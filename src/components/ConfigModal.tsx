import React, { useState } from 'react';
import { AppConfig } from '../types';
import { getAppConfig, saveAppConfig } from '../services/config';
import { sendTestEmail, ADMIN_EMAIL } from '../services/emailService';
import { 
  Settings, 
  X, 
  Check, 
  Key, 
  Mail, 
  Sparkles, 
  ExternalLink, 
  Send, 
  HelpCircle, 
  AlertCircle,
  Copy,
  CheckCircle2
} from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showEmailGuide, setShowEmailGuide] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppConfig(config);
    setSaveSuccess(true);
    onConfigUpdated();
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleRunEmailTest = async () => {
    setIsTestingEmail(true);
    setTestResult(null);
    try {
      // First save the current keys so test runs on latest inputs
      saveAppConfig(config);
      const res = await sendTestEmail(
        config.emailjsServiceId,
        config.emailjsTemplateId,
        config.emailjsPublicKey
      );
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        message: `حدث خطأ أثناء محاولة الإرسال: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const templateSnippet = `مرحباً، تم استلام طلب تحديث جديد في مشجرة آل بوعينين (الطبعة السادسة):

• الرقم المرجعي: {{reference_number}}
• الأسرة: {{family_name}}
• مقدم الطلب: {{applicant_name}}
• رقم الجوال: {{applicant_phone}}
• البريد: {{applicant_email}}
• تاريخ التقديم: {{submission_date}}

الأسماء المطلوبة:
{{persons_list}}`;

  const copyTemplateContent = () => {
    navigator.clipboard.writeText(templateSnippet);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-3xl p-5 sm:p-8 bg-white dark:bg-[#09101F] border border-[#C5A059]/40 shadow-2xl space-y-6 text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0F3D3E] text-[#E5C384]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                إعدادات الإشعارات والربط السحابي
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تفعيل استلام الإيميل على ({ADMIN_EMAIL}) والربط مع Firebase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تم حفظ المفاتيح والإعدادات بنجاح في النظام!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section A: Admin Email Address */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>البريد الإلكتروني المعتمد لاستلام إشعارات التحديث:</span>
            </label>
            <input
              type="email"
              required
              value={config.adminEmail}
              onChange={e => setConfig({ ...config, adminEmail: e.target.value })}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              جميع التحديثات والطلبات الجديدة يتم توجيهها تلقائياً إلى هذا الحساب: <strong className="text-slate-800 dark:text-white font-mono">{ADMIN_EMAIL}</strong>
            </p>
          </div>

          {/* Section B: EmailJS Configuration & Test Button */}
          <div className="space-y-4 border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>تفعيل الإرسال التلقائي عبر خدمة (EmailJS)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  يربط موقعك بحساب Gmail لإرسال بريد إلكتروني فوري للإدارة وتأكيد للمستخدم
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailGuide(!showEmailGuide)}
                className="text-xs text-[#987836] dark:text-[#E5C384] hover:underline flex items-center gap-1 font-semibold self-start sm:self-center cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showEmailGuide ? 'إخفاء خطوات التفعيل' : 'طريقة الحصول على المفاتيح مجاناً (دقيقتين)'}</span>
              </button>
            </div>

            {/* Step-by-Step Guide Box */}
            {showEmailGuide && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#0B1527] border border-amber-300 dark:border-[#C5A059]/40 text-xs text-slate-700 dark:text-slate-300 space-y-3 animate-fade-in">
                <h4 className="font-bold text-amber-900 dark:text-[#E5C384] flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>خطوات ربط حسابك في EmailJS (مجاناً 100% مدى الحياة):</span>
                </h4>
                
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed pr-1">
                  <li>
                    ادخل على موقع <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-sky-400 underline font-semibold">EmailJS.com</a> وسجل دخولك بحسابك (<span className="font-mono">{ADMIN_EMAIL}</span>).
                  </li>
                  <li>
                    من القائمة الجانبية، اختر <strong>Email Services</strong> واضغط على <strong>Add New Service</strong> ثم اختر <strong>Gmail</strong> وربط الحساب. سيظهر لك <strong>Service ID</strong> (انسخه وضعه في الحقل أدناه).
                  </li>
                  <li>
                    من قائمة <strong>Email Templates</strong> اضغط <strong>Create New Template</strong>، ثم ضع في خانة <em>To Email</em> البريد <span className="font-mono font-bold text-slate-900 dark:text-white">{ADMIN_EMAIL}</span>، وسمّ القالب (انسخ <strong>Template ID</strong> وضعه في الحقل أدناه).
                  </li>
                  <li>
                    من صفحة <strong>Account</strong> انسخ <strong>Public Key</strong> وضعه في الحقل أدناه.
                  </li>
                </ol>

                {/* Template Copy Box */}
                <div className="pt-2 border-t border-amber-200 dark:border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">محتوى القالب المقترح لـ EmailJS:</span>
                    <button
                      type="button"
                      onClick={copyTemplateContent}
                      className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-white/10 hover:bg-amber-300 text-slate-900 dark:text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedTemplate ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTemplate ? 'تم النسخ!' : 'نسخ نص القالب'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-[10px] text-slate-800 dark:text-slate-200 font-mono overflow-x-auto whitespace-pre-wrap" dir="rtl">
                    {templateSnippet}
                  </pre>
                </div>
              </div>
            )}

            {/* EmailJS Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Service ID
                </label>
                <input
                  type="text"
                  value={config.emailjsServiceId}
                  onChange={e => setConfig({ ...config, emailjsServiceId: e.target.value.trim() })}
                  placeholder="service_xxxxx"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Template ID
                </label>
                <input
                  type="text"
                  value={config.emailjsTemplateId}
                  onChange={e => setConfig({ ...config, emailjsTemplateId: e.target.value.trim() })}
                  placeholder="template_xxxxx"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Public Key
                </label>
                <input
                  type="text"
                  value={config.emailjsPublicKey}
                  onChange={e => setConfig({ ...config, emailjsPublicKey: e.target.value.trim() })}
                  placeholder="المفتاح العام (User ID)"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Test Email Button & Response Card */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleRunEmailTest}
                disabled={isTestingEmail}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3D3E] hover:bg-[#155253] text-[#E5C384] border border-[#C5A059]/40 text-xs font-bold shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-pulse' : ''}`} />
                <span>{isTestingEmail ? 'جاري فحص الإرسال...' : 'فحص وإرسال بريد تجريبي الآن إلى albuainaintree@gmail.com'}</span>
              </button>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-right">
                اضغط لتجربة الربط واستلام رسالة تأكيد فورية في بريدك
              </span>
            </div>

            {/* Test Email Status Feedback */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {testResult.success ? 'نجح اختبار إرسال البريد!' : 'تنبيه بشأن نتيجة الاختبار:'}
                  </p>
                  <p className="leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section C: Firebase Web Credentials */}
          <div className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>إعدادات Firebase Firestore (مشروع: buainain-be6e1)</span>
              </h3>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#987836] dark:text-[#C5A059] flex items-center gap-1 hover:underline"
              >
                <span>Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={config.firebaseApiKey}
                  onChange={e => setConfig({ ...config, firebaseApiKey: e.target.value.trim() })}
                  placeholder="AIzaSy..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  value={config.firebaseProjectId}
                  onChange={e => setConfig({ ...config, firebaseProjectId: e.target.value.trim() })}
                  placeholder="buainain-be6e1"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  value={config.firebaseAuthDomain}
                  onChange={e => setConfig({ ...config, firebaseAuthDomain: e.target.value.trim() })}
                  placeholder="buainain-be6e1.firebaseapp.com"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  value={config.firebaseStorageBucket}
                  onChange={e => setConfig({ ...config, firebaseStorageBucket: e.target.value.trim() })}
                  placeholder="buainain-be6e1.firebasestorage.app"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold shadow-lg shadow-[#C5A059]/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              حفظ الإعدادات وتحديث الاتصال
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
