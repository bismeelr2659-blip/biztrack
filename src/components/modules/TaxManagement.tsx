import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { taxService, COMMON_TAX_PRESETS, TaxSettings } from '../../services/taxService';
import { formatCurrency } from '../../utils/formatters';
import { 
  Percent, 
  Receipt, 
  FileText, 
  Check, 
  Save, 
  Download, 
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Scale
} from 'lucide-react';

export const TaxManagement: React.FC = () => {
  const { invoices, expenses, settings, updateSettings, showToast } = useApp();
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(taxService.getTaxSettings());
  const [selectedRate, setSelectedRate] = useState<number>(taxSettings.defaultTaxRate);
  const [taxIdInput, setTaxIdInput] = useState<string>(taxSettings.taxIdNumber);
  const [taxNameInput, setTaxNameInput] = useState<string>(taxSettings.taxName);

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Generate real-time tax report based on current invoices and expenses
  const report = useMemo(() => {
    return taxService.generateTaxReport(invoices, expenses);
  }, [invoices, expenses]);

  const handleSaveTaxConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = taxService.saveTaxSettings({
      defaultTaxRate: Number(selectedRate) || 0,
      taxIdNumber: taxIdInput.trim(),
      taxName: taxNameInput.trim() || 'Sales Tax / VAT',
    });
    setTaxSettings(updated);

    // Also sync to global settings
    await updateSettings({
      defaultTaxRate: Number(selectedRate) || 0,
      taxId: taxIdInput.trim(),
    });

    showToast(`Tax rate updated to ${selectedRate}%. Applied to new invoices.`);
  };

  const handleExportTaxReport = () => {
    const headers = ['Month', 'Gross Invoiced', 'Tax Collected', 'Total Expenses', 'Tax Deductible Expenses'];
    const rows = report.taxBreakdownByMonth.map(m => [
      m.month,
      m.grossInvoiced.toFixed(2),
      m.taxCollected.toFixed(2),
      m.expenses.toFixed(2),
      m.taxDeductible.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BizTrack-Tax-Report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Tax report downloaded as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#0D9488]" />
            <span>Tax Management & Reporting</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure your standard business tax percentage, automated subtotal breakdowns, and tax liability reporting.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportTaxReport}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Tax Report (CSV)</span>
        </button>
      </div>

      {/* Tax KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Output Tax Collected */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Total Tax Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(report.taxCollected, currency, symbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            From {invoices.length} issued invoices
          </div>
        </div>

        {/* Tax Deductions */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tax Deductible Expenses</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(report.deductibleExpenses, currency, symbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            From verified deductible operating receipts
          </div>
        </div>

        {/* Net Tax Liability */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Estimated Net Tax Due</span>
            <Scale className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {formatCurrency(report.netTaxPayable, currency, symbol)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Output tax minus deductible input adjustments
          </div>
        </div>
      </div>

      {/* Tax Configuration Form */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
          Default Tax Rate & Invoicing Rules
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Select or enter your business tax percentage. Every invoice will calculate: <strong className="text-slate-800">Subtotal + Tax = Total</strong>.
        </p>

        <form onSubmit={handleSaveTaxConfig} className="space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Common Tax Presets:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COMMON_TAX_PRESETS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSelectedRate(rate)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    selectedRate === rate
                      ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Tax Rate (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={selectedRate}
                  onChange={(e) => setSelectedRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax Label (e.g. VAT, GST, Sales Tax)
              </label>
              <input
                type="text"
                value={taxNameInput}
                onChange={(e) => setTaxNameInput(e.target.value)}
                placeholder="VAT"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax / VAT Registration ID
              </label>
              <input
                type="text"
                value={taxIdInput}
                onChange={(e) => setTaxIdInput(e.target.value)}
                placeholder="e.g. PK-89102-VAT"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
              />
            </div>
          </div>

          {/* Live Calculation Preview */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-800 block mb-2">Live Invoice Tax Calculation Sample ($1,000 Order):</span>
            <div className="flex items-center gap-4 text-slate-600">
              <span>Subtotal: <strong className="font-mono">$1,000.00</strong></span>
              <span>+</span>
              <span>Tax ({selectedRate}%): <strong className="font-mono">${((1000 * selectedRate) / 100).toFixed(2)}</strong></span>
              <span>=</span>
              <span className="text-emerald-700 font-bold">Total: <strong className="font-mono">${(1000 + (1000 * selectedRate) / 100).toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Tax Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
          Recent Monthly Tax Breakdown
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Historical overview of taxable invoiced revenue and tax collected.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3 text-right">Gross Invoiced</th>
                <th className="py-2 px-3 text-right">Tax Collected</th>
                <th className="py-2 px-3 text-right">Operating Expenses</th>
                <th className="py-2 px-3 text-right">Tax Deductions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.taxBreakdownByMonth.map((m) => (
                <tr key={m.month} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{m.month}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(m.grossInvoiced, currency, symbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                    {formatCurrency(m.taxCollected, currency, symbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatCurrency(m.expenses, currency, symbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                    {formatCurrency(m.taxDeductible, currency, symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
