import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  buildWhatsAppReminderMessage, 
  formatPhoneForWhatsApp, 
  generateWhatsAppURL, 
  isPakistaniNumber 
} from '../../utils/whatsapp';
import { formatDate } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { Invoice, Client } from '../../types';
import { 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  AlertCircle, 
  Sparkles,
  MessageSquare
} from 'lucide-react';

// Custom WhatsApp SVG icon for branding
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="0" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  client?: Client | null;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  invoice,
  client: directClient,
}) => {
  const { clients, settings, updateClient, showToast } = useApp();

  const client = directClient || (invoice ? clients.find((c) => c.id === invoice.clientId) : null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [templateType, setTemplateType] = useState<'gentle' | 'due_today' | 'overdue' | 'formal' | 'custom'>('gentle');
  const [customText, setCustomText] = useState('');
  const [savePhoneToProfile, setSavePhoneToProfile] = useState(true);
  const [copied, setCopied] = useState(false);

  // Initialize phone number when client or invoice changes
  useEffect(() => {
    if (client) {
      setPhoneNumber(client.phone || '');
    } else {
      setPhoneNumber('');
    }

    // Default template to overdue if the invoice status is overdue
    if (invoice?.status === 'overdue') {
      setTemplateType('overdue');
    } else {
      setTemplateType('gentle');
    }
  }, [client, invoice, isOpen]);

  if (!invoice) return null;

  const clientName = client?.name || 'Valued Client';
  const currencySymbol = settings.currencySymbol || '$';
  const amountToRemind = invoice.balanceDue > 0 ? invoice.balanceDue : invoice.totalAmount;
  const formattedDueDate = formatDate(invoice.dueDate);

  // Auto-formatted phone for WhatsApp
  const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
  const isPakistanFormat = isPakistaniNumber(phoneNumber);

  // Generated message
  const generatedMessage = buildWhatsAppReminderMessage({
    clientName,
    invoiceNumber: invoice.invoiceNumber,
    amount: amountToRemind,
    dueDate: formattedDueDate,
    currencySymbol,
    templateType,
    customMessage: customText,
  });

  const fullWhatsAppUrl = generateWhatsAppURL(phoneNumber, generatedMessage);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      showToast('Reminder message copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy message automatically.', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      showToast('Please enter a valid phone number for the client.', 'error');
      return;
    }

    // If user wants to save phone to client profile
    if (savePhoneToProfile && client && phoneNumber.trim() !== client.phone) {
      try {
        await updateClient(client.id, { phone: phoneNumber.trim() });
      } catch (e) {
        console.error('Failed to update client phone', e);
      }
    }

    // Open WhatsApp
    window.open(fullWhatsAppUrl, '_blank', 'noopener,noreferrer');
    showToast(`WhatsApp opened for ${clientName}!`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send WhatsApp Invoice Reminder"
      subtitle={`Quickly remind ${clientName} about invoice ${invoice.invoiceNumber}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Invoice Summary Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
              Invoice
            </span>
            <span className="font-mono font-semibold text-slate-900 text-sm">
              {invoice.invoiceNumber}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
              Amount Due
            </span>
            <span className="font-mono font-bold text-amber-700 text-sm">
              {currencySymbol}{Number(amountToRemind).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
              Due Date
            </span>
            <span className="font-medium text-slate-800">
              {formattedDueDate}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
              Client
            </span>
            <span className="font-medium text-slate-900">
              {clientName}
            </span>
          </div>
        </div>

        {/* Recipient Phone Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800">
            Client Phone Number (WhatsApp)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 03001234567 or +92 300 1234567"
              className="w-full pl-9 pr-24 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            />
            {formattedPhone && (
              <span className="absolute inset-y-0 right-3 flex items-center text-[11px] font-mono font-medium text-emerald-700">
                +{formattedPhone}
              </span>
            )}
          </div>

          {/* Pakistan 03 -> 92 format highlight badge */}
          {phoneNumber.startsWith('0') && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                Pakistani format detected: Leading <strong className="font-mono">0</strong> will automatically route to <strong className="font-mono">+92</strong> ({formattedPhone}).
              </span>
            </div>
          )}

          {/* Client profile save checkbox */}
          {client && (
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={savePhoneToProfile}
                onChange={(e) => setSavePhoneToProfile(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Save phone number to {client.name}&apos;s profile for future reminders</span>
            </label>
          )}
        </div>

        {/* Template Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-800">
            Select Reminder Tone & Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => setTemplateType('gentle')}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors text-center ${
                templateType === 'gentle'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Gentle
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('due_today')}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors text-center ${
                templateType === 'due_today'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Due Today
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('overdue')}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors text-center ${
                templateType === 'overdue'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Overdue
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('formal')}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors text-center ${
                templateType === 'formal'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Formal
            </button>
            <button
              type="button"
              onClick={() => {
                setTemplateType('custom');
                if (!customText) setCustomText(generatedMessage);
              }}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors text-center ${
                templateType === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom text editor if custom selected */}
        {templateType === 'custom' && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Customize Reminder Text
            </label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="Type your custom WhatsApp message here..."
            />
          </div>
        )}

        {/* Live WhatsApp Bubble Preview */}
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
          <div className="bg-[#075E54] text-white px-3.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span className="text-xs font-semibold tracking-wide">WhatsApp Message Preview</span>
            </div>
            <span className="text-[10px] text-emerald-100 font-mono">
              {formattedPhone ? `+${formattedPhone}` : 'No phone set'}
            </span>
          </div>

          <div className="bg-[#EFEAE2] p-4 min-h-[110px] flex items-center justify-end">
            <div className="bg-[#DCF8C6] text-slate-900 rounded-lg rounded-tr-none px-3.5 py-2.5 max-w-[90%] shadow-xs text-xs space-y-1 border border-emerald-100">
              <p className="whitespace-pre-wrap leading-relaxed select-text" dir="ltr">
                {generatedMessage}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 select-none">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-blue-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Message Text</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!phoneNumber.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1da851] disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
