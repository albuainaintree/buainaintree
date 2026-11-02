import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Download, Move } from 'lucide-react';

interface TreeViewerProps {
  imageUrl: string;
  familyName: string;
  isInline?: boolean;
}

export const TreeViewer: React.FC<TreeViewerProps> = ({ imageUrl, familyName, isInline = false }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch Drag & Pinch-to-zoom handlers
  const touchStartRef = useRef<{ dist: number; x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
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
      setScale(prev => Math.min(Math.max(prev * ratio, 0.5), 4));
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
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `مشجرة_${familyName.replace(/\s+/g, '_')}_آل_بوعينين.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    handleReset();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#0A1020]/90 backdrop-blur-xl shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none p-4 bg-[#060A14]'
          : isInline
          ? 'w-full h-[420px] md:h-[520px]'
          : 'w-full h-[360px] md:h-[460px]'
      }`}
    >
      {/* Top Floating Glass Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Family info badge */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-1.5 bg-[#0F1A30]/80 backdrop-blur-md border border-[#C5A059]/40 text-xs md:text-sm text-[#E5C384] shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="font-semibold">مشجرة {familyName} (الطبعة الحالية)</span>
          <span className="text-slate-400 text-xs hidden sm:inline">| نسبة التكبير: {Math.round(scale * 100)}%</span>
        </div>

        {/* Zoom & Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5 bg-[#0F1A30]/80 backdrop-blur-md border border-white/10 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-full hover:bg-[#C5A059]/20 text-slate-200 hover:text-[#E5C384] transition"
            title="تكبير (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-full hover:bg-[#C5A059]/20 text-slate-200 hover:text-[#E5C384] transition"
            title="تصغير (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-full hover:bg-[#C5A059]/20 text-slate-200 hover:text-[#E5C384] transition"
            title="إعادة ضبط (100%)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-[#C5A059]/20 text-slate-200 hover:text-[#E5C384] transition"
            title="تحميل نسخة المشجرة"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-[#C5A059]/20 text-slate-200 hover:text-[#E5C384] transition"
            title={isFullscreen ? 'تصغير الشاشة' : 'عرض بملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Helpful drag prompt banner at bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full px-4 py-1 bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] text-slate-300">
          <Move className="w-3 h-3 text-[#C5A059]" />
          <span>اسحب للتنقل بين الفروع | قرّب بإصبعيك أو أزرار التكبير للقراءة بوضوح</span>
        </div>
      </div>

      {/* Interactive Canvas / Image Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="flex items-center justify-center p-6"
        >
          <img
            src={imageUrl}
            alt={`مشجرة ${familyName}`}
            className="max-w-none w-auto max-h-[85vh] shadow-2xl rounded-xl border border-[#C5A059]/20 pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};
