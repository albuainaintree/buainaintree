import { Family, Submission, SubmissionPerson, RequestStatus, SiteBackupData } from '../types';
import { INITIAL_FAMILIES, INITIAL_SUBMISSIONS } from '../data/mockFamilies';
import { 
  syncFamilyToFirestore, 
  deleteFamilyFromFirestore, 
  syncSubmissionToFirestore, 
  subscribeToFirestore,
  fetchAllFirestoreFamilies,
  fetchAllFirestoreSubmissions,
  pushAllLocalDataToFirestore
} from './firebaseClient';
import { generateFamilyTreeSvg } from '../data/mockFamilies';

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
// Resilient Multi-Source Merging Helpers (Zero Data Loss)
// -------------------------------------------------------------

/**
 * Normalizes family name to prevent false duplicates (strips extra spaces)
 */
function normalizeName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

/**
 * Merges two lists of families without losing any record or image data.
 * Matches by normalized family name OR existing ID, merges details without loss,
 * and strictly guarantees zero duplicate IDs and zero duplicate names in the output.
 */
export function mergeFamiliesList(listA: Family[], listB: Family[]): Family[] {
  const all = [...(listA || []), ...(listB || [])];
  const items: Family[] = [];

  for (const raw of all) {
    if (!raw) continue;
    const norm = normalizeName(raw.name);
    if (!norm) continue;

    const rawId = (raw.id && String(raw.id).trim()) || '';
    const f: Family = {
      ...raw,
      id: rawId,
      name: norm,
      branch: (raw.branch || '').trim(),
      treeImageUrl: raw.treeImageUrl || '',
      membersCount: raw.membersCount || 100,
      lastUpdated: raw.lastUpdated || 'النسخة الخامسة',
    };

    // Find existing match by either normalized name OR non-empty ID
    const matchIndex = items.findIndex(
      item => item.name === f.name || (f.id !== '' && item.id !== '' && item.id === f.id)
    );

    if (matchIndex === -1) {
      items.push(f);
    } else {
      const existing = items[matchIndex];
      const fImgLen = (f.treeImageUrl || '').length;
      const exImgLen = (existing.treeImageUrl || '').length;
      const bestImage = fImgLen > exImgLen ? f.treeImageUrl : existing.treeImageUrl;

      items[matchIndex] = {
        ...existing,
        ...f,
        id: existing.id || f.id,
        name: norm || existing.name,
        branch: f.branch || existing.branch || '',
        treeImageUrl: bestImage,
        membersCount: f.membersCount || existing.membersCount || 100,
        lastUpdated: f.lastUpdated || existing.lastUpdated || 'النسخة الخامسة',
      };
    }
  }

  // Ensure every item has a strictly unique non-empty ID
  const seenIds = new Set<string>();
  const result: Family[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    if (!item.id || seenIds.has(item.id)) {
      item.id = `fam-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 7)}`;
    }
    seenIds.add(item.id);
    result.push(item);
  }

  return result;
}

/**
 * Merges two lists of submissions by reference number or ID,
 * and guarantees strictly unique IDs and persons IDs.
 */
