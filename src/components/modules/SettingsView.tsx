import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode } from '../../types';
import { demoService } from '../../services/demoService';
import { reminderService, ReminderConfig } from '../../services/reminderService';
import { taxService, COMMON_TAX_PRESETS } from '../../services/taxService';
import { 
  Building2, 
  DollarSign, 
  Database, 
  Download, 
  Upload, 
  Sparkles, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Save,
  Mail,
  Bell,
  Percent,
  Users,
  Trash2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    loadDemoData,
    clearAllData,
    exportDataJSON,
    importDataJSON,
    showToast,
    setActiveModule,
  } = useApp();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearDemoConfirmOpen, setIsClearDemoConfirmOpen] = useState(false);

  // Profile fields (Dynamic)
  const [businessName, setBusinessName] = useState(settings.businessName || 'My Workspace');
  const [ownerName, setOwnerName] = useState(settings.ownerName || 'Workspace Owner');
  const [email, setEmail] = useState(settings.email || 'billing@myworkspace.io');
  const [phone, setPhone] = useState(settings.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || '');
  const [website, setWebsite] = useState(settings.website || '');
  const [address, setAddress] = useState(settings.address || '');
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(settings.defaultCurrency);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate ?? 16);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(settings.defaultPaymentTerms);
  const [bankDetails, setBankDetails] = useState(settings.bankDetails);
  const [invoiceNotesTemplate, setInvoiceNotesTemplate] = useState(settings.invoiceNotesTemplate);

  // Reminder settings (Module 3)
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(reminderService.getConfig());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBusinessName(settings.businessName || 'My Workspace');
    setOwnerName(settings.ownerName || 'Workspace Owner');
    setEmail(settings.email || 'billing@myworkspace.io');
    setPhone(settings.phone || '');
    setWhatsappNumber(settings.whatsappNumber || '');
    setWebsite(settings.website || '');
    setAddress(settings.address || '');
    setTaxId(settings.taxId || '');
    setDefaultCurrency(settings.defaultCurrency);
    setCurrencySymbol(settings.currencySymbol);
    setDefaultTaxRate(settings.defaultTaxRate ?? 16);
    setDefaultPaymentTerms(settings.defaultPaymentTerms);
    setBankDetails(settings.bankDetails);
    setInvoiceNotesTemplate(settings.invoiceNotesTemplate);
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      businessName,
      ownerName,
      email,
      phone,
      whatsappNumber,
      website,
      address,
      taxId,
      defaultCurrency,
      currencySymbol,
      defaultTaxRate: Number(defaultTaxRate) || 0,
      defaultPaymentTerms,
      bankDetails,
      invoiceNotesTemplate,
      autoEmailReminders: reminderConfig.enabled,
    });

    // Also update tax service default
    taxService.saveTaxSettings({
      defaultTaxRate: Number(defaultTaxRate) || 0,
      taxIdNumber: taxId,
    });

    showToast('Workspace settings saved successfully.');
  };

  const handleCurrencyChange = (curr: CurrencyCode) => {
    setDefaultCurrency(curr);
    const symbolMap: Record<CurrencyCode, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'CA$',
      AUD: 'AU$',
      JPY: '¥',
      INR: '₹',
      CHF: 'CHF ',
    };
    setCurrencySymbol(symbolMap[curr] || '$');
  };

  const handleToggleReminder = (enabled: boolean) => {
    const updated = reminderService.saveConfig({ enabled });
    setReminderConfig(updated);
    updateSettings({ autoEmailReminders: enabled });
    showToast(enabled ? 'Automatic email reminders enabled.' : 'Automatic reminders disabled.');
  };

  const handleReminderDaysChange = (days: number) => {
    const updated = reminderService.saveConfig({ daysBeforeDue: days });
    setReminderConfig(updated);
  };

  const handleClearDemoDataConfirm = async () => {
    try {
      const stats = await demoService.clearAllDemoData();
      showToast(
        `Cleared ${stats.clearedClients} demo clients, ${stats.clearedInvoices} demo invoices. Workspace is clean for real clients!`,
        'success'
      );
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to clear demo data.', 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await importDataJSON(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Workspace Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize your business invoicing identity, tax rates, automatic reminders, and data storage.
        </p>
      </div>

      {/* Module 7: Dedicated Demo Data Management Banner */}
      <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Demo Data Clean-up for New Clients
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Remove all sample records (Apex Corp, Nexus Technologies, Solaria Creative, Kinetic Media) with one click to start fresh for a real client.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsClearDemoConfirmOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Demo Data</span>
        </button>
      </div>

      {/* Confirmation Modal for Clearing Demo Data */}
      <ConfirmModal
        isOpen={isClearDemoConfirmOpen}
        onClose={() => setIsClearDemoConfirmOpen(false)}
        onConfirm={handleClearDemoDataConfirm}
        title="Clear All Demo Data?"
        message="Are you sure? This will delete ALL sample demo data (Apex Corp, Nexus, Solaria, Kinetic) at once, leaving an empty clean app ready for a new client. Real records will remain intact."
        confirmLabel="Yes, Clear All Demo Data"
      />

      {/* Module 3: Automatic Email Reminders Section */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Automatic Email Reminders
            </h2>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={reminderConfig.enabled}
              onChange={(e) => handleToggleReminder(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D9488]"></div>
          </label>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Automatically send polite, itemized email notifications to clients when an invoice is due soon (3 days before), due today, or overdue.
        </p>

        {reminderConfig.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-teal-50/50 border border-teal-100 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Upcoming Reminder Lead Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={reminderConfig.daysBeforeDue}
                  onChange={(e) => handleReminderDaysChange(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center font-mono"
                />
                <span className="text-slate-600">days before Due Date</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-700 block">Active Triggers:</span>
              <p className="text-slate-600 text-[11px]">• 3 Days Before Due Date (Upcoming reminder)</p>
              <p className="text-slate-600 text-[11px]">• On Due Date (Due today alert)</p>
              <p className="text-slate-600 text-[11px]">• After Due Date (Overdue notice)</p>
            </div>
          </div>
        )}
      </div>

      {/* Module 4: Tax Management Section */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Tax Settings & Default Rate
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveModule('tax')}
            className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1"
          >
            <span>Open Tax Report</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Set your standard business tax percentage. Tax automatically calculates on every invoice and shows itemized: <strong className="text-slate-900">Subtotal + Tax = Total</strong>.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-700 mr-2">Quick Presets:</span>
            {COMMON_TAX_PRESETS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setDefaultTaxRate(rate)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  defaultTaxRate === rate
                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tax ID / VAT Registration #
              </label>
              <input
                type="text"
                placeholder="e.g. VAT-892182"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Business Identity */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Business Profile & Invoice Header
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('profile')}
              className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1"
            >
              <span>Full Profile Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Company / Studio Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Owner / Contact Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Official Billing Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number / WhatsApp
              </label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setWhatsappNumber(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Headquarters Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Innovation Way, City, Country"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://mycompany.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
          </div>
        </div>

        {/* Currency & Financial Standards */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Currency & Invoicing Terms
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="CAD">CAD (CA$) - Canadian Dollar</option>
                <option value="AUD">AUD (AU$) - Australian Dollar</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="CHF">CHF (CHF) - Swiss Franc</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Payment Terms
              </label>
              <input
                type="text"
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bank Account & Wire Instructions (Included on Invoices)
            </label>
            <textarea
              rows={3}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Default Invoice Notes / Thank You Message
            </label>
            <textarea
              rows={2}
              value={invoiceNotesTemplate}
              onChange={(e) => setInvoiceNotesTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Workspace Profile</span>
            </button>
          </div>
        </div>
      </form>

      {/* Data Management & Storage Abstraction */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Database className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Data Portability & Storage Management
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          BizTrack runs with a hybrid storage layer: cloud persistence with offline caching and instant device synchronization.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Backup / Export */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-1">
                Export Full Backup
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Download a complete JSON snapshot of all clients, projects, time logs, invoices, and payments.
              </p>
            </div>
            <button
              type="button"
              onClick={exportDataJSON}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 self-start cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON Backup</span>
            </button>
          </div>

          {/* Restore / Import */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-1">
                Restore From Backup
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Upload a previously saved BizTrack JSON file to restore your entire database.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                id="import-json-file"
              />
              <label
                htmlFor="import-json-file"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 self-start cursor-pointer w-fit"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import JSON File</span>
              </label>
            </div>
          </div>
        </div>

        {/* Reset Zone */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">
              Clear All Data (Hard Reset)
            </h3>
            <p className="text-[11px] text-slate-500">
              Wipe all local and cached state to return to an empty workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Data</span>
          </button>
        </div>

        {/* Reset Confirmation Modal */}
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={async () => {
            await clearAllData();
          }}
          title="Reset Workspace Data"
          message="Are you sure you want to clear all data and return to an empty workspace? All clients, invoices, time logs, and payments will be removed."
        />
      </div>
    </div>
  );
};
