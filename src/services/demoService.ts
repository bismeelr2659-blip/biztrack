import { Client, Project, TimeEntry, Invoice, Payment, Expense } from '../types';
import { storageService, PROTECTED_INVOICE_NUMBER } from './storage';
import { cloudService } from './cloudService';

export const DEMO_COMPANY_NAMES = [
  'apex corp',
  'nexus technologies',
  'solaria creative',
  'kinetic media',
];

export const DEMO_CLIENT_IDS = ['cli-1', 'cli-2', 'cli-3', 'cli-4'];

class DemoService {
  /**
   * Check if any demo data exists in the current workspace
   */
  public hasDemoData(): boolean {
    const clients: Client[] = storageService.getClients();
    const invoices: Invoice[] = storageService.getInvoices();

    const hasDemoClient = clients.some(
      (c: Client) =>
        c.source === 'demo' ||
        DEMO_CLIENT_IDS.includes(c.id) ||
        DEMO_COMPANY_NAMES.some((name) => (c.company || c.name || '').toLowerCase().includes(name))
    );

    const hasDemoInvoice = invoices.some(
      (i: Invoice) => i.source === 'demo' || i.invoiceNumber === 'INV-2026-009'
    );

    return hasDemoClient || hasDemoInvoice;
  }

  /**
   * Clear all demo data at once, keeping real data & protected records
   */
  public async clearAllDemoData(): Promise<{
    clearedClients: number;
    clearedProjects: number;
    clearedInvoices: number;
    clearedPayments: number;
    clearedExpenses: number;
  }> {
    const currentClients: Client[] = storageService.getClients();
    const currentProjects: Project[] = storageService.getProjects();
    const currentInvoices: Invoice[] = storageService.getInvoices();
    const currentPayments: Payment[] = storageService.getPayments();
    const currentExpenses: Expense[] = storageService.getExpenses();
    const currentTimeEntries: TimeEntry[] = storageService.getTimeEntries();

    // Identify demo client IDs
    const demoClientIds = new Set<string>();
    currentClients.forEach((c: Client) => {
      const isDemo =
        c.source === 'demo' ||
        DEMO_CLIENT_IDS.includes(c.id) ||
        DEMO_COMPANY_NAMES.some((name) => (c.company || c.name || '').toLowerCase().includes(name));
      if (isDemo) {
        demoClientIds.add(c.id);
      }
    });

    // Filter out demo clients
    const realClients = currentClients.filter((c: Client) => !demoClientIds.has(c.id) && c.source !== 'demo');

    // Filter out demo projects
    const realProjects = currentProjects.filter(
      (p: Project) => !demoClientIds.has(p.clientId) && p.source !== 'demo'
    );
    const demoProjectIds = new Set(
      currentProjects
        .filter((p: Project) => demoClientIds.has(p.clientId) || p.source === 'demo')
        .map((p: Project) => p.id)
    );

    // Filter out demo time entries
    const realTimeEntries = currentTimeEntries.filter(
      (t: TimeEntry) => !demoProjectIds.has(t.projectId) && !demoClientIds.has(t.clientId) && t.source !== 'demo'
    );

    // Filter out demo invoices and INV-2026-009 so no invoice is permanent or protected
    const realInvoices = currentInvoices.filter((inv: Invoice) => {
      if (inv.invoiceNumber === 'INV-2026-009') {
        return false;
      }
      return !demoClientIds.has(inv.clientId) && inv.source !== 'demo';
    });

    const realInvoiceIds = new Set(realInvoices.map((i: Invoice) => i.id));

    // Filter out demo payments
    const realPayments = currentPayments.filter(
      (pmt: Payment) => realInvoiceIds.has(pmt.invoiceId) && pmt.source !== 'demo'
    );

    // Filter out demo expenses
    const realExpenses = currentExpenses.filter((e: Expense) => e.source !== 'demo');

    // Update settings: turn off demo mode
    const currentSettings = storageService.getSettings();
    storageService.saveSettings({
      ...currentSettings,
      isDemoMode: false,
    });

    // Save cleaned real entities back to storageService
    storageService.saveClients(realClients);
    storageService.saveProjects(realProjects);
    storageService.saveTimeEntries(realTimeEntries);
    storageService.saveInvoices(realInvoices);
    storageService.savePayments(realPayments);
    storageService.saveExpenses(realExpenses);

    const stats = {
      clearedClients: currentClients.length - realClients.length,
      clearedProjects: currentProjects.length - realProjects.length,
      clearedInvoices: currentInvoices.length - realInvoices.length,
      clearedPayments: currentPayments.length - realPayments.length,
      clearedExpenses: currentExpenses.length - realExpenses.length,
    };

    // Sync cleaned dataset to Cloud
    cloudService.saveDocument('workspaces', 'dataset_cleaned', {
      clearedAt: new Date().toISOString(),
      stats,
    });

    return stats;
  }
}

export const demoService = new DemoService();
