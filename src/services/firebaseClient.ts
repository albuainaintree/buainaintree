import { Family, Submission } from '../types';
import { getAppConfig } from './config';

interface FirebaseAppCompat {
  apps: unknown[];
  initializeApp: (config: Record<string, unknown>) => unknown;
  firestore: () => {
    collection: (name: string) => {
      doc: (id: string) => {
        set: (data: unknown, options?: unknown) => Promise<unknown>;
        delete: () => Promise<unknown>;
        get: () => Promise<{ exists: boolean; data: () => unknown }>;
      };
      get: () => Promise<{ docs: Array<{ id: string; data: () => unknown }> }>;
      onSnapshot: (callback: (snapshot: { docs: Array<{ id: string; data: () => unknown }> }) => void, error?: (err: unknown) => void) => () => void;
    };
  };
}

declare global {
  interface Window {
    firebase?: FirebaseAppCompat;
  }
}

let firestoreInstance: ReturnType<FirebaseAppCompat['firestore']> | null = null;

export function getFirestoreDB() {
  if (firestoreInstance) return firestoreInstance;

  const config = getAppConfig();
  if (!config.firebaseApiKey || !config.firebaseProjectId) {
    return null;
  }

  if (typeof window !== 'undefined' && window.firebase) {
    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp({
          apiKey: config.firebaseApiKey,
          authDomain: config.firebaseAuthDomain || `${config.firebaseProjectId}.firebaseapp.com`,
          projectId: config.firebaseProjectId,
          storageBucket: config.firebaseStorageBucket || `${config.firebaseProjectId}.firebasestorage.app`,
          messagingSenderId: config.firebaseMessagingSenderId,
          appId: config.firebaseAppId,
        });
        console.info('🔥 Firebase Cloud initialized successfully for project:', config.firebaseProjectId);
      }
      firestoreInstance = window.firebase.firestore();
      return firestoreInstance;
    } catch (err) {
      console.warn('Firebase initialization notice:', err);
    }
  }

  return null;
}

/**
 * Sync family to Firestore
 */
export async function syncFamilyToFirestore(family: Family): Promise<void> {
  const db = getFirestoreDB();
  if (!db) return;

  try {
    await db.collection('families').doc(family.id).set(family, { merge: true });
  } catch (e) {
    console.warn('Firestore family sync notice:', e);
  }
}

/**
 * Delete family from Firestore
 */
export async function deleteFamilyFromFirestore(familyId: string): Promise<void> {
  const db = getFirestoreDB();
  if (!db) return;

  try {
    await db.collection('families').doc(familyId).delete();
  } catch (e) {
    console.warn('Firestore family delete notice:', e);
  }
}

/**
 * Sync submission to Firestore
 */
export async function syncSubmissionToFirestore(submission: Submission): Promise<void> {
  const db = getFirestoreDB();
  if (!db) return;

  try {
    await db.collection('submissions').doc(submission.id).set(submission, { merge: true });
  } catch (e) {
    console.warn('Firestore submission sync notice:', e);
  }
}

/**
 * Subscribe to real-time updates from Firestore
 */
export function subscribeToFirestore(
  onFamiliesUpdate: (families: Family[]) => void,
  onSubmissionsUpdate: (submissions: Submission[]) => void
): (() => void) | null {
  const db = getFirestoreDB();
  if (!db) return null;

  try {
    // Initial fetch + Live Snapshot for Families
    const unsubFamilies = db.collection('families').onSnapshot(
      (snapshot) => {
        const fams: Family[] = snapshot.docs.map(doc => doc.data() as Family);
        if (fams.length > 0) {
          onFamiliesUpdate(fams);
        }
      },
      (err) => console.warn('Families listener note:', err)
    );

    // Initial fetch + Live Snapshot for Submissions
    const unsubSubmissions = db.collection('submissions').onSnapshot(
      (snapshot) => {
        const subs: Submission[] = snapshot.docs.map(doc => doc.data() as Submission);
        if (subs.length > 0) {
          onSubmissionsUpdate(subs);
        }
      },
      (err) => console.warn('Submissions listener note:', err)
    );

    return () => {
      unsubFamilies();
      unsubSubmissions();
    };
  } catch (e) {
    console.warn('Firestore subscription notice:', e);
    return null;
  }
}
