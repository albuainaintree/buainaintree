import { Family, Submission, SubmissionPerson, RequestStatus, SiteBackupData } from '../types';
import { INITIAL_FAMILIES, INITIAL_SUBMISSIONS } from '../data/mockFamilies';

// Updated storage keys for clean slate start (v7)
const FAMILIES_KEY = 'albuainain_tree_families_v7';
const SUBMISSIONS_KEY = 'albuainain_tree_submissions_v7';

// -------------------------------------------------------------
// Database Operations (Local + Firebase Ready Bridge)
// -------------------------------------------------------------

export function loadFamilies(): Family[] {
  try {
    const raw = localStorage.getItem(FAMILIES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading families from localStorage:', e);
  }
  // Initialize with empty array as requested
  localStorage.setItem(FAMILIES_KEY, JSON.stringify(INITIAL_FAMILIES));
  return INITIAL_FAMILIES;
}

export function saveFamilies(families: Family[]): void {
  try {
    localStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
    window.dispatchEvent(new Event('albuainain_families_updated'));
  } catch (e) {
    console.error('Error saving families:', e);
  }
}

export function loadSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading submissions from localStorage:', e);
  }
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
  return INITIAL_SUBMISSIONS;
}

export function saveSubmissions(submissions: Submission[]): void {
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    window.dispatchEvent(new Event('albuainain_submissions_updated'));
  } catch (e) {
    console.error('Error saving submissions:', e);
  }
}

/**
 * Add a new user update submission
 */
export function addSubmission(submissionData: Omit<Submission, 'id' | 'referenceNumber' | 'status' | 'createdAt'>): Submission {
  const submissions = loadSubmissions();
  
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
  const submissions = loadSubmissions();
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
  const submissions = loadSubmissions();
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
 * Replaced "الفرع والمنطقة" with "الفخذ", and removed "نبذة تعريفية" as requested.
 */
export function upsertFamily(familyData: { id?: string; name: string; branch?: string; treeImageUrl?: string; membersCount?: number }): Family {
  const families = loadFamilies();
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
    saveFamilies(filtered);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Backup & Restore System (تصدير واستيراد البيانات الكاملة للموقع)
// -------------------------------------------------------------

/**
 * Exports full website database (families, tree images, submissions, inputs)
 * as a downloadable JSON backup file.
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