export function mergeSubmissionsList(listA: Submission[], listB: Submission[]): Submission[] {
  const all = [...(listA || []), ...(listB || [])];
  const items: Submission[] = [];

  for (const raw of all) {
    if (!raw) continue;
    const ref = (raw.referenceNumber || '').trim();
    const id = (raw.id || '').trim();
    if (!ref && !id) continue;

    const matchIndex = items.findIndex(
      item => (ref !== '' && item.referenceNumber === ref) || (id !== '' && item.id === id)
    );

    if (matchIndex === -1) {
      items.push({
        ...raw,
        id: id || `sub-${Date.now()}-${items.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        referenceNumber: ref || `BA-6E-${Math.floor(10000 + Math.random() * 90000)}`,
        persons: (raw.persons || []).map((p, pIdx) => ({
          ...p,
          id: p.id || `p-${Date.now()}-${pIdx + 1}-${Math.random().toString(36).slice(2, 5)}`,
        })),
      });
    } else {
      const existing = items[matchIndex];
      const isIncomingNewer = (raw.updatedAt || raw.createdAt || '') >= (existing.updatedAt || existing.createdAt || '');
      const merged: Submission = isIncomingNewer ? { ...existing, ...raw } : { ...raw, ...existing };
      merged.id = existing.id || raw.id;
      merged.referenceNumber = existing.referenceNumber || raw.referenceNumber;

      // Ensure unique person IDs within the submission
      const seenPIds = new Set<string>();
      merged.persons = (merged.persons || []).map((p, pIdx) => {
        let pId = p.id;
        if (!pId || seenPIds.has(pId)) {
          pId = `${pId || 'p'}-${pIdx + 1}-${Math.random().toString(36).slice(2, 5)}`;
        }
        seenPIds.add(pId);
        return { ...p, id: pId };
      });

      items[matchIndex] = merged;
    }
  }

  // Guarantee strictly unique submission IDs
  const seenIds = new Set<string>();
  const result: Submission[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    if (!item.id || seenIds.has(item.id)) {
      item.id = `sub-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 7)}`;
    }
    seenIds.add(item.id);
    result.push(item);
  }

  return result;
}

/**
 * Scans ALL keys in localStorage for any family data from current and previous versions (v1..v8, backups)
 */
function scanAllLocalStorageForFamilies(): Family[] {
  const gathered: Family[] = [];
  if (typeof window === 'undefined' || !window.localStorage) return gathered;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Check keys matching family tree patterns
      const isFamilyCandidate = 
        k.includes('famil') || 
        k.includes('tree') || 
        k.includes('buainain') || 
        k.startsWith('albuainain_');

      if (isFamilyCandidate) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);

          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && typeof item === 'object' && item.name && (item.treeImageUrl !== undefined || item.branch !== undefined || item.id)) {
                gathered.push(item as Family);
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.families)) {
              for (const item of parsed.families) {
                if (item && item.name) gathered.push(item as Family);
              }
            }
          }
        } catch {
          // ignore corrupted keys
        }
      }
    }
  } catch (err) {
    console.warn('Error during localStorage deep scan:', err);
  }

  return gathered;
}

/**
 * Scans ALL keys in localStorage for any submission data
 */
function scanAllLocalStorageForSubmissions(): Submission[] {
  const gathered: Submission[] = [];
  if (typeof window === 'undefined' || !window.localStorage) return gathered;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.includes('submission') || k.includes('request')) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.referenceNumber && Array.isArray(item.persons)) {
                gathered.push(item as Submission);
              }
            }
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.submissions)) {
            for (const item of parsed.submissions) {
              if (item && item.referenceNumber) gathered.push(item as Submission);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  return gathered;
}

// -------------------------------------------------------------
// Synchronous Initial Boot with Auto-Recovery
// -------------------------------------------------------------

try {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // 1. Scan and merge all historical localStorage keys to rescue any older data
    const recoveredFams = scanAllLocalStorageForFamilies();
    const recoveredSubs = scanAllLocalStorageForSubmissions();

    if (recoveredFams.length > 0) {
      memoryFamilies = mergeFamiliesList(memoryFamilies, recoveredFams);
    }
    if (recoveredSubs.length > 0) {
      memorySubmissions = mergeSubmissionsList(memorySubmissions, recoveredSubs);
    }

    // 2. Read specific v8 primary keys
    try {
      const storedFams = localStorage.getItem(FAMILIES_KEY);
      if (storedFams) {
        const parsed = JSON.parse(storedFams);
        if (Array.isArray(parsed)) {
          memoryFamilies = mergeFamiliesList(memoryFamilies, parsed);
        }
      }
    } catch {
      // Ignore corrupted stored families key
    }

    try {
      const storedSubs = localStorage.getItem(SUBMISSIONS_KEY);
      if (storedSubs) {
        const parsed = JSON.parse(storedSubs);
        if (Array.isArray(parsed)) {
          memorySubmissions = mergeSubmissionsList(memorySubmissions, parsed);
        }
      }
    } catch {
      // Ignore corrupted stored submissions key
    }
  }

  // Ensure initial cache is strictly cleansed of duplicate IDs or colliding records
  memoryFamilies = mergeFamiliesList(memoryFamilies, []);
  memorySubmissions = mergeSubmissionsList(memorySubmissions, []);
} catch (e) {
  console.warn('Initial localStorage parse notice:', e);
}

/**
 * Safely saves families to localStorage without triggering QuotaExceededError.
 * If data URL images cause payload to exceed 2.5MB, stores a lightweight index
 * while the full-resolution images are permanently preserved in IndexedDB.
 */
function saveToLocalStorageSafely(families: Family[]): void {
  try {
    // Try complete save first
    localStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
  } catch (err) {
    console.warn('LocalStorage quota limit reached. Saving lightweight index and preserving full assets in IndexedDB.', err);
    try {
      // Store lightweight version: keep metadata, clear heavy data URLs if needed
      const lightweight = families.map(f => ({
        ...f,
        treeImageUrl: (f.treeImageUrl && f.treeImageUrl.length > 4000) ? '' : f.treeImageUrl,
      }));
      localStorage.setItem(FAMILIES_KEY, JSON.stringify(lightweight));
    } catch {
      // If even lightweight fails, IndexedDB holds everything
    }
  }
}

/**
 * Initializes IndexedDB and hydrates memory cache with high-capacity records,
 * and sets up resilient real-time Firestore sync that NEVER deletes local records.
 */
export async function initStorage(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // 1. Hydrate from high-capacity IndexedDB
    const idbFamilies = await idbGet<Family[]>('families');
    if (Array.isArray(idbFamilies) && idbFamilies.length > 0) {
      // Merge with memory to guarantee no lost entries
      memoryFamilies = mergeFamiliesList(memoryFamilies, idbFamilies);
      saveToLocalStorageSafely(memoryFamilies);
      window.dispatchEvent(new Event('albuainain_families_updated'));
    } else if (memoryFamilies.length > 0) {
      await idbSet('families', memoryFamilies);
    }

    const idbSubs = await idbGet<Submission[]>('submissions');
    if (Array.isArray(idbSubs) && idbSubs.length > 0) {
      memorySubmissions = mergeSubmissionsList(memorySubmissions, idbSubs);
      window.dispatchEvent(new Event('albuainain_submissions_updated'));
    } else if (memorySubmissions.length > 0) {
      await idbSet('submissions', memorySubmissions);
    }

    // 2. Subscribe to Firestore for real-time live synchronization (with resilient merge)
    subscribeToFirestore(
      (remoteFams) => {
        if (remoteFams && remoteFams.length > 0) {
          // CRITICAL: NEVER blindly overwrite! Merge with local memory cache!
          const merged = mergeFamiliesList(memoryFamilies, remoteFams);
          const hadChanges = merged.length !== memoryFamilies.length;
          memoryFamilies = merged;
          idbSet('families', merged);
          saveToLocalStorageSafely(merged);

          // If local has families that Firestore doesn't, sync them up to the cloud!
          if (merged.length > remoteFams.length) {
            merged.forEach(f => syncFamilyToFirestore(f));
          }

          if (hadChanges) {
            window.dispatchEvent(new Event('albuainain_families_updated'));
          }
        }
      },
      (remoteSubs) => {
        if (remoteSubs && remoteSubs.length > 0) {
          const merged = mergeSubmissionsList(memorySubmissions, remoteSubs);
          const hadChanges = merged.length !== memorySubmissions.length;
          memorySubmissions = merged;
          idbSet('submissions', merged);
          try {
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }

          // If local has submissions that Firestore doesn't, sync them up to the cloud!
          if (merged.length > remoteSubs.length) {
            merged.forEach(s => syncSubmissionToFirestore(s));
          }

          if (hadChanges) {
            window.dispatchEvent(new Event('albuainain_submissions_updated'));
          }
        }
      }
    );

    // Initial direct fetch to ensure instant display on fresh tabs
    fetchAllFirestoreFamilies().then(fams => {
      if (fams && fams.length > 0) {
        const merged = mergeFamiliesList(memoryFamilies, fams);
        memoryFamilies = merged;
        idbSet('families', merged);
        saveToLocalStorageSafely(merged);
        window.dispatchEvent(new Event('albuainain_families_updated'));
      }
    }).catch(() => {});

    fetchAllFirestoreSubmissions().then(subs => {
      if (subs && subs.length > 0) {
        const merged = mergeSubmissionsList(memorySubmissions, subs);
        memorySubmissions = merged;
        idbSet('submissions', merged);
        window.dispatchEvent(new Event('albuainain_submissions_updated'));
      }
    }).catch(() => {});
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
  memoryFamilies = mergeFamiliesList(memoryFamilies, []);
  return memoryFamilies;
}

export function saveFamilies(families: Family[]): void {
  // Guarantee deduplication by name/ID and strict ID uniqueness
  const sanitized = mergeFamiliesList(families, []);

  memoryFamilies = sanitized;

  // 1. Sync to Firebase Firestore cloud database
  sanitized.forEach(f => syncFamilyToFirestore(f));

  // 2. Save full high-capacity records to IndexedDB (asynchronous, no 5MB quota limit)
  idbSet('families', sanitized).catch(err => {
    console.error('Failed to save families to IndexedDB:', err);
  });

  // 3. Save to localStorage safely (with quota overflow protection)
  saveToLocalStorageSafely(sanitized);

  // 4. Notify app components
  window.dispatchEvent(new Event('albuainain_families_updated'));
}

export function loadSubmissions(): Submission[] {
  memorySubmissions = mergeSubmissionsList(memorySubmissions, []);
  return memorySubmissions;
}

export function saveSubmissions(submissions: Submission[]): void {
  // Guarantee deduplication by referenceNumber/ID and strict ID uniqueness
  const sanitized = mergeSubmissionsList(submissions, []);
  memorySubmissions = sanitized;

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
      id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: familyData.name,
      branch: familyData.branch || '', // الفخذ
      treeImageUrl: familyData.treeImageUrl || '',
      membersCount: familyData.membersCount || 100,
      lastUpdated: 'النسخة الخامسة',
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
 * Exports full website database as a downloadable JSON backup file,
 * containing complete families, full-resolution tree images, and all submissions.
 */
export function exportSiteBackup(): { success: boolean; filename: string; familiesCount: number; submissionsCount: number } {
  const families = loadFamilies();
  const submissions = loadSubmissions();

  const backupData: SiteBackupData & { databaseName: string; project: string } = {
    version: '2.0-complete',
    app: 'albuainain-tree-v6',
    databaseName: 'AlBuainainGenealogyDB',
    project: 'buainain-be6e1',
    exportedAt: new Date().toISOString(),
    families,
    submissions,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `قاعدة_بيانات_شجرة_آل_بوعينين_كاملة_${today}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { 
    success: true, 
    filename, 
    familiesCount: families.length, 
    submissionsCount: submissions.length 
  };
}

/**
 * Imports full website database from a JSON backup file and immediately
 * pushes everything to Firebase Firestore so all users (including GitHub Pages) see it in real time.
 */
export async function importSiteBackup(jsonContent: string): Promise<{ 
  success: boolean; 
  message: string; 
  familiesCount?: number; 
  submissionsCount?: number;
  cloudSynced?: boolean;
}> {
  try {
    const data = JSON.parse(jsonContent);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'الملف المرفوع غير صالح.' };
    }

    if (!Array.isArray(data.families) && !Array.isArray(data.submissions)) {
      return { success: false, message: 'صيغة النسخة الاحتياطية غير متوافقة (لا تحتوي على بيانات أسر أو طلبات).' };
    }

    const incomingFamilies: Family[] = Array.isArray(data.families) ? data.families : [];
    const incomingSubmissions: Submission[] = Array.isArray(data.submissions) ? data.submissions : [];

    // Merge incoming with existing records
    const currentFams = loadFamilies();
    const currentSubs = loadSubmissions();

    const mergedFams = mergeFamiliesList(currentFams, incomingFamilies);
    const mergedSubs = mergeSubmissionsList(currentSubs, incomingSubmissions);

    saveFamilies(mergedFams);
    saveSubmissions(mergedSubs);

    // Push full database to Firebase Cloud to synchronize across GitHub Pages and all devices!
    const cloudPushRes = await pushAllLocalDataToFirestore(mergedFams, mergedSubs);

    const cloudMsg = cloudPushRes.success 
      ? ' وتمت مزامنتها مع سحابة Firebase بنجاح لتظهر فوراً على GitHub Pages.' 
      : ' (تم الحفظ محلياً بنجاح، جاري استكمال الربط السحابي).';

    return {
      success: true,
      message: `تم استيراد واستعادة قاعدة البيانات بنجاح (${mergedFams.length} أسرة، و ${mergedSubs.length} طلب تحديث)${cloudMsg}`,
      familiesCount: mergedFams.length,
      submissionsCount: mergedSubs.length,
      cloudSynced: cloudPushRes.success,
    };
  } catch (err) {
    console.error('Error importing backup:', err);
    return { success: false, message: 'حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.' };
  }
}

