import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import { Family, Submission } from '../types';
import { getAppConfig } from './config';

export type CloudSyncStatus = 'checking' | 'connected' | 'permission_denied' | 'error' | 'disconnected';

let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

let currentSyncStatus: CloudSyncStatus = 'checking';
let lastSyncTimestamp: string | null = null;
let lastSyncErrorMessage: string | null = null;

const statusListeners = new Set<(status: CloudSyncStatus, details?: { lastSync?: string; error?: string }) => void>();

function notifyStatusChange(status: CloudSyncStatus, errorMsg?: string) {
  currentSyncStatus = status;
  if (errorMsg) lastSyncErrorMessage = errorMsg;
  if (status === 'connected') {
    lastSyncTimestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastSyncErrorMessage = null;
  }
  statusListeners.forEach(fn => fn(status, { 
    lastSync: lastSyncTimestamp || undefined, 
    error: lastSyncErrorMessage || undefined 
  }));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('albuainain_cloud_status_changed', { 
      detail: { status, lastSync: lastSyncTimestamp, error: lastSyncErrorMessage } 
    }));
  }
}

export function subscribeToCloudStatus(
  listener: (status: CloudSyncStatus, details?: { lastSync?: string; error?: string }) => void
): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus, { 
    lastSync: lastSyncTimestamp || undefined, 
    error: lastSyncErrorMessage || undefined 
  });
  return () => {
    statusListeners.delete(listener);
  };
}

export function getCloudSyncStatus(): { status: CloudSyncStatus; lastSync?: string; error?: string } {
  return {
    status: currentSyncStatus,
    lastSync: lastSyncTimestamp || undefined,
    error: lastSyncErrorMessage || undefined,
  };
}

/**
 * Initializes official Firebase client using configuration
 */
export function getFirestoreDB(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  const config = getAppConfig();
  if (!config.firebaseApiKey || !config.firebaseProjectId) {
    notifyStatusChange('disconnected', 'بيانات الربط السحابي غير مكتملة');
    return null;
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp({
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain || `${config.firebaseProjectId}.firebaseapp.com`,
        projectId: config.firebaseProjectId,
        storageBucket: config.firebaseStorageBucket || `${config.firebaseProjectId}.firebasestorage.app`,
        messagingSenderId: config.firebaseMessagingSenderId,
        appId: config.firebaseAppId,
      });
      console.info('🔥 Firebase Cloud client initialized successfully for project:', config.firebaseProjectId);
    }

    firestoreInstance = getFirestore(firebaseAppInstance);
    return firestoreInstance;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firebase initialization notice:', msg);
    notifyStatusChange('error', msg);
    return null;
  }
}

/**
 * Sync family to Firestore (real-time cloud write)
 */
export async function syncFamilyToFirestore(family: Family): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const familyDocRef = doc(db, 'families', family.id);
    await setDoc(familyDocRef, family, { merge: true });
    notifyStatusChange('connected');
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firestore family sync error:', msg);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      notifyStatusChange('permission_denied', 'قواعد Firestore في Firebase تتطلب السماح بالقراءة والكتابة');
    } else {
      notifyStatusChange('error', msg);
    }
    return false;
  }
}

/**
 * Delete family from Firestore
 */
export async function deleteFamilyFromFirestore(familyId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const familyDocRef = doc(db, 'families', familyId);
    await deleteDoc(familyDocRef);
    notifyStatusChange('connected');
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firestore family delete notice:', msg);
    return false;
  }
}

/**
 * Sync user update submission to Firestore (real-time cloud write)
 */
export async function syncSubmissionToFirestore(submission: Submission): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const subDocRef = doc(db, 'submissions', submission.id);
    await setDoc(subDocRef, submission, { merge: true });
    notifyStatusChange('connected');
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firestore submission sync error:', msg);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      notifyStatusChange('permission_denied', 'قواعد Firestore في Firebase تتطلب السماح بالقراءة والكتابة');
    } else {
      notifyStatusChange('error', msg);
    }
    return false;
  }
}

/**
 * Subscribe to real-time live updates from Firestore
 */
