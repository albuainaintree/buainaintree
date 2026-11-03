import { Family, Submission } from '../types';

/**
 * Helper to generate authentic SVG family tree diagrams with Arabic calligraphy aesthetic,
 * gold flourishes, ancestral nodes, and lineages for any newly added family.
 */
export function generateFamilyTreeSvg(familyName: string, clanName: string = ''): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900" style="background:#090F1C; font-family:'Tajawal','Readex Pro',sans-serif;" dir="rtl">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#14283E" />
      <stop offset="100%" stop-color="#070B14" />
    </radialGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2D6" />
      <stop offset="50%" stop-color="#C5A059" />
      <stop offset="100%" stop-color="#8E6A26" />
    </linearGradient>
    <linearGradient id="boxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#192A47" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0E192D" stop-opacity="0.95" />
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Layer -->
  <rect width="1200" height="900" fill="url(#bgGlow)" />
  
  <!-- Outer Ornate Border -->
  <rect x="25" y="25" width="1150" height="850" rx="16" fill="none" stroke="url(#goldGradient)" stroke-width="2" stroke-opacity="0.4" />
  <rect x="35" y="35" width="1130" height="830" rx="12" fill="none" stroke="url(#goldGradient)" stroke-width="1" stroke-dasharray="6,4" stroke-opacity="0.3" />
  
  <!-- Corner Ornaments -->
  <g fill="none" stroke="url(#goldGradient)" stroke-width="1.5">
    <path d="M 40,70 L 70,40 M 40,85 L 85,40 M 40,40 L 95,40 M 40,40 L 40,95" />
    <path d="M 1160,70 L 1130,40 M 1160,85 L 1115,40 M 1160,40 L 1105,40 M 1160,40 L 1160,95" />
    <path d="M 40,830 L 70,860 M 40,815 L 85,860 M 40,860 L 95,860 M 40,860 L 40,805" />
    <path d="M 1160,830 L 1130,860 M 1160,815 L 1115,860 M 1160,860 L 1105,860 M 1160,860 L 1160,805" />
  </g>

  <!-- Header Banner -->
  <g transform="translate(600, 95)" text-anchor="middle">
    <text font-size="16" fill="#C5A059" letter-spacing="4" font-weight="600">بسم الله الرحمن الرحيم</text>
    <text y="40" font-size="28" fill="url(#goldGradient)" font-weight="800" filter="url(#goldGlow)">مشجرة ${familyName} - قبيلة آل بوعينين</text>
    <text y="70" font-size="16" fill="#94A3B8">النسخة الخامسة (المرجع المعتمد لتحديث الطبعة السادسة)</text>
    <line x1="-300" y1="88" x2="300" y2="88" stroke="url(#goldGradient)" stroke-width="1.5" stroke-opacity="0.6" />
    <circle cx="0" cy="88" r="5" fill="#C5A059" />
  </g>

  <!-- Root Node (الجد الجامع) -->
  <g transform="translate(600, 240)" text-anchor="middle">
    <rect x="-160" y="-35" width="320" height="70" rx="12" fill="url(#boxGradient)" stroke="url(#goldGradient)" stroke-width="2" />
    <text y="-8" font-size="15" fill="#C5A059" font-weight="600">الجد الجامع للأسرة</text>
    <text y="18" font-size="20" fill="#FFFFFF" font-weight="bold">${familyName}</text>
  </g>

  <!-- Connecting Trunk Line -->
  <path d="M 600,275 L 600,340" stroke="#C5A059" stroke-width="2.5" />

  <!-- Generation 1 Horizontal Bar -->
  <path d="M 300,340 L 900,340" stroke="#C5A059" stroke-width="2" />
  <path d="M 300,340 L 300,400" stroke="#C5A059" stroke-width="2" />
  <path d="M 600,340 L 600,400" stroke="#C5A059" stroke-width="2" />
  <path d="M 900,340 L 900,400" stroke="#C5A059" stroke-width="2" />

  <g transform="translate(300, 440)" text-anchor="middle">
    <rect x="-110" y="-30" width="220" height="60" rx="8" fill="url(#boxGradient)" stroke="#C5A059" stroke-width="1.5" />
    <text y="-4" font-size="13" fill="#94A3B8">الفرع (1)</text>
    <text y="17" font-size="16" fill="#F8FAFC" font-weight="bold">ذرية ${familyName}</text>
  </g>

  <g transform="translate(600, 440)" text-anchor="middle">
    <rect x="-110" y="-30" width="220" height="60" rx="8" fill="url(#boxGradient)" stroke="#C5A059" stroke-width="1.5" />
    <text y="-4" font-size="13" fill="#94A3B8">الفرع (2)</text>
    <text y="17" font-size="16" fill="#F8FAFC" font-weight="bold">ذرية ${familyName}</text>
  </g>

  <g transform="translate(900, 440)" text-anchor="middle">
    <rect x="-110" y="-30" width="220" height="60" rx="8" fill="url(#boxGradient)" stroke="#C5A059" stroke-width="1.5" />
    <text y="-4" font-size="13" fill="#94A3B8">الفرع (3)</text>
    <text y="17" font-size="16" fill="#F8FAFC" font-weight="bold">ذرية ${familyName}</text>
  </g>

  <!-- Modern Generation 3 Indicators (Placeholders for pending updates) -->
  <g transform="translate(600, 680)" text-anchor="middle">
    <rect x="-300" y="-45" width="600" height="85" rx="12" fill="#0E2333" stroke="#C5A059" stroke-width="1.5" stroke-dasharray="5,3" />
    <text y="-14" font-size="15" fill="#E5C384" font-weight="bold">📌 منطقة الإضافات والتحديثات الجارية - 2026م</text>
    <text y="14" font-size="13" fill="#94A3B8">يتم تدقيق واعتماد الأسماء المضافة وتحديث المشجرة بانتظام</text>
  </g>

  <!-- Footer Seal & Notes -->
  <g transform="translate(600, 830)" text-anchor="middle">
    <text font-size="13" fill="#64748B">${clanName ? `الفخذ: ${clanName} | ` : ''}وثيقة رسمية خاصة بمشروع تحديث شجرة نسب آل بوعينين</text>
  </g>
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// User requested to clear all families so they can start fresh recording families and uploading their tree images
export const INITIAL_FAMILIES: Family[] = [];

// Empty initial submissions
export const INITIAL_SUBMISSIONS: Submission[] = [];
