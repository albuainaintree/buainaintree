import React, { useState } from 'react';
import { Submission } from '../types';
import { getLineageStatusLabel } from '../services/emailService';
import { CheckCircle2, Copy, Check, MessageSquare, Printer, ArrowLeft, PlusCircle, Mail } from 'lucide-react';

interface SubmissionSuccessModalProps {
  submission: Submission;
  onClose: () => void;
  onSubmitAnother: () => void;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  submission,
  onClose,
  onSubmitAnother,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReference = () => {
    navigator.clipboard.writeText(submission.referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // WhatsApp share message
  const whatsappText = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته،\nتم إرسال طلب تحديث في مشجرة آل بوعينين (الطبعة السادسة):\n• الرقم المرجعي: ${submission.referenceNumber}\n• الأسرة: ${submission.familyName}\n• مقدم الطلب: ${submission.applicantName}\n• عدد الأسماء: ${submission.persons.length}\nشكراً لجهودكم في توثيق نسب القبيلة.`
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0F1E36] to-[#070B14] border border-[#C5A059]/50 shadow-2xl space-y-6 text-center">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-16 w-32 h-32 rounded-full bg-[#C5A059]/20 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#0F3D3E] to-[#10B981] border-2 border-[#C5A059] shadow-xl text-white mx-auto">
          <CheckCircle2 className="w-10 h-10 text-[#FFF2D6]" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#C5A059] tracking-widest uppercase">
            تم حفظ الطلب بنجاح
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            شكراً لمساهمتكم الكريمة
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            تم تسجيل طلب التحديث الخاص بـ <strong className="text-[#E5C384]">مشجرة {submission.familyName}</strong> بنجاح، وأُحيل إلى لجنة تدقيق الأنساب للمراجعة والاعتماد في الطبعة السادسة.
          </p>
        </div>

        {/* Reference Code Card */}
        <div className="rounded-2xl p-4 sm:p-5 bg-[#090F1E] border border-[#C5A059]/40 space-y-2">
          <span className="text-[11px] text-slate-400 block font-medium">الرقم المرجعي الرسمي لمتابعة طلبك:</span>
          
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-mono font-black text-[#E5C384] tracking-wider">
              {submission.referenceNumber}
            </span>
            <button
              type="button"
              onClick={handleCopyReference}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition"
              title="نسخ الرقم المرجعي"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            يرجى الاحتفاظ بهذا الرقم أو تصوير الشاشة للمراجعة عند الحاجة.
          </p>

          {submission.applicantEmail && (
            <div className="pt-1 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
              <Mail className="w-3.5 h-3.5" />
              <span>تم إرسال إشعار تأكيد بالرقم المرجعي إلى: <strong className="font-mono text-white">{submission.applicantEmail}</strong></span>
            </div>
          )}
        </div>

        {/* Submission Summary Table */}
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-right space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-slate-400">مقدم الطلب:</span>
            <span className="font-bold text-white">{submission.applicantName}</span>
          </div>
          {submission.applicantEmail && (
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">البريد الإلكتروني:</span>
              <span className="font-mono text-slate-200" dir="ltr">{submission.applicantEmail}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-slate-400">رقم الجوال:</span>
            <span className="font-mono text-slate-200" dir="ltr">{submission.applicantPhone}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-slate-400">حالة الطلب:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[11px]">
              قيد المراجعة والتدقيق ⏳
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">الأسماء المقدمة ({submission.persons.length}):</span>
            <ul className="space-y-1 pr-2">
              {submission.persons.map((p, i) => (
                <li key={`${p.id || 'p'}-${i}`} className="text-slate-200 list-disc list-inside">
                  <strong>{p.fullName}</strong> — <span className="text-[#C5A059]">{getLineageStatusLabel(p.lineageStatus)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* WhatsApp share */}
          <a
            href={`https://api.whatsapp.com/send?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>إرسال تفاصيل الطلب عبر الواتساب للجنة</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
            >
              <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>طباعة إشعار الاستلام</span>
            </button>

            <button
              type="button"
              onClick={onSubmitAnother}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#E5C384] text-xs font-semibold border border-[#C5A059]/30 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تقديم طلب لأسرة أخرى</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] font-bold text-sm shadow-md hover:brightness-110 transition mt-2"
          >
            <span>العودة للرئيسية</span>
          </button>
        </div>

      </div>
    </div>
  );
};