/**
 * Manually trigger complete two-way synchronization with Firebase Firestore
 */
export async function forceSyncAllToCloud(): Promise<{ success: boolean; message: string; families: number; submissions: number }> {
  const currentFams = loadFamilies();
  const currentSubs = loadSubmissions();

  const res = await pushAllLocalDataToFirestore(currentFams, currentSubs);
  if (res.success) {
    return {
      success: true,
      message: `تمت المزامنة السحابية بنجاح! تم تأمين ${res.pushedFamilies} أسرة و ${res.pushedSubmissions} طلب في سحابة Firebase، وتظهر الآن على منصة GitHub Pages مباشرة.`,
      families: res.pushedFamilies,
      submissions: res.pushedSubmissions,
    };
  } else {
    return {
      success: false,
      message: `تعذر إتمام المزامنة السحابية: ${res.error || 'يرجى التأكد من اتصال الإنترنت وقواعد Firestore'}.`,
      families: 0,
      submissions: 0,
    };
  }
}


// -------------------------------------------------------------
// Diagnostic & Deep Recovery Tools
// -------------------------------------------------------------

export interface StorageDiagnosticInfo {
  memoryCount: number;
  localStorageCount: number;
  historicalLocalStorageCount: number;
  indexedDbCount: number;
  firestoreCount: number;
}

