import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { authService, AuthUser } from './services/authService';
import { reminderService } from './services/reminderService';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';

// Module views
import { DashboardView } from './components/modules/DashboardView';
import { ClientsView } from './components/modules/ClientsView';
import { ProjectsView } from './components/modules/ProjectsView';
import { TimeTrackerView } from './components/modules/TimeTrackerView';
import { InvoicesView } from './components/modules/InvoicesView';
import { PaymentsView } from './components/modules/PaymentsView';
import { ExpensesView } from './components/modules/ExpensesView';
import { FinancialsView } from './components/modules/FinancialsView';
import { ReportsView } from './components/modules/ReportsView';
import { SettingsView } from './components/modules/SettingsView';
import { TaxManagement } from './components/modules/TaxManagement';
import { TeamManagement } from './components/modules/TeamManagement';
import { ProfileSettings } from './components/modules/ProfileSettings';

const MainLayout: React.FC = () => {
  const { activeModule, setActiveModule, isLoading, invoices, clients, settings } = useApp();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Global Modal states
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Cross-module states
  const [targetInvoiceForPayment, setTargetInvoiceForPayment] = useState<string | null>(null);
  const [preselectedTimeEntriesForInvoice, setPreselectedTimeEntriesForInvoice] = useState<string[]>([]);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  // Auto-check invoice reminders when workspace is loaded
  useEffect(() => {
    if (!isLoading && invoices.length > 0) {
      reminderService.checkAndSendAutomaticReminders(invoices, clients, settings).catch((err) => {
        console.warn('Auto reminder check error:', err);
      });
    }
  }, [isLoading, invoices.length, clients.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EFEE] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#0D9488] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold text-slate-700 tracking-tight">
          Loading BizTrack Workspace...
        </span>
      </div>
    );
  }

  const handleOpenRecordPaymentForInvoice = (invoiceId: string) => {
    setTargetInvoiceForPayment(invoiceId);
    setIsRecordPaymentOpen(true);
    setActiveModule('payments');
  };

  const handleOpenCreateInvoiceWithEntries = (entryIds: string[]) => {
    setPreselectedTimeEntriesForInvoice(entryIds);
    setIsNewInvoiceOpen(true);
    setActiveModule('invoices');
  };

  const handleSelectInvoiceFromDashboard = (invoiceId: string) => {
    setPreviewInvoiceId(invoiceId);
    setActiveModule('invoices');
  };

  return (
    <div className="min-h-screen bg-[#F4EFEE] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onOpenNewInvoiceModal={() => setIsNewInvoiceOpen(true)}
          onOpenNewExpenseModal={() => setIsNewExpenseOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardView
              onOpenNewInvoiceModal={() => setIsNewInvoiceOpen(true)}
              onOpenNewExpenseModal={() => setIsNewExpenseOpen(true)}
              onOpenNewClientModal={() => setIsNewClientOpen(true)}
              onSelectInvoice={handleSelectInvoiceFromDashboard}
            />
          )}

          {activeModule === 'clients' && (
            <ClientsView
              isOpenCreateModal={isNewClientOpen}
              onOpenCreateModal={() => setIsNewClientOpen(true)}
              onCloseCreateModal={() => setIsNewClientOpen(false)}
            />
          )}

          {activeModule === 'projects' && (
            <ProjectsView
              isOpenCreateModal={isNewProjectOpen}
              onOpenCreateModal={() => setIsNewProjectOpen(true)}
              onCloseCreateModal={() => setIsNewProjectOpen(false)}
            />
          )}

          {activeModule === 'time_tracker' && (
            <TimeTrackerView
              onOpenCreateInvoiceWithEntries={handleOpenCreateInvoiceWithEntries}
            />
          )}

          {activeModule === 'invoices' && (
            <InvoicesView
              isOpenCreateModal={isNewInvoiceOpen}
              onOpenCreateModal={() => setIsNewInvoiceOpen(true)}
              onCloseCreateModal={() => {
                setIsNewInvoiceOpen(false);
                setPreselectedTimeEntriesForInvoice([]);
              }}
              preselectedTimeEntryIds={preselectedTimeEntriesForInvoice}
              selectedInvoiceId={previewInvoiceId}
              onClearSelectedInvoice={() => setPreviewInvoiceId(null)}
              onOpenRecordPayment={handleOpenRecordPaymentForInvoice}
            />
          )}

          {activeModule === 'payments' && (
            <PaymentsView
              isOpenRecordModal={isRecordPaymentOpen}
              onOpenRecordModal={() => setIsRecordPaymentOpen(true)}
              onCloseRecordModal={() => {
                setIsRecordPaymentOpen(false);
                setTargetInvoiceForPayment(null);
              }}
              presetInvoiceId={targetInvoiceForPayment}
            />
          )}

          {activeModule === 'expenses' && (
            <ExpensesView
              isOpenCreateModal={isNewExpenseOpen}
              onOpenCreateModal={() => setIsNewExpenseOpen(true)}
              onCloseCreateModal={() => setIsNewExpenseOpen(false)}
            />
          )}

          {activeModule === 'financials' && <FinancialsView />}

          {activeModule === 'reports' && <ReportsView />}

          {activeModule === 'tax' && <TaxManagement />}

          {activeModule === 'team' && <TeamManagement />}

          {activeModule === 'profile' && <ProfileSettings />}

          {activeModule === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Protected Routes: If not logged in, render Login / Signup
  if (!currentUser) {
    return authView === 'login' ? (
      <Login
        onSuccess={(user) => setCurrentUser(user)}
        onNavigateToSignup={() => setAuthView('signup')}
      />
    ) : (
      <Signup
        onSuccess={(user) => setCurrentUser(user)}
        onNavigateToLogin={() => setAuthView('login')}
      />
    );
  }

  // Authenticated workspace
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