export function subscribeToFirestore(
  onFamiliesUpdate: (families: Family[]) => void,
  onSubmissionsUpdate: (submissions: Submission[]) => void
): (() => void) | null {
  const db = getFirestoreDB();
  if (!db) {
    notifyStatusChange('disconnected');
    return null;
  }

  notifyStatusChange('checking');

  try {
    // 1. Live Snapshot for Families Collection
    const familiesCol = collection(db, 'families');
    const unsubFamilies: Unsubscribe = onSnapshot(
      familiesCol,
      (snapshot) => {
        const fams: Family[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Family;
          if (data && (data.name || docSnap.id)) {
            fams.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        notifyStatusChange('connected');
        if (fams.length > 0) {
          onFamiliesUpdate(fams);
        }
      },
      (err) => {
        console.warn('Firestore families listener notice:', err.message);
        if (err.message.includes('permission-denied') || err.message.includes('Missing or insufficient permissions')) {
          notifyStatusChange('permission_denied', 'قواعد أمان Firebase Firestore تتطلب تفعيل القراءة والكتابة');
        } else {
          notifyStatusChange('error', err.message);
        }
      }
    );

    // 2. Live Snapshot for Submissions Collection
    const submissionsCol = collection(db, 'submissions');
    const unsubSubmissions: Unsubscribe = onSnapshot(
      submissionsCol,
      (snapshot) => {
        const subs: Submission[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Submission;
          if (data && (data.referenceNumber || docSnap.id)) {
            subs.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        notifyStatusChange('connected');
        if (subs.length > 0) {
          onSubmissionsUpdate(subs);
        }
      },
      (err) => {
        console.warn('Firestore submissions listener notice:', err.message);
        if (err.message.includes('permission-denied') || err.message.includes('Missing or insufficient permissions')) {
          notifyStatusChange('permission_denied', 'قواعد أمان Firebase Firestore تتطلب تفعيل القراءة والكتابة');
        } else {
          notifyStatusChange('error', err.message);
        }
      }
    );

    return () => {
      unsubFamilies();
      unsubSubmissions();
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firestore subscription exception:', msg);
    notifyStatusChange('error', msg);
    return null;
  }
}

/**
 * Fetch all families directly from Firestore once
 */
export async function fetchAllFirestoreFamilies(): Promise<Family[]> {
  const db = getFirestoreDB();
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, 'families'));
    const fams: Family[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Family;
      if (data && (data.name || docSnap.id)) {
        fams.push({
          ...data,
          id: data.id || docSnap.id,
        });
      }
    });
    notifyStatusChange('connected');
    return fams;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Direct Firestore families fetch notice:', msg);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      notifyStatusChange('permission_denied', 'قواعد أمان Firebase Firestore تتطلب تفعيل القراءة والكتابة');
    }
    return [];
  }
}

/**
 * Fetch all submissions directly from Firestore once
 */
export async function fetchAllFirestoreSubmissions(): Promise<Submission[]> {
  const db = getFirestoreDB();
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, 'submissions'));
    const subs: Submission[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Submission;
      if (data && (data.referenceNumber || docSnap.id)) {
        subs.push({
          ...data,
          id: data.id || docSnap.id,
        });
      }
    });
    notifyStatusChange('connected');
    return subs;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Direct Firestore submissions fetch notice:', msg);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      notifyStatusChange('permission_denied', 'قواعد أمان Firebase Firestore تتطلب تفعيل القراءة والكتابة');
    }
    return [];
  }
}

/**
 * Pushes entire local database (families + submissions) to Firestore cloud
 */
export async function pushAllLocalDataToFirestore(
  families: Family[], 
  submissions: Submission[]
): Promise<{ success: boolean; pushedFamilies: number; pushedSubmissions: number; error?: string }> {
  const db = getFirestoreDB();
  if (!db) {
    return { success: false, pushedFamilies: 0, pushedSubmissions: 0, error: 'تعذر الاتصال بـ Firebase' };
  }

  let pushedFamilies = 0;
  let pushedSubmissions = 0;

  try {
    for (const f of families) {
      if (f && f.id) {
        await setDoc(doc(db, 'families', f.id), f, { merge: true });
        pushedFamilies++;
      }
    }

    for (const s of submissions) {
      if (s && s.id) {
        await setDoc(doc(db, 'submissions', s.id), s, { merge: true });
        pushedSubmissions++;
      }
    }

    notifyStatusChange('connected');
    return { success: true, pushedFamilies, pushedSubmissions };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error pushing data to Firestore:', msg);
    notifyStatusChange('error', msg);
    return { success: false, pushedFamilies, pushedSubmissions, error: msg };
  }
}
