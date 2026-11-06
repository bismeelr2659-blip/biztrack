import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Payment, PaymentMethod } from '../../types';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Trash2, 
  DollarSign, 
  FileText, 
  Calendar, 
  Building2,
  CheckCircle2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { paymentCards, getWhatsAppLink } from '../../utils/paymentCards';
import { WhatsAppIcon } from '../common/WhatsAppReminderModal';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';

export const PaymentsView: React.FC<{
  isOpenRecordModal: boolean;
  onCloseRecordModal: () => void;
  onOpenRecordModal: () => void;
  presetInvoiceId?: string | null;
}> = ({
  isOpenRecordModal,
  onCloseRecordModal,
  onOpenRecordModal,
  presetInvoiceId,
}) => {
  const {
    payments,
    invoices,
    clients,
    settings,
    recordPayment,
    deletePayment,
    setActiveModule,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(presetInvoiceId || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Unpaid or partially paid invoices list for selection
  const eligibleInvoices = useMemo(() => {
    return invoices.filter((i) => i.status !== 'void' && i.balanceDue > 0);
  }, [invoices]);

  // When invoice selection changes, auto-populate remaining balance
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const target = invoices.find((i) => i.id === invId);
    if (target) {
      setPaymentAmount(target.balanceDue);
    }
  };

  // Reset form
  const handleCloseForm = () => {
    onCloseRecordModal();
    setSelectedInvoiceId('');
    setPaymentAmount(0);
    setPaymentReference('');
    setPaymentNotes('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setFormError('Please select an invoice to apply payment.');
      return;
    }
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      await recordPayment({
        invoiceId: selectedInvoiceId,
        amount: amt,
        paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      handleCloseForm();
    } catch {
      setFormError('Failed to record payment.');
    }
  };

  // Total collected payments
  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoiceId);
      const client = clients.find((c) => c.id === p.clientId);

      return (
        !q ||
        (inv && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (client && client.name.toLowerCase().includes(q)) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        p.method.toLowerCase().includes(q)
      );
    });
  }, [payments, invoices, clients, searchQuery]);

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  return (
    <div className="space-y-6">
      {/* Official Payment Methods & Client Remittance Cards */}
      <section className="p-5 sm:p-6 bg-[#142B4A] text-white rounded-2xl shadow-sm border border-[#1D3B63] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D3B63] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <h2 className="text-sm font-bold tracking-tight text-white uppercase text-[11px] tracking-wider">
                Official Client Payment Channels
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Secure global remittance options for <strong data-business-name className="text-white font-semibold">{settings.businessName || 'My Workspace'}</strong>.
            </p>
          </div>

          {(settings.whatsappNumber || settings.phone) && (
            <a
              data-whatsapp-contact
              href={getWhatsAppLink(`Hello, I would like to contact ${settings.businessName || 'the workspace'}.`, settings.whatsappNumber || settings.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-lg transition-colors self-start sm:self-auto"
              title="Direct WhatsApp Support"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
              <span>{settings.whatsappNumber || settings.phone}</span>
            </a>
          )}
        </div>

        {/* Payment Cards Grid */}
        <div id="payment-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentCards.map((card) => (
            <article
              key={card.id}
              className="payment-card bg-white text-slate-900 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              data-payment-method={card.id}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-slate-900 font-bold text-base tracking-tight leading-snug">
                    {card.title}
                  </h3>
                  {card.badge && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {card.description}
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                  {card.details.map((detail, idx) => (
                    <p key={idx} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 text-xs">
                      <strong className="text-slate-900 font-semibold">{detail.label}: </strong>
                      <span className="text-slate-600">{detail.value}</span>
                    </p>
                  ))}
                </div>
              </div>

              <a
                href={getWhatsAppLink(card.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-payment-button mt-4 inline-flex items-center justify-center gap-2 bg-[#15803d] hover:bg-[#166534] text-white py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors shadow-2xs"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                <span>Contact on WhatsApp</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Payments Ledger ({payments.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recorded remittances, transaction reference IDs, and settled client funds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, client, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={onOpenRecordModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Total Collected Revenue</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatCurrency(totalCollected, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {payments.length} transactions
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Pending Invoices</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {eligibleInvoices.length} invoices
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Awaiting full or partial payment
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Average Payment Value</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {payments.length > 0
              ? formatCurrency(totalCollected / payments.length, currency, symbol)
              : formatCurrency(0, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Per recorded receipt</span>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={searchQuery ? 'No payments matching criteria' : 'No payments logged yet'}
          description="When clients pay invoices via bank transfer, card, or check, record them here to update balances."
          actionLabel="Record Payment"
          onAction={onOpenRecordModal}
        />
      ) : (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Reference / Notes</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((pay) => {
                  const inv = invoices.find((i) => i.id === pay.invoiceId);
                  const client = clients.find((c) => c.id === pay.clientId);

                  const methodLabels: Record<PaymentMethod, string> = {
                    airtm: 'Airtm Wallet',
                    wise: 'Wise Transfer',
                    upi: 'UPI / IMPS',
                    bank_transfer: 'Bank Transfer / Wire',
                    credit_card: 'Credit Card',
                    stripe: 'Stripe',
                    paypal: 'PayPal',
                    cash: 'Cash',
                    check: 'Check',
                    other: 'Other',
                  };

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-700 whitespace-nowrap font-medium">
                        {formatDate(pay.paymentDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {inv?.invoiceNumber || 'INV-Deleted'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{client?.name || 'Client'}</div>
                        {client?.company && (
                          <div className="text-[11px] text-slate-400">{client.company}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {methodLabels[pay.method] || pay.method}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {pay.reference && (
                          <span className="font-mono text-slate-700 mr-2">{pay.reference}</span>
                        )}
                        {pay.notes && <span className="italic">{pay.notes}</span>}
                        {!pay.reference && !pay.notes && '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        +{formatCurrency(pay.amount, currency, symbol)}
                      </td>
                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setDeletingPaymentId(pay.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingPaymentId}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={async () => {
          if (deletingPaymentId) {
            await deletePayment(deletingPaymentId);
            setDeletingPaymentId(null);
          }
        }}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? The associated invoice balance will be restored."
      />

      {/* Record Payment Modal */}
      <Modal
        isOpen={isOpenRecordModal}
        onClose={handleCloseForm}
        title="Record Client Payment"
        subtitle="Apply received funds against an open invoice."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Invoice *
            </label>
            {eligibleInvoices.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                <span>No invoices with an outstanding balance found.</span>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseForm();
                    setActiveModule('invoices');
                  }}
                  className="font-semibold underline ml-2 hover:text-slate-900"
                >
                  Go to Invoices
                </button>
              </div>
            ) : (
              <select
                required
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="" disabled>
                  Select an open invoice...
                </option>
                {eligibleInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {client?.name} (Balance: {formatCurrency(inv.balanceDue, currency, symbol)})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="airtm">Airtm Wallet (Global Recommended)</option>
                <option value="wise">Wise Transfer (USD / GBP / EUR)</option>
                <option value="upi">UPI / IMPS (India)</option>
                <option value="bank_transfer">Bank Transfer / Wire</option>
                <option value="credit_card">Credit Card</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transaction / Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. WIRE-89210 or ch_3N82..."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Deposit milestone paid on receipt of build."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
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
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
