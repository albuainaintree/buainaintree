import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Family, Submission, SubmissionPerson, RequestStatus, LineageStatus } from '../types';
import { 
  updateSubmissionStatus, 
  updatePersonInSubmission, 
  upsertFamily, 
  deleteFamily,
  exportSiteBackup,
  importSiteBackup,
  deepScanAndRecoverAll,
  getStorageDiagnosticInfo,
  bulkAddFamilies,
  StorageDiagnosticInfo
} from '../services/storage';
import { exportDatabaseToExcel } from '../services/excelExport';
import { getLineageStatusLabel } from '../services/emailService';
import { generateFamilyTreeSvg } from '../data/mockFamilies';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  ShieldCheck, 
  Lock, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Search, 
  User, 
  Phone, 
  ExternalLink, 
  Upload, 
  AlertCircle,
  Sparkles,
  Download,
  Database,
  FileUp,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Mail,
  Layers,
  ListPlus,
  RotateCw,
  FileText,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

interface AdminDashboardProps {
  submissions: Submission[];
  families: Family[];
  onRefreshData: () => void;
  isAdminLoggedIn: boolean;
  onAdminLogin: (username: string, password: string) => boolean;
  onAdminLogout: () => void;
  adminEmail: string;
  onOpenSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  submissions,
  families,
  onRefreshData,
  isAdminLoggedIn,
  onAdminLogin,
  onAdminLogout,
  adminEmail,
  onOpenSettings,
}) => {
  // Login Form States
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'requests' | 'families'>('requests');

  // Requests Filters
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Family Search in Admin Tab
  const [familySearchQuery, setFamilySearchQuery] = useState('');

  // Editing Person Modal State
  const [editingPerson, setEditingPerson] = useState<{
    submissionId: string;
    person: SubmissionPerson;
  } | null>(null);

  // Edit/Add Family Modal State
  const [familyModal, setFamilyModal] = useState<{
    isOpen: boolean;
    family: Partial<Family> | null;
  }>({ isOpen: false, family: null });

  // Bulk Add Families Modal State
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkDefaultClan, setBulkDefaultClan] = useState('');

  // Deep Recovery & Storage Diagnostics States
  const [isRecovering, setIsRecovering] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<StorageDiagnosticInfo | null>(null);

  // Excel & Backup States
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Load diagnostic info when viewing families tab
  useEffect(() => {
    if (activeTab === 'families') {
      getStorageDiagnosticInfo().then(setDiagnosticInfo);
    }
  }, [activeTab, families.length]);


  // Metrics
  const stats = useMemo(() => {
    const totalRequests = submissions.length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;

    let totalPersons = 0;
    let approvedPersons = 0;
    submissions.forEach(s => {
      totalPersons += s.persons.length;
      approvedPersons += s.persons.filter(p => p.status === 'approved').length;
    });

    return { totalRequests, pending, approved, rejected, totalPersons, approvedPersons };
  }, [submissions]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchFamily = familyFilter === 'all' || sub.familyId === familyFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        sub.applicantName.toLowerCase().includes(q) ||
        sub.applicantPhone.includes(q) ||
        sub.referenceNumber.toLowerCase().includes(q) ||
        sub.familyName.toLowerCase().includes(q) ||
        sub.persons.some(p => p.fullName.toLowerCase().includes(q));

      return matchStatus && matchFamily && matchSearch;
    });
  }, [submissions, statusFilter, familyFilter, searchQuery]);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const success = onAdminLogin(usernameInput.trim(), passwordInput);
    if (!success) {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  // Handle Submissions Actions
  const handleApproveSubmission = (id: string) => {
    updateSubmissionStatus(id, 'approved', adminEmail);
    onRefreshData();
  };

  const handleRejectSubmission = (id: string) => {
    if (confirm('هل أنت متأكد من رفض هذا الطلب بالكامل؟')) {
      updateSubmissionStatus(id, 'rejected', adminEmail);
      onRefreshData();
    }
  };

  // Person Status Action
  const handleUpdatePersonStatus = (subId: string, personId: string, newStatus: RequestStatus) => {
    updatePersonInSubmission(subId, personId, { status: newStatus });
    onRefreshData();
  };

  // Save Edited Person
  const handleSaveEditedPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;

    updatePersonInSubmission(
      editingPerson.submissionId,
      editingPerson.person.id,
      {
        fullName: editingPerson.person.fullName,
        lineageStatus: editingPerson.person.lineageStatus,
        note: editingPerson.person.note,
        adminNotes: editingPerson.person.adminNotes,
        status: editingPerson.person.status,
      }
    );

    setEditingPerson(null);
    onRefreshData();
  };

  // Save Family (Add/Edit)
  const handleSaveFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyModal.family || !familyModal.family.name) return;

    let treeUrl = familyModal.family.treeImageUrl;
    if (!treeUrl || treeUrl.trim() === '') {
      treeUrl = generateFamilyTreeSvg(familyModal.family.name, familyModal.family.branch || '');
    }

    upsertFamily({
      id: familyModal.family.id,
      name: familyModal.family.name,
      branch: familyModal.family.branch || '', // الفخذ
      treeImageUrl: treeUrl,
      membersCount: familyModal.family.membersCount || 100,
    });

    setFamilyModal({ isOpen: false, family: null });
    onRefreshData();
  };

  // Delete Family
  const handleDeleteFamily = (famId: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف أسرة (${name}) نهائياً من قاعدة البيانات؟`)) {
      deleteFamily(famId);
      onRefreshData();
    }
  };

  // Export Excel
  const handleExportExcel = (onlyApproved: boolean = false) => {
    setIsExporting(true);
    setStatusNotice(null);
    setTimeout(() => {
      const res = exportDatabaseToExcel(submissions, onlyApproved);
      setIsExporting(false);
      setStatusNotice({ type: res.success ? 'success' : 'error', message: res.message });
      setTimeout(() => setStatusNotice(null), 5000);
    }, 200);
  };

  // Export Complete Site Backup (JSON)
  const handleExportFullBackup = () => {
    const res = exportSiteBackup();
    setStatusNotice({
      type: 'success',
      message: `تم تنزيل النسخة الاحتياطية الكاملة (${res.filename}). يمكنك استخدامها لاستعادة كافة الأسر والمشجرات والمدخلات في أي وقت.`,
    });
    setTimeout(() => setStatusNotice(null), 7000);
  };

  // Import Site Backup (JSON)
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (confirm('تنبيه: سيؤدي استيراد النسخة الاحتياطية إلى استرجاع الأسر والمشجرات والطلبات من الملف. هل ترغب بالمتابعة؟')) {
          const res = importSiteBackup(content);
          if (res.success) {
            onRefreshData();
            setStatusNotice({ type: 'success', message: res.message });
          } else {
            setStatusNotice({ type: 'error', message: res.message });
          }
          setTimeout(() => setStatusNotice(null), 7000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Deep Scan and Recover All Families across LocalStorage, IndexedDB & Firebase
  const handleDeepScanAndRecover = async () => {
    setIsRecovering(true);
    setStatusNotice(null);
    try {
      const result = await deepScanAndRecoverAll();
      onRefreshData();
      setDiagnosticInfo(result.sources);
      setStatusNotice({
        type: 'success',
        message: `${result.message} تم تأمين وحفظ البيانات في التخزين فائق السعة والسحابة بنجاح.`,
      });
    } catch (err) {
      console.error('Error during deep recovery:', err);
      setStatusNotice({
        type: 'error',
        message: 'تعذر إتمام الفحص الشامل، يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsRecovering(false);
      setTimeout(() => setStatusNotice(null), 9000);
    }
  };

  // Bulk Add Families
  const handleExecuteBulkAdd = () => {
    if (!bulkAddText.trim()) return;
    const res = bulkAddFamilies(bulkAddText, bulkDefaultClan);
    onRefreshData();
    setShowBulkAddModal(false);
    setBulkAddText('');
    setStatusNotice({
      type: 'success',
      message: `تمت معالجة القائمة: تم إضافة ${res.addedCount} أسرة جديدة وتوليد مشجراتها، وتخطي ${res.existingCount} أسرة مسجلة مسبقاً. إجمالي الأسر الآن: ${res.totalCount}.`,
    });
    setTimeout(() => setStatusNotice(null), 9000);
  };

  // Filtered families in Admin Tab
  const filteredAdminFamilies = useMemo(() => {
    if (!familySearchQuery.trim()) return families;
    const q = familySearchQuery.toLowerCase().trim();
    return families.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.branch && f.branch.toLowerCase().includes(q))
    );
  }, [families, familySearchQuery]);


  // Upload Tree Image (Compressed & Optimized for High Capacity)
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingImage(true);
        const optimizedDataUrl = await compressImageFile(file, 2600, 0.86);
        setFamilyModal(prev => ({
          ...prev,
          family: {
            ...prev.family,
            treeImageUrl: optimizedDataUrl,
          },
        }));
      } catch (err) {
        console.error('Error processing image:', err);
        alert('تعذر معالجة الصورة، يرجى اختيار ملف صورة صالح.');
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  // -------------------------------------------------------------
  // If Not Authenticated: Render Secure Login Screen
  // -------------------------------------------------------------
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-[#09101F]/90 border border-[#C5A059]/40 backdrop-blur-2xl shadow-2xl space-y-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F3D3E] to-[#122238] border border-[#C5A059] flex items-center justify-center mx-auto text-[#E5C384] shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">تسجيل الدخول للوحة التحكم</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            يرجى إدخال بيانات الاعتماد المخصصة لإدارة المشروع
          </p>
        </div>

        {loginError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
            <p className="leading-relaxed font-medium">{loginError}</p>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="glass-input w-full rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 dark:text-white"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="glass-input w-full rounded-xl pr-10 pl-10 py-3 text-sm text-slate-900 dark:text-white font-mono"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-sm font-bold shadow-lg shadow-[#C5A059]/30 hover:brightness-110 active:scale-95 transition mt-2 cursor-pointer"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 pb-16">
      
      {/* Dashboard Top Header & Metrics */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0B1527] via-[#0F3D3E]/60 to-[#0B1527] border border-[#C5A059]/40 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/50 text-xs font-bold text-[#E5C384]">
                <ShieldCheck className="w-3.5 h-3.5" />
                لوحة تحكم الإدارة المعتمدة
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black gold-gradient-text">
              لوحة إدارة مشروع شجرة آل بوعينين
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              تدقيق ومراجعة الطلبات، تعديل واعتماد الأسماء، وإدارة الأسر والمشجرات، والنسخ الاحتياطي الكامل.
            </p>
          </div>

          {/* Quick Actions (Major Excel Export + Full Backup/Restore) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Excel Export */}
            <button
              type="button"
              onClick={() => handleExportExcel(false)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-bold shadow-xl transition active:scale-95"
              title="تصدير ملف Excel بتبويب لكل أسرة"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            {/* Full Site Backup Export */}
            <button
              type="button"
              onClick={handleExportFullBackup}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F3D3E] hover:bg-[#155253] text-[#E5C384] border border-[#C5A059]/40 text-xs sm:text-sm font-bold shadow transition active:scale-95"
              title="تصدير نسخة احتياطية كاملة للموقع (JSON) تشمل كافة المشجرات والمدخلات"
            >
              <Database className="w-4 h-4 text-[#C5A059]" />
              <span>تصدير نسخة احتياطية للموقع</span>
            </button>

            {/* Full Site Backup Import (Restore) */}
            <button
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs sm:text-sm font-semibold transition"
              title="استيراد نسخة احتياطية كاملة واسترجاع كافة الأسر والمشجرات والمدخلات"
            >
              <FileUp className="w-4 h-4 text-sky-400" />
              <span>استيراد نسخة احتياطية</span>
            </button>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackupFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/70 text-purple-200 border border-purple-400/40 text-xs sm:text-sm font-semibold transition active:scale-95"
              title="إعدادات الربط السحابي والإشعارات البريدية"
            >
              <Mail className="w-4 h-4 text-purple-300" />
              <span>إعدادات الإيميل والسحاب</span>
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusNotice && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
              statusNotice.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            {statusNotice.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusNotice.message}</span>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="rounded-2xl p-4 bg-[#070D1A]/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-1">إجمالي طلبات التحديث</span>
            <span className="text-2xl font-black text-white">{stats.totalRequests}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">({stats.totalPersons} اسم فردي)</span>
          </div>

          <div className="rounded-2xl p-4 bg-[#070D1A]/80 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 block mb-1">طلبات قيد المراجعة</span>
            <span className="text-2xl font-black text-amber-400">{stats.pending}</span>
            <span className="text-[10px] text-amber-500/80 block mt-0.5">بحاجة للتدقيق</span>
          </div>

          <div className="rounded-2xl p-4 bg-[#070D1A]/80 border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 block mb-1">طلبات تمت الموافقة عليها</span>
            <span className="text-2xl font-black text-emerald-400">{stats.approved}</span>
            <span className="text-[10px] text-emerald-500/80 block mt-0.5">({stats.approvedPersons} اسم معتمد)</span>
          </div>

          <div className="rounded-2xl p-4 bg-[#070D1A]/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-1">الأسر المسجلة حالياً</span>
            <span className="text-2xl font-black text-[#E5C384]">{families.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">مشجرة عائلية</span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'requests'
                ? 'bg-[#C5A059] text-[#0A0F1D] shadow-lg shadow-[#C5A059]/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            إدارة الطلبات الواردة ({submissions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('families')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'families'
                ? 'bg-[#C5A059] text-[#0A0F1D] shadow-lg shadow-[#C5A059]/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            إدارة الأسر والمشجرات ({families.length})
          </button>
        </div>

        {activeTab === 'families' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeepScanAndRecover}
              disabled={isRecovering}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-400/40 text-xs font-bold text-sky-200 transition active:scale-95 shadow"
              title="فحص شامل ومزامنة كافة الأسر من السحابة والتخزين فائق السعة"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin text-sky-300' : 'text-sky-400'}`} />
              <span>{isRecovering ? 'جاري الفحص والمزامنة...' : 'فحص ومزامنة الأسر'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBulkAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D3E] hover:bg-[#165556] border border-[#C5A059]/40 text-xs font-bold text-[#E5C384] transition active:scale-95 shadow"
              title="إضافة أو استكمال عدة أسر دفعة واحدة من قائمة أسماء"
            >
              <ListPlus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>إضافة جماعية (لصق قائمة)</span>
            </button>

            <button
              type="button"
              onClick={() => setFamilyModal({ isOpen: true, family: { name: '', branch: '' } })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-black hover:brightness-110 shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أسرة</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REQUESTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#09101F]/80 border border-white/10">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث بمقدم الطلب، رقم الجوال، أو الاسم..."
                className="glass-input w-full rounded-xl pr-9 pl-3 py-2.5 text-xs text-white placeholder-slate-400"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === st
                      ? 'bg-white/20 text-white border border-[#C5A059]'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {st === 'all' && 'كافة الحالات'}
                  {st === 'pending' && 'قيد المراجعة ⏳'}
                  {st === 'approved' && 'تمت الموافقة ✅'}
                  {st === 'rejected' && 'مرفوض ❌'}
                </button>
              ))}
            </div>

            {/* Family Filter */}
            <div>
              <select
                value={familyFilter}
                onChange={e => setFamilyFilter(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 bg-[#0F1A30] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C5A059]"
              >
                <option value="all">كافة الأسر ({families.length})</option>
                {families.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-white/5 border border-white/10">
              <p className="text-slate-300 font-semibold mb-1">لا توجد طلبات واردة حالياً</p>
              <p className="text-xs text-slate-400">ستظهر الطلبات الجديدة هنا فور تقديمها عبر النموذج العام من قِبل أبناء القبيلة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map(sub => (
                <div
                  key={sub.id}
                  className="rounded-2xl p-5 sm:p-6 bg-[#09101F]/80 border border-white/15 space-y-4 hover:border-[#C5A059]/40 transition"
                >
                  {/* Request Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-[#0F3D3E] border border-[#C5A059]/40 text-xs font-bold text-[#E5C384]">
                          مشجرة {sub.familyName}
                        </span>
                        <span className="font-mono text-xs text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-lg">
                          {sub.referenceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.createdAt).toLocaleString('ar-SA')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-200 pt-1 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#C5A059]" />
                          <strong>مقدم الطلب:</strong> {sub.applicantName}
                        </span>
                        <a
                          href={`https://wa.me/${sub.applicantPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono"
                          dir="ltr"
                          title="مراسلة عبر الواتساب"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{sub.applicantPhone}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Overall Request Status & Bulk Action */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold ${
                          sub.status === 'approved'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                            : sub.status === 'rejected'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {sub.status === 'approved' && 'تمت الموافقة ✅'}
                        {sub.status === 'rejected' && 'مرفوض ❌'}
                        {sub.status === 'pending' && 'قيد المراجعة ⏳'}
                      </span>

                      {sub.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveSubmission(sub.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                          title="اعتماد كافة أسماء الطلب"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد الكل</span>
                        </button>
                      )}

                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleRejectSubmission(sub.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold"
                          title="رفض الطلب بالكامل"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Persons Table inside this Request */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#E5C384] block">
                      الأسماء المرفقة في هذا الطلب ({sub.persons.length}):
                    </span>

                    <div className="space-y-2">
                      {sub.persons.map((person, idx) => (
                        <div
                          key={person.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/15"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-white">{person.fullName}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#0F3D3E] text-[#E5C384]">
                                {getLineageStatusLabel(person.lineageStatus)}
                              </span>
                            </div>

                            {person.note && (
                              <p className="text-xs text-slate-400 mr-7">
                                <strong className="text-slate-300">ملاحظة مقدم الطلب:</strong> {person.note}
                              </p>
                            )}

                            {person.adminNotes && (
                              <p className="text-xs text-amber-300 mr-7">
                                <strong>ملاحظة الإدارة:</strong> {person.adminNotes}
                              </p>
                            )}
                          </div>

                          {/* Individual Person Actions (Approve, Edit, Reject) */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                person.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : person.status === 'rejected'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {person.status === 'approved' ? 'معتمد' : person.status === 'rejected' ? 'مرفوض' : 'معلق'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setEditingPerson({ submissionId: sub.id, person: { ...person } })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 transition"
                              title="تعديل الاسم أو الملاحظات"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#C5A059]" />
                            </button>

                            {person.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePersonStatus(sub.id, person.id, 'approved')}
                                className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                                title="موافقة واعتماد هذا الاسم"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {person.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePersonStatus(sub.id, person.id, 'rejected')}
                                className="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                                title="رفض هذا الاسم"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FAMILIES & TREES MANAGEMENT (CRUD) */}
      {/* ========================================================================= */}
      {activeTab === 'families' && (
        <div className="space-y-6">

          {/* Storage & Cloud Sync Diagnostic Status Card */}
          <div className="rounded-2xl p-5 bg-[#09101F]/90 border border-[#C5A059]/30 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-sm font-bold text-white">حالة تخزين ومزامنة المشجرات عبر السحابة والذاكرة</h3>
              </div>
              <button
                type="button"
                onClick={handleDeepScanAndRecover}
                disabled={isRecovering}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-400/50 text-xs font-bold text-sky-200 transition active:scale-95 shadow cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin text-sky-300' : 'text-sky-400'}`} />
                <span>{isRecovering ? 'جاري الفحص واسترجاع الأسر...' : 'استرجاع ومزامنة كافة الأسر من كافة المصادر'}</span>
              </button>
            </div>

            {/* Diagnostic Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block mb-0.5">المنصة والذاكرة الحالية</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#E5C384]">{families.length}</span>
                  <span className="text-[10px] text-slate-500">أسرة ظاهرة</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block mb-0.5">تخزين فائق السعة (IndexedDB)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-400">{diagnosticInfo?.indexedDbCount ?? families.length}</span>
                  <span className="text-[10px] text-emerald-500/80">مشجرة مؤمنة</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block mb-0.5">المحلي والنسخ السابقة</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-sky-400">{diagnosticInfo?.historicalLocalStorageCount ?? families.length}</span>
                  <span className="text-[10px] text-sky-500/80">سجل مفحوص</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block mb-0.5">سحابة Firebase Firestore</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-purple-400">{diagnosticInfo?.firestoreCount ?? 'متصل'}</span>
                  <span className="text-[10px] text-purple-400/80">سجل سحابي</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/10 pt-3">
              💡 <strong className="text-slate-300">ملاحظة أمان البيانات:</strong> تم إلغاء قيود المتصفح (5MB)، وأصبح النظام يستخدم التخزين فائق السعة (IndexedDB) بالتكامل المباشر مع سحابة Firebase، مما يضمن حفظ واستعراض مئات الأسر ومشاركتها دون أي نقص أو حد لعدد المشجرات.
            </p>
          </div>

          {/* Families Search Bar in Admin */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={familySearchQuery}
                onChange={e => setFamilySearchQuery(e.target.value)}
                placeholder="ابحث بين الأسر بالاسم أو الفخذ..."
                className="glass-input w-full rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder-slate-400"
              />
              {familySearchQuery && (
                <button
                  type="button"
                  onClick={() => setFamilySearchQuery('')}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  مسح
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400">
              عرض <strong className="text-white">{filteredAdminFamilies.length}</strong> من أصل <strong className="text-[#E5C384]">{families.length}</strong> أسرة مسجلة
            </div>
          </div>

          {families.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl bg-[#09101F]/80 border border-white/10 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0F3D3E] border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#E5C384]">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">لا توجد أسر مسجلة حالياً</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                يمكنك الضغط على زر استرجاع الأسر لمزامنة كافة الأسر، أو إضافة الأسر بشكل فردي أو جماعي.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFamilyModal({ isOpen: true, family: { name: '', branch: '' } })}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold shadow-lg"
                >
                  + تسجيل أسرة جديدة
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#0F3D3E] text-[#E5C384] text-xs font-bold border border-[#C5A059]/40"
                >
                  لصق قائمة جماعية
                </button>
              </div>
            </div>
          ) : filteredAdminFamilies.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-slate-300 text-sm font-semibold">لم يتم العثور على أسر مطابقة لبحثك</p>
              <button
                type="button"
                onClick={() => setFamilySearchQuery('')}
                className="mt-2 text-xs text-[#C5A059] hover:underline"
              >
                مسح البحث وعرض كافة الأسر ({families.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAdminFamilies.map(fam => (
                <div
                  key={fam.id}
                  className="rounded-2xl p-5 bg-[#09101F]/80 border border-white/15 space-y-4 hover:border-[#C5A059]/40 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">{fam.name}</h3>
                        {fam.branch && (
                          <p className="text-xs text-[#C5A059]">الفخذ: {fam.branch}</p>
                        )}
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#0F3D3E] text-[#E5C384] border border-[#C5A059]/30 font-bold">
                        النسخة الخامسة
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="h-32 w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 relative">
                      <img
                        src={fam.treeImageUrl}
                        alt={fam.name}
                        className="w-full h-full object-cover object-top opacity-80"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setFamilyModal({ isOpen: true, family: { ...fam } })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>تعديل الأسرة والمشجرة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFamily(fam.id, fam.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition"
                      title="حذف الأسرة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PERSON IN SUBMISSION */}
      {/* ========================================================================= */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-[#0E1A30] border border-[#C5A059]/50 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#C5A059]" />
                <span>تعديل بيانات الاسم قبل الاعتماد</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPerson} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">الاسم الرباعي المصحح:</label>
                <input
                  type="text"
                  required
                  value={editingPerson.person.fullName}
                  onChange={e =>
                    setEditingPerson({
                      ...editingPerson,
                      person: { ...editingPerson.person, fullName: e.target.value },
                    })
                  }
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">حالة العقب:</label>
                <select
                  value={editingPerson.person.lineageStatus}
                  onChange={e =>
                    setEditingPerson({
                      ...editingPerson,
                      person: { ...editingPerson.person, lineageStatus: e.target.value as LineageStatus },
                    })
                  }
                  className="w-full rounded-xl px-3 py-2 bg-[#091020] border border-white/10 text-xs text-white"
                >
                  <option value="new_addition">إضافة جديدة (استمرت ذريته أو مواليد جدد)</option>
                  <option value="female_descendants_only">انتهى عقبه بذرية إناث</option>
                  <option value="lineage_ended">انتهى عقبه (توفي أو لم يعقب)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">حالة الاعتماد:</label>
                <select
                  value={editingPerson.person.status}
                  onChange={e =>
                    setEditingPerson({
                      ...editingPerson,
                      person: { ...editingPerson.person, status: e.target.value as RequestStatus },
                    })
                  }
                  className="w-full rounded-xl px-3 py-2 bg-[#091020] border border-white/10 text-xs text-white"
                >
                  <option value="approved">تمت الموافقة والاعتماد للطبعة 6 ✅</option>
                  <option value="pending">قيد المراجعة ⏳</option>
                  <option value="rejected">مرفوض ❌</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">ملاحظات الإدارة والتدقيق:</label>
                <textarea
                  rows={2}
                  value={editingPerson.person.adminNotes || ''}
                  onChange={e =>
                    setEditingPerson({
                      ...editingPerson,
                      person: { ...editingPerson.person, adminNotes: e.target.value },
                    })
                  }
                  placeholder="اكتب ملاحظة توثيقية حول سبب التعديل أو التوثيق..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C5A059] text-[#0A0F1D] text-xs font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT FAMILY & TREE */}
      {/* ========================================================================= */}
      {familyModal.isOpen && familyModal.family && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-[#0E1A30] border border-[#C5A059]/50 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>{familyModal.family.id ? 'تعديل بيانات الأسرة والمشجرة' : 'إضافة أسرة جديدة للمشجرة'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setFamilyModal({ isOpen: false, family: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFamily} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">اسم الأسرة *</label>
                <input
                  type="text"
                  required
                  value={familyModal.family.name || ''}
                  onChange={e =>
                    setFamilyModal(prev => ({
                      ...prev,
                      family: { ...prev.family, name: e.target.value },
                    }))
                  }
                  placeholder="مثال: آل جبران، آل خاطر..."
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              {/* Replaced 'الفرع والمنطقة' with 'الفخذ' */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">الفخذ</label>
                <input
                  type="text"
                  value={familyModal.family.branch || ''}
                  onChange={e =>
                    setFamilyModal(prev => ({
                      ...prev,
                      family: { ...prev.family, branch: e.target.value },
                    }))
                  }
                  placeholder="اكتب اسم الفخذ"
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              {/* 'نبذة تعريفية' was removed as requested */}

              {/* Tree Image Upload / Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  صورة المشجرة (رفع ملف من جهازك أو إدخال رابط):
                </label>

                <div className="flex items-center gap-2">
                  <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition ${
                    isProcessingImage 
                      ? 'bg-[#0F3D3E] border-[#C5A059] text-[#E5C384]' 
                      : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                  }`}>
                    {isProcessingImage ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#E5C384] border-t-transparent rounded-full animate-spin" />
                        <span>جاري ضغط ومعالجة الصورة بدقة عالية...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#C5A059]" />
                        <span>رفع صورة المشجرة من جهازك</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isProcessingImage}
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={familyModal.family.treeImageUrl || ''}
                  onChange={e =>
                    setFamilyModal(prev => ({
                      ...prev,
                      family: { ...prev.family, treeImageUrl: e.target.value },
                    }))
                  }
                  placeholder="أو ضع رابط صورة المشجرة URL (اختياري)"
                  className="glass-input w-full rounded-xl px-3.5 py-2 text-xs text-white text-left font-mono"
                  dir="ltr"
                />

                {familyModal.family.treeImageUrl && (
                  <div className="h-32 w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 relative">
                    <img
                      src={familyModal.family.treeImageUrl}
                      alt="معاينة"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-2 text-[10px] text-emerald-400 bg-black/70 px-2 py-0.5 rounded">
                      معاينة الصورة المرفوعة
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setFamilyModal({ isOpen: false, family: null })}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C5A059] text-[#0A0F1D] text-xs font-bold"
                >
                  حفظ بيانات الأسرة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BULK ADD FAMILIES (PASTE LIST) */}
      {/* ========================================================================= */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-xl rounded-3xl p-6 bg-[#0E1A30] border border-[#C5A059]/50 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-base font-bold text-white">إضافة جماعية سريعة للأسر (لصق قائمة)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              إذا كانت لديك قائمة بالأسر الـ 64 أو الأسر المتبقية، يمكنك لصق أسمائها هنا مباشرة. سيقوم النظام بتسجيلها وتوليد مشجراتها الرسمية وتأمينها في التخزين فائق السعة والسحابة دون تكرار الأسر الموجودة مسبقاً.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">
                  قائمة الأسر (اكتب أو الصق كل اسم في سطر، ويمكنك كتابة الفخذ بعد علامة |):
                </label>
                <textarea
                  rows={8}
                  value={bulkAddText}
                  onChange={e => setBulkAddText(e.target.value)}
                  placeholder={`مثال:\nآل جبران | فخذ آل علي\nآل خاطر\nآل عيسى\nآل راشد`}
                  className="glass-input w-full rounded-xl p-3 text-xs text-white font-mono leading-relaxed placeholder-slate-500"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-200">
                  الفخذ الافتراضي (اختياري - يطبق على الأسر التي لم يُحدد لها فخذ):
                </label>
                <input
                  type="text"
                  value={bulkDefaultClan}
                  onChange={e => setBulkDefaultClan(e.target.value)}
                  placeholder="مثال: آل علي، آل حسن..."
                  className="glass-input w-full rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>النظام سيتخطى تلقائياً أي أسرة مضافة مسبقاً لمنع التكرار، وسيضيف الأسر الجديدة فقط.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowBulkAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAdd}
                disabled={!bulkAddText.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold hover:brightness-110 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                إضافة وتوليد المشجرات فوراً
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
