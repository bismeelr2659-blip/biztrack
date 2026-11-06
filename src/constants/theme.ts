export const APP_THEME = {
  navyBlue: '#142B4A', // Sidebar and Navigation
  teal: '#0D9488',      // Button and Actions
  white: '#FFFFFF',     // Cards
  background: '#F4EFEE' // Page Background
} as const;

export type AppTheme = typeof APP_THEME;

// Reusable Tailwind class helpers aligned with APP_THEME
export const THEME_CLASSES = {
  sidebar: 'bg-[#142B4A] sidebar text-slate-100 border-[#1B365D]',
  primaryBtn: 'bg-[#0D9488] btn-primary hover:bg-[#0F766E] text-white shadow-xs font-semibold transition-colors',
  card: 'bg-[#FFFFFF] card border border-slate-200 shadow-2xs rounded-xl',
  pageBg: 'bg-[#F4EFEE]',
} as const;
