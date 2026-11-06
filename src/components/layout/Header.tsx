import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { 
  Menu, 
  Plus, 
  Sparkles, 
  Timer, 
  Receipt,
  RotateCcw,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { formatSecondsToTimer } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewInvoiceModal: () => void;
  onOpenNewExpenseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenNewInvoiceModal,
  onOpenNewExpenseModal,
}) => {
  const {
    activeModule,
    setActiveModule,
    activeTimer,
    timerSeconds,
    stopTimer,
    settings,
    loadDemoData,
    clearAllData,
  } = useApp();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const currentUser = authService.getCurrentUser();

  const moduleTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    clients: 'Client Directory',
    projects: 'Projects & Milestones',
    time_tracker: 'Time Tracker',
    invoices: 'Invoice Generator',
    payments: 'Payment Ledger',
    expenses: 'Expense Management',
    financials: 'Financial Overview',
    reports: 'Financial & Tax Reports',
    tax: 'Tax Management',
    team: 'Team & Permissions',
    profile: 'Company Profile',
    settings: 'Workspace Settings',
  };

  const businessTitle = settings.businessName || currentUser?.company || 'My Workspace';
  const whatsappNumber = settings.whatsappNumber || settings.phone;

  const handleLogout = async () => {
    await authService.signOut();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Single-Line Breadcrumb / Module title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
          <h1 data-business-name className="font-bold text-slate-900 tracking-tight text-sm sm:text-base truncate">
            {businessTitle}
          </h1>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-medium text-slate-600 tracking-tight text-xs sm:text-sm hidden sm:inline">
            {moduleTitles[activeModule] || 'Overview'}
          </span>
        </div>
      </div>

      {/* Zone 2: Dynamic Contact & Live status / Timer affordance */}
      <div className="hidden md:flex items-center gap-3">
        {whatsappNumber && (
          <a
            data-whatsapp-contact
            href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, I would like to contact ${businessTitle}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            title={`Contact ${businessTitle} on WhatsApp`}
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366]" />
            <span>{whatsappNumber}</span>
          </a>
        )}
        {activeTimer ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-emerald-900 font-medium truncate max-w-[140px]">
              {activeTimer.description}
            </span>
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">
              {formatSecondsToTimer(timerSeconds)}
            </span>
            <button
              onClick={() => stopTimer()}
              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline ml-1 cursor-pointer"
            >
              Stop
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveModule('time_tracker')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 py-1.5 px-2.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            <Timer className="w-4 h-4 text-slate-500" />
            <span>Time Tracker</span>
          </button>
        )}
      </div>

      {/* Zone 3: Actions + User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Log Expense button */}
        <button
          type="button"
          onClick={onOpenNewExpenseModal}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          <Receipt className="w-3.5 h-3.5 text-slate-500" />
          <span>Add Expense</span>
        </button>

        {/* Primary CTA: New Invoice */}
        <button
          type="button"
          onClick={onOpenNewInvoiceModal}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shadow-xs transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </button>

        {/* Authenticated User & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => setActiveModule('profile')}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 text-xs text-slate-700 transition-colors"
              title={`Logged in as ${currentUser.name} (${currentUser.role})`}
            >
              <div className="w-7 h-7 rounded-full bg-[#142B4A] text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.slice(0, 1).toUpperCase()}
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Logout from Workspace"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
