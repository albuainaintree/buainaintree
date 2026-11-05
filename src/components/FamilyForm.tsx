import React, { useState } from 'react';
import { Family, LineageStatus, Submission } from '../types';
import { TreeViewer } from './TreeViewer';
import { addSubmission } from '../services/storage';
import { sendSubmissionEmailNotification } from '../services/emailService';
import { 
  User, 
  Phone, 
  Mail,
  Plus, 
  Trash2, 
  AlertTriangle, 
  Send, 
  ChevronRight, 
  CheckCircle, 
  Baby, 
  Users, 
  UserMinus,
  Sparkles,
  Info
} from 'lucide-react';

interface FamilyFormProps {
  family: Family;
  onBack: () => void;
  onSuccess: (submission: Submission) => void;
  allFamilies: Family[];
  onSelectFamily: (fam: Family) => void;
}

interface FormPerson {
  tempId: string;
  fullName: string;
  lineageStatus: LineageStatus;
  note: string;
}

export const FamilyForm: React.FC<FamilyFormProps> = ({
  family,
  onBack,
  onSuccess,
  allFamilies,
  onSelectFamily,
}) => {
  // Section 1: Applicant info (Mandatory Name & Phone, Optional Email for Confirmation)
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');

  // Section 2: Dynamic Repeater for Persons
  const [persons, setPersons] = useState<FormPerson[]>([
    {
      tempId: `tmp-${Date.now()}-0`,
      fullName: '',
      lineageStatus: 'new_addition',
      note: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add person row
  const handleAddPerson = () => {
    setPersons(prev => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${prev.length}`,
        fullName: '',
        lineageStatus: 'new_addition',
        note: '',
      },
    ]);
  };

  // Remove person row
  const handleRemovePerson = (tempId: string) => {
    if (persons.length <= 1) return;
    setPersons(prev => prev.filter(p => p.tempId !== tempId));
  };

  // Update person row
  const handleUpdatePerson = (tempId: string, field: keyof FormPerson, value: string) => {
    setPersons(prev =>
      prev.map(p => (p.tempId === tempId ? { ...p, [field]: value } : p))
    );
  };

  // Validate Saudi/GCC phone number format (min 8 digits, only numbers and +)
  const isValidPhone = (phone: string) => {
    const clean = phone.replace(/[\s-]/g, '');
    return /^(\+?\d{8,15})$/.test(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Mandatory Validation for Applicant
    if (!applicantName.trim()) {
      setErrorMessage('يرجى إدخال اسم مقدم الطلب كاملاً للمتابعة.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    if (!applicantPhone.trim() || !isValidPhone(applicantPhone)) {
      setErrorMessage('يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx) للتواصل معك والتحقق.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    // 2. Validate Persons
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p.fullName.trim()) {
        setErrorMessage(`يرجى كتابة الاسم الرباعي للشخص رقم (${i + 1}).`);
        return;
      }
      // Check for at least 3 name words (to ensure quadruple name verification)
      const nameParts = p.fullName.trim().split(/\s+/);
      if (nameParts.length < 3) {
        setErrorMessage(
          `الاسم رقم (${i + 1}): "${p.fullName}" غير مكتمل. يجب كتابة الاسم الرباعي (الاسم، واسم الأب، والجد الأول، والجد الثاني) لربطه بدقة في المشجرة.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Save to database
      const savedSubmission = addSubmission({
        familyId: family.id,
        familyName: family.name,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim(),
        applicantEmail: applicantEmail.trim() || undefined,
        persons: persons.map(p => ({
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fullName: p.fullName.trim(),
          lineageStatus: p.lineageStatus,
          note: p.note.trim(),
          status: 'pending',
        })),
      });

      // Send Email Notification to Admin AND Confirmation to User via EmailJS
      await sendSubmissionEmailNotification(savedSubmission);

      // Trigger Celebration / Success Modal
      onSuccess(savedSubmission);
    } catch (err) {
      console.error('Error submitting form:', err);
      setErrorMessage('حدث خطأ أثناء حفظ الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-20 px-1 sm:px-0">
      
      {/* Top Breadcrumb & Switch Family */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#825C17] dark:text-[#E5C384] hover:underline transition"
        >
          <ChevronRight className="w-4 h-4" />
          <span>العودة لكافة الأسر</span>
        </button>

        {/* Quick Family Switcher */}
        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="hidden sm:inline">تغيير الأسرة:</span>
          <select
            value={family.id}
            onChange={e => {
              const found = allFamilies.find(f => f.id === e.target.value);
              if (found) onSelectFamily(found);
            }}
            className="rounded-xl px-3 py-1.5 bg-white dark:bg-[#0F1A30] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#C5A059]"
          >
            {allFamilies.map((f, idx) => (
              <option key={`${f.id}-${idx}`} value={f.id}>
                {f.name} {f.branch ? `(الفخذ: ${f.branch})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Header for Chosen Family (Royal Emerald Card) */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-[#0F3D3E] via-[#164E4F] to-[#0A2627] text-white border border-[#C5A059]/40 shadow-xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#E5C384] tracking-wider uppercase">
              نموذج تحديث المشجرة المعتمد
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              مشجرة {family.name}
            </h2>
            {family.branch && (
              <p className="text-xs sm:text-sm text-slate-200">
                الفخذ: <strong className="text-[#E5C384] font-bold">{family.branch}</strong>
              </p>
            )}
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/35 border border-[#C5A059]/40 text-center sm:text-left self-start sm:self-center">
            <span className="text-[10px] text-slate-300 block">المشجرة المرفقة أدناه</span>
            <span className="text-xs font-bold text-[#E5C384]">النسخة الخامسة (المرجع للتحديث)</span>
          </div>
        </div>
      </div>

      {/* Part 0: Compact Smart Tree Preview (Non-blocking on mobile) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <span>معاينة صورة المشجرة (النسخة الخامسة المعتمدة للتحديث):</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">انقر لتكبيرها وفحص الأسماء</span>
        </div>

        {/* TreeViewer in responsive compact mode */}
        <TreeViewer imageUrl={family.treeImageUrl} familyName={family.name} isInline={true} />
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 backdrop-blur-xl animate-shake shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-xs sm:text-sm">تنبيه في البيانات المدخلة:</span>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Applicant Information (Mandatory Name & Phone, Optional Email) */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="border-b border-slate-200 dark:border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#0F3D3E] border border-[#C5A059]/40 flex items-center justify-center text-[#E5C384] font-bold text-xs sm:text-sm shrink-0">
                1
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                بيانات مقدم الطلب <span className="text-rose-500 text-xs sm:text-sm font-medium">(إلزامية)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mr-9 sm:mr-10">
              بياناتك وسيلة الاتصال المعتمدة لتدقيق صحة صلة القرابة ومطابقة الأسماء في المشجرة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Applicant Name */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                اسم مقدم الطلب <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  className="glass-input w-full rounded-xl pr-10 pl-3 py-3 text-sm placeholder-slate-400"
                />
              </div>
            </div>

            {/* Applicant Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                رقم الجوال للتواصل والتحقق <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={applicantPhone}
                  onChange={e => setApplicantPhone(e.target.value)}
                  placeholder="05xxxxxxxx أو +966..."
                  className="glass-input w-full rounded-xl pr-10 pl-3 py-3 text-sm placeholder-slate-400 text-right"
                />
              </div>
            </div>

            {/* Applicant Email (Optional for EmailJS Confirmation) */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                البريد الإلكتروني <span className="text-slate-500 text-[11px] font-normal">(اختياري - لاستلام تأكيد)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  dir="ltr"
                  value={applicantEmail}
                  onChange={e => setApplicantEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="glass-input w-full rounded-xl pr-10 pl-3 py-3 text-sm placeholder-slate-400 text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Dynamic Repeater for Persons */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="border-b border-slate-200 dark:border-white/10 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#C5A059] text-[#0A0F1D] font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  الأسماء المراد إضافتها أو تحديثها في المشجرة
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mr-9 sm:mr-10">
                يمكنك إضافة اسم واحد أو أكثر في نفس الطلب عبر زر الإضافة أدناه.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddPerson}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D3E] to-[#1A5F60] border border-[#C5A059]/40 text-xs sm:text-sm font-bold text-[#E5C384] hover:brightness-110 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة اسم آخر للطلب</span>
            </button>
          </div>

          {/* Persons List (Stacked Responsive Cards) */}
          <div className="space-y-5">
            {persons.map((person, index) => (
              <div
                key={`${person.tempId}-${index}`}
                className="relative rounded-2xl p-4 sm:p-5 bg-slate-50/80 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-4 hover:border-[#C5A059]/50 transition-all shadow-sm"
              >
                {/* Person Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#C5A059]/20 text-[#825C17] dark:text-[#E5C384] text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      بيانات الشخص المراد إضافته ({index + 1})
                    </span>
                  </div>

                  {persons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person.tempId)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition p-1"
                      title="حذف هذا الاسم من الطلب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الاسم</span>
                    </button>
                  )}
                </div>

                {/* 1. Full Quadruple Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    الاسم الرباعي كاملاً <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={person.fullName}
                    onChange={e => handleUpdatePerson(person.tempId, 'fullName', e.target.value)}
                    placeholder="مثال: محمد بن ناصر بن راشد بن عبدالله آل بوعينين"
                    className="glass-input w-full rounded-xl px-4 py-3 text-sm font-medium"
                  />

                  {/* Quadruple Name Warning Banner */}
                  <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-[#C5A059]/10 border border-amber-200 dark:border-[#C5A059]/30 text-xs text-amber-800 dark:text-[#E5C384]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-[#C5A059]" />
                    <span className="font-semibold leading-relaxed">
                      تنبيه: يجب كتابة الاسم متبوعاً باسم الأب والجد الأول والجد الثاني لربطه بدقة في المشجرة.
                    </span>
                  </div>
                </div>

                {/* 2. Lineage Status (Mobile-Friendly Radio Cards) */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    حالة العقب / التحديث <span className="text-rose-500">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Option 1: New Addition */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'new_addition')}
                      className={`cursor-pointer rounded-xl p-3 sm:p-3.5 border transition-all text-right flex flex-col justify-center ${
                        person.lineageStatus === 'new_addition'
                          ? 'bg-[#0F3D3E] text-white border-[#C5A059] shadow-md'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-[#E5C384]">
                          <Baby className="w-4 h-4 text-[#C5A059]" />
                          إضافة جديدة
                        </span>
                        {person.lineageStatus === 'new_addition' && (
                          <CheckCircle className="w-4 h-4 text-[#E5C384]" />
                        )}
                      </div>
                    </div>

                    {/* Option 2: Female Descendants Only */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'female_descendants_only')}
                      className={`cursor-pointer rounded-xl p-3 sm:p-3.5 border transition-all text-right flex flex-col justify-between ${
                        person.lineageStatus === 'female_descendants_only'
                          ? 'bg-[#0F3D3E] text-white border-[#C5A059] shadow-md'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-purple-300">
                          <Users className="w-4 h-4 text-purple-400" />
                          انتهى عقبه بذرية إناث
                        </span>
                        {person.lineageStatus === 'female_descendants_only' && (
                          <CheckCircle className="w-4 h-4 text-purple-300" />
                        )}
                      </div>
                      <p className={`text-[11px] leading-normal ${person.lineageStatus === 'female_descendants_only' ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        من توفي وله ذرية إناث فقط
                      </p>
                    </div>

                    {/* Option 3: Lineage Ended */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'lineage_ended')}
                      className={`cursor-pointer rounded-xl p-3 sm:p-3.5 border transition-all text-right flex flex-col justify-between ${
                        person.lineageStatus === 'lineage_ended'
                          ? 'bg-[#0F3D3E] text-white border-[#C5A059] shadow-md'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-slate-200">
                          <UserMinus className="w-4 h-4 text-slate-400" />
                          انتهى عقبه
                        </span>
                        {person.lineageStatus === 'lineage_ended' && (
                          <CheckCircle className="w-4 h-4 text-[#E5C384]" />
                        )}
                      </div>
                      <p className={`text-[11px] leading-normal ${person.lineageStatus === 'lineage_ended' ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        انتهى عقبه بدون ذرية
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Optional Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ملاحظات
                  </label>
                  <input
                    type="text"
                    value={person.note}
                    onChange={e => handleUpdatePerson(person.tempId, 'note', e.target.value)}
                    className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Person Button */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleAddPerson}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>+ إضافة اسم شخص آخر لهذا الطلب</span>
            </button>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-4 text-center">
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              إرسال طلب التحديث للمراجعة والاعتماد
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              سيتم إرسال إشعار فوري لإدارة المشروع بالبريد الإلكتروني وتوليد رقم مرجعي لتتبع الطلب.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:max-w-md mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-sm sm:text-base font-black shadow-lg shadow-[#C5A059]/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                <span>جاري حفظ وإرسال الطلب...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>إرسال طلب التحديث الآن ({persons.length} اسم)</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
