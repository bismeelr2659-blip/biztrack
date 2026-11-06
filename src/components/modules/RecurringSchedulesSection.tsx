import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  RecurringInvoiceSchedule, 
  RecurringFrequency, 
  InvoiceItem 
} from '../../types';
import { 
  Repeat, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Building2,
  DollarSign,
  FileText,
  HelpCircle
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  calculateInvoiceTotals,
  computeNextRunDate 
} from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';

const FREQUENCY_LABELS: Record<RecurringFrequency, { name: string; periodLabel: string; badgeClass: string }> = {
  weekly: {
    name: 'Weekly',
    periodLabel: 'week',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  biweekly: {
    name: 'Bi-weekly',
    periodLabel: '2 weeks',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  monthly: {
    name: 'Monthly',
    periodLabel: 'month',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  quarterly: {
    name: 'Quarterly',
    periodLabel: 'quarter',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  annually: {
    name: 'Annually',
    periodLabel: 'year',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

interface RecurringSchedulesSectionProps {
  onViewGeneratedInvoice: (invoiceId: string) => void;
  onOpenCreateInvoice?: () => void;
}

export const RecurringSchedulesSection: React.FC<RecurringSchedulesSectionProps> = ({
  onViewGeneratedInvoice,
}) => {
  const {
    recurringSchedules,
    clients,
    projects,
    settings,
    addRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    toggleRecurringSchedule,
    generateInvoiceFromSchedule,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringInvoiceSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<RecurringInvoiceSchedule | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNextRunDate, setFormNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Monthly Retainer & Ongoing Support Services',
      quantity: 1,
      unitPrice: 1500,
      amount: 1500,
    },
  ]);
  const [formTaxRate, setFormTaxRate] = useState<number>(settings.defaultTaxRate);
  const [formDiscountRate, setFormDiscountRate] = useState<number>(0);
  const [formPaymentTerms, setFormPaymentTerms] = useState(settings.defaultPaymentTerms);
  const [formNotes, setFormNotes] = useState(settings.invoiceNotesTemplate);
  const [formError, setFormError] = useState('');

  // Currency formatting values
  const defaultCurrency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return recurringSchedules.filter((sch) => {
      // Status filter
      if (statusFilter === 'active' && !sch.isActive) return false;
      if (statusFilter === 'paused' && sch.isActive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const client = clients.find((c) => c.id === sch.clientId);
        const matchTitle = sch.title.toLowerCase().includes(q);
        const matchClient = client ? client.name.toLowerCase().includes(q) || (client.company && client.company.toLowerCase().includes(q)) : false;
        return matchTitle || matchClient;
      }
      return true;
    });
  }, [recurringSchedules, statusFilter, searchQuery, clients]);

  // Overall metrics
  const activeCount = useMemo(() => recurringSchedules.filter((s) => s.isActive).length, [recurringSchedules]);
  const totalLifetimeDrafts = useMemo(
    () => recurringSchedules.reduce((acc, s) => acc + (s.generatedInvoiceCount || 0), 0),
    [recurringSchedules]
  );
  
  // Pipeline estimate (monthly-normalized or sum per period)
  const totalPipeline = useMemo(() => {
    return recurringSchedules
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const { totalAmount } = calculateInvoiceTotals(s.items, s.taxRate, s.discountRate);
        return sum + totalAmount;
      }, 0);
  }, [recurringSchedules]);

  // Next scheduled date across active schedules
  const earliestNextRun = useMemo(() => {
    const active = recurringSchedules.filter((s) => s.isActive && s.nextRunDate);
    if (active.length === 0) return null;
    const sorted = [...active].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
    return sorted[0].nextRunDate;
  }, [recurringSchedules]);

  // Reset form
  const resetForm = () => {
    setEditingSchedule(null);
    setFormTitle('');
    setFormClientId(clients[0]?.id || '');
    setFormProjectId('');
    setFormFrequency('monthly');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormNextRunDate(new Date().toISOString().split('T')[0]);
    setFormEndDate('');
    setFormIsActive(true);
    setFormItems([
      {
        id: 'item-1',
        description: 'Monthly Retainer & Ongoing Support Services',
        quantity: 1,
        unitPrice: 1500,
        amount: 1500,
      },
    ]);
    setFormTaxRate(settings.defaultTaxRate);
    setFormDiscountRate(0);
    setFormPaymentTerms(settings.defaultPaymentTerms);
    setFormNotes(settings.invoiceNotesTemplate);
    setFormError('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (sch: RecurringInvoiceSchedule) => {
    setEditingSchedule(sch);
    setFormTitle(sch.title);
    setFormClientId(sch.clientId);
    setFormProjectId(sch.projectId || '');
    setFormFrequency(sch.frequency);
    setFormStartDate(sch.startDate);
    setFormNextRunDate(sch.nextRunDate);
    setFormEndDate(sch.endDate || '');
    setFormIsActive(sch.isActive);
    setFormItems(sch.items && sch.items.length > 0 ? sch.items : [
      { id: '1', description: 'Recurring Service', quantity: 1, unitPrice: 100, amount: 100 }
    ]);
    setFormTaxRate(sch.taxRate ?? settings.defaultTaxRate);
    setFormDiscountRate(sch.discountRate ?? 0);
    setFormPaymentTerms(sch.paymentTerms || settings.defaultPaymentTerms);
    setFormNotes(sch.notes || settings.invoiceNotesTemplate);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

  // Line item handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
        const rate = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
        item.amount = Math.round(qty * rate * 100) / 100;
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        description: 'Scheduled Service Deliverable',
        quantity: 1,
        unitPrice: 500,
        amount: 500,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations for modal preview
  const calculatedFormTotals = useMemo(() => {
    return calculateInvoiceTotals(formItems, formTaxRate, formDiscountRate);
  }, [formItems, formTaxRate, formDiscountRate]);

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Schedule title is required (e.g., "Monthly Retainer").');
      return;
    }
    if (!formClientId) {
      setFormError('Please select a client for this recurring schedule.');
      return;
    }
    if (formItems.length === 0 || formItems.some((i) => !i.description.trim())) {
      setFormError('Please ensure all line items have descriptions and valid amounts.');
      return;
    }
    if (!formStartDate || !formNextRunDate) {
      setFormError('Start date and next run date are required.');
      return;
    }

    try {
      if (editingSchedule) {
        await updateRecurringSchedule(editingSchedule.id, {
          title: formTitle.trim(),
          clientId: formClientId,
          projectId: formProjectId || undefined,
          frequency: formFrequency,
          startDate: formStartDate,
          nextRunDate: formNextRunDate,
          endDate: formEndDate || undefined,
          isActive: formIsActive,
          items: formItems,
          taxRate: Number(formTaxRate) || 0,
          discountRate: Number(formDiscountRate) || 0,
          paymentTerms: formPaymentTerms.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await addRecurringSchedule({
          title: formTitle.trim(),
          clientId: formClientId,
          projectId: formProjectId || undefined,
          frequency: formFrequency,
          startDate: formStartDate,
          nextRunDate: formNextRunDate,
          endDate: formEndDate || undefined,
          isActive: formIsActive,
          items: formItems,
          taxRate: Number(formTaxRate) || 0,
          discountRate: Number(formDiscountRate) || 0,
          paymentTerms: formPaymentTerms.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      }
      handleCloseModal();
    } catch {
      setFormError('An unexpected error occurred while saving schedule.');
    }
  };

  // Trigger immediate draft generation
  const handleGenerateDraftNow = async (sch: RecurringInvoiceSchedule) => {
    try {
      setIsGeneratingId(sch.id);
      const newInv = await generateInvoiceFromSchedule(sch.id);
      if (newInv && onViewGeneratedInvoice) {
        onViewGeneratedInvoice(newInv.id);
      }
    } catch (err) {
      console.error('Error generating invoice from schedule:', err);
      showToast('Failed to generate draft invoice.', 'error');
    } finally {
      setIsGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Schedules</span>
            <Repeat className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{activeCount}</span>
            <span className="text-xs text-slate-400">/ {recurringSchedules.length} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Recurring Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(totalPipeline, defaultCurrency, symbol)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Next Scheduled Run</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-sm font-semibold font-mono text-slate-900 mt-1">
            {earliestNextRun ? formatDate(earliestNextRun) : 'None pending'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Drafts Generated</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalLifetimeDrafts}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({recurringSchedules.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({recurringSchedules.filter((s) => s.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'paused'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paused ({recurringSchedules.filter((s) => !s.isActive).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search schedules or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={searchQuery || statusFilter !== 'all' ? 'No matching recurring schedules' : 'No recurring schedules configured'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try clearing your search or status filter to see all schedules.'
              : 'Automate retainer and repeating billing. Define schedules for clients, and BizTrack will generate draft invoices automatically based on your schedule.'
          }
          actionLabel="Create First Schedule"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchedules.map((sch) => {
            const client = clients.find((c) => c.id === sch.clientId);
            const project = projects.find((p) => p.id === sch.projectId);
            const freqInfo = FREQUENCY_LABELS[sch.frequency] || FREQUENCY_LABELS.monthly;
            const { totalAmount, subtotal } = calculateInvoiceTotals(sch.items, sch.taxRate, sch.discountRate);
            const clientCurrency = client?.currency || defaultCurrency;
            const isDueSoon = sch.nextRunDate && sch.nextRunDate <= new Date().toISOString().split('T')[0];

            return (
              <div
                key={sch.id}
                className={`p-5 rounded-xl bg-white border transition-all shadow-2xs flex flex-col justify-between ${
                  sch.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/50 opacity-85'
                }`}
              >
                <div>
                  {/* Top line with title and status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
                          {sch.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-800">{client?.name || 'Unknown Client'}</span>
                        {client?.company && (
                          <span className="text-slate-400">· {client.company}</span>
                        )}
                        {project && (
                          <span className="text-slate-400">· {project.name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${freqInfo.badgeClass}`}>
                        {freqInfo.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRecurringSchedule(sch.id)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                          sch.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={sch.isActive ? 'Click to pause schedule' : 'Click to activate schedule'}
                      >
                        {sch.isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 text-slate-400" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Amount and Timing Details */}
                  <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Amount Per Cycle</span>
                      <div className="text-base font-bold font-mono text-slate-900">
                        {formatCurrency(totalAmount, clientCurrency, symbol)}
                        <span className="text-xs font-normal text-slate-500 ml-1">/ {freqInfo.periodLabel}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Next Draft Generation</span>
                      <div className="flex items-center gap-1 justify-end font-mono text-xs font-medium">
                        {isDueSoon && sch.isActive && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Due for generation" />
                        )}
                        <span className={isDueSoon && sch.isActive ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                          {formatDate(sch.nextRunDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line items preview */}
                  <div className="space-y-1 my-3">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Line Items ({sch.items.length})
                    </span>
                    <div className="text-xs text-slate-600 divide-y divide-slate-100 max-h-24 overflow-y-auto">
                      {sch.items.map((item, idx) => (
                        <div key={item.id || idx} className="py-1 flex justify-between items-center text-xs">
                          <span className="truncate pr-2">{item.description}</span>
                          <span className="font-mono text-slate-700 whitespace-nowrap">
                            {item.quantity} × {formatCurrency(item.unitPrice, clientCurrency, symbol)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Historical generation stats */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>
                      Generated: <strong className="text-slate-600">{sch.generatedInvoiceCount || 0} drafts</strong>
                    </span>
                    <span>
                      Last run: {sch.lastGeneratedDate ? formatDate(sch.lastGeneratedDate) : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(sch)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Edit schedule configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSchedule(sch)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateDraftNow(sch)}
                    disabled={isGeneratingId === sch.id}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Generate a draft invoice right now based on this schedule"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isGeneratingId === sch.id ? 'Generating...' : 'Generate Draft Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Schedule Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={handleCloseModal}
          title={editingSchedule ? 'Edit Recurring Schedule' : 'Create Recurring Schedule'}
          subtitle="Define an automated billing cadence for ongoing client retainers or subscriptions."
          maxWidth="2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Schedule Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Platform Maintenance Retainer"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              {/* Client & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formClientId}
                    onChange={(e) => {
                      setFormClientId(e.target.value);
                      setFormProjectId(''); // Reset project on client change
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    required
                  >
                    {clients.length === 0 && <option value="">No clients available</option>}
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">No linked project</option>
                    {projects
                      .filter((p) => !formClientId || p.clientId === formClientId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Cadence & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frequency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as RecurringFrequency)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
                  >
                    <option value="weekly">Weekly (Every 7 days)</option>
                    <option value="biweekly">Bi-weekly (Every 14 days)</option>
                    <option value="monthly">Monthly (Every month)</option>
                    <option value="quarterly">Quarterly (Every 3 months)</option>
                    <option value="annually">Annually (Every year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!editingSchedule) {
                        setFormNextRunDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Run Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formNextRunDate}
                    onChange={(e) => setFormNextRunDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              {/* End Date & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Leave blank for indefinite recurring schedule</p>
                </div>

                <div className="pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      Schedule is active and generating draft invoices
                    </span>
                  </label>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Scheduled Invoice Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <input
                          type="text"
                          placeholder="Description of scheduled deliverable"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                          required
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Rate"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-span-3 sm:col-span-1 text-right font-mono text-xs font-semibold text-slate-800">
                        ${item.amount.toFixed(2)}
                      </div>

                      <div className="col-span-1 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formItems.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formDiscountRate}
                    onChange={(e) => setFormDiscountRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Live Totals Card */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">
                    Calculated Per-Cycle Invoice Total
                  </span>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {formatCurrency(calculatedFormTotals.totalAmount, defaultCurrency, symbol)}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      / {FREQUENCY_LABELS[formFrequency]?.periodLabel || 'cycle'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-0.5 sm:text-right font-mono">
                  <div>Subtotal: ${calculatedFormTotals.subtotal.toFixed(2)}</div>
                  {calculatedFormTotals.discountAmount > 0 && (
                    <div className="text-emerald-400">Discount: -${calculatedFormTotals.discountAmount.toFixed(2)}</div>
                  )}
                  {calculatedFormTotals.taxAmount > 0 && (
                    <div>Tax ({formTaxRate}%): +${calculatedFormTotals.taxAmount.toFixed(2)}</div>
                  )}
                </div>
              </div>

              {/* Payment Terms & Remittance Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 15 days upon receipt"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Notes / Remittance Memo
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Notes automatically included on each generated invoice..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors shadow-2xs"
              >
                {editingSchedule ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSchedule && (
        <ConfirmModal
          isOpen={!!deletingSchedule}
          onClose={() => setDeletingSchedule(null)}
          onConfirm={async () => {
            if (deletingSchedule) {
              await deleteRecurringSchedule(deletingSchedule.id);
              setDeletingSchedule(null);
            }
          }}
          title="Delete Recurring Schedule"
          message={`Are you sure you want to delete the schedule "${deletingSchedule.title}"? Any draft or issued invoices previously created from this schedule will remain safely in your invoice records.`}
        />
      )}
    </div>
  );
};
