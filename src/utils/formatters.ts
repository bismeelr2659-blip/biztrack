import { CurrencyCode, InvoiceItem } from '../types';

export function formatCurrency(
  amount: number, 
  currency: CurrencyCode = 'USD', 
  customSymbol?: string
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  // High-precision tabular formatting
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (customSymbol) {
    return `${customSymbol}${formattedNumber}`;
  }

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

  const symbol = symbolMap[currency] || '$';
  return `${symbol}${formattedNumber}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatSecondsToTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatSecondsToHours(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(1)} hrs`;
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRatePercent: number = 0,
  discountRatePercent: number = 0
) {
  const subtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  const discountAmount = subtotal * (Math.max(0, discountRatePercent) / 100);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = discountedSubtotal * (Math.max(0, taxRatePercent) / 100);
  const totalAmount = discountedSubtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export function generateNextInvoiceNumber(existingInvoices: { invoiceNumber: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  let maxSeq = 0;
  for (const inv of existingInvoices) {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
      const seqStr = inv.invoiceNumber.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function computeNextRunDate(fromDateStr: string, frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'): string {
  const date = new Date(fromDateStr);
  if (isNaN(date.getTime())) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}

export {
  sendWhatsAppReminder,
  formatPhoneForWhatsApp,
  buildWhatsAppReminderMessage,
  generateWhatsAppURL,
  isPakistaniNumber,
} from './whatsapp';
export type { WhatsAppReminderOptions } from './whatsapp';

export {
  getNextDate,
  formatNextDate,
  createRecurringInvoice,
  checkRecurringInvoices,
} from './recurring';
export type { RecurringRepeatType } from './recurring';


