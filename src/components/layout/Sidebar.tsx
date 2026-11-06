import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppModule } from '../../types';
import { authService } from '../../services/authService';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Timer, 
  FileText, 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  FileBarChart2, 
  Settings,
  Percent,
  UserCheck,
  Building2,
  StopCircle,
  LogOut
} from 'lucide-react';
import { formatSecondsToTimer, formatCurrency } from '../../utils/formatters';

interface NavItem {
  id: AppModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeModule,
    setActiveModule,
    clients,
    projects,
    invoices,
    expenses,
    activeTimer,
    timerSeconds,
    stopTimer,
    getProjectById,
    settings,
    totalOutstanding,
    unbilledEarnings,
  } = useApp();

  const currentUser = authService.getCurrentUser();
  const activeProject = activeTimer ? getProjectById(activeTimer.projectId) : undefined;
  const businessName = settings.businessName || currentUser?.company || 'My Workspace';
  const contactPhone = settings.whatsappNumber || settings.phone;
  const initials = businessName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'BW';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users, count: clients.length },
    { id: 'projects', label: 'Projects', icon: Briefcase, count: projects.filter(p => p.status === 'in_progress').length },
    { id: 'time_tracker', label: 'Time Tracker', icon: Timer },
    { 
      id: 'invoices', 
      label: 'Invoices', 
      icon: FileText, 
      count: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length 
    },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
    { id: 'financials', label: 'Financials', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    { id: 'tax', label: 'Tax Management', icon: Percent },
    { id: 'team', label: 'Team & Access', icon: UserCheck },
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelectModule = (mod: AppModule) => {
    setActiveModule(mod);
    onClose();
  };

  const handleLogout = async () => {
    await authService.signOut();
    window.location.reload();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`sidebar fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#142B4A] text-slate-100 border-r border-[#1D3B63] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#1D3B63] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <span data-business-name className="font-semibold text-white tracking-tight text-sm block leading-tight truncate">
                {businessName}
              </span>
              {contactPhone ? (
                <a
                  data-whatsapp-contact
                  href={`https://wa.me/${contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, I would like to contact ${businessName}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-teal-300 hover:text-teal-200 font-mono tracking-wide flex items-center gap-1 mt-0.5 truncate"
                  title="Contact via WhatsApp"
                >
                  <span>{contactPhone}</span>
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 block mt-0.5">SaaS Workspace</span>
              )}
            </div>
          </div>
          {settings.isDemoMode && (
            <span className="text-[10px] font-mono font-medium text-teal-300 bg-teal-950/80 border border-teal-700/80 px-1.5 py-0.5 rounded shrink-0">
              Demo
            </span>
          )}
        </div>

        {/* Live Active Timer Strip in Sidebar */}
        {activeTimer && (
          <div className="mx-3 mt-3 p-3 rounded-lg bg-[#0E1F35] border border-[#1D3B63]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium text-teal-300">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Active Tracker
              </span>
              <span className="font-mono font-semibold text-teal-200 tabular-nums">
                {formatSecondsToTimer(timerSeconds)}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mb-2">
              {activeProject ? activeProject.name : activeTimer.description}
            </p>
            <button
              onClick={() => stopTimer()}
              className="w-full flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5" />
              Stop & Log Hours
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-[#0D9488] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${
                      isActive
                        ? 'bg-teal-900/60 text-white border-teal-600/60'
                        : 'bg-[#1D3B63] text-slate-200 border-[#254A7C]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Metrics & User Info */}
        <footer className="p-4 border-t border-[#1D3B63] shrink-0 bg-[#0E1F35] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Outstanding Due:</span>
            <span className="font-mono font-semibold text-white">
              {formatCurrency(totalOutstanding, settings.defaultCurrency, settings.currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Unbilled Work:</span>
            <span className="font-mono font-semibold text-teal-300">
              {formatCurrency(unbilledEarnings, settings.defaultCurrency, settings.currencySymbol)}
            </span>
          </div>

          {/* User profile & quick signout */}
          {currentUser && (
            <div className="pt-2 border-t border-[#1D3B63]/80 flex items-center justify-between text-[11px] text-slate-300">
              <div className="truncate mr-2">
                <span className="font-semibold text-white block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-teal-300 uppercase tracking-wider font-mono">{currentUser.role}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
};
