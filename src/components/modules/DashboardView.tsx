import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { WhatsAppReminderModal, WhatsAppIcon } from '../common/WhatsAppReminderModal';
import { 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  TrendingUp, 
  Briefcase, 
  AlertCircle,
  Plus,
  Play,
  CheckCircle2,
  ChevronRight,
  FileText,
  Percent,
  Scale
} from 'lucide-react';
import { formatCurrency, formatDate, formatSecondsToHours } from '../../utils/formatters';
import { FinancialChart } from '../charts/FinancialChart';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { taxService } from '../../services/taxService';
import { authService } from '../../services/authService';

interface DashboardViewProps {
  onOpenNewInvoiceModal: () => void;
  onOpenNewExpenseModal: () => void;
  onOpenNewClientModal: () => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewInvoiceModal,
  onOpenNewExpenseModal,
  onOpenNewClientModal,
  onSelectInvoice,
}) => {
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);
  const {
    clients,
    projects,
    invoices,
    payments,
    expenses,
    settings,
    totalRevenue,
    totalOutstanding,
    totalExpenses,
    netProfit,
    profitMarginPercent,
    totalHoursLogged,
    unbilledHours,
    unbilledEarnings,
    setActiveModule,
    activeTimer,
    timerSeconds,
    stopTimer,
    loadDemoData,
  } = useApp();

  // Dynamic Monthly Data for Financial Chart
  const chartMonthlyData = useMemo(() => {
    // Generate last 6 months buckets
    const monthsMap: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      monthsMap[key] = { month: label, revenue: 0, expenses: 0, profit: 0 };
    }

    // Accumulate payments
    payments.forEach((p) => {
      const key = p.paymentDate.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].revenue += Number(p.amount) || 0;
      }
    });

    // Accumulate expenses
    expenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].expenses += Number(e.amount) || 0;
      }
    });

    // Compute profit
    Object.values(monthsMap).forEach((m) => {
      m.profit = m.revenue - m.expenses;
    });

    return Object.values(monthsMap);
  }, [payments, expenses]);

  // Recent invoices (sorted by issueDate desc)
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5);
  }, [invoices]);

  // Active in-progress projects
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'in_progress').slice(0, 4);
  }, [projects]);

  const currentUser = authService.getCurrentUser();

  // Real-time tax liability report
  const taxReport = useMemo(() => {
    return taxService.generateTaxReport(invoices, expenses);
  }, [invoices, expenses]);

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  return (
    <div className="space-y-6">
      {/* Welcome / Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Good day, {currentUser?.name || settings.ownerName || 'Creator'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Financial & operational overview for {settings.businessName || currentUser?.company || 'your business'}.
          </p>
        </div>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModule('tax')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Percent className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Tax Report</span>
          </button>
          <button
            onClick={() => setActiveModule('time_tracker')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Time Tracker</span>
          </button>
          <button
            onClick={onOpenNewClientModal}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Client</span>
          </button>
          <button
            onClick={onOpenNewInvoiceModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Single-Elevation, Tabular figures) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Total Revenue</span>
            <span className="text-emerald-700 font-medium text-[11px] flex items-center">
              Received
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {formatCurrency(totalRevenue, currency, symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <span>Collected across {payments.length} settled payment{payments.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Outstanding Balance</span>
            <span className="text-amber-700 font-medium text-[11px]">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">
            {formatCurrency(totalOutstanding, currency, symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            <span>From active & overdue invoices</span>
          </div>
        </div>

        {/* Operating Net Profit */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Net Operating Profit</span>
            <span className="text-slate-500 font-mono text-[11px]">
              {profitMarginPercent}% margin
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatCurrency(netProfit, currency, symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            <span>Expenses: {formatCurrency(totalExpenses, currency, symbol)}</span>
          </div>
        </div>

        {/* Billable Time & Unbilled */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tracked Hours</span>
            <span className="text-slate-500 font-mono text-[11px]">
              {unbilledHours}h unbilled
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {totalHoursLogged} hrs
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center justify-between">
            <span>Unbilled value:</span>
            <span className="font-mono font-semibold">
              {formatCurrency(unbilledEarnings, currency, symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Flow Chart (Span 2) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Cash Flow & Profit Trends
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly breakdown of revenue, operating expenses, and net profit.
              </p>
            </div>
            <button
              onClick={() => setActiveModule('financials')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
            >
              <span>Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <FinancialChart data={chartMonthlyData} currency={currency} />
        </div>

        {/* Active Projects Status Snapshot (Span 1) */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Active Projects
            </h2>
            <button
              onClick={() => setActiveModule('projects')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
            >
              <span>View All ({projects.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeProjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <Briefcase className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs text-slate-500">No projects currently marked In Progress.</p>
              <button
                onClick={() => setActiveModule('projects')}
                className="mt-3 text-xs font-semibold text-slate-900 underline"
              >
                Create or update projects
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {activeProjects.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveModule('projects')}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-900 truncate max-w-[170px]">
                        {p.name}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                      <span className="truncate">{client?.name || client?.company || 'Direct'}</span>
                      <span className="font-mono text-slate-700">
                        {p.billingType === 'hourly'
                          ? `${formatCurrency(p.hourlyRate, currency, symbol)}/hr`
                          : formatCurrency(p.fixedBudget, currency, symbol)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Module 4: Tax Management & Liability Snapshot */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Tax Report & Net Liability Snapshot
            </h2>
          </div>
          <button
            onClick={() => setActiveModule('tax')}
            className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 hover:underline"
          >
            <span>Manage Tax Settings ({settings.defaultTaxRate ?? 16}%)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Total Output Tax Collected</span>
            <span className="text-lg font-bold font-mono text-emerald-700">
              {formatCurrency(taxReport.taxCollected, currency, symbol)}
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Deductible Input Tax</span>
            <span className="text-lg font-bold font-mono text-amber-700">
              {formatCurrency(taxReport.taxDeductions, currency, symbol)}
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Estimated Net Tax Due</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {formatCurrency(taxReport.netTaxPayable, currency, symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Recent Invoices
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status and payment balance of latest client billings.
            </p>
          </div>
          <button
            onClick={() => setActiveModule('invoices')}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 self-start sm:self-auto hover:underline"
          >
            <span>Manage All Invoices ({invoices.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices created yet"
            description="Create your first client invoice with itemized line items, tax, and automatic calculations."
            actionLabel="Create First Invoice"
            onAction={onOpenNewInvoiceModal}
            secondaryActionLabel="Load Sample Demo Data"
            onSecondaryAction={loadDemoData}
          />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Invoice #</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 pr-2 text-right w-24">Remind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 pr-4 font-mono font-medium text-slate-900 group-hover:text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {client?.name || 'Unnamed Client'}
                        </div>
                        {client?.company && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {client.company}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(inv.totalAmount, currency, symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span className={inv.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatCurrency(inv.balanceDue, currency, symbol)}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {inv.balanceDue > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWhatsAppInvoice(inv);
                            }}
                            className="p-1.5 text-[#25D366] hover:text-[#1da851] hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Send WhatsApp Reminder"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                            <span className="text-[10px] font-semibold hidden md:inline">WhatsApp</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={!!whatsAppInvoice}
        onClose={() => setWhatsAppInvoice(null)}
        invoice={whatsAppInvoice}
      />
    </div>
  );
};