/**
 * Gets real-time counts across all client and cloud storage tiers
 */
export async function getStorageDiagnosticInfo(): Promise<StorageDiagnosticInfo> {
  let localStorageCount = 0;
  try {
    const raw = localStorage.getItem(FAMILIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localStorageCount = parsed.length;
    }
  } catch {
    // ignore
  }

  const historicalLocalStorageCount = scanAllLocalStorageForFamilies().length;

  let indexedDbCount = 0;
  try {
    const idb = await idbGet<Family[]>('families');
    if (Array.isArray(idb)) indexedDbCount = idb.length;
  } catch {
    // ignore
  }

  let firestoreCount = 0;
  try {
    const fs = await fetchAllFirestoreFamilies();
    firestoreCount = fs.length;
  } catch {
    // ignore
  }

  return {
    memoryCount: memoryFamilies.length,
    localStorageCount,
    historicalLocalStorageCount,
    indexedDbCount,
    firestoreCount,
  };
}

/**
 * Deep scan and unified recovery: Combines families from LocalStorage, IndexedDB,
 * and Firebase Firestore into one complete master list without losing any records.
 */
export async function deepScanAndRecoverAll(): Promise<{
  totalFamilies: number;
  newlyRecovered: number;
  sources: StorageDiagnosticInfo;
  message: string;
}> {
  const currentCount = memoryFamilies.length;

  // 1. Scan LocalStorage across all historic keys
  const localFound = scanAllLocalStorageForFamilies();

  // 2. Scan IndexedDB
  const idbFound = (await idbGet<Family[]>('families')) || [];

  // 3. Fetch from Firestore
  const firestoreFound = await fetchAllFirestoreFamilies();

  // 4. Merge all sources safely
  let combined = mergeFamiliesList(memoryFamilies, localFound);
  combined = mergeFamiliesList(combined, idbFound);
  combined = mergeFamiliesList(combined, firestoreFound);

  const newlyRecovered = Math.max(0, combined.length - currentCount);

  // Save the unified list everywhere
  saveFamilies(combined);

  // Sync any locally missing families to Firestore
  combined.forEach(f => syncFamilyToFirestore(f));

  const diag = await getStorageDiagnosticInfo();

  return {
    totalFamilies: combined.length,
    newlyRecovered,
    sources: diag,
    message: `تم فحص ومزامنة كافة المصادر بنجاح. إجمالي الأسر المتوفرة حالياً: ${combined.length} أسرة (أسر مسترجعة: ${newlyRecovered}).`,
  };
}

