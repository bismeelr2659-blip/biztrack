import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, CurrencyCode, Invoice } from '../../types';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Trash2, 
  Edit3, 
  Briefcase, 
  FileText,
  DollarSign,
  ExternalLink,
  Download,
  Printer,
  FileSpreadsheet,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV, formatPhoneForWhatsApp } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';
import { WhatsAppReminderModal, WhatsAppIcon } from '../common/WhatsAppReminderModal';
import PremiumClientCard from '../PremiumClientCard';

export const ClientsView: React.FC<{
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}> = ({ isOpenCreateModal, onCloseCreateModal, onOpenCreateModal }) => {
  const {
    clients,
    projects,
    invoices,
    settings,
    addClient,
    updateClient,
    deleteClient,
    setActiveModule,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<'saas' | 'classic'>('saas');

  // Form State
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(settings.defaultCurrency);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Open Edit
  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCompany(client.company || '');
    setFormEmail(client.email);
    setFormPhone(client.phone || '');
    setFormAddress(client.address || '');
    setFormCurrency(client.currency);
    setFormNotes(client.notes || '');
    setFormError('');
  };

  const handleCloseForm = () => {
    onCloseCreateModal();
    setEditingClient(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCurrency(settings.defaultCurrency);
    setFormNotes('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Client name is required.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formName.trim(),
          company: formCompany.trim() || undefined,
          email: formEmail.trim(),
          phone: formPhone.trim() || undefined,
          address: formAddress.trim() || undefined,
          currency: formCurrency,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await addClient({
          name: formName.trim(),
          company: formCompany.trim() || undefined,
          email: formEmail.trim(),
          phone: formPhone.trim() || undefined,
          address: formAddress.trim() || undefined,
          currency: formCurrency,
          notes: formNotes.trim() || undefined,
        });
      }
      handleCloseForm();
    } catch {
      setFormError('An error occurred while saving the client.');
    }
  };

  // Client metrics
  const clientStats = useMemo(() => {
    const stats: Record<string, { totalBilled: number; totalPaid: number; balanceDue: number; projectCount: number; invoiceCount: number }> = {};
    clients.forEach((c) => {
      stats[c.id] = { totalBilled: 0, totalPaid: 0, balanceDue: 0, projectCount: 0, invoiceCount: 0 };
    });

    projects.forEach((p) => {
      if (stats[p.clientId]) {
        stats[p.clientId].projectCount += 1;
      }
    });

    invoices.forEach((inv) => {
      if (stats[inv.clientId]) {
        stats[inv.clientId].invoiceCount += 1;
        stats[inv.clientId].totalBilled += Number(inv.totalAmount) || 0;
        stats[inv.clientId].totalPaid += Number(inv.amountPaid) || 0;
        stats[inv.clientId].balanceDue += Number(inv.balanceDue) || 0;
      }
    });

    return stats;
  }, [clients, projects, invoices]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Export Clients to CSV
  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      showToast('No clients available to export.', 'info');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = [
      'Client ID',
      'Name',
      'Company',
      'Email',
      'Phone',
      'Address',
      'Currency',
      'Linked Projects',
      'Issued Invoices',
      'Total Billed',
      'Total Settled',
      'Balance Due',
      'Notes',
      'Created Date',
    ];
    const rows = filteredClients.map((c) => {
      const stats = clientStats[c.id] || { totalBilled: 0, totalPaid: 0, balanceDue: 0, projectCount: 0, invoiceCount: 0 };
      return [
        c.id,
        c.name,
        c.company || '',
        c.email,
        c.phone || '',
        c.address || '',
        c.currency,
        stats.projectCount,
        stats.invoiceCount,
        stats.totalBilled.toFixed(2),
        stats.totalPaid.toFixed(2),
        stats.balanceDue.toFixed(2),
        c.notes || '',
        c.createdAt.split('T')[0],
      ];
    });
    exportToCSV(`BizTrack-Clients-${dateStr}.csv`, headers, rows);
    showToast(`Exported ${filteredClients.length} clients to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Clients ({clients.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your client relationships, billing details, and accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* View Mode Toggle: SaaS vs Classic */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('saas')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'saas'
                  ? 'bg-[#11121a] text-violet-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="SaaS Dark Theme Cards"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">SaaS Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('classic')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'classic'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Classic Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Classic</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={clients.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            title="Download client records as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Export</span> CSV
          </button>

          {/* Export PDF / Print Button */}
          <button
            type="button"
            onClick={() => setIsPdfPreviewOpen(true)}
            disabled={clients.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            title="Export printable PDF directory of contacts"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Export</span> PDF
          </button>

          {/* Add Client Primary CTA */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matching clients found' : 'No clients added yet'}
          description={
            searchQuery
              ? `No clients match "${searchQuery}". Try a different search term.`
              : 'Add your first client to start organizing projects, tracking billable time, and issuing invoices.'
          }
          actionLabel="Add Client"
          onAction={onOpenCreateModal}
        />
      ) : viewMode === 'saas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const stats = clientStats[client.id] || { totalBilled: 0, totalPaid: 0, balanceDue: 0, projectCount: 0, invoiceCount: 0 };
            const revK = stats.totalPaid > 0 ? (stats.totalPaid / 1000) : (stats.totalBilled / 1000);
            const displayRevenue = revK > 0 ? (Math.round(revK * 10) / 10) : 12;
            const deals = (stats.projectCount + stats.invoiceCount) || 3;
            const health = stats.totalBilled > 0
              ? Math.min(100, Math.max(65, Math.round((stats.totalPaid / stats.totalBilled) * 100)))
              : 98;

            return (
              <PremiumClientCard
                key={client.id}
                client={{
                  id: client.id,
                  name: client.name,
                  company: client.company || 'Enterprise Partner',
                  email: client.email,
                  revenue: displayRevenue,
                  deals: deals,
                  health: health,
                  status: 'Active',
                  phone: client.phone,
                }}
                onViewProfile={() => setSelectedClientDetail(client)}
                onEdit={() => handleOpenEdit(client)}
                onDelete={() => setIsDeletingId(client.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const stats = clientStats[client.id] || { totalBilled: 0, totalPaid: 0, balanceDue: 0, projectCount: 0, invoiceCount: 0 };
            return (
              <div
                key={client.id}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.company}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit client"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsDeletingId(client.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1 my-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${client.email}`} className="hover:underline truncate">
                        {client.email}
                      </a>
                    </div>
                    {client.phone && (
                      <div className="flex items-center justify-between gap-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        <a
                          href={`https://wa.me/${formatPhoneForWhatsApp(client.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors shrink-0"
                          title="Open WhatsApp chat with client"
                        >
                          <WhatsAppIcon className="w-3 h-3 fill-current" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial overview strip */}
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Total Billed:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {formatCurrency(stats.totalBilled, client.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Outstanding:</span>
                    <span
                      className={`font-mono font-semibold ${
                        stats.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(stats.balanceDue, client.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50 mt-2">
                    <span>{stats.projectCount} Projects · {stats.invoiceCount} Invoices</span>
                    <button
                      onClick={() => setSelectedClientDetail(client)}
                      className="text-slate-700 hover:text-slate-900 font-medium hover:underline flex items-center gap-0.5"
                    >
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isOpenCreateModal || !!editingClient}
        onClose={handleCloseForm}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        subtitle="Enter client contact and billing profile details."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name / Contact Person *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rostova"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Company / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Vanguard FinTech Group"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="elena@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number (WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="03001234567 or +1 (555) 000-0000"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                03xx Pakistani numbers automatically convert to +92 for WhatsApp links.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Physical / Invoicing Address
              </label>
              <input
                type="text"
                placeholder="100 Market St, Suite 400, City, State, Zip"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Billing Currency
              </label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (AU$)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="INR">INR (₹)</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Internal Notes & Terms
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Net 15 payment terms. PO number required for all submissions."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
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
              {editingClient ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Detail Modal */}
      {selectedClientDetail && (
        <Modal
          isOpen={!!selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          title={selectedClientDetail.name}
          subtitle={selectedClientDetail.company || 'Client Profile & History'}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block">Total Invoiced</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatCurrency(
                    clientStats[selectedClientDetail.id]?.totalBilled || 0,
                    selectedClientDetail.currency
                  )}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Payments Settled</span>
                <span className="text-base font-bold font-mono text-emerald-700">
                  {formatCurrency(
                    clientStats[selectedClientDetail.id]?.totalPaid || 0,
                    selectedClientDetail.currency
                  )}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Balance Due</span>
                <span className="text-base font-bold font-mono text-amber-700">
                  {formatCurrency(
                    clientStats[selectedClientDetail.id]?.balanceDue || 0,
                    selectedClientDetail.currency
                  )}
                </span>
              </div>
            </div>

            {/* Linked Projects */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Linked Projects ({projects.filter((p) => p.clientId === selectedClientDetail.id).length})
              </h4>
              <div className="space-y-2">
                {projects.filter((p) => p.clientId === selectedClientDetail.id).length === 0 ? (
                  <p className="text-xs text-slate-400">No projects linked to this client.</p>
                ) : (
                  projects
                    .filter((p) => p.clientId === selectedClientDetail.id)
                    .map((proj) => (
                      <div
                        key={proj.id}
                        className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{proj.name}</span>
                          <span className="text-slate-400 ml-2">({proj.status})</span>
                        </div>
                        <span className="font-mono text-slate-700">
                          {proj.billingType === 'hourly'
                            ? `$${proj.hourlyRate}/hr`
                            : `$${proj.fixedBudget} fixed`}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Linked Invoices */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Client Invoices ({invoices.filter((i) => i.clientId === selectedClientDetail.id).length})
              </h4>
              <div className="space-y-2">
                {invoices.filter((i) => i.clientId === selectedClientDetail.id).length === 0 ? (
                  <p className="text-xs text-slate-400">No invoices issued for this client.</p>
                ) : (
                  invoices
                    .filter((i) => i.clientId === selectedClientDetail.id)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-semibold text-slate-900">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-slate-500 ml-2">Issued {formatDate(inv.issueDate)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-slate-900">
                            {formatCurrency(inv.totalAmount, selectedClientDetail.currency)}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            Due: {formatCurrency(inv.balanceDue, selectedClientDetail.currency)}
                          </span>
                          {inv.balanceDue > 0 && (
                            <button
                              type="button"
                              onClick={() => setWhatsAppInvoice(inv)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <WhatsAppIcon className="w-3 h-3 fill-current" />
                              <span>Remind</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Client Confirmation Modal */}
      <ConfirmModal
        isOpen={!!isDeletingId}
        onClose={() => setIsDeletingId(null)}
        onConfirm={async () => {
          if (isDeletingId) {
            await deleteClient(isDeletingId);
            setIsDeletingId(null);
          }
        }}
        title="Delete Client"
        message="Are you sure you want to delete this client? Clients with associated projects or invoices must be cleared first."
      />

      {/* Printable PDF Directory Modal */}
      {isPdfPreviewOpen && (
        <Modal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          title="Client Directory & Offline Backup"
          subtitle={`Official contact records for ${settings.businessName || 'BizTrack'} · ${filteredClients.length} accounts`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 no-print">
              <div className="text-xs text-slate-500">
                <span>Print or export this directory directly as a PDF document for offline backup.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print to PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Canvas */}
            <div className="p-6 sm:p-8 border border-slate-200 rounded-xl bg-white space-y-6 print:border-0 print:p-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Official Contact Records
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                    {settings.businessName || 'BizTrack Workspace'}
                  </h1>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {settings.ownerName && <p>{settings.ownerName}</p>}
                    <p>{settings.email}</p>
                    {settings.phone && <p>{settings.phone}</p>}
                    {settings.address && <p>{settings.address}</p>}
                  </div>
                </div>

                <div className="sm:text-right text-xs text-slate-500 space-y-1">
                  <div className="font-mono font-semibold text-slate-900 text-sm">
                    CLIENT DIRECTORY REPORT
                  </div>
                  <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  <p>Active Client Accounts: {filteredClients.length}</p>
                  {settings.taxId && <p>Tax ID: {settings.taxId}</p>}
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Total Clients</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    {filteredClients.length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Companies</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    {filteredClients.filter((c) => !!c.company).length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Total Invoiced</span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatCurrency(
                      filteredClients.reduce((sum, c) => sum + (clientStats[c.id]?.totalBilled || 0), 0),
                      settings.defaultCurrency,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Total Outstanding</span>
                  <span className="text-base font-bold font-mono text-amber-700 mt-0.5 block">
                    {formatCurrency(
                      filteredClients.reduce((sum, c) => sum + (clientStats[c.id]?.balanceDue || 0), 0),
                      settings.defaultCurrency,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
              </div>

              {/* Clients Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">Client & Company</th>
                      <th className="py-2.5 px-3">Contact Details</th>
                      <th className="py-2.5 px-3">Billing Address</th>
                      <th className="py-2.5 px-3 text-center">Projects / Invoices</th>
                      <th className="py-2.5 px-3 text-right">Total Billed</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => {
                      const stats = clientStats[client.id] || { totalBilled: 0, balanceDue: 0, projectCount: 0, invoiceCount: 0 };
                      return (
                        <tr key={client.id} className="align-top">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{client.name}</div>
                            {client.company && (
                              <div className="text-[11px] text-slate-500">{client.company}</div>
                            )}
                            {client.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs">
                                Note: {client.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-800">{client.email}</div>
                            {client.phone && (
                              <div className="text-[11px] text-slate-500">{client.phone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs">
                            {client.address || '—'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700">
                            {stats.projectCount} proj · {stats.invoiceCount} inv
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(stats.totalBilled, client.currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold">
                            <span className={stats.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'}>
                              {formatCurrency(stats.balanceDue, client.currency)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Printable Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                <span>BizTrack Client Ledger System</span>
                <span>Page 1 of 1 · Confidential Business Record</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={!!whatsAppInvoice}
        onClose={() => setWhatsAppInvoice(null)}
        invoice={whatsAppInvoice}
        client={selectedClientDetail}
      />
    </div>
  );
};
