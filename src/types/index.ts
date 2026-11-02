export type LineageStatus = 'new_addition' | 'female_descendants_only' | 'lineage_ended';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Family {
  id: string;
  name: string;
  branch?: string; // الفخذ
  treeImageUrl: string;
  thumbnailUrl?: string;
  membersCount?: number;
  lastUpdated?: string;
}

export interface SubmissionPerson {
  id: string;
  fullName: string;
  lineageStatus: LineageStatus;
  note?: string;
  adminNotes?: string;
  status: RequestStatus;
  reviewedAt?: string;
}

export interface Submission {
  id: string;
  referenceNumber: string;
  familyId: string;
  familyName: string;
  applicantName: string;
  applicantPhone: string;
  persons: SubmissionPerson[];
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  reviewedBy?: string;
}

export interface AppConfig {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
  adminEmail: string;
  isFirebaseActive: boolean;
}

export interface SiteBackupData {
  version: string;
  exportedAt: string;
  app: string;
  families: Family[];
  submissions: Submission[];
}
