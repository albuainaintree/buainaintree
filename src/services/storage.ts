import { Family, Submission, SubmissionPerson, RequestStatus, SiteBackupData } from '../types';
import { INITIAL_FAMILIES, INITIAL_SUBMISSIONS } from '../data/mockFamilies';
import { 
  syncFamilyToFirestore, 
  deleteFamilyFromFirestore, 
  syncSubmissionToFirestore, 
  subscribeToFirestore 
} from './firebaseClient';

// Storage keys
const FAMILIES_KEY = 'albuainain_tree_families_v8';
const SUBMISSIONS_KEY = 'albuainain_tree_submissions_v8';
const DB_NAME = 'AlBuainainGenealogyDB';
const DB_VERSION = 1;
const STORE_NAME = 'tree_records';

// In-memory cache for ultra-fast, synchronous access
let memoryFamilies: Family[] = INITIAL_FAMILIES;
let memorySubmissions: Submission[] = INITIAL_SUBMISSIONS;
let isInitialized = false;

// -------------------------------------------------------------
// IndexedDB Helper (Virtually unlimited client-side storage)
// -------------------------------------------------------------

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('IDB get failed, falling back to cache:', e);
    return null;
  }
}

async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('IDB set failed:', e);
    return false;
  }
}

// -------------------------------------------------------------
// Initialization & Cache Hydration
// -------------------------------------------------------------

// Clean up old bulky keys from localStorage to prevent quota exhaustion
function cleanObsoleteLocalStorage() {
  try {
    const obsoleteKeys = [
      'albuainain_tree_families_v6',
      'albuainain_tree_families_v7',
      'albuainain_tree_submissions_v6',
      'albuainain_tree_submissions_v7',
    ];
    for (const k of obsoleteKeys) {
      localStorage.removeItem(k);
    }
  } catch (e) {
    // Ignore
  }
}

// Synchronous initial read from localStorage if present
try {
  cleanObsoleteLocalStorage();
  const storedFams = localStorage.getItem(FAMILIES_KEY);
  if (storedFams) {
    const parsed = JSON.parse(storedFams);
    if (Array.isArray(parsed)) memoryFamilies = parsed;
  }
  const storedSubs = localStorage.getItem(SUBMISSIONS_KEY);
  if (storedSubs) {
    const parsed = JSON.parse(storedSubs);
    if (Array.isArray(parsed)) memorySubmissions = parsed;
  }
} catch (e) {
  console.warn('Initial localStorage parse error:', e);
}

/**
 * Initializes IndexedDB and hydrates memory cache with high-capacity records
 */
export async function initStorage(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const idbFamilies = await idbGet<Family[]>('families');
    if (Array.isArray(idbFamilies)) {
      memoryFamilies = idbFamilies;
      window.dispatchEvent(new Event('albuainain_families_updated'));
    } else if (memoryFamilies.length > 0) {
      await idbSet('families', memoryFamilies);
    }

    const idbSubs = await idbGet<Submission[]>('submissions');
    if (Array.isArray(idbSubs)) {
      memorySubmissions = idbSubs;
      window.dispatchEvent(new Event('albuainain_submissions_updated'));
    } else if (memorySubmissions.length > 0) {
      await idbSet('submissions', memorySubmissions);
    }

    // Subscribe to Firestore for real-time live synchronization
    subscribeToFirestore(
      (fams) => {
        if (fams && fams.length > 0) {
          memoryFamilies = fams;
          idbSet('families', fams);
          window.dispatchEvent(new Event('albuainain_families_updated'));
        }
      },
      (subs) => {
        if (subs && subs.length > 0) {
          memorySubmissions = subs;
          idbSet('submissions', subs);
          window.dispatchEvent(new Event('albuainain_submissions_updated'));
        }
      }
    );
  } catch (err) {
    console.warn('Storage hydration warning:', err);
  }
}

// Automatically start background hydration
if (typeof window !== 'undefined') {
  initStorage();
}

