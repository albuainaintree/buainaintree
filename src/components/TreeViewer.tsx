import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  X, 
  Download, 
  ExternalLink, 
  Eye, 
  Sparkles,
  Move,
  CheckSquare
} from 'lucide-react';

interface TreeViewerProps {
  imageUrl: string;
  familyName: string;
  isInline?: boolean;
  onClose?: () => void;
  onUpdateClick?: () => void;
}

export const TreeViewer: React.FC<TreeViewerProps> = ({ 
  imageUrl, 
  familyName, 
  isInline = false,
  onClose,
  onUpdateClick
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(!isInline);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close handler: closes fullscreen state and triggers parent onClose if provided
  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsFullscreen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Zoom handlers
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(prev => Math.min(prev + 0.35, 5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(prev => Math.max(prev - 0.35, 0.6));
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Keyboard navigation: Escape key closes viewer
  const isModalActive = !isInline || isFullscreen;
  useEffect(() => {
    if (!isModalActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalActive, handleClose]);

  // Prevent background page scroll while lightbox is open
  useEffect(() => {
    if (isModalActive) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isModalActive]);

  // Open full resolution image in a clean new tab
  const handleOpenInNewTab = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!imageUrl) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>مشجرة ${familyName} - قبيلة آل بوعينين</title>
            <style>
              body {
                margin: 0;
                padding: 16px;
                background: #070B14;
                color: #E5C384;
                font-family: -apple-system, system-ui, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
              }
              .header {
                width: 100%;
                max-width: 1200px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(197, 160, 89, 0.3);
              }
              h1 { font-size: 1.25rem; margin: 0; color: #FFF; }
              img {
                max-width: 100%;
                height: auto;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                border: 1px solid rgba(197, 160, 89, 0.25);
              }
              .btn {
                background: #C5A059;
                color: #070B14;
                font-weight: bold;
                padding: 8px 16px;
                border-radius: 8px;
                text-decoration: none;
                font-size: 0.85rem;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>مشجرة ${familyName} - الطبعة السادسة (2026م)</h1>
              <a href="${imageUrl}" download="مشجرة_${familyName}.svg" class="btn">تحميل الصورة</a>
            </div>
            <img src="${imageUrl}" alt="مشجرة ${familyName}">
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background, not controls
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mobile Touch handlers (Active strictly inside fullscreen modal)
  const touchStartRef = useRef<{ dist: number; x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isModalActive) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { dist, x: position.x, y: position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isModalActive) return;
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = newDist / touchStartRef.current.dist;
      setScale(prev => Math.min(Math.max(prev * ratio, 0.6), 5));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Download tree SVG/Image
  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `مشجرة_${familyName.replace(/\s+/g, '_')}_آل_بوعينين.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --------------------------------------------------------------------------
  // INLINE PREVIEW MODE (Compact, mobile-friendly, passive scroll)
  // --------------------------------------------------------------------------
  if (isInline && !isFullscreen) {
    return (
      <div className="rounded-2xl overflow-hidden border border-[#C5A059]/30 bg-white dark:bg-[#0A1020]/80 shadow-md transition-all">
        {/* Compact Thumbnail Container */}
        <div 
          onClick={() => setIsFullscreen(true)}
          className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900 cursor-pointer group"
          title="اضغط للتكبير واستعراض المشجرة"
        >
          <img
            src={imageUrl}
            alt={`مشجرة ${familyName}`}
            className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#C5A059]/40 text-xs font-semibold text-[#E5C384] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>مشجرة {familyName} الحالية</span>
          </div>

          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-xs text-white">
            <span className="flex items-center gap-1 text-[11px] text-slate-300">
              <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
              انقر هنا لتكبير المشجرة
            </span>
            <span className="text-[11px] font-bold text-[#E5C384] bg-black/60 px-2.5 py-1 rounded-lg border border-[#C5A059]/30 shadow">
              تكبير واستعراض 🔍
            </span>
          </div>
        </div>

        {/* Action Buttons Bar for Mobile & Desktop */}
        <div className="p-3 bg-slate-50 dark:bg-black/30 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0F3D3E] to-[#174F50] text-[#E5C384] font-bold text-xs sm:text-sm shadow transition hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>تكبير واستعراض المشجرة</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
            title="فتح الصورة بحجمها الكامل في نافذة مستقلة بالمتصفح"
          >
            <ExternalLink className="w-4 h-4 text-[#C5A059]" />
            <span className="hidden sm:inline">فتح في صفحة مستقلة</span>
            <span className="sm:hidden">صفحة مستقلة</span>
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FULLSCREEN / DEDICATED LIGHTBOX MODAL
  // --------------------------------------------------------------------------
  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-[#070B14]/98 backdrop-blur-3xl animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`مشجرة ${familyName}`}
    >
      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-[#C5A059]/40 bg-[#0B1527]/95 shadow-xl z-30 gap-2 shrink-0">
        
        {/* Right side: Family Name and Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#0F3D3E] border border-[#C5A059]/40 flex items-center justify-center text-[#E5C384] font-black text-sm shrink-0">
            ع
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white truncate">
              مشجرة {familyName}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-[#E5C384]">
              <span>الطبعة السادسة</span>
              <span className="text-white/30">•</span>
              <span>التقريب: {Math.round(scale * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Center / Left Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="تكبير (+)"
          >
            <ZoomIn className="w-4 h-4 text-[#E5C384]" />
            <span className="hidden md:inline">تكبير</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="تصغير (-)"
          >
            <ZoomOut className="w-4 h-4 text-[#E5C384]" />
            <span className="hidden md:inline">تصغير</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            title="إعادة ضبط (100%)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Open in New Tab */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D3E] hover:bg-[#155253] border border-[#C5A059]/40 text-[#E5C384] text-xs font-bold transition active:scale-95 cursor-pointer"
            title="فتح الصورة في صفحة مستقلة بالمتصفح"
          >
            <ExternalLink className="w-4 h-4" />
            <span>صفحة مستقلة</span>
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="hidden sm:flex p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            title="تحميل الصورة"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-white/20 mx-1" />

          {/* PRIMARY CLOSE BUTTON (Very prominent, highlighted, and unmistakable) */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-900/40 border border-rose-400/50 transition active:scale-95 cursor-pointer shrink-0"
            title="إغلاق المعاينة والعودة للصفحة (Escape)"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {/* Top Helper Hint */}
      <div className="bg-[#09101F]/90 px-4 py-1.5 text-center border-b border-white/5 text-[11px] text-slate-300 flex items-center justify-center gap-2 shrink-0">
        <Move className="w-3.5 h-3.5 text-[#C5A059]" />
        <span>اسحب الصورة للتحريك | استخدم أزرار التكبير | اضغط إغلاق أو زر Esc للعودة</span>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing relative p-2 sm:p-6"
        style={{ touchAction: 'none' }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="flex items-center justify-center max-w-full max-h-full pointer-events-none"
        >
          <img
            src={imageUrl}
            alt={`مشجرة ${familyName}`}
            className="max-w-[95vw] max-h-[75vh] object-contain shadow-2xl rounded-2xl border border-[#C5A059]/40 bg-[#060A14]"
            draggable={false}
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar for Mobile Thumb Ergonomics */}
      <div className="p-3 sm:p-4 bg-[#0B1527]/95 border-t border-[#C5A059]/30 shadow-2xl z-30 shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          
          {/* Action 1: Close button (Direct thumb reach at bottom of phone) */}
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold text-xs sm:text-sm border border-white/20 transition active:scale-95 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 text-rose-400 stroke-[3]" />
            <span>إغلاق والعودة</span>
          </button>

          {/* Action 2 (Optional): Update submission if triggered from families directory */}
          {onUpdateClick && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onUpdateClick();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] font-bold text-xs sm:text-sm shadow-lg shadow-[#C5A059]/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>تحديث بيانات المشجرة</span>
            </button>
          )}

          {/* Action 3: Open in new tab for mobile */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="sm:hidden flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[#0F3D3E] hover:bg-[#155253] text-[#E5C384] font-bold text-xs border border-[#C5A059]/40 transition active:scale-95 cursor-pointer"
            title="صفحة مستقلة"
          >
            <ExternalLink className="w-4 h-4" />
            <span>صفحة مستقلة</span>
          </button>

        </div>
      </div>

    </div>
  );
};
