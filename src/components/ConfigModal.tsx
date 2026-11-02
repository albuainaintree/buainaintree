import React, { useState } from 'react';
import { AppConfig } from '../types';
import { getAppConfig, saveAppConfig } from '../services/config';
import { Settings, X, Check, Key, Mail, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppConfig(config);
    setSaveSuccess(true);
    onConfigUpdated();
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-3xl p-6 sm:p-8 bg-[#09101F] border border-[#C5A059]/40 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0F3D3E] text-[#E5C384]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">إعدادات الربط السحابي (Firebase & EmailJS)</h2>
              <p className="text-xs text-slate-400">إدارة مفاتيح التشغيل الحي والاستضافة على GitHub Pages</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-4 rounded-2xl bg-[#0F3D3E]/40 border border-[#C5A059]/30 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-[#E5C384] font-bold">
            <Sparkles className="w-4 h-4" />
            <span>الوضع التجريبي النشط (Demo Mode جاهز تماماً)</span>
          </div>
          <p className="leading-relaxed">
            التطبيق يعمل حالياً بكامل وظائفه: استعراض المشجرات، تقديم طلبات التحديث، توليد أرقام المراجع، وتصدير Excel. 
            عند رغبتك بالربط المباشر مع قاعدة بيانات Firebase أو تفعيل الإشعارات البريدية عبر EmailJS، ضع المفاتيح في الحقول أدناه.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم حفظ الإعدادات بنجاح في متصفحك!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section A: Admin Email */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>البريد الإلكتروني الحصري لمدير المشروع (مالك لوحة التحكم):</span>
            </label>
            <input
              type="email"
              required
              value={config.adminEmail}
              onChange={e => setConfig({ ...config, adminEmail: e.target.value })}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-xs text-white font-mono text-left"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-400">
              الحساب الافتراضي المعتمد للمشروع هو: <strong className="text-white">albuainaintree@gmail.com</strong>
            </p>
          </div>

          {/* Section B: EmailJS Configuration */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-purple-400" />
                <span>إعدادات خدمة البريد (EmailJS)</span>
              </h3>
              <a
                href="https://www.emailjs.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#C5A059] flex items-center gap-1 hover:underline"
              >
                <span>موقع EmailJS</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Service ID</label>
                <input
                  type="text"
                  value={config.emailjsServiceId}
                  onChange={e => setConfig({ ...config, emailjsServiceId: e.target.value })}
                  placeholder="service_xxx"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Template ID</label>
                <input
                  type="text"
                  value={config.emailjsTemplateId}
                  onChange={e => setConfig({ ...config, emailjsTemplateId: e.target.value })}
                  placeholder="template_xxx"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Public Key</label>
                <input
                  type="text"
                  value={config.emailjsPublicKey}
                  onChange={e => setConfig({ ...config, emailjsPublicKey: e.target.value })}
                  placeholder="المفتاح العام"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section C: Firebase Web Credentials */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>إعدادات Firebase Firestore & Auth (اختياري للربط السحابي)</span>
              </h3>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#C5A059] flex items-center gap-1 hover:underline"
              >
                <span>Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">API Key</label>
                <input
                  type="text"
                  value={config.firebaseApiKey}
                  onChange={e => setConfig({ ...config, firebaseApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Project ID</label>
                <input
                  type="text"
                  value={config.firebaseProjectId}
                  onChange={e => setConfig({ ...config, firebaseProjectId: e.target.value })}
                  placeholder="albuainain-tree"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={config.firebaseAuthDomain}
                  onChange={e => setConfig({ ...config, firebaseAuthDomain: e.target.value })}
                  placeholder="albuainain-tree.firebaseapp.com"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={config.firebaseStorageBucket}
                  onChange={e => setConfig({ ...config, firebaseStorageBucket: e.target.value })}
                  placeholder="albuainain-tree.appspot.com"
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-slate-300 hover:text-white"
            >
              إغلاق
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold shadow-lg"
            >
              حفظ الإعدادات وتحديث الاتصال
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