// -------------------------------------------------------------
// Database Operations
// -------------------------------------------------------------

export function loadFamilies(): Family[] {
  return memoryFamilies;
}

export function saveFamilies(families: Family[]): void {
  memoryFamilies = families;

  // 1. Sync to Firebase Firestore cloud database
  families.forEach(f => syncFamilyToFirestore(f));

  // 2. Save to IndexedDB (asynchronous, no 5MB quota limit)
  idbSet('families', families).catch(err => {
    console.error('Failed to save families to IndexedDB:', err);
  });

  // 3. Try saving to localStorage safely without throwing QuotaExceededError
  try {
    localStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
  } catch (e) {
    console.warn('LocalStorage quota reached. Data safely persisted in IndexedDB.', e);
  }

  // 4. Notify app components
  window.dispatchEvent(new Event('albuainain_families_updated'));
}

export function loadSubmissions(): Submission[] {
  return memorySubmissions;
}

export function saveSubmissions(submissions: Submission[]): void {
  memorySubmissions = submissions;

  // 1. Sync to Firebase Firestore cloud database
  submissions.forEach(s => syncSubmissionToFirestore(s));

  // 2. Save to IndexedDB
  idbSet('submissions', submissions).catch(err => {
    console.error('Failed to save submissions to IndexedDB:', err);
  });

  // 3. Try saving to localStorage safely
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch (e) {
    console.warn('LocalStorage quota reached for submissions. Data safely persisted in IndexedDB.', e);
  }

  // 4. Notify app components
  window.dispatchEvent(new Event('albuainain_submissions_updated'));
}

/**
 * Add a new user update submission
 */
export function addSubmission(submissionData: Omit<Submission, 'id' | 'referenceNumber' | 'status' | 'createdAt'>): Submission {
  const submissions = [...loadSubmissions()];
  
  // Generate distinct reference number e.g. BA-6E-XXXXX
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const referenceNumber = `BA-6E-${randomSuffix}`;
  
  const newSubmission: Submission = {
    ...submissionData,
    id: `sub-${Date.now()}`,
    referenceNumber,
    status: 'pending',
    createdAt: new Date().toISOString(),
    persons: submissionData.persons.map((p, idx) => ({
      ...p,
      id: p.id || `p-${Date.now()}-${idx}`,
      status: 'pending',
    })),
  };

  submissions.unshift(newSubmission);
  saveSubmissions(submissions);
  return newSubmission;
}

/**
 * Update request status (Approve / Reject)
 */
export function updateSubmissionStatus(submissionId: string, status: RequestStatus, reviewedBy?: string): Submission | null {
  const submissions = [...loadSubmissions()];
  const index = submissions.findIndex(s => s.id === submissionId);
  if (index === -1) return null;

  const current = submissions[index];
  const updatedPersons = current.persons.map(p => ({
    ...p,
    status: status,
    reviewedAt: new Date().toISOString()
  }));

  const updated: Submission = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
    reviewedBy: reviewedBy || 'لجنة التوثيق',
    persons: updatedPersons,
  };

  submissions[index] = updated;
  saveSubmissions(submissions);
  return updated;
}

/**
 * Update an individual person within a submission (Admin editing name, lineageStatus, note, status)
 */
