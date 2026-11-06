import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, InvoiceStatus, PaymentMethod, DataSource } from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Printer, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Building2, 
  Check, 
  ChevronRight,
  ExternalLink,
  Download,
  Clock,
  Sparkles,
  Repeat,
  Shield
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  calculateInvoiceTotals, 
  generateNextInvoiceNumber 
} from '../../utils/formatters';
import { 
  getNextDate, 
  formatNextDate, 
  RecurringRepeatType 
} from '../../utils/recurring';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { RecurringSchedulesSection } from './RecurringSchedulesSection';
import { WhatsAppReminderModal, WhatsAppIcon } from '../common/WhatsAppReminderModal';

export const InvoicesView: React.FC<{
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
  preselectedTimeEntryIds?: string[];
  selectedInvoiceId?: string | null;
  onClearSelectedInvoice?: () => void;
  onOpenRecordPayment?: (invoiceId: string) => void;
}> = ({
  isOpenCreateModal,
  onCloseCreateModal,
  onOpenCreateModal,
  preselectedTimeEntryIds,
  selectedInvoiceId,
  onClearSelectedInvoice,
  onOpenRecordPayment,
}) => {
  const {
    invoices,
    clients,
    projects,
    timeEntries,
    recurringSchedules,
    settings,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceStatus,
    toggleInvoiceRecurring,
    checkAndRunRecurringInvoices,
    showToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<'invoices' | 'recurring'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'demo'>('all');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);

  // Form State
  const [formClientId, setFormClientId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consulting & Development Deliverable', quantity: 1, unitPrice: 1200, amount: 1200 },
  ]);
  const [formTaxRate, setFormTaxRate] = useState<number>(settings.defaultTaxRate);
  const [formDiscountRate, setFormDiscountRate] = useState<number>(0);
  const [formNotes, setFormNotes] = useState(settings.invoiceNotesTemplate);
  const [formPaymentTerms, setFormPaymentTerms] = useState(settings.defaultPaymentTerms);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRepeat, setFormRepeat] = useState<RecurringRepeatType>('monthly');
  const [formError, setFormError] = useState('');

  // Handle preselected invoice ID if passed from dashboard
  useEffect(() => {
    if (selectedInvoiceId) {
      const inv = invoices.find((i) => i.id === selectedInvoiceId);
      if (inv) {
        setPreviewInvoice(inv);
      }
    }
  }, [selectedInvoiceId, invoices]);

  // Handle preselected time entries passed from TimeTracker
  useEffect(() => {
    if (preselectedTimeEntryIds && preselectedTimeEntryIds.length > 0) {
      const entries = timeEntries.filter((t) => preselectedTimeEntryIds.includes(t.id));
      if (entries.length > 0) {
        const first = entries[0];
        setFormClientId(first.clientId);
        setFormProjectId(first.projectId);

        const newItems: InvoiceItem[] = entries.map((entry, idx) => {
          const hours = Math.round((entry.durationSeconds / 3600) * 100) / 100;
          return {
            id: `item-${Date.now()}-${idx}`,
            description: `${entry.description} (${hours} hrs @ $${entry.hourlyRate}/hr)`,
            quantity: hours,
            unitPrice: entry.hourlyRate,
            amount: Math.round(hours * entry.hourlyRate * 100) / 100,
            timeEntryId: entry.id,
          };
        });
        setFormItems(newItems);
        onOpenCreateModal();
      }
    }
  }, [preselectedTimeEntryIds, timeEntries, onOpenCreateModal]);

  // Set default client if none
  useEffect(() => {
    if (!formClientId && clients.length > 0) {
      setFormClientId(clients[0].id);
    }
  }, [clients, formClientId]);

  // Form Calculations
  const calculated = useMemo(() => {
    return calculateInvoiceTotals(formItems, formTaxRate, formDiscountRate);
  }, [formItems, formTaxRate, formDiscountRate]);

  // Form Line Items operations
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
        description: 'Service / Deliverable description',
        quantity: 1,
        unitPrice: 100,
        amount: 100,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Import Unbilled Hours for the currently selected client/project
  const handleImportUnbilledHours = () => {
    if (!formClientId) return;
    const unbilled = timeEntries.filter(
      (t) =>
        t.clientId === formClientId &&
        t.isBillable &&
        !t.isInvoiced &&
        (!formProjectId || t.projectId === formProjectId)
    );

    if (unbilled.length === 0) {
      showToast('No unbilled time entries found for the selected client/project.', 'info');
      return;
    }

    const importedItems: InvoiceItem[] = unbilled.map((entry, idx) => {
      const hours = Math.round((entry.durationSeconds / 3600) * 100) / 100;
      return {
        id: `item-imported-${Date.now()}-${idx}`,
        description: `${entry.description} (${hours} hrs @ $${entry.hourlyRate}/hr)`,
        quantity: hours,
        unitPrice: entry.hourlyRate,
        amount: Math.round(hours * entry.hourlyRate * 100) / 100,
        timeEntryId: entry.id,
      };
    });

    setFormItems((prev) => [...prev, ...importedItems]);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormClientId(inv.clientId);
    setFormProjectId(inv.projectId || '');
    setFormIssueDate(inv.issueDate);
    setFormDueDate(inv.dueDate);
    setFormItems(inv.items);
    setFormTaxRate(inv.taxRate);
    setFormDiscountRate(inv.discountRate);
    setFormNotes(inv.notes || settings.invoiceNotesTemplate);
    setFormPaymentTerms(inv.paymentTerms || settings.defaultPaymentTerms);
    setFormIsRecurring(!!inv.isRecurring);
    setFormRepeat(inv.repeat || 'monthly');
    setFormError('');
  };

  const handleCloseForm = () => {
    onCloseCreateModal();
    setEditingInvoice(null);
    setFormClientId(clients[0]?.id || '');
    setFormProjectId('');
    setFormItems([
      { id: '1', description: 'Consulting & Development Deliverable', quantity: 1, unitPrice: 1200, amount: 1200 },
    ]);
    setFormTaxRate(settings.defaultTaxRate);
    setFormDiscountRate(0);
    setFormIsRecurring(false);
    setFormRepeat('monthly');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId) {
      setFormError('Please select a client.');
      return;
    }
    if (formItems.length === 0) {
      setFormError('Add at least one line item.');
      return;
    }

    try {
      const calculatedNext = formIsRecurring
        ? formatNextDate(getNextDate(formDueDate || new Date(), formRepeat))
        : undefined;

      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, {
          clientId: formClientId,
          projectId: formProjectId || undefined,
          issueDate: formIssueDate,
          dueDate: formDueDate,
          items: formItems,
          taxRate: Number(formTaxRate) || 0,
          discountRate: Number(formDiscountRate) || 0,
          subtotal: calculated.subtotal,
          taxAmount: calculated.taxAmount,
          discountAmount: calculated.discountAmount,
          totalAmount: calculated.totalAmount,
          notes: formNotes,
          paymentTerms: formPaymentTerms,
          isRecurring: formIsRecurring,
          repeat: formIsRecurring ? formRepeat : undefined,
          nextDate: formIsRecurring ? (editingInvoice.nextDate || calculatedNext) : undefined,
        });
      } else {
        const linkedEntryIds = formItems
          .map((i) => i.timeEntryId)
          .filter(Boolean) as string[];

        await createInvoice({
          clientId: formClientId,
          projectId: formProjectId || undefined,
          issueDate: formIssueDate,
          dueDate: formDueDate,
          items: formItems,
          taxRate: Number(formTaxRate) || 0,
          discountRate: Number(formDiscountRate) || 0,
          notes: formNotes,
          paymentTerms: formPaymentTerms,
          linkedTimeEntryIds: linkedEntryIds,
          isRecurring: formIsRecurring,
          repeat: formIsRecurring ? formRepeat : undefined,
          nextDate: calculatedNext,
        });
      }
      handleCloseForm();
    } catch {
      setFormError('Failed to save invoice.');
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const client = clients.find((c) => c.id === inv.clientId);
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (client && client.name.toLowerCase().includes(q)) ||
        (client && client.company && client.company.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || (inv.source || 'real') === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [invoices, clients, searchQuery, statusFilter, sourceFilter]);

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  return (
    <div className="space-y-6">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {viewMode === 'invoices' ? `Invoices (${invoices.length})` : `Recurring Schedules (${recurringSchedules.length})`}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'invoices'
              ? 'Create, issue, track payment receipts, and print itemized PDF-ready invoices.'
              : 'Automate repeating billing schedules, retainers, and subscriptions.'}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('invoices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'invoices'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('recurring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'recurring'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-blue-600" />
            <span>Recurring Schedules</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-mono font-semibold">
              {recurringSchedules.length}
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'recurring' ? (
        <RecurringSchedulesSection
          onViewGeneratedInvoice={(invId) => {
            const inv = invoices.find((i) => i.id === invId);
            if (inv) {
              setPreviewInvoice(inv);
            }
          }}
        />
      ) : (
        <>
          {/* Quick Informational Notice for Recurring Schedules */}
          {recurringSchedules.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>{recurringSchedules.filter((s) => s.isActive).length} active recurring schedules</strong> are configured. Auto-generated invoices arrive directly in your draft list.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('recurring')}
                className="font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0"
              >
                <span>View Schedules</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Source Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-600 font-medium pl-1">
              Filter invoices by dataset:
            </span>

            {/* Source Filter Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Data ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('real')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  sourceFilter === 'real'
                    ? 'bg-[#0D9488] text-white font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-[#0D9488]'
                }`}
              >
                <Shield className="w-3 h-3 text-[#0D9488]" />
                <span>Real ({invoices.filter((i) => (i.source || 'real') === 'real').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('demo')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sourceFilter === 'demo'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-blue-600'
                }`}
              >
                Demo ({invoices.filter((i) => i.source === 'demo').length})
              </button>
            </div>
          </div>

          {/* Search & Actions Bar for Standard Invoices */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto text-xs">
              {(['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue'] as const).map((tab) => {
                const labels = {
                  all: 'All Invoices',
                  draft: 'Draft',
                  sent: 'Sent',
                  partially_paid: 'Partially Paid',
                  paid: 'Paid',
                  overdue: 'Overdue',
                };
                const count =
                  tab === 'all' ? invoices.length : invoices.filter((i) => i.status === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {labels[tab]} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice # or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={() => checkAndRunRecurringInvoices()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                title="Check for any recurring invoices due today and generate them"
              >
                <Repeat className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Check Recurring</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreateModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
              </button>
            </div>
          </div>

          {/* Invoices List */}
          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices generated yet'}
              description="Create your first invoice with automated subtotal calculation, tax rate, and payment tracking."
              actionLabel="Create Invoice"
              onAction={onOpenCreateModal}
            />
          ) : (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-2.5 pr-4">Invoice #</th>
                      <th className="py-2.5 px-4">Client</th>
                      <th className="py-2.5 px-4">Dates</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Balance Due</th>
                      <th className="py-2.5 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => {
                      const client = clients.find((c) => c.id === inv.clientId);
                      const isPaid = inv.balanceDue <= 0.009;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                className="font-mono font-semibold text-slate-900 hover:text-blue-600 text-xs block"
                              >
                                {inv.invoiceNumber}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`inline-flex items-center text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-xs tracking-wider ${
                                inv.source === 'demo' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700 border border-blue-200/60 font-medium'
                              }`}>
                                {inv.source === 'demo' ? 'Demo' : 'Real'}
                              </span>
                              {inv.isRecurring && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-sm">
                                  <Repeat className="w-2.5 h-2.5" />
                                  <span>{inv.repeat?.toUpperCase() || 'RECURRING'}</span>
                                  {inv.nextDate && <span className="text-purple-400 font-mono">· Next: {formatDate(inv.nextDate)}</span>}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">{client?.name || 'Client'}</div>
                            {client?.company && (
                              <div className="text-[11px] text-slate-400">{client.company}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            <div>Issued: {formatDate(inv.issueDate)}</div>
                            <div className="text-[11px] text-slate-400">Due: {formatDate(inv.dueDate)}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                            {formatCurrency(inv.totalAmount, currency, symbol)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold whitespace-nowrap">
                            <span className={inv.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'}>
                              {formatCurrency(inv.balanceDue, currency, symbol)}
                            </span>
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Preview / Print"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {!isPaid && (
                                <button
                                  onClick={() => setWhatsAppInvoice(inv)}
                                  className="p-1.5 text-[#25D366] hover:text-[#1da851] hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Send WhatsApp Reminder"
                                >
                                  <WhatsAppIcon className="w-4 h-4 fill-current" />
                                </button>
                              )}

                              {!isPaid && onOpenRecordPayment && (
                                <button
                                  onClick={() => onOpenRecordPayment(inv.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                                  title="Record client payment"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay</span>
                                </button>
                              )}

                              <button
                                onClick={() => toggleInvoiceRecurring(inv.id, inv.repeat || 'monthly')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  inv.isRecurring
                                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={inv.isRecurring ? `Recurring (${inv.repeat}) - Click to pause` : 'Make Recurring'}
                              >
                                <Repeat className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(inv)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingInvoice(inv)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={async () => {
          if (deletingInvoice) {
            await deleteInvoice(deletingInvoice.id);
            setDeletingInvoice(null);
          }
        }}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${deletingInvoice?.invoiceNumber}? Any unbilled time entries will be restored.`}
      />

      {/* Create / Edit Invoice Modal */}
      <Modal
        isOpen={isOpenCreateModal || !!editingInvoice}
        onClose={handleCloseForm}
        title={editingInvoice ? `Edit Invoice ${editingInvoice.invoiceNumber}` : 'Create New Invoice'}
        subtitle="Itemize billables, configure taxes, discounts, and payment terms."
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          {/* Top Row: Client, Project, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Client *
              </label>
              <select
                required
                value={formClientId}
                onChange={(e) => {
                  setFormClientId(e.target.value);
                  setFormProjectId('');
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project (Optional)
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="">General Project / None</option>
                {projects
                  .filter((p) => !formClientId || p.clientId === formClientId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formIssueDate}
                onChange={(e) => setFormIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Line Items
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleImportUnbilledHours}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5"
                  title="Pull logged unbilled hours for this client into invoice line items"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import Unbilled Hours</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 w-24">Qty / Hrs</th>
                    <th className="py-2 px-3 w-28">Rate ($)</th>
                    <th className="py-2 px-3 w-28 text-right">Amount</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="Description of deliverable or service"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-hidden font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-hidden font-mono"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(item.amount, currency, symbol)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={formItems.length === 1}
                          className="text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Calculations & Totals Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formPaymentTerms}
                  onChange={(e) => setFormPaymentTerms(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes & Remittance Instructions
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Recurring Schedule Configuration */}
              <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsRecurring}
                    onChange={(e) => setFormIsRecurring(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-purple-600" />
                    <span>Make this a Recurring Invoice</span>
                  </span>
                </label>

                {formIsRecurring && (
                  <div className="pt-2 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-purple-800 mb-1">
                        Repeat Interval
                      </label>
                      <select
                        value={formRepeat}
                        onChange={(e) => setFormRepeat(e.target.value as RecurringRepeatType)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="weekly">Weekly (Every 7 days)</option>
                        <option value="monthly">Monthly (Every month)</option>
                        <option value="yearly">Yearly (Every year)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-purple-800 mb-1">
                        Next Auto-Run Date
                      </label>
                      <div className="px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-purple-900 font-mono font-medium">
                        {formatDate(formatNextDate(getNextDate(formDueDate || new Date(), formRepeat)))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subtotal / Tax / Discount Breakdown */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(calculated.subtotal, currency, symbol)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span>Discount (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formDiscountRate}
                    onChange={(e) => setFormDiscountRate(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 rounded bg-white text-right font-mono"
                  />
                </div>
                <span className="font-mono text-slate-700">
                  -{formatCurrency(calculated.discountAmount, currency, symbol)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span>Tax (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 rounded bg-white text-right font-mono"
                  />
                </div>
                <span className="font-mono text-slate-700">
                  +{formatCurrency(calculated.taxAmount, currency, symbol)}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono">
                  {formatCurrency(calculated.totalAmount, currency, symbol)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors shadow-2xs"
            >
              {editingInvoice ? 'Save Invoice' : 'Create & Issue Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Preview & Printable Layout Modal */}
      {previewInvoice && (
        <Modal
          isOpen={!!previewInvoice}
          onClose={() => {
            setPreviewInvoice(null);
            if (onClearSelectedInvoice) onClearSelectedInvoice();
          }}
          title={`Invoice ${previewInvoice.invoiceNumber}`}
          subtitle={`Status: ${previewInvoice.status.toUpperCase()}`}
          maxWidth="4xl"
        >
          {(() => {
            const client = clients.find((c) => c.id === previewInvoice.clientId);
            return (
              <div className="space-y-6">
                {/* Print action toolbar */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 no-print">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={previewInvoice.status} />
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">
                      Balance Due: {formatCurrency(previewInvoice.balanceDue, currency, symbol)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {previewInvoice.balanceDue > 0 && (
                      <button
                        onClick={() => setWhatsAppInvoice(previewInvoice)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba5a] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Send WhatsApp Reminder to client"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                        <span>WhatsApp Reminder</span>
                      </button>
                    )}
                    {previewInvoice.balanceDue > 0 && onOpenRecordPayment && (
                      <button
                        onClick={() => {
                          onOpenRecordPayment(previewInvoice.id);
                          setPreviewInvoice(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable Invoice Canvas */}
                <div className="p-6 sm:p-8 border border-slate-200 rounded-xl bg-white space-y-8 print:border-0 print:p-0">
                  {previewInvoice.isRecurring && (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 no-print">
                      <Repeat className="w-4 h-4 shrink-0 text-purple-600" />
                      <div>
                        <span className="font-semibold">Recurring Schedule Active ({previewInvoice.repeat}):</span>
                        <span className="ml-1 text-purple-700">
                          Next billing cycle generation scheduled for {previewInvoice.nextDate ? formatDate(previewInvoice.nextDate) : 'upcoming period'}.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      {settings.logoUrl && (
                        <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain mb-2" />
                      )}
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight" data-business-name>
                        {settings.businessName || 'My Workspace'}
                      </h1>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        {settings.ownerName && <p>{settings.ownerName}</p>}
                        {settings.email && <p>{settings.email}</p>}
                        {(settings.whatsappNumber || settings.phone) && (
                          <p data-whatsapp-contact>Phone / WhatsApp: {settings.whatsappNumber || settings.phone}</p>
                        )}
                        {settings.address && <p>{settings.address}</p>}
                        {settings.taxId && <p>Tax ID: {settings.taxId}</p>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-slate-900 block">
                        {previewInvoice.invoiceNumber}
                      </span>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        <p>Issue Date: {formatDate(previewInvoice.issueDate)}</p>
                        <p>Due Date: {formatDate(previewInvoice.dueDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Billed To Client */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-start text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Billed To:
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{client?.name}</p>
                      {client?.company && <p className="text-slate-600 font-medium">{client.company}</p>}
                      <p className="text-slate-500">{client?.email}</p>
                      {client?.address && <p className="text-slate-500">{client.address}</p>}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Amount Due:
                      </span>
                      <span className="text-xl font-mono font-bold text-slate-900">
                        {formatCurrency(previewInvoice.balanceDue, currency, symbol)}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5">Item & Description</th>
                        <th className="py-2.5 text-right w-20">Qty/Hrs</th>
                        <th className="py-2.5 text-right w-28">Rate</th>
                        <th className="py-2.5 text-right w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 text-slate-800 font-medium">{item.description}</td>
                          <td className="py-3 text-right font-mono text-slate-600">{item.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-600">
                            {formatCurrency(item.unitPrice, currency, symbol)}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-slate-900">
                            {formatCurrency(item.amount, currency, symbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Summary */}
                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatCurrency(previewInvoice.subtotal, currency, symbol)}</span>
                      </div>
                      {previewInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Discount ({previewInvoice.discountRate}%):</span>
                          <span className="font-mono text-emerald-700">
                            -{formatCurrency(previewInvoice.discountAmount, currency, symbol)}
                          </span>
                        </div>
                      )}
                      {previewInvoice.taxAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax ({previewInvoice.taxRate}%):</span>
                          <span className="font-mono">
                            +{formatCurrency(previewInvoice.taxAmount, currency, symbol)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                        <span>Total:</span>
                        <span className="font-mono">{formatCurrency(previewInvoice.totalAmount, currency, symbol)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 pt-1">
                        <span>Amount Paid:</span>
                        <span className="font-mono text-emerald-700">
                          {formatCurrency(previewInvoice.amountPaid, currency, symbol)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-100">
                        <span>Balance Due:</span>
                        <span className="font-mono text-amber-700">
                          {formatCurrency(previewInvoice.balanceDue, currency, symbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details & Remittance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100 text-xs text-slate-500">
                    {previewInvoice.paymentTerms && (
                      <div>
                        <span className="font-semibold text-slate-700 block mb-0.5">Payment Terms</span>
                        <p>{previewInvoice.paymentTerms}</p>
                      </div>
                    )}
                    {settings.bankDetails && (
                      <div>
                        <span className="font-semibold text-slate-700 block mb-0.5">Bank / Wire Instructions</span>
                        <pre className="font-mono text-[11px] whitespace-pre-wrap text-slate-600 bg-slate-50 p-2 rounded">
                          {settings.bankDetails}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 no-print">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewInvoice(null);
                      if (onClearSelectedInvoice) onClearSelectedInvoice();
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={!!whatsAppInvoice}
        onClose={() => setWhatsAppInvoice(null)}
        invoice={whatsAppInvoice}
      />
    </div>
  );
};
