import React from 'react';

interface FooterProps {
  onNavigate: (view: 'home' | 'form' | 'admin') => void;
  onOpenSettings: () => void;
  isAdminLoggedIn?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSettings, isAdminLoggedIn = false }) => {
  return (
    <footer className="w-full border-t border-[#C5A059]/20 bg-[#060A14] text-slate-400 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-center md:text-right">
            <div className="w-10 h-10 rounded-xl bg-[#0F3D3E] border border-[#C5A059]/40 flex items-center justify-center text-[#E5C384] font-black font-tajawal text-lg">
              ع
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                مشروع تحديث شجرة نسب آل بوعينين - الطبعة السادسة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#E5C384] transition"
            >
              الأسر والمشجرات
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => onNavigate('form')}
              className="hover:text-[#E5C384] transition"
            >
              تقديم تحديث
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => onNavigate('admin')}
              className="hover:text-[#E5C384] transition"
            >
              لوحة تحكم المدير
            </button>
            
            {isAdminLoggedIn && (
              <>
                <span className="text-white/20">•</span>
                <button
                  onClick={onOpenSettings}
                  className="hover:text-[#E5C384] transition text-[#C5A059]"
                >
                  إعدادات السحاب
                </button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            تنبيه: جميع البيانات الواردة في هذه المنصة تخضع لتدقيق ومراجعة قبل اعتمادها في الطبعة السادسة المطبوعة.
          </p>
        </div>

      </div>
    </footer>
  );
};