export function updatePersonInSubmission(
  submissionId: string,
  personId: string,
  updatedFields: Partial<SubmissionPerson>
): Submission | null {
  const submissions = [...loadSubmissions()];
  const subIndex = submissions.findIndex(s => s.id === submissionId);
  if (subIndex === -1) return null;

  const currentSub = submissions[subIndex];
  const personIndex = currentSub.persons.findIndex(p => p.id === personId);
  if (personIndex === -1) return null;

  const updatedPersons = [...currentSub.persons];
  updatedPersons[personIndex] = {
    ...updatedPersons[personIndex],
    ...updatedFields,
    reviewedAt: new Date().toISOString(),
  };

  // Re-calculate overall submission status
  const allApproved = updatedPersons.every(p => p.status === 'approved');
  const allRejected = updatedPersons.every(p => p.status === 'rejected');
  let overallStatus: RequestStatus = 'pending';
  if (allApproved) overallStatus = 'approved';
  else if (allRejected) overallStatus = 'rejected';

  const updatedSubmission: Submission = {
    ...currentSub,
    persons: updatedPersons,
    status: overallStatus,
    updatedAt: new Date().toISOString(),
  };

  submissions[subIndex] = updatedSubmission;
  saveSubmissions(submissions);
  return updatedSubmission;
}

/**
 * Add or update family (Admin CRUD)
 */
export function upsertFamily(familyData: { id?: string; name: string; branch?: string; treeImageUrl?: string; membersCount?: number }): Family {
  const families = [...loadFamilies()];
  const existingIndex = familyData.id ? families.findIndex(f => f.id === familyData.id) : -1;

  if (existingIndex >= 0) {
    const updated: Family = {
      ...families[existingIndex],
      name: familyData.name,
      branch: familyData.branch || '', // الفخذ
      treeImageUrl: familyData.treeImageUrl || families[existingIndex].treeImageUrl,
      membersCount: familyData.membersCount || families[existingIndex].membersCount,
      lastUpdated: '2026م (محدثة)',
    };
    families[existingIndex] = updated;
    saveFamilies(families);
    return updated;
  } else {
    const newFamily: Family = {
      id: `fam-${Date.now()}`,
      name: familyData.name,
      branch: familyData.branch || '', // الفخذ
      treeImageUrl: familyData.treeImageUrl || '',
      membersCount: familyData.membersCount || 100,
      lastUpdated: '2026م (جديدة)',
    };
    families.unshift(newFamily);
    saveFamilies(families);
    return newFamily;
  }
}

/**
 * Delete family (Admin CRUD)
 */
export function deleteFamily(familyId: string): boolean {
  const families = loadFamilies();
  const filtered = families.filter(f => f.id !== familyId);
  if (filtered.length !== families.length) {
    deleteFamilyFromFirestore(familyId);
    saveFamilies(filtered);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Backup & Restore System
// -------------------------------------------------------------

/**
 * Exports full website database as a downloadable JSON backup file.
 */
export function exportSiteBackup(): { success: boolean; filename: string } {
  const families = loadFamilies();
  const submissions = loadSubmissions();

  const backupData: SiteBackupData = {
    version: '1.0',
    app: 'albuainain-tree-v6',
    exportedAt: new Date().toISOString(),
    families,
    submissions,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `نسخة_احتياطية_شجرة_آل_بوعينين_${today}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Imports full website database from a JSON backup file
 */
export function importSiteBackup(jsonContent: string): { success: boolean; message: string; familiesCount?: number; submissionsCount?: number } {
  try {
    const data = JSON.parse(jsonContent);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'الملف المرفوع غير صالح.' };
    }

    if (!Array.isArray(data.families) && !Array.isArray(data.submissions)) {
      return { success: false, message: 'صيغة النسخة الاحتياطية غير متوافقة (لا تحتوي على بيانات أسر أو طلبات).' };
    }

    const familiesToSave: Family[] = Array.isArray(data.families) ? data.families : [];
    const submissionsToSave: Submission[] = Array.isArray(data.submissions) ? data.submissions : [];

    saveFamilies(familiesToSave);
    saveSubmissions(submissionsToSave);

    return {
      success: true,
      message: `تم استيراد النسخة الاحتياطية بنجاح (${familiesToSave.length} أسرة، و ${submissionsToSave.length} طلب تحديث).`,
      familiesCount: familiesToSave.length,
      submissionsCount: submissionsToSave.length,
    };
  } catch (err) {
    console.error('Error importing backup:', err);
    return { success: false, message: 'حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.' };
  }
}