/**
 * Bulk add families from a pasted list (text with lines like: "آل جبران | فخذ آل علي" or "آل جبران")
 */
export function bulkAddFamilies(
  rawText: string,
  defaultClan = ''
): { addedCount: number; existingCount: number; totalCount: number } {
  if (!rawText || !rawText.trim()) {
    return { addedCount: 0, existingCount: 0, totalCount: memoryFamilies.length };
  }

  // Split by newlines or commas
  const lines = rawText
    .split(/[\r\n,]+/)
    .map(l => l.trim())
    .filter(Boolean);

  const currentFamilies = [...loadFamilies()];
  const existingNames = new Set(currentFamilies.map(f => normalizeName(f.name)));

  let addedCount = 0;
  let existingCount = 0;

  const toAdd: Family[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Support "اسم الأسرة | الفخذ" or "اسم الأسرة - الفخذ"
    let famName = line;
    let clanName = defaultClan;

    if (line.includes('|')) {
      const parts = line.split('|');
      famName = parts[0].trim();
      clanName = parts[1].trim();
    } else if (line.includes(' - ')) {
      const parts = line.split(' - ');
      famName = parts[0].trim();
      clanName = parts[1].trim();
    }

    const norm = normalizeName(famName);
    if (!norm) continue;

    if (existingNames.has(norm)) {
      existingCount++;
    } else {
      existingNames.add(norm);
      addedCount++;
      const newFam: Family = {
        id: `fam-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name: norm,
        branch: clanName || '',
        treeImageUrl: generateFamilyTreeSvg(norm, clanName || ''),
        membersCount: 100,
        lastUpdated: 'النسخة الخامسة',
      };
      toAdd.push(newFam);
    }
  }

  if (toAdd.length > 0) {
    const updatedList = [...toAdd, ...currentFamilies];
    saveFamilies(updatedList);
  }

  return {
    addedCount,
    existingCount,
    totalCount: loadFamilies().length,
  };
}

