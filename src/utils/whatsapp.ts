/**
 * WhatsApp Reminder Utilities
 * Converts local Pakistani phone numbers (03xx -> 923xx) and standardizes international numbers,
 * formats reminder text, and generates wa.me links.
 */

export interface WhatsAppReminderOptions {
  clientName: string;
  invoiceNumber: string;
  amount: number | string;
  dueDate: string;
  clientPhone: string;
  currencySymbol?: string;
  templateType?: 'gentle' | 'due_today' | 'overdue' | 'formal' | 'custom';
  customMessage?: string;
}

/**
 * Normalizes phone numbers for WhatsApp wa.me URLs.
 * In Pakistan, mobile numbers usually start with '03...' (e.g. 03001234567).
 * wa.me requires country code without leading zero or '+', so '03...' becomes '923...'.
 */
export function formatPhoneForWhatsApp(clientPhone: string): string {
  if (!clientPhone) return '';

  // Remove whitespace, hyphens, brackets, dots, plus signs
  let phone = clientPhone.replace(/[\s\-\(\)\+\.]/g, '').trim();

  // If phone starts with 0 (e.g. 03001234567 in Pakistan), replace leading 0 with 92
  if (phone.startsWith('0')) {
    phone = phone.replace(/^0/, '92');
  }

  return phone;
}

/**
 * Checks if a phone number appears to be a Pakistani mobile number
 */
export function isPakistaniNumber(clientPhone: string): boolean {
  if (!clientPhone) return false;
  const cleaned = clientPhone.replace(/[\s\-\(\)\+\.]/g, '');
  return /^03\d{9}$/.test(cleaned) || /^923\d{9}$/.test(cleaned);
}

/**
 * Builds the message text for WhatsApp reminder based on selected template
 */
export function buildWhatsAppReminderMessage({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  currencySymbol = '$',
  templateType = 'gentle',
  customMessage,
}: Omit<WhatsAppReminderOptions, 'clientPhone'>): string {
  if (templateType === 'custom' && customMessage) {
    return customMessage;
  }

  const formattedAmount = typeof amount === 'number' 
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : amount;

  switch (templateType) {
    case 'due_today':
      return `Hi ${clientName}, a friendly reminder that invoice #${invoiceNumber} for ${currencySymbol}${formattedAmount} is due today (${dueDate}). Please let us know once paid. Thank you! - Sent via BizTrack Invoicing`;

    case 'overdue':
      return `Hi ${clientName}, our records indicate that invoice #${invoiceNumber} for ${currencySymbol}${formattedAmount} (due on ${dueDate}) is currently overdue. Kindly process the payment at your earliest convenience. Thank you! - Sent via BizTrack Invoicing`;

    case 'formal':
      return `Dear ${clientName}, this is a formal notice regarding invoice #${invoiceNumber} amounting to ${currencySymbol}${formattedAmount}, due on ${dueDate}. Please remit payment as agreed. Thank you.`;

    case 'gentle':
    default:
      return `Hi ${clientName}, a gentle reminder that your invoice #${invoiceNumber} of ${currencySymbol}${formattedAmount} is due on ${dueDate}. Thanks! - Sent via BizTrack Invoicing`;
  }
}

/**
 * Generates the full WhatsApp URL: https://wa.me/{phone}?text={encodedMessage}
 */
export function generateWhatsAppURL(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Main execution function matching standard parameters:
 * sendWhatsAppReminder(clientName, invoiceNumber, amount, dueDate, clientPhone)
 */
export function sendWhatsAppReminder(
  clientName: string,
  invoiceNumber: string,
  amount: number | string,
  dueDate: string,
  clientPhone: string,
  currencySymbol: string = '$',
  templateType: 'gentle' | 'due_today' | 'overdue' | 'formal' | 'custom' = 'gentle'
): { whatsappURL: string; message: string; formattedPhone: string } {
  // Replace leading 0 with Pakistan country code 92
  const formattedPhone = formatPhoneForWhatsApp(clientPhone);

  const message = buildWhatsAppReminderMessage({
    clientName,
    invoiceNumber,
    amount,
    dueDate,
    currencySymbol,
    templateType,
  });

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  // Open WhatsApp in a new tab safely
  if (typeof window !== 'undefined') {
    window.open(whatsappURL, '_blank', 'noopener,noreferrer');
  }

  return { whatsappURL, message, formattedPhone };
}
