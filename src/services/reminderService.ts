import { Invoice, Client, BusinessSettings } from '../types';
import { emailService, ReminderType } from './emailService';

export interface ReminderConfig {
  enabled: boolean;
  daysBeforeDue: number; // default: 3
  remindOnDueDate: boolean;
  remindWhenOverdue: boolean;
  overdueFrequencyDays: number;
}

const REMINDER_CONFIG_STORAGE_KEY = 'biztrack_reminder_config_v1';
const SENT_REMINDERS_CACHE_KEY = 'biztrack_sent_reminders_history_v1';

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  daysBeforeDue: 3,
  remindOnDueDate: true,
  remindWhenOverdue: true,
  overdueFrequencyDays: 3,
};

class ReminderService {
  public getConfig(): ReminderConfig {
    if (typeof localStorage === 'undefined') return DEFAULT_REMINDER_CONFIG;
    try {
      const raw = localStorage.getItem(REMINDER_CONFIG_STORAGE_KEY);
      return raw ? { ...DEFAULT_REMINDER_CONFIG, ...JSON.parse(raw) } : DEFAULT_REMINDER_CONFIG;
    } catch {
      return DEFAULT_REMINDER_CONFIG;
    }
  }

  public saveConfig(config: Partial<ReminderConfig>): ReminderConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(REMINDER_CONFIG_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save reminder config:', e);
      }
    }
    return updated;
  }

  private getHistory(): Record<string, string> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(SENT_REMINDERS_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private recordSent(invoiceId: string, reminderType: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const history = this.getHistory();
      const key = `${invoiceId}_${reminderType}`;
      history[key] = new Date().toISOString();
      localStorage.setItem(SENT_REMINDERS_CACHE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to record sent reminder:', e);
    }
  }

  private wasRecentlySent(invoiceId: string, reminderType: string, cooldownHours = 24): boolean {
    const history = this.getHistory();
    const key = `${invoiceId}_${reminderType}`;
    const lastSentStr = history[key];
    if (!lastSentStr) return false;

    const diffMs = Date.now() - new Date(lastSentStr).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < cooldownHours;
  }

  /**
   * Run automatic email reminder check against all invoices
   */
  public async checkAndSendAutomaticReminders(
    invoices: Invoice[],
    clients: Client[],
    settings: BusinessSettings
  ): Promise<{ sentCount: number; invoicesReminded: string[] }> {
    const config = this.getConfig();
    if (!config.enabled) {
      return { sentCount: 0, invoicesReminded: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sentCount = 0;
    const invoicesReminded: string[] = [];

    // Filter eligible invoices: unpaid or partially paid and not draft or void
    const activeInvoices = invoices.filter(
      (inv) => inv.status === 'sent' || inv.status === 'partially_paid' || inv.status === 'overdue'
    );

    for (const inv of activeInvoices) {
      const client = clients.find((c) => c.id === inv.clientId);
      if (!client || !client.email) continue;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let reminderTypeToSend: ReminderType | null = null;

      if (diffDays === config.daysBeforeDue) {
        // Due soon (e.g. 3 days before)
        reminderTypeToSend = 'upcoming_due';
      } else if (diffDays === 0 && config.remindOnDueDate) {
        // Due today
        reminderTypeToSend = 'due_today';
      } else if (diffDays < 0 && config.remindWhenOverdue) {
        // Overdue
        reminderTypeToSend = 'overdue';
      }

      if (reminderTypeToSend && !this.wasRecentlySent(inv.id, reminderTypeToSend, 24)) {
        try {
          await emailService.sendInvoiceEmailReminder({
            client,
            invoice: inv,
            settings,
            reminderType: reminderTypeToSend,
          });
          this.recordSent(inv.id, reminderTypeToSend);
          sentCount++;
          invoicesReminded.push(inv.invoiceNumber);
        } catch (err) {
          console.error(`Failed to send auto-reminder for invoice ${inv.invoiceNumber}:`, err);
        }
      }
    }

    return { sentCount, invoicesReminded };
  }
}

export const reminderService = new ReminderService();
