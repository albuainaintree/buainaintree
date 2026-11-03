import React, { useState, useMemo } from 'react';
import { Family } from '../types';
import { Search, Eye, ArrowLeft, Sparkles, Plus, ExternalLink, ShieldCheck } from 'lucide-react';

interface FamiliesGridProps {
  families: Family[];
  onSelectFamily: (family: Family) => void;
  onPreviewTree: (family: Family) => void;
  onNavigateToAdmin?: () => void;
}

export const FamiliesGrid: React.FC<FamiliesGridProps> = ({
  families,
  onSelectFamily,
  onPreviewTree,
  onNavigateToAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClan, setSelectedClan] = useState<string>('الكل');

  // Distinct clans (الأفخاذ) for fast filtering
  const clans = useMemo(() => {
    const list = Array.from(new Set(families.map(f => f.branch).filter(Boolean))) as string[];
    return ['الكل', ...list];
  }, [families]);

  // Filtered families based on search and clan
  const filteredFamilies = useMemo(() => {
    return families.filter(fam => {
      const matchSearch =
        fam.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        (fam.branch && fam.branch.toLowerCase().includes(searchTerm.trim().toLowerCase()));

      const matchClan = selectedClan === 'الكل' || fam.branch === selectedClan;

      return matchSearch && matchClan;
    });
  }, [families, searchTerm, selectedClan]);

  // Open direct in new tab
  const handleOpenRaw = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      
      {/* Hero Welcome Section (Royal Emerald & Gold Banner) */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#0F3D3E] via-[#164E4F] to-[#0A2627] text-white border border-[#C5A059]/40 shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[#C5A059]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/25 border border-[#C5A059]/50 text-xs sm:text-sm font-semibold text-[#E5C384]">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>مشروع توثيق الطبعة السادسة لشجرة نسب قبيلة آل بوعينين - 2026م</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            تحديث شجرة نسب آل بوعينين
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            المنصة الرسمية المعتمدة لتوثيق وتحديث شجرة نسب قبيلة <strong className="text-[#E5C384]">آل بوعينين</strong> الكريمة،
            واستقبال طلبات الإضافة وتحديث الأعقاب وتوثيق مشجرات الأسر تحت إشراف لجنة التوثيق.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {families.length === 0 ? (
        /* Empty State when no families are registered yet */
        <div className="text-center py-16 sm:py-20 px-6 rounded-3xl glass-panel max-w-xl mx-auto space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0F3D3E] to-[#142844] border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#E5C384] shadow-xl">
            <Plus className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              جاهز للبدء بتسجيل الأسر ورفع المشجرات
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              تم تهيئة النظام لمرحلة التوثيق الجديدة. يمكن لمدير المشروع تسجيل الأسر الجديدة ورفع صور مشجراتها، أو استيراد نسخة احتياطية سابقة بنقرة واحدة.
            </p>
          </div>

          {onNavigateToAdmin && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs sm:text-sm font-black shadow-lg shadow-[#C5A059]/30 hover:brightness-110 transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>الدخول للوحة التحكم وتسجيل أول أسرة</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Floating Glass Search Capsule & Clan Filters */}
          <div className="space-y-4">
            <div className="relative max-w-2xl mx-auto">
              <div className="relative flex items-center rounded-full p-2 bg-white dark:bg-[#0d1629]/90 backdrop-blur-2xl border border-[#C5A059]/40 shadow-md shadow-slate-200/50 dark:shadow-black/40 hover:border-[#C5A059] transition-all">
                <div className="pr-4 pl-2 text-[#C5A059]">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم الأسرة أو الفخذ..."
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    مسح
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#0F3D3E] text-[#E5C384] border border-[#C5A059]/30 mr-2 whitespace-nowrap">
                  {filteredFamilies.length} أسرة
                </span>
              </div>
            </div>

            {/* Clan Filter Pills */}
            {clans.length > 2 && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">تصفية حسب الفخذ:</span>
                {clans.map(clan => (
                  <button
                    key={clan}
                    onClick={() => setSelectedClan(clan)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedClan === clan
                        ? 'bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] font-bold shadow-md shadow-[#C5A059]/20'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'
                    }`}
                  >
                    {clan}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Families Grid (Light & Dark Responsive Cards) */}
          {filteredFamilies.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 max-w-md mx-auto shadow-sm">
              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">لم يتم العثور على أسر مطابقة لبحثك</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedClan('الكل');
                }}
                className="px-4 py-2 rounded-xl bg-[#C5A059]/20 text-[#987836] dark:text-[#E5C384] text-xs font-semibold hover:bg-[#C5A059]/30 transition"
              >
                عرض كافة الأسر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredFamilies.map(fam => (
                <div
                  key={fam.id}
                  className="glass-card group relative rounded-2xl overflow-hidden p-4 sm:p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header of the Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#987836] dark:group-hover:text-[#E5C384] transition">
                          {fam.name}
                        </h3>
                        {fam.branch && (
                          <p className="text-xs text-[#987836] dark:text-[#C5A059] font-semibold mt-0.5">
                            الفخذ: {fam.branch}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0F3D3E] text-[#E5C384] font-medium shrink-0">
                        {fam.lastUpdated || '2026م'}
                      </span>
                    </div>

                    {/* Tree Image Thumbnail Preview (Non-blocking) */}
                    <div
                      onClick={() => onPreviewTree(fam)}
                      className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 group-hover:border-[#C5A059]/50 cursor-pointer shadow-inner transition"
                      title="اضغط للتكبير واستعراض المشجرة بملء الشاشة"
                    >
                      <img
                        src={fam.treeImageUrl}
                        alt={`مشجرة ${fam.name}`}
                        className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />
                      
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                          معاينة المشجرة
                        </span>
                        <span className="text-[10px] text-[#E5C384] font-semibold">انقر للتكبير 🔍</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewTree(fam)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 transition active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>فحص المشجرة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectFamily(fam)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold shadow-md shadow-[#C5A059]/20 hover:brightness-110 active:scale-95 transition"
                    >
                      <span>تحديث البيانات</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
};
