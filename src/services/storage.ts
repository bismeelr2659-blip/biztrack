import { 
  Client, 
  Project, 
  TimeEntry, 
  Invoice, 
  Payment, 
  Expense, 
  BusinessSettings, 
  ActiveTimer,
  RecurringInvoiceSchedule,
  DataSource,
  BaseEntity
} from '../types';

export type { DataSource, BaseEntity };

export interface AppData {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  recurringSchedules: RecurringInvoiceSchedule[];
  settings: BusinessSettings;
  activeTimer: ActiveTimer | null;
}

// ==========================================
// ==========================================
// BIZTRACK STORAGE
// ==========================================

export const STORAGE_KEY = 'biztrack_saas_data_v1';
export const DEFAULT_BUSINESS_ID = 'business_default';
export const PROTECTED_INVOICE_NUMBER = 'INV-2026-009';

export const PROTECTED_INVOICE_INV_2026_009: Invoice = {
  id: 'inv-2026-009',
  invoiceNumber: 'INV-2026-009',
  clientId: 'cli-101',
  projectId: 'proj-201',
  issueDate: '2026-10-20',
  dueDate: '2026-11-10',
  status: 'sent',
  items: [
    {
      id: 'item-inv-009-1',
      description: 'Enterprise AI & Workflow Automation Solutions',
      quantity: 1,
      unitPrice: 2800,
      amount: 2800,
    },
    {
      id: 'item-inv-009-2',
      description: 'Data Pipeline Integration & Safe Architecture Setup',
      quantity: 1,
      unitPrice: 1200,
      amount: 1200,
    },
  ],
  subtotal: 4000,
  taxRate: 0,
  taxAmount: 0,
  discountRate: 0,
  discountAmount: 0,
  totalAmount: 4000,
  amount: 4000,
  amountPaid: 0,
  balanceDue: 4000,
  notes: 'Remittance accepted via bank wire or online portal.',
  paymentTerms: 'Net 15 days upon receipt',
  source: 'real',
  businessId: DEFAULT_BUSINESS_ID,
  isProtected: false,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

export function ensureSafeSource<T extends BaseEntity>(item: T): T {
  const result: any = { ...item };
  if (result.isProtected) {
    result.isProtected = false;
  }
  if (!result.source) {
    result.source = 'real' as DataSource;
  }
  if (!result.businessId) {
    result.businessId = DEFAULT_BUSINESS_ID;
  }
  return result as T;
}

export function getInvoices(): Invoice[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return (data.invoices || []).map((inv: Invoice) => {
      const safe = ensureSafeSource(inv);
      if (safe.totalAmount === undefined && typeof safe.amount === 'number') {
        safe.totalAmount = safe.amount;
      }
      if (safe.amount === undefined && typeof safe.totalAmount === 'number') {
        safe.amount = safe.totalAmount;
      }
      return safe;
    });
  } catch {
    return [];
  }
}

