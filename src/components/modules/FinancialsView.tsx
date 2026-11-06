import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart, 
  Clock, 
  AlertCircle,
  FileText,
  CreditCard,
  Building2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { FinancialChart } from '../charts/FinancialChart';
import { ExpenseBreakdownBar } from '../charts/ExpenseBreakdownBar';

export const FinancialsView: React.FC = () => {
  const {
    invoices,
    payments,
    expenses,
    clients,
    settings,
    totalRevenue,
    totalInvoiced,
    totalOutstanding,
    totalExpenses,
    netProfit,
    profitMarginPercent,
  } = useApp();

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Monthly trends calculation (last 6 months)
  const chartMonthlyData = useMemo(() => {
    const monthsMap: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      monthsMap[key] = { month: label, revenue: 0, expenses: 0, profit: 0 };
    }

    payments.forEach((p) => {
      const key = p.paymentDate.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].revenue += Number(p.amount) || 0;
      }
    });

    expenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].expenses += Number(e.amount) || 0;
      }
    });

    Object.values(monthsMap).forEach((m) => {
      m.profit = m.revenue - m.expenses;
    });

    return Object.values(monthsMap);
  }, [payments, expenses]);

  // Accounts Receivable Aging Analysis
  const agingAnalysis = useMemo(() => {
    const today = new Date();
    let current0_30 = 0;
    let days31_60 = 0;
    let days61Plus = 0;

    invoices.forEach((inv) => {
      if (inv.status !== 'void' && inv.balanceDue > 0) {
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) {
          current0_30 += inv.balanceDue;
        } else if (diffDays <= 60) {
          days31_60 += inv.balanceDue;
        } else {
          days61Plus += inv.balanceDue;
        }
      }
    });

    return {
      current0_30,
      days31_60,
      days61Plus,
      total: current0_30 + days31_60 + days61Plus,
    };
  }, [invoices]);

  // Expense breakdown by category
  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });

    const categoryLabels: Record<ExpenseCategory, string> = {
      software: 'Software & SaaS',
      hardware: 'Hardware & Gear',
      contractors: 'Subcontractors',
      marketing: 'Marketing & Ads',
      office: 'Office & Rent',
      travel: 'Travel & Transport',
      utilities: 'Cloud & Utilities',
      legal: 'Legal & Accounting',
      meals: 'Meals',
      other: 'Other',
    };

    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat as ExpenseCategory,
        label: categoryLabels[cat as ExpenseCategory] || cat,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpenses]);

  // Client Revenue Contribution Breakdown
  const clientRevenueBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      map[p.clientId] = (map[p.clientId] || 0) + (Number(p.amount) || 0);
    });

    return Object.entries(map)
      .map(([clientId, amount]) => {
        const c = clients.find((client) => client.id === clientId);
        return {
          clientId,
          name: c?.name || 'Unknown Client',
          company: c?.company,
          amount,
          percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [payments, clients, totalRevenue]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Financial Overview
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Dynamic cash flow statements, accounts receivable aging, and expense allocations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Settled Revenue</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatCurrency(totalRevenue, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total Invoiced: {formatCurrency(totalInvoiced, currency, symbol)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Total Expenses</span>
          <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
            {formatCurrency(totalExpenses, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.length} recorded items
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Net Operating Profit</span>
          <span
            className={`text-2xl font-bold font-mono mt-1 block ${
              netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatCurrency(netProfit, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Profit Margin: {profitMarginPercent}%
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Outstanding Receivables</span>
          <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">
            {formatCurrency(totalOutstanding, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Awaiting client remittance
          </span>
        </div>
      </div>

      {/* Main Trends Chart */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Six-Month Cash Flow & Profit Trend
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare monthly revenue collected against operating expenses and net earnings.
          </p>
        </div>
        <FinancialChart data={chartMonthlyData} currency={currency} />
      </div>

      {/* Two Column Section: AR Aging & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Receivable Aging Analysis */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Accounts Receivable Aging
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of outstanding invoices by payment due window.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="font-semibold text-xs text-slate-900 block">
                  Current (0 - 30 Days)
                </span>
                <span className="text-[11px] text-slate-400">Normal billing cycle terms</span>
              </div>
              <span className="font-mono font-semibold text-xs text-slate-900">
                {formatCurrency(agingAnalysis.current0_30, currency, symbol)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-200/70">
              <div>
                <span className="font-semibold text-xs text-amber-900 block">
                  31 - 60 Days Overdue
                </span>
                <span className="text-[11px] text-amber-700/80">Follow-up reminder recommended</span>
              </div>
              <span className="font-mono font-semibold text-xs text-amber-800">
                {formatCurrency(agingAnalysis.days31_60, currency, symbol)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-200/70">
              <div>
                <span className="font-semibold text-xs text-rose-900 block">
                  60+ Days Overdue
                </span>
                <span className="text-[11px] text-rose-700/80">Critical overdue notice required</span>
              </div>
              <span className="font-mono font-semibold text-xs text-rose-800">
                {formatCurrency(agingAnalysis.days61Plus, currency, symbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Operating Expense Allocations */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Expense Allocations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating costs categorized by spend area.
            </p>
          </div>

          <ExpenseBreakdownBar
            categories={expenseCategories}
            total={totalExpenses}
            currency={currency}
          />
        </div>
      </div>

      {/* Top Revenue Contributors by Client */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Client Revenue Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total cash collected per client across all settled milestones and hourly invoices.
          </p>
        </div>

        {clientRevenueBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No payments have been received yet.
          </p>
        ) : (
          <div className="space-y-2 pt-2">
            {clientRevenueBreakdown.map((item) => (
              <div
                key={item.clientId}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-900 truncate">{item.name}</span>
                  {item.company && (
                    <span className="text-slate-400 truncate">({item.company})</span>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0 font-mono">
                  <span className="text-slate-500 text-[11px]">{item.percentage}%</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(item.amount, currency, symbol)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
