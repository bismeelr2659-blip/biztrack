import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileBarChart2, 
  Download, 
  Printer, 
  Calendar, 
  DollarSign, 
  Clock, 
  Building2, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';

type ReportType = 'pnl' | 'time_utilization' | 'client_profitability' | 'tax_summary';
type DateRange = 'all' | 'ytd' | 'this_quarter' | 'this_month';

export const ReportsView: React.FC = () => {
  const {
    invoices,
    payments,
    expenses,
    clients,
    timeEntries,
    settings,
  } = useApp();

  const [activeReport, setActiveReport] = useState<ReportType>('pnl');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Filter entities by date range
  const dateFilter = useMemo(() => {
    const now = new Date();
    let startDate: string | null = null;

    if (dateRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (dateRange === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
    } else if (dateRange === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    return (itemDate?: string) => {
      if (!startDate || !itemDate) return true;
      return itemDate >= startDate;
    };
  }, [dateRange]);

  const filteredPayments = useMemo(() => payments.filter((p) => dateFilter(p.paymentDate)), [payments, dateFilter]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => dateFilter(e.date)), [expenses, dateFilter]);
  const filteredInvoices = useMemo(() => invoices.filter((i) => dateFilter(i.issueDate)), [invoices, dateFilter]);
  const filteredTime = useMemo(() => timeEntries.filter((t) => dateFilter(t.startTime.split('T')[0])), [timeEntries, dateFilter]);

  // Report 1: P&L Data
  const pnlData = useMemo(() => {
    const grossRevenue = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netIncome = grossRevenue - totalOperatingExpenses;
    return {
      grossRevenue,
      totalOperatingExpenses,
      netIncome,
      margin: grossRevenue > 0 ? Math.round((netIncome / grossRevenue) * 100) : 0,
    };
  }, [filteredPayments, filteredExpenses]);

  // Report 2: Time Utilization Data
  const timeData = useMemo(() => {
    let totalSecs = 0;
    let billableSecs = 0;
    let totalEarnings = 0;

    filteredTime.forEach((t) => {
      totalSecs += Number(t.durationSeconds) || 0;
      if (t.isBillable) {
        billableSecs += Number(t.durationSeconds) || 0;
        const hours = (Number(t.durationSeconds) || 0) / 3600;
        totalEarnings += hours * (Number(t.hourlyRate) || 0);
      }
    });

    const totalHours = Math.round((totalSecs / 3600) * 10) / 10;
    const billableHours = Math.round((billableSecs / 3600) * 10) / 10;
    const nonBillableHours = Math.max(0, Math.round((totalHours - billableHours) * 10) / 10);
    const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    const effectiveHourlyRate = billableHours > 0 ? Math.round(totalEarnings / billableHours) : 0;

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      utilizationRate,
      effectiveHourlyRate,
      totalEarnings,
    };
  }, [filteredTime]);

  // Report 3: Client Profitability
  const clientProfitability = useMemo(() => {
    const map: Record<string, { name: string; company?: string; billed: number; collected: number; directExpenses: number; netContribution: number }> = {};
    clients.forEach((c) => {
      map[c.id] = { name: c.name, company: c.company, billed: 0, collected: 0, directExpenses: 0, netContribution: 0 };
    });

    filteredInvoices.forEach((inv) => {
      if (map[inv.clientId]) {
        map[inv.clientId].billed += Number(inv.totalAmount) || 0;
      }
    });

    filteredPayments.forEach((p) => {
      if (map[p.clientId]) {
        map[p.clientId].collected += Number(p.amount) || 0;
      }
    });

    filteredExpenses.forEach((e) => {
      if (e.projectId) {
        // Find client for project
        // (if any)
      }
    });

    Object.values(map).forEach((c) => {
      c.netContribution = c.collected - c.directExpenses;
    });

    return Object.values(map).sort((a, b) => b.collected - a.collected);
  }, [clients, filteredInvoices, filteredPayments, filteredExpenses]);

  // Report 4: Tax Deductions Summary
  const taxSummary = useMemo(() => {
    const deductibleExpenses = filteredExpenses.filter((e) => e.isTaxDeductible);
    const totalDeductible = deductibleExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const estimatedTaxCollected = filteredInvoices.reduce((sum, i) => sum + (Number(i.taxAmount) || 0), 0);

    return {
      deductibleExpenses,
      totalDeductible,
      estimatedTaxCollected,
    };
  }, [filteredExpenses, filteredInvoices]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const dateTag = new Date().toISOString().split('T')[0];

    if (activeReport === 'pnl') {
      const headers = ['Category', 'Amount (USD)', 'Notes'];
      const rows = [
        ['Gross Revenue Collected', pnlData.grossRevenue, 'Settled invoice payments'],
        ['Total Operating Expenses', pnlData.totalOperatingExpenses, 'Operating costs and gear'],
        ['Net Operating Profit', pnlData.netIncome, `${pnlData.margin}% profit margin`],
      ];
      exportToCSV(`BizTrack-Profit-and-Loss-${dateTag}.csv`, headers, rows);
    } else if (activeReport === 'time_utilization') {
      const headers = ['Date', 'Project', 'Task Description', 'Duration (Hours)', 'Billable', 'Hourly Rate ($)', 'Value ($)'];
      const rows = filteredTime.map((t) => {
        const hours = (t.durationSeconds / 3600).toFixed(2);
        const val = t.isBillable ? (parseFloat(hours) * t.hourlyRate).toFixed(2) : '0';
        return [
          t.startTime.split('T')[0],
          t.projectId,
          t.description,
          hours,
          t.isBillable ? 'Yes' : 'No',
          t.hourlyRate,
          val,
        ];
      });
      exportToCSV(`BizTrack-Time-Utilization-${dateTag}.csv`, headers, rows);
    } else if (activeReport === 'client_profitability') {
      const headers = ['Client Name', 'Company', 'Total Invoiced ($)', 'Total Collected ($)', 'Direct Expenses ($)', 'Net Contribution ($)'];
      const rows = clientProfitability.map((c) => [
        c.name,
        c.company || '',
        c.billed.toFixed(2),
        c.collected.toFixed(2),
        c.directExpenses.toFixed(2),
        c.netContribution.toFixed(2),
      ]);
      exportToCSV(`BizTrack-Client-Profitability-${dateTag}.csv`, headers, rows);
    } else if (activeReport === 'tax_summary') {
      const headers = ['Date', 'Vendor', 'Category', 'Description', 'Deductible Amount ($)', 'Receipt Reference'];
      const rows = taxSummary.deductibleExpenses.map((e) => [
        e.date,
        e.vendor,
        e.category,
        e.description,
        e.amount.toFixed(2),
        e.receiptNote || '',
      ]);
      exportToCSV(`BizTrack-Tax-Deductions-${dateTag}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial & Tax Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export statements for tax filings, client profitability, and time utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">All Historical Time</option>
            <option value="ytd">Year to Date (YTD)</option>
            <option value="this_quarter">Current Quarter</option>
            <option value="this_month">This Month</option>
          </select>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto text-xs">
        <button
          onClick={() => setActiveReport('pnl')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
            activeReport === 'pnl' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReport('time_utilization')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
            activeReport === 'time_utilization'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600'
          }`}
        >
          Time Utilization & Billing
        </button>
        <button
          onClick={() => setActiveReport('client_profitability')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
            activeReport === 'client_profitability'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600'
          }`}
        >
          Client Profitability
        </button>
        <button
          onClick={() => setActiveReport('tax_summary')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
            activeReport === 'tax_summary'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600'
          }`}
        >
          Tax Deductions Ledger
        </button>
      </div>

      {/* REPORT CONTENT: 1. P&L Statement */}
      {activeReport === 'pnl' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Statement of Profit and Loss
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cash basis accounting of income collected and operating expenses incurred.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl text-xs">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                Operating Revenue (Inflows)
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Client Payments Settled</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(pnlData.grossRevenue, currency, symbol)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 border-b border-slate-200">
                <span>Total Gross Revenue</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(pnlData.grossRevenue, currency, symbol)}
                </span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2 pt-2">
              <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                Operating Expenses (Outflows)
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">General Business Operating Expenses</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(pnlData.totalOperatingExpenses, currency, symbol)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 border-b border-slate-200">
                <span>Total Operating Expenses</span>
                <span className="font-mono text-rose-600">
                  -{formatCurrency(pnlData.totalOperatingExpenses, currency, symbol)}
                </span>
              </div>
            </div>

            {/* Net Operating Income */}
            <div className="pt-4 border-t-2 border-slate-900">
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Net Operating Income (Profit)</span>
                <span className="font-mono text-base">
                  {formatCurrency(pnlData.netIncome, currency, symbol)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Net Operating Margin: {pnlData.margin}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 2. Time Utilization */}
      {activeReport === 'time_utilization' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Time Utilization & Productivity Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Efficiency breakdown comparing billable client hours against internal overhead.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Logged Time</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {timeData.totalHours} hrs
              </span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Billable Hours</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                {timeData.billableHours} hrs
              </span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Utilization Rate</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {timeData.utilizationRate}%
              </span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Effective Hourly Rate</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                ${timeData.effectiveHourlyRate}/hr
              </span>
            </div>
          </div>

          {/* Time logs listing */}
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Duration</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 pl-4 text-right">Calculated Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTime.map((t) => {
                  const hours = (t.durationSeconds / 3600);
                  const val = t.isBillable ? hours * t.hourlyRate : 0;
                  return (
                    <tr key={t.id}>
                      <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                        {formatDate(t.startTime)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">{t.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 whitespace-nowrap">
                        {hours.toFixed(1)} hrs
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        {t.isBillable ? `$${t.hourlyRate}/hr` : 'Non-billable'}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {t.isBillable ? formatCurrency(val, currency, symbol) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 3. Client Profitability */}
      {activeReport === 'client_profitability' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Client Profitability Statement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Net revenue contribution per client account.
            </p>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Client Name</th>
                  <th className="py-2.5 px-4">Company</th>
                  <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Collected Revenue</th>
                  <th className="py-2.5 pl-4 text-right">Net Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientProfitability.map((c, idx) => (
                  <tr key={idx}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-500">{c.company || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(c.billed, currency, symbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(c.collected, currency, symbol)}
                    </td>
                    <td className="py-3 pl-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(c.netContribution, currency, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 4. Tax Summary */}
      {activeReport === 'tax_summary' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Tax Deductible Expenses & Sales Tax Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated deduction report ready for CPA hand-off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Deductible Expenses</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                {formatCurrency(taxSummary.totalDeductible, currency, symbol)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {taxSummary.deductibleExpenses.length} qualifying items
              </span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Sales / Service Tax Invoiced</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {formatCurrency(taxSummary.estimatedTaxCollected, currency, symbol)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                From issued invoices
              </span>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-4">Vendor</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Receipt Ref</th>
                  <th className="py-2.5 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxSummary.deductibleExpenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{e.vendor}</td>
                    <td className="py-2.5 px-4 text-slate-600 capitalize">{e.category}</td>
                    <td className="py-2.5 px-4 text-slate-700">{e.description}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {e.receiptNote || '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                      {formatCurrency(e.amount, currency, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
