import { Invoice, Client, BusinessSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export type ReminderType = 'upcoming_due' | 'due_today' | 'overdue' | 'manual';

export interface EmailLog {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
  reminderType: ReminderType;
  amount: number;
}

const EMAIL_LOGS_STORAGE_KEY = 'biztrack_email_logs_v1';

class EmailService {
  public getLogs(): EmailLog[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveLog(log: EmailLog): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const logs = this.getLogs();
      logs.unshift(log);
      // Keep recent 100 logs
      localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save email log:', e);
    }
  }

  public clearLogs(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(EMAIL_LOGS_STORAGE_KEY);
  }

  public async sendInvoiceEmailReminder(params: {
    client: Client;
    invoice: Invoice;
    settings: BusinessSettings;
    reminderType: ReminderType;
    customNote?: string;
  }): Promise<EmailLog> {
    const { client, invoice, settings, reminderType, customNote } = params;
    const senderName = settings.businessName || settings.ownerName || 'BizTrack Invoicing';
    const currency = settings.defaultCurrency || 'USD';
    const symbol = settings.currencySymbol || '$';
    const dueFormatted = formatDate(invoice.dueDate);
    const balanceDueFormatted = formatCurrency(invoice.balanceDue || invoice.totalAmount, currency, symbol);

    let subject = '';
    let greeting = `Dear ${client.name},`;

    switch (reminderType) {
      case 'upcoming_due':
        subject = `Reminder: Invoice #${invoice.invoiceNumber} is due on ${dueFormatted}`;
        break;
      case 'due_today':
        subject = `Payment Due Today: Invoice #${invoice.invoiceNumber} (${balanceDueFormatted})`;
        break;
      case 'overdue':
        subject = `Urgent: Invoice #${invoice.invoiceNumber} is overdue`;
        break;
      case 'manual':
      default:
        subject = `Invoice #${invoice.invoiceNumber} from ${senderName}`;
        break;
    }

    const bodyLines = [
      greeting,
      '',
      reminderType === 'overdue'
        ? `We noticed that payment for Invoice #${invoice.invoiceNumber} was due on ${dueFormatted} and remains outstanding.`
        : reminderType === 'due_today'
        ? `This is a reminder that payment for Invoice #${invoice.invoiceNumber} is due today, ${dueFormatted}.`
        : `This is a friendly reminder that Invoice #${invoice.invoiceNumber} is scheduled for payment on ${dueFormatted}.`,
      '',
      `Invoice Details:`,
      `• Invoice #: ${invoice.invoiceNumber}`,
      `• Total Amount: ${formatCurrency(invoice.totalAmount, currency, symbol)}`,
      `• Balance Due: ${balanceDueFormatted}`,
      `• Due Date: ${dueFormatted}`,
      '',
      customNote ? `Note: ${customNote}\n` : '',
      settings.bankDetails ? `Remittance Instructions:\n${settings.bankDetails}\n` : '',
      `Thank you for your business!\n\nBest regards,\n${senderName}`,
      settings.phone ? `Phone / WhatsApp: ${settings.phone}` : '',
      settings.email ? `Email: ${settings.email}` : ''
    ].filter(Boolean);

    const emailBody = bodyLines.join('\n');

    const log: EmailLog = {
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      recipientEmail: client.email,
      recipientName: client.name,
      subject,
      body: emailBody,
      sentAt: new Date().toISOString(),
      status: 'sent',
      reminderType,
      amount: invoice.balanceDue || invoice.totalAmount,
    };

    this.saveLog(log);
    return log;
  }
}

export const emailService = new EmailService();
