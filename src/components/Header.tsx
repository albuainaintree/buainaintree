import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trees, Send, Settings, UserCheck, Menu, X, Sun, Moon, Sparkles, Cloud, CloudCheck, CloudAlert } from 'lucide-react';
import { subscribeToCloudStatus, CloudSyncStatus } from '../services/firebaseClient';

interface HeaderProps {
  currentView: 'home' | 'form' | 'admin';
  setCurrentView: (view: 'home' | 'form' | 'admin') => void;
  onOpenSettings: () => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  pendingRequestsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenSettings,
  isAdminLoggedIn,
  onAdminLogout,
  isDarkMode,
  setIsDarkMode,
  pendingRequestsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('checking');
  const [lastSync, setLastSync] = useState<string | undefined>();

  useEffect(() => {
    const unsub = subscribeToCloudStatus((status, details) => {
      setCloudStatus(status);
      setLastSync(details?.lastSync);
    });
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#C5A059]/30 bg-white/95 dark:bg-[#070b14]/90 backdrop-blur-xl transition-colors shadow-sm">
      {/* Top Heritage Ribbon */}
      <div className="bg-gradient-to-r from-[#0F3D3E] via-[#164e4f] to-[#0F3D3E] py-1 px-4 text-center border-b border-[#C5A059]/30">
        <p className="text-[12px] md:text-xs text-[#E5C384] font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
          <span>مشروع توثيق نسب قبيلة آل بوعينين</span>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Royal Emblem */}
          <div
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Liquid Glass Badge Seal */}
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1b2b4a] via-[#0F3D3E] to-[#0d1627] border border-[#C5A059]/50 shadow-lg shadow-[#0F3D3E]/30 group-hover:border-[#E5C384] transition-all">
              <span className="text-[#E5C384] text-xl font-black font-tajawal select-none">ع</span>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C5A059] border-2 border-[#070b14]" />
            </div>

            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-black gold-gradient-text tracking-tight group-hover:brightness-110 transition">
                توثيق شجرة نسب آل بوعينين
              </span>
              <span className="text-[11px] md:text-xs text-slate-400 font-medium">
                بوابة التحديث الرسمي
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'home'
                  ? 'bg-gradient-to-r from-[#0F3D3E] to-[#155253] text-[#E5C384] border border-[#C5A059]/40 shadow-md'
                  : 'text-slate-700 hover:text-[#0F3D3E] hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <Trees className="w-4 h-4 text-[#C5A059]" />
              <span>الأسر والمشجرات</span>
            </button>

            <button
              onClick={() => setCurrentView('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'form'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] shadow-md shadow-[#C5A059]/20 font-bold'
                  : 'text-slate-700 hover:text-[#0F3D3E] hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <Send className="w-4 h-4 text-[#C5A059]" />
              <span>تقديم تحديث جديد</span>
            </button>

            <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1" />

            {/* Live Cloud Sync Pill */}
            <div className="hidden lg:flex items-center">
              {cloudStatus === 'connected' ? (
                <span 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs" 
                  title={`متصل بسحابة Firebase (مشروع buainain-be6e1) ومحدث مع GitHub Pages${lastSync ? ` - آخر مزامنة: ${lastSync}` : ''}`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>سحابة متصلة ومزامنة</span>
                </span>
              ) : cloudStatus === 'checking' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>جاري المزامنة...</span>
                </span>
              ) : cloudStatus === 'permission_denied' ? (
                <span 
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 cursor-pointer hover:brightness-110" 
                  title="قواعد Firestore تتطلب تفعيل القراءة والكتابة في Firebase Console"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>قواعد السحابة</span>
                </span>
              ) : (
                <span 
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 cursor-pointer hover:brightness-110"
                  title="السحابة غير متصلة، اضغط للتحقق"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>السحابة غير متصلة</span>
                </span>
              )}
            </div>

            <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1" />

            <button
              onClick={() => setCurrentView('admin')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-[#0F2942] text-[#E5C384] border border-[#C5A059]/60 shadow-md'
                  : 'text-slate-700 hover:text-[#0F3D3E] hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>لوحة الإدارة</span>
              {pendingRequestsCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-amber-600 rounded-full">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {isAdminLoggedIn && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-xl text-slate-400 hover:text-[#E5C384] hover:bg-white/5 transition"
                title="إعدادات الربط السحابي (Firebase / EmailJS)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-white/5 transition"
              title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAdminLoggedIn && (
              <button
                onClick={onAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 transition mr-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>تسجيل خروج المدير</span>
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white/98 dark:bg-[#070b14]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 shadow-xl">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <Trees className="w-4 h-4 text-[#C5A059]" />
              الأسر والمشجرات
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentView('form');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D]"
          >
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              تقديم تحديث جديد
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentView('admin');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              لوحة تحكم المدير
            </span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-600 rounded-full text-white font-bold">
                {pendingRequestsCount} جديد
              </span>
            )}
          </button>

          {isAdminLoggedIn && (
            <button
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              <Settings className="w-4 h-4 text-[#C5A059]" />
              إعدادات الربط السحابي (Firebase / EmailJS)
            </button>
          )}

          {isAdminLoggedIn && (
            <button
              onClick={() => {
                onAdminLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30"
            >
              <UserCheck className="w-4 h-4" />
              تسجيل خروج حساب المدير
            </button>
          )}
        </div>
      )}
    </header>
  );
};