export function saveInvoice(invoice: Invoice): void {
  const safe = ensureSafeSource(invoice);
  if (safe.totalAmount === undefined && typeof safe.amount === 'number') {
    safe.totalAmount = safe.amount;
  }
  if (safe.amount === undefined && typeof safe.totalAmount === 'number') {
    safe.amount = safe.totalAmount;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const data = raw ? JSON.parse(raw) : { invoices: [] };
  data.invoices = [...(data.invoices || []).filter((i: Invoice) => i.id !== safe.id), safe];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getFilteredInvoices(filter: 'all' | 'real' | 'demo' = 'all'): Invoice[] {
  const all = getInvoices();
  if (filter === 'all') return all;
  return all.filter((i) => (i.source || 'real') === filter);
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'My Workspace',
  ownerName: 'Workspace Owner',
  email: 'billing@myworkspace.io',
  adminEmail: 'admin@myworkspace.io',
  showEmailPublicly: false,
  phone: '',
  whatsappNumber: '',
  website: '',
  address: '',
  taxId: '',
  defaultCurrency: 'USD',
  currencySymbol: '$',
  defaultTaxRate: 16,
  defaultPaymentTerms: 'Net 15 days upon receipt',
  bankDetails: 'Bank Transfer / Wire or Online Remittance Accepted',
  invoiceNotesTemplate: 'Thank you for your business!',
  isDemoMode: false,
  autoEmailReminders: true,
};

export const EMPTY_DATA: AppData = {
  clients: [],
  projects: [],
  timeEntries: [],
  invoices: [],
  payments: [],
  expenses: [],
  recurringSchedules: [],
  settings: DEFAULT_SETTINGS,
  activeTimer: null,
};

/**
 * Storage Abstraction Interface
 * Designed so Firebase Firestore or Cloud SQL can be substituted without touching UI components.
 */
export interface IStorageService {
  loadData(): Promise<AppData>;
  saveData(data: AppData): Promise<void>;
  clearData(): Promise<void>;
  getClients(): Client[];
  saveClients(clients: Client[]): void;
  getProjects(): Project[];
  saveProjects(projects: Project[]): void;
  getTimeEntries(): TimeEntry[];
  saveTimeEntries(entries: TimeEntry[]): void;
  getInvoices(): Invoice[];
  saveInvoices(invoices: Invoice[]): void;
  getPayments(): Payment[];
  savePayments(payments: Payment[]): void;
  getExpenses(): Expense[];
  saveExpenses(expenses: Expense[]): void;
  getSettings(): BusinessSettings;
  saveSettings(settings: Partial<BusinessSettings>): void;
}

export class LocalStorageAdapter implements IStorageService {
  private getParsed(): Partial<AppData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private savePartial(partial: Partial<AppData>): void {
    try {
      const current = this.getParsed();
      const updated = { ...EMPTY_DATA, ...current, ...partial };
      const currentInvoices = Array.isArray(updated.invoices) ? updated.invoices : [];
      updated.invoices = currentInvoices.map((inv) => ensureSafeSource(inv));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  getClients(): Client[] {
    const data = this.getParsed();
    return Array.isArray(data.clients) ? data.clients.map(ensureSafeSource) : [];
  }

  saveClients(clients: Client[]): void {
    this.savePartial({ clients: clients.map(ensureSafeSource) });
  }

  getProjects(): Project[] {
    const data = this.getParsed();
    return Array.isArray(data.projects) ? data.projects.map(ensureSafeSource) : [];
  }

  saveProjects(projects: Project[]): void {
    this.savePartial({ projects: projects.map(ensureSafeSource) });
  }

  getTimeEntries(): TimeEntry[] {
    const data = this.getParsed();
    return Array.isArray(data.timeEntries) ? data.timeEntries.map(ensureSafeSource) : [];
  }

  saveTimeEntries(timeEntries: TimeEntry[]): void {
    this.savePartial({ timeEntries: timeEntries.map(ensureSafeSource) });
  }

  getInvoices(): Invoice[] {
    return getInvoices();
  }

  saveInvoices(invoices: Invoice[]): void {
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    this.savePartial({ invoices: safeInvoices.map(ensureSafeSource) });
  }

  getPayments(): Payment[] {
    const data = this.getParsed();
    return Array.isArray(data.payments) ? data.payments.map(ensureSafeSource) : [];
  }

  savePayments(payments: Payment[]): void {
    this.savePartial({ payments: payments.map(ensureSafeSource) });
  }

  getExpenses(): Expense[] {
    const data = this.getParsed();
    return Array.isArray(data.expenses) ? data.expenses.map(ensureSafeSource) : [];
  }

  saveExpenses(expenses: Expense[]): void {
    this.savePartial({ expenses: expenses.map(ensureSafeSource) });
  }

  getSettings(): BusinessSettings {
    const data = this.getParsed();
    return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  }

  saveSettings(settings: Partial<BusinessSettings>): void {
    const current = this.getSettings();
    this.savePartial({ settings: { ...current, ...settings } });
  }

  async loadData(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return EMPTY_DATA;
      }
      const parsed = JSON.parse(raw) as Partial<AppData>;
      const rawInvoices = Array.isArray(parsed.invoices) ? parsed.invoices : [];
      const mappedInvoices: Invoice[] = rawInvoices.map((inv) => {
        const safe = ensureSafeSource(inv);
        if (safe.totalAmount === undefined && typeof safe.amount === 'number') {
          safe.totalAmount = safe.amount;
        }
        if (safe.amount === undefined && typeof safe.totalAmount === 'number') {
          safe.amount = safe.totalAmount;
        }
        return safe;
      });

      return {
        clients: Array.isArray(parsed.clients) ? parsed.clients.map(ensureSafeSource) : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects.map(ensureSafeSource) : [],
        timeEntries: Array.isArray(parsed.timeEntries) ? parsed.timeEntries.map(ensureSafeSource) : [],
        invoices: mappedInvoices,
        payments: Array.isArray(parsed.payments) ? parsed.payments.map(ensureSafeSource) : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses.map(ensureSafeSource) : [],
        recurringSchedules: Array.isArray(parsed.recurringSchedules) ? parsed.recurringSchedules : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        activeTimer: parsed.activeTimer || null,
      };
    } catch (err) {
      console.error('Failed to load BizTrack data from localStorage', err);
      return EMPTY_DATA;
    }
  }

  async saveData(data: AppData): Promise<void> {
    try {
      const currentInvoices = Array.isArray(data.invoices) ? [...data.invoices] : [];
      const safeguardedData: AppData = {
        ...data,
        invoices: currentInvoices.map((inv) => {
          const safe = ensureSafeSource(inv);
          if (safe.totalAmount === undefined && typeof safe.amount === 'number') {
            safe.totalAmount = safe.amount;
          }
          if (safe.amount === undefined && typeof safe.totalAmount === 'number') {
            safe.amount = safe.totalAmount;
          }
          return safe;
        }),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeguardedData));
    } catch (err) {
      console.error('Failed to persist BizTrack data to localStorage', err);
      throw new Error('Local storage write limit exceeded or access denied.');
    }
  }

  async clearData(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_DATA));
    } catch (err) {
      console.error('Failed to clear BizTrack localStorage', err);
    }
  }
}

