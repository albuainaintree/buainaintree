import React, { useState } from 'react';
import { Mail, Copy, Check, X, Send } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTACT_EMAIL = 'albuainaintree@gmail.com';

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = CONTACT_EMAIL;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0D1526] border border-[#C5A059]/40 shadow-2xl overflow-hidden text-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Header */}
        <div className="bg-gradient-to-r from-[#0F3D3E] via-[#164e4f] to-[#0F3D3E] px-6 py-5 border-b border-[#C5A059]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#E5C384]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                تواصل معنا
              </h3>
              <p className="text-[11px] text-[#E5C384]/90">
                الأسئلة والمقترحات والاستفسارات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
            للتواصل أو للأسئلة والمقترحات يرجى التواصل على البريد الإلكتروني التالي:
          </p>

          {/* Email Box */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-[#C5A059]/35">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-[#987836] dark:text-[#C5A059] shrink-0" />
              <span
                dir="ltr"
                className="text-sm sm:text-base font-bold text-[#0F3D3E] dark:text-[#E5C384] select-all truncate"
              >
                {CONTACT_EMAIL}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyEmail}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0F3D3E]/10 dark:bg-white/10 text-[#0F3D3E] dark:text-slate-200 hover:bg-[#0F3D3E]/20 dark:hover:bg-white/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ البريد</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('استفسار / مقترح - منصة توثيق شجرة نسب آل بوعينين')}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] font-bold text-xs sm:text-sm shadow-md hover:brightness-110 transition"
            >
              <Send className="w-4 h-4" />
              <span>إرسال رسالة الآن</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
