import React, { useState } from 'react';
import { Family, LineageStatus, Submission } from '../types';
import { TreeViewer } from './TreeViewer';
import { addSubmission } from '../services/storage';
import { sendSubmissionEmailNotification } from '../services/emailService';
import { 
  User, 
  Phone, 
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
  // Section 1: Applicant info (Mandatory)
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');

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
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    if (!applicantPhone.trim() || !isValidPhone(applicantPhone)) {
      setErrorMessage('يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx) للتواصل معك والتحقق.');
      window.scrollTo({ top: 400, behavior: 'smooth' });
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
        persons: persons.map(p => ({
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fullName: p.fullName.trim(),
          lineageStatus: p.lineageStatus,
          note: p.note.trim(),
          status: 'pending',
        })),
      });

      // Send Email Notification to Admin via EmailJS
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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Top Breadcrumb & Switch Family */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#E5C384] hover:text-white transition"
        >
          <ChevronRight className="w-4 h-4" />
          <span>العودة لقائمة كافة الأسر</span>
        </button>

        {/* Quick Family Switcher */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>تغيير الأسرة:</span>
          <select
            value={family.id}
            onChange={e => {
              const found = allFamilies.find(f => f.id === e.target.value);
              if (found) onSelectFamily(found);
            }}
            className="rounded-lg px-2.5 py-1.5 bg-[#0F1A30] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C5A059]"
          >
            {allFamilies.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} {f.branch ? `(الفخذ: ${f.branch})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Header for Chosen Family */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0d1627] via-[#0F3D3E]/50 to-[#0d1627] border border-[#C5A059]/40 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#C5A059] tracking-wider uppercase">
              نموذج تحديث المشجرة المعتمد
            </span>
            <h2 className="text-2xl sm:text-4xl font-black gold-gradient-text">
              مشجرة {family.name}
            </h2>
            {family.branch && (
              <p className="text-xs sm:text-sm text-slate-300">
                الفخذ: <strong className="text-[#E5C384]">{family.branch}</strong>
              </p>
            )}
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/40 border border-[#C5A059]/30 text-center sm:text-left">
            <span className="text-[10px] text-slate-400 block">مشروع التوثيق</span>
            <span className="text-xs font-bold text-[#E5C384]">الطبعة السادسة (2026م)</span>
          </div>
        </div>
      </div>

      {/* Part 0: Interactive Smart Tree Viewer (Above Form) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <span>صورة المشجرة الحالية المعتمدة (طالع فروع الأسرة أولاً):</span>
          </h3>
          <span className="text-xs text-slate-400">انقر على أزرار التكبير للقراءة بوضوح</span>
        </div>

        <TreeViewer imageUrl={family.treeImageUrl} familyName={family.name} isInline={true} />
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-sm flex items-start gap-3 backdrop-blur-xl animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">تنبيه في البيانات المدخلة:</span>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Applicant Information (Mandatory) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0F3D3E] border border-[#C5A059]/40 flex items-center justify-center text-[#E5C384] font-bold text-sm">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                بيانات مقدم الطلب <span className="text-rose-400 text-sm font-normal">(إلزامية)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 mr-10">
              بياناتك وسيلة الاتصال المعتمدة لتدقيق صحة صلة القرابة ومطابقة الأسماء في المشجرة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Applicant Name */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                اسم مقدم الطلب <span className="text-rose-400">*</span>
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
                  placeholder="مثال: خالد بن إبراهيم بن محمد آل بوعينين"
                  className="glass-input w-full rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-slate-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">الاسم الثلاثي أو الرباعي لمقدم هذا التحديث</p>
            </div>

            {/* Applicant Phone */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                رقم الجوال للتواصل والتحقق <span className="text-rose-400">*</span>
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
                  placeholder="05xxxxxxxx أو +9665xxxxxxxx"
                  className="glass-input w-full rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-slate-500 text-right"
                />
              </div>
              <p className="text-[11px] text-slate-400">سيتم التواصل عبر الواتساب أو الاتصال للتحقق</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Dynamic Repeater for Persons */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C5A059] text-[#0A0F1D] font-black text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  الأسماء المراد إضافتها أو تحديثها في المشجرة
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1 mr-10">
                يمكنك إضافة شخص واحد أو أكثر في نفس الطلب عبر زر الإضافة أدناه.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddPerson}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F3D3E] to-[#1A5F60] border border-[#C5A059]/40 text-xs sm:text-sm font-bold text-[#E5C384] hover:brightness-110 shadow-lg transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة اسم آخر للطلب</span>
            </button>
          </div>

          {/* Persons List */}
          <div className="space-y-6">
            {persons.map((person, index) => (
              <div
                key={person.tempId}
                className="relative rounded-2xl p-5 sm:p-6 bg-[#0B1222]/80 border border-white/15 space-y-5 hover:border-[#C5A059]/40 transition"
              >
                {/* Person Card Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#C5A059]/20 text-[#E5C384] text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-white">
                      بيانات الشخص رقم ({index + 1})
                    </span>
                  </div>

                  {persons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person.tempId)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition flex items-center gap-1 text-xs"
                      title="حذف هذا الاسم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">حذف الاسم</span>
                    </button>
                  )}
                </div>

                {/* 1. Full Quadruple Name */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                    الاسم الرباعي <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={person.fullName}
                    onChange={e => handleUpdatePerson(person.tempId, 'fullName', e.target.value)}
                    placeholder="مثال: محمد بن ناصر بن راشد بن عبدالله آل بوعينين"
                    className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 font-medium"
                  />

                  {/* Prominent Warning Badge required by prompt */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-xs text-[#E5C384]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#C5A059]" />
                    <span className="font-semibold leading-relaxed">
                      تنبيه: يجب كتابة الاسم متبوعاً باسم الأب والجد الأول والجد الثاني لربطه بدقة في المشجرة.
                    </span>
                  </div>
                </div>

                {/* 2. Lineage Status (Liquid Glass Radio Cards) */}
                <div className="space-y-2.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                    حالة العقب / التحديث <span className="text-rose-400">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: New Addition */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'new_addition')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all text-right flex flex-col justify-between ${
                        person.lineageStatus === 'new_addition'
                          ? 'bg-[#0F3D3E]/70 border-[#C5A059] shadow-lg shadow-[#0F3D3E]/40 text-white'
                          : 'bg-black/30 border-white/10 hover:border-white/25 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-[#E5C384]">
                          <Baby className="w-4 h-4 text-[#C5A059]" />
                          إضافة جديدة
                        </span>
                        {person.lineageStatus === 'new_addition' && (
                          <CheckCircle className="w-4 h-4 text-[#C5A059]" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        لمن استمرت ذريته أو المواليد الجدد من الذكور.
                      </p>
                    </div>

                    {/* Option 2: Female Descendants Only */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'female_descendants_only')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all text-right flex flex-col justify-between ${
                        person.lineageStatus === 'female_descendants_only'
                          ? 'bg-[#0F3D3E]/70 border-[#C5A059] shadow-lg shadow-[#0F3D3E]/40 text-white'
                          : 'bg-black/30 border-white/10 hover:border-white/25 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-purple-300">
                          <Users className="w-4 h-4 text-purple-400" />
                          انتهى عقبه بذرية إناث
                        </span>
                        {person.lineageStatus === 'female_descendants_only' && (
                          <CheckCircle className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        حتى الوقت الحالي (له بنات فقط).
                      </p>
                    </div>

                    {/* Option 3: Lineage Ended */}
                    <div
                      onClick={() => handleUpdatePerson(person.tempId, 'lineageStatus', 'lineage_ended')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all text-right flex flex-col justify-between ${
                        person.lineageStatus === 'lineage_ended'
                          ? 'bg-[#0F3D3E]/70 border-[#C5A059] shadow-lg shadow-[#0F3D3E]/40 text-white'
                          : 'bg-black/30 border-white/10 hover:border-white/25 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-slate-200">
                          <UserMinus className="w-4 h-4 text-slate-400" />
                          انتهى عقبه
                        </span>
                        {person.lineageStatus === 'lineage_ended' && (
                          <CheckCircle className="w-4 h-4 text-[#C5A059]" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        لمن توفي أو لم يعقب ذرية.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Optional Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    ملاحظات إضافية أو توضيحات (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={person.note}
                    onChange={e => handleUpdatePerson(person.tempId, 'note', e.target.value)}
                    placeholder="مثال: سنة الميلاد، المدينة، اسم الوالدة، أو أي تفاصيل تفيد لجنة التوثيق في تسكين الاسم..."
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500"
                  />
                </div>

              </div>
            ))}
          </div>

          {/* Add Another Person Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleAddPerson}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-[#C5A059]/40 text-xs sm:text-sm font-bold text-[#E5C384] transition"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>+ إضافة اسم آخر لنفس الطلب ({persons.length} أسماء مضافة)</span>
            </button>
          </div>

        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#09101F]/90 backdrop-blur-2xl border border-[#C5A059]/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-right">
            <span className="text-xs text-slate-400 block">إجمالي الأسماء في هذا الطلب:</span>
            <span className="text-sm font-bold text-white">
              {persons.length} {persons.length === 1 ? 'اسم مسجل' : 'أسماء مسجلة'} لمشجرة {family.name}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white/5 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] via-[#D8B675] to-[#987836] text-[#0A0F1D] text-sm sm:text-base font-black shadow-xl shadow-[#C5A059]/30 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري إرسال الطلب وحفظه...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال طلب التحديث للجنة</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