export const storageService: IStorageService = new LocalStorageAdapter();

/**
 * Generates rich, cohesive demonstration data for testing and previewing
 */
export function generateDemoData(): AppData {
  const c1Id = 'cli-101';
  const c2Id = 'cli-102';
  const c3Id = 'cli-103';
  const c4Id = 'cli-104';
  const c5Id = 'cli-105';

  const clients: Client[] = [
    {
      id: c1Id,
      name: 'Elena Rostova',
      company: 'Vanguard FinTech Group',
      email: 'elena@vanguardfin.com',
      phone: '+1 (415) 890-1122',
      address: '100 Montgomery St, Fl 18, San Francisco, CA 94104',
      currency: 'USD',
      notes: 'Quarterly compliance and modern UI redesign. Net 15 terms.',
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-01T09:00:00.000Z',
    },
    {
      id: c2Id,
      name: 'Marcus Vance',
      company: 'Solaria Solar Systems',
      email: 'm.vance@solariagrid.io',
      phone: '+1 (512) 441-9080',
      address: '804 Congress Ave, Austin, TX 78701',
      currency: 'USD',
      notes: 'Customer portal and telemetry monitoring web dashboard.',
      createdAt: '2026-08-15T11:00:00.000Z',
      updatedAt: '2026-08-15T11:00:00.000Z',
    },
    {
      id: c3Id,
      name: 'Dr. Sarah Lin',
      company: 'Kinetic Health Labs',
      email: 'clinics@kinetichealth.org',
      phone: '+1 (206) 773-4500',
      address: '2200 Westlake Ave, Seattle, WA 98121',
      currency: 'USD',
      notes: 'HIPAA compliant patient telemetry integration.',
      createdAt: '2026-09-02T14:30:00.000Z',
      updatedAt: '2026-09-02T14:30:00.000Z',
    },
    {
      id: c4Id,
      name: 'Julian Becker',
      company: 'Nordic Craft Roast',
      email: 'julian@nordicroast.co',
      phone: '+1 (503) 229-8812',
      address: '1120 NW Couch St, Portland, OR 97209',
      currency: 'USD',
      notes: 'E-commerce wholesale subscription portal.',
      createdAt: '2026-09-20T10:15:00.000Z',
      updatedAt: '2026-09-20T10:15:00.000Z',
    },
    {
      id: c5Id,
      name: 'Ali Khan',
      company: 'Indus Creative Studio',
      email: 'ali@induscreative.pk',
      phone: '03001234567',
      address: 'Gulberg III, Lahore, Pakistan',
      currency: 'USD',
      notes: 'Brand design & digital identity deliverables. WhatsApp preferred for invoices.',
      createdAt: '2026-09-25T11:00:00.000Z',
      updatedAt: '2026-09-25T11:00:00.000Z',
    },
  ];

  const p1Id = 'proj-201';
  const p2Id = 'proj-202';
  const p3Id = 'proj-203';
  const p4Id = 'proj-204';

  const projects: Project[] = [
    {
      id: p1Id,
      clientId: c1Id,
      name: 'Vanguard Trading Dashboard',
      description: 'Real-time trader order book analytics and execution terminal.',
      billingType: 'hourly',
      hourlyRate: 140,
      fixedBudget: 0,
      status: 'in_progress',
      startDate: '2026-08-10',
      deadline: '2026-11-30',
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: p2Id,
      clientId: c2Id,
      name: 'Solaria Telemetry Portal',
      description: 'IoT solar panel fleet telemetry data visualization platform.',
      billingType: 'hourly',
      hourlyRate: 125,
      fixedBudget: 0,
      status: 'in_progress',
      startDate: '2026-08-20',
      deadline: '2026-10-25',
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-09-28T16:00:00.000Z',
    },
    {
      id: p3Id,
      clientId: c3Id,
      name: 'Kinetic EHR Sync Engine',
      description: 'Automated bi-directional HL7/FHIR record synchronization.',
      billingType: 'fixed',
      hourlyRate: 135,
      fixedBudget: 8500,
      status: 'completed',
      startDate: '2026-09-05',
      deadline: '2026-10-05',
      createdAt: '2026-09-05T08:00:00.000Z',
      updatedAt: '2026-10-05T18:00:00.000Z',
    },
    {
      id: p4Id,
      clientId: c4Id,
      name: 'Nordic B2B Wholesale Portal',
      description: 'Subscription management and recurring wholesale invoices.',
      billingType: 'hourly',
      hourlyRate: 110,
      fixedBudget: 0,
      status: 'planning',
      startDate: '2026-10-15',
      deadline: '2026-12-15',
      createdAt: '2026-09-22T08:00:00.000Z',
      updatedAt: '2026-09-22T08:00:00.000Z',
    },
  ];

  const timeEntries: TimeEntry[] = [
    {
      id: 'time-301',
      projectId: p1Id,
      clientId: c1Id,
      description: 'Implemented WebSocket stream for order book depths',
      startTime: '2026-10-02T09:00:00.000Z',
      endTime: '2026-10-02T13:30:00.000Z',
      durationSeconds: 16200, // 4.5 hours
      isBillable: true,
      hourlyRate: 140,
      isInvoiced: true,
      invoiceId: 'inv-401',
      createdAt: '2026-10-02T13:30:00.000Z',
    },
    {
      id: 'time-302',
      projectId: p1Id,
      clientId: c1Id,
      description: 'Optimized high-frequency canvas chart rendering',
      startTime: '2026-10-03T10:00:00.000Z',
      endTime: '2026-10-03T14:00:00.000Z',
      durationSeconds: 14400, // 4.0 hours
      isBillable: true,
      hourlyRate: 140,
      isInvoiced: true,
      invoiceId: 'inv-401',
      createdAt: '2026-10-03T14:00:00.000Z',
    },
    {
      id: 'time-303',
      projectId: p2Id,
      clientId: c2Id,
      description: 'Inverter telemetry anomaly detection filter',
      startTime: '2026-10-04T08:30:00.000Z',
      endTime: '2026-10-04T12:00:00.000Z',
      durationSeconds: 12600, // 3.5 hours
      isBillable: true,
      hourlyRate: 125,
      isInvoiced: false,
      createdAt: '2026-10-04T12:00:00.000Z',
    },
    {
      id: 'time-304',
      projectId: p2Id,
      clientId: c2Id,
      description: 'Responsive mobile layout for field solar technicians',
      startTime: '2026-10-05T13:00:00.000Z',
      endTime: '2026-10-05T17:45:00.000Z',
      durationSeconds: 17100, // 4.75 hours
      isBillable: true,
      hourlyRate: 125,
      isInvoiced: false,
      createdAt: '2026-10-05T17:45:00.000Z',
    },
    {
      id: 'time-305',
      projectId: p1Id,
      clientId: c1Id,
      description: 'Trade settlement audit modal & CSV export engine',
      startTime: '2026-10-06T09:15:00.000Z',
      endTime: '2026-10-06T12:45:00.000Z',
      durationSeconds: 12600, // 3.5 hours
      isBillable: true,
      hourlyRate: 140,
      isInvoiced: false,
      createdAt: '2026-10-06T12:45:00.000Z',
    },
  ];

  const invoices: Invoice[] = [
    PROTECTED_INVOICE_INV_2026_009,
    {
      id: 'inv-401',
      invoiceNumber: 'INV-2026-001',
      clientId: c1Id,
      projectId: p1Id,
      issueDate: '2026-09-15',
      dueDate: '2026-09-30',
      status: 'paid',
      source: 'demo',
      businessId: DEFAULT_BUSINESS_ID,
      items: [
        {
          id: 'item-1',
          description: 'Frontend Architecture & WebSocket Engine (18 hrs @ $140/hr)',
          quantity: 18,
          unitPrice: 140,
          amount: 2520,
        },
        {
          id: 'item-2',
          description: 'Technical Risk & Data Validation Audit',
          quantity: 1,
          unitPrice: 650,
          amount: 650,
        },
      ],
      subtotal: 3170,
      taxRate: 8.5,
      taxAmount: 269.45,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 3439.45,
      amount: 3439.45,
      amountPaid: 3439.45,
      balanceDue: 0,
      notes: 'Paid in full via wire transfer.',
      paymentTerms: 'Net 15 days upon receipt',
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-28T14:30:00.000Z',
    },
    {
      id: 'inv-402',
      invoiceNumber: 'INV-2026-002',
      clientId: c2Id,
      projectId: p2Id,
      issueDate: '2026-09-25',
      dueDate: '2026-10-10',
      status: 'partially_paid',
      source: 'demo',
      businessId: DEFAULT_BUSINESS_ID,
      items: [
        {
          id: 'item-3',
          description: 'Solaria IoT Map Fleet Visualization (24 hrs @ $125/hr)',
          quantity: 24,
          unitPrice: 125,
          amount: 3000,
        },
        {
          id: 'item-4',
          description: 'Cloud Watchdog Integration & Setup',
          quantity: 1,
          unitPrice: 500,
          amount: 500,
        },
      ],
      subtotal: 3500,
      taxRate: 8.5,
      taxAmount: 297.5,
      discountRate: 5,
      discountAmount: 175,
      totalAmount: 3622.5,
      amount: 3622.5,
      amountPaid: 2000,
      balanceDue: 1622.5,
      notes: 'Initial milestone deposit paid. Remainder due on delivery.',
      paymentTerms: 'Net 15 days upon receipt',
      createdAt: '2026-09-25T11:00:00.000Z',
      updatedAt: '2026-09-29T16:00:00.000Z',
    },
    {
      id: 'inv-403',
      invoiceNumber: 'INV-2026-003',
      clientId: c3Id,
      projectId: p3Id,
      issueDate: '2026-10-01',
      dueDate: '2026-10-16',
      status: 'sent',
      source: 'demo',
      businessId: DEFAULT_BUSINESS_ID,
      items: [
        {
          id: 'item-5',
          description: 'Kinetic EHR Sync Engine - Full Fixed Milestone Deliverable',
          quantity: 1,
          unitPrice: 8500,
          amount: 8500,
        },
      ],
      subtotal: 8500,
      taxRate: 8.5,
      taxAmount: 722.5,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 9222.5,
      amount: 9222.5,
      amountPaid: 0,
      balanceDue: 9222.5,
      notes: 'Delivered and tested on Kinetic staging cluster.',
      paymentTerms: 'Net 15 days upon receipt',
      createdAt: '2026-10-01T15:00:00.000Z',
      updatedAt: '2026-10-01T15:00:00.000Z',
    },
    {
      id: 'inv-404',
      invoiceNumber: 'INV-2026-004',
      clientId: c1Id,
      projectId: p1Id,
      issueDate: '2026-09-01',
      dueDate: '2026-09-15',
      status: 'overdue',
      source: 'demo',
      businessId: DEFAULT_BUSINESS_ID,
      items: [
        {
          id: 'item-6',
          description: 'Specialized SecOps Penetration Support',
          quantity: 1,
          unitPrice: 1200,
          amount: 1200,
        },
      ],
      subtotal: 1200,
      taxRate: 8.5,
      taxAmount: 102,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 1302,
      amount: 1302,
      amountPaid: 0,
      balanceDue: 1302,
      notes: 'Second reminder notice transmitted to accounts payable.',
      paymentTerms: 'Due upon receipt',
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-16T08:00:00.000Z',
    },
    {
      id: 'inv-101',
      invoiceNumber: 'INV-101',
      clientId: c5Id,
      issueDate: '2026-09-26',
      dueDate: '2026-10-10',
      status: 'sent',
      source: 'demo',
      businessId: DEFAULT_BUSINESS_ID,
      items: [
        {
          id: 'item-7',
          description: 'Brand Identity Design & Logo Suite',
          quantity: 1,
          unitPrice: 500,
          amount: 500,
        },
      ],
      subtotal: 500,
      taxRate: 0,
      taxAmount: 0,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 500,
      amount: 500,
      amountPaid: 0,
      balanceDue: 500,
      notes: 'Final delivery approved. Payment due by 10-Oct-2026.',
      paymentTerms: 'Due on 10-Oct-2026',
      isRecurring: true,
      repeat: 'monthly',
      nextDate: '2026-10-26',
      createdAt: '2026-09-26T10:00:00.000Z',
      updatedAt: '2026-09-26T10:00:00.000Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-501',
      invoiceId: 'inv-401',
      clientId: c1Id,
      amount: 3439.45,
      paymentDate: '2026-09-28',
      method: 'bank_transfer',
      reference: 'WIRE-VG-99210',
      notes: 'Received via Chase wire transfer, settled same-day.',
      createdAt: '2026-09-28T14:30:00.000Z',
    },
    {
      id: 'pay-502',
      invoiceId: 'inv-402',
      clientId: c2Id,
      amount: 2000,
      paymentDate: '2026-09-29',
      method: 'stripe',
      reference: 'ch_3N82bX2eZvKYlo2C',
      notes: 'Milestone 50% deposit paid via credit card.',
      createdAt: '2026-09-29T16:00:00.000Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-601',
      category: 'software',
      description: 'Figma Organization Annual Seat & FigJam',
      vendor: 'Figma Inc.',
      amount: 540,
      date: '2026-08-15',
      isBillable: false,
      isTaxDeductible: true,
      receiptNote: 'Invoice #FG-88210',
      createdAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'exp-602',
      category: 'software',
      description: 'GitHub Enterprise & Copilot Business',
      vendor: 'GitHub / Microsoft',
      amount: 216,
      date: '2026-09-01',
      isBillable: false,
      isTaxDeductible: true,
      receiptNote: 'Monthly auto-bill',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'exp-603',
      category: 'contractors',
      description: 'Specialist Security Code Review (Kinetic HIPAA prep)',
      vendor: 'CipherSec Auditing LLC',
      amount: 1450,
      date: '2026-09-12',
      projectId: p3Id,
      isBillable: true,
      isTaxDeductible: true,
      receiptNote: 'W-9 on file',
      createdAt: '2026-09-12T15:00:00.000Z',
    },
    {
      id: 'exp-604',
      category: 'hardware',
      description: 'CalDigit TS4 Thunderbolt 4 Dock & Test Cables',
      vendor: 'B&H Photo Video',
      amount: 399.95,
      date: '2026-09-18',
      isBillable: false,
      isTaxDeductible: true,
      receiptNote: 'Order #BH-77491',
      createdAt: '2026-09-18T11:00:00.000Z',
    },
    {
      id: 'exp-605',
      category: 'utilities',
      description: 'AWS Staging & Cloudflare Zero Trust tunnel',
      vendor: 'Amazon Web Services',
      amount: 184.20,
      date: '2026-10-01',
      isBillable: false,
      isTaxDeductible: true,
      receiptNote: 'AWS Account #392810',
      createdAt: '2026-10-01T09:00:00.000Z',
    },
    {
      id: 'exp-606',
      category: 'office',
      description: 'WeWork Hot Desk & Meeting Room Credits',
      vendor: 'WeWork Companies',
      amount: 350,
      date: '2026-10-02',
      isBillable: false,
      isTaxDeductible: true,
      receiptNote: 'Invoice #WW-29184',
      createdAt: '2026-10-02T13:00:00.000Z',
    },
  ];

  const recurringSchedules: RecurringInvoiceSchedule[] = [
    {
      id: 'rec-701',
      clientId: c1Id,
      projectId: p1Id,
      title: 'Monthly Trading Platform Retainer & Maintenance',
      frequency: 'monthly',
      items: [
        {
          id: 'rec-item-1',
          description: 'Monthly Dedicated DevOps & High-Frequency Stream Monitoring',
          quantity: 1,
          unitPrice: 2800,
          amount: 2800,
        },
      ],
      taxRate: 8.5,
      discountRate: 0,
      paymentTerms: 'Net 15 days upon receipt',
      notes: 'Automated monthly recurring retainer invoice. Remit via ACH wire.',
      startDate: '2026-09-01',
      nextRunDate: '2026-11-01',
      lastGeneratedDate: '2026-10-01',
      isActive: true,
      generatedInvoiceCount: 2,
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    },
    {
      id: 'rec-702',
      clientId: c2Id,
      projectId: p2Id,
      title: 'Bi-Weekly IoT Fleet Telemetry Cloud Oversight',
      frequency: 'biweekly',
      items: [
        {
          id: 'rec-item-2',
          description: 'Bi-weekly Telemetry Database Health & Solar Map Sync',
          quantity: 1,
          unitPrice: 1250,
          amount: 1250,
        },
      ],
      taxRate: 8.5,
      discountRate: 5,
      paymentTerms: 'Due upon receipt',
      notes: 'Bi-weekly recurring system audit retainer.',
      startDate: '2026-09-15',
      nextRunDate: '2026-10-15',
      lastGeneratedDate: '2026-10-01',
      isActive: true,
      generatedInvoiceCount: 2,
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
  ];

  return {
    clients,
    projects,
    timeEntries,
    invoices,
    payments,
    expenses,
    recurringSchedules,
    settings: {
      ...DEFAULT_SETTINGS,
      isDemoMode: true,
    },
    activeTimer: null,
  };
}
