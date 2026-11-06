import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Client, 
  Project, 
  TimeEntry, 
  Invoice, 
  Payment, 
  Expense, 
  BusinessSettings, 
  ActiveTimer,
  AppModule,
  InvoiceStatus,
  InvoiceItem,
  RecurringInvoiceSchedule,
  RecurringFrequency
} from '../types';
import { 
  storageService, 
  DEFAULT_SETTINGS, 
  generateDemoData, 
  AppData,
  EMPTY_DATA,
  DEFAULT_BUSINESS_ID
} from '../services/storage';
import { 
  calculateInvoiceTotals, 
  generateNextInvoiceNumber,
  computeNextRunDate 
} from '../utils/formatters';
import { 
  getNextDate, 
  formatNextDate, 
  checkRecurringInvoices, 
  RecurringRepeatType 
} from '../utils/recurring';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  isLoading: boolean;
  activeModule: AppModule;
  setActiveModule: (module: AppModule) => void;
  
  // Entities
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  recurringSchedules: RecurringInvoiceSchedule[];
  settings: BusinessSettings;
  activeTimer: ActiveTimer | null;
  timerSeconds: number;

  // Client operations
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteClient: (id: string) => Promise<boolean>;

  // Project operations
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<boolean>;

  // Time Tracker operations
  startTimer: (projectId: string, description: string, isBillable?: boolean) => void;
  stopTimer: () => Promise<TimeEntry | null>;
  cancelTimer: () => void;
  addManualTimeEntry: (entry: {
    projectId: string;
    clientId: string;
    description: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    isBillable: boolean;
    hourlyRate: number;
  }) => Promise<TimeEntry>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;

  // Invoice operations
  createInvoice: (invoiceData: {
    clientId: string;
    projectId?: string;
    issueDate: string;
    dueDate: string;
    items: InvoiceItem[];
    taxRate: number;
    discountRate: number;
    notes?: string;
    paymentTerms?: string;
    linkedTimeEntryIds?: string[];
    isRecurring?: boolean;
    repeat?: RecurringRepeatType;
    nextDate?: string;
  }) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  markInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  toggleInvoiceRecurring: (invoiceId: string, repeat?: RecurringRepeatType) => Promise<void>;
  checkAndRunRecurringInvoices: () => Promise<number>;

  // Recurring Invoice operations
  addRecurringSchedule: (schedule: Omit<RecurringInvoiceSchedule, 'id' | 'generatedInvoiceCount' | 'createdAt' | 'updatedAt'>) => Promise<RecurringInvoiceSchedule>;
  updateRecurringSchedule: (id: string, updates: Partial<Omit<RecurringInvoiceSchedule, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteRecurringSchedule: (id: string) => Promise<void>;
  toggleRecurringSchedule: (id: string) => Promise<void>;
  generateInvoiceFromSchedule: (scheduleId: string) => Promise<Invoice>;

  // Payment operations
  recordPayment: (paymentData: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    method: Payment['method'];
    reference?: string;
    notes?: string;
  }) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;

  // Expense operations
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id' | 'createdAt'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Settings & System
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => Promise<boolean>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Calculated Metrics
  totalRevenue: number;
  totalInvoiced: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  totalHoursLogged: number;
  billableHours: number;
  unbilledHours: number;
  unbilledEarnings: number;

  // Helper getters
  getClientById: (id: string) => Client | undefined;
  getProjectById: (id: string) => Project | undefined;
  getInvoiceById: (id: string) => Invoice | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<AppModule>('dashboard');

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringInvoiceSchedule[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to persist current state
  const persistState = useCallback(async (overrides?: Partial<AppData>) => {
    const currentState: AppData = {
      clients: overrides?.clients ?? clients,
      projects: overrides?.projects ?? projects,
      timeEntries: overrides?.timeEntries ?? timeEntries,
      invoices: overrides?.invoices ?? invoices,
      payments: overrides?.payments ?? payments,
      expenses: overrides?.expenses ?? expenses,
      recurringSchedules: overrides?.recurringSchedules ?? recurringSchedules,
      settings: overrides?.settings ?? settings,
      activeTimer: overrides?.activeTimer !== undefined ? overrides.activeTimer : activeTimer,
    };
    await storageService.saveData(currentState);
  }, [clients, projects, timeEntries, invoices, payments, expenses, recurringSchedules, settings, activeTimer]);

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        const data = await storageService.loadData();
        setClients(data.clients);
        setProjects(data.projects);
        setTimeEntries(data.timeEntries);
        setInvoices(data.invoices);
        setPayments(data.payments);
        setExpenses(data.expenses);
        setRecurringSchedules(data.recurringSchedules || []);
        setSettings(data.settings);
        setActiveTimer(data.activeTimer);
      } catch (err) {
        console.error('Initial data load error:', err);
        showToast('Failed to load local data', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [showToast]);

  // Live Timer Interval
  useEffect(() => {
    if (!activeTimer) {
      setTimerSeconds(0);
      return;
    }

    const calcSeconds = () => {
      const startMs = new Date(activeTimer.startTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setTimerSeconds(diffSecs);
    };

    calcSeconds();
    const interval = setInterval(calcSeconds, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Automatic overdue check on invoices
  useEffect(() => {
    if (invoices.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    let changed = false;

    const updated = invoices.map((inv) => {
      if ((inv.status === 'sent' || inv.status === 'partially_paid') && inv.dueDate < today && inv.balanceDue > 0) {
        changed = true;
        return { ...inv, status: 'overdue' as InvoiceStatus, updatedAt: new Date().toISOString() };
      }
      return inv;
    });

    if (changed) {
      setInvoices(updated);
      storageService.saveData({
        clients,
        projects,
        timeEntries,
        invoices: updated,
        payments,
        expenses,
        recurringSchedules,
        settings,
        activeTimer,
      });
    }
  }, [invoices, clients, projects, timeEntries, payments, expenses, recurringSchedules, settings, activeTimer]);

  // Automated recurring schedule checker & draft invoice generation
  useEffect(() => {
    if (isLoading) return;
    const today = new Date().toISOString().split('T')[0];
    const todayDateStr = new Date().toDateString();

    let updatedInvoices = [...invoices];
    let updatedSchedules = [...recurringSchedules];
    let hasChanges = false;
    let generatedCount = 0;

    // 1. Check recurring schedules (if any)
    const dueSchedules = recurringSchedules.filter(
      (s) => s.isActive && s.nextRunDate <= today && (!s.endDate || s.endDate >= today)
    );

    if (dueSchedules.length > 0) {
      dueSchedules.forEach((sch) => {
        const nextNum = generateNextInvoiceNumber(updatedInvoices);
        const { subtotal, taxAmount, discountAmount, totalAmount } = calculateInvoiceTotals(
          sch.items,
          sch.taxRate,
          sch.discountRate
        );

        const due = new Date();
        due.setDate(due.getDate() + 15);
        const dueDateStr = due.toISOString().split('T')[0];

        const newInv: Invoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          invoiceNumber: nextNum,
          clientId: sch.clientId,
          projectId: sch.projectId,
          issueDate: today,
          dueDate: dueDateStr,
          status: 'draft',
          items: sch.items.map((it, idx) => ({
            ...it,
            id: `item-${Date.now()}-${idx}`,
          })),
          subtotal,
          taxRate: sch.taxRate,
          taxAmount,
          discountRate: sch.discountRate,
          discountAmount,
          totalAmount,
          amount: totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          notes: sch.notes || settings.invoiceNotesTemplate,
          paymentTerms: sch.paymentTerms || settings.defaultPaymentTerms,
          source: 'real',
          businessId: DEFAULT_BUSINESS_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updatedInvoices = [newInv, ...updatedInvoices];
        generatedCount++;

        const nextRun = computeNextRunDate(sch.nextRunDate, sch.frequency);
        updatedSchedules = updatedSchedules.map((s) =>
          s.id === sch.id
            ? {
                ...s,
                nextRunDate: nextRun,
                lastGeneratedDate: today,
                generatedInvoiceCount: (s.generatedInvoiceCount || 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : s
        );
      });
      hasChanges = true;
    }

    // 2. Check direct recurring invoices:
    // "allInvoices.forEach(inv => { if (inv.isRecurring && new Date(inv.nextDate).toDateString() === today) ... inv.nextDate = newInv.nextDate; })"
    const dueRecurringInvoices = updatedInvoices.filter(
      (inv) =>
        inv.isRecurring &&
        inv.nextDate &&
        (new Date(inv.nextDate).toDateString() === todayDateStr || inv.nextDate <= today)
    );

    if (dueRecurringInvoices.length > 0) {
      const newlyCreatedChildren: Invoice[] = [];

      updatedInvoices = updatedInvoices.map((inv) => {
        if (!inv.isRecurring || !inv.nextDate) return inv;
        const isDue = new Date(inv.nextDate).toDateString() === todayDateStr || inv.nextDate <= today;
        if (!isDue) return inv;

        const repeatType = inv.repeat || 'monthly';
        const nextCycleDate = getNextDate(new Date(), repeatType);
        const nextCycleDateStr = formatNextDate(nextCycleDate);

        const due = new Date();
        due.setDate(due.getDate() + 15);
        const dueDateStr = formatNextDate(due);

        const nextNum = generateNextInvoiceNumber([...updatedInvoices, ...newlyCreatedChildren]);

        // Create new child invoice for current cycle
        const newInv: Invoice = {
          ...inv,
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          invoiceNumber: nextNum,
          issueDate: today,
          dueDate: dueDateStr,
          status: 'sent',
          amountPaid: 0,
          balanceDue: inv.totalAmount,
          isRecurring: false, // Child issued copy is not recurring
          originalId: inv.id,
          nextDate: nextCycleDateStr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newlyCreatedChildren.push(newInv);
        generatedCount++;

        // Update parent template invoice nextDate
        return {
          ...inv,
          nextDate: newInv.nextDate,
          updatedAt: new Date().toISOString(),
        };
      });

      updatedInvoices = [...newlyCreatedChildren, ...updatedInvoices];
      hasChanges = true;
    }

    if (hasChanges && generatedCount > 0) {
      setInvoices(updatedInvoices);
      setRecurringSchedules(updatedSchedules);
      storageService.saveData({
        clients,
        projects,
        timeEntries,
        invoices: updatedInvoices,
        payments,
        expenses,
        recurringSchedules: updatedSchedules,
        settings,
        activeTimer,
      });
      showToast(`Automatically generated ${generatedCount} recurring invoice(s) due today!`, 'success');
    }
  }, [isLoading, recurringSchedules, clients, invoices, settings, activeTimer, expenses, payments, projects, timeEntries, showToast]);

  // Lookups
  const getClientById = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);
  const getProjectById = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);
  const getInvoiceById = useCallback((id: string) => invoices.find((i) => i.id === id), [invoices]);

  // CLIENT CRUD
  const addClient = async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const newClient: Client = {
      ...data,
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [newClient, ...clients];
    setClients(next);
    await persistState({ clients: next });
    showToast(`Client "${newClient.name}" created.`);
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const next = clients.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
    setClients(next);
    await persistState({ clients: next });
    showToast('Client updated.');
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    // Check if client has linked projects or invoices
    const hasProjects = projects.some((p) => p.clientId === id);
    const hasInvoices = invoices.some((i) => i.clientId === id);

    if (hasProjects || hasInvoices) {
      showToast('Cannot delete client with linked projects or invoices. Archive or remove them first.', 'error');
      return false;
    }

    const next = clients.filter((c) => c.id !== id);
    setClients(next);
    await persistState({ clients: next });
    showToast('Client removed.');
    return true;
  };

  // PROJECT CRUD
  const addProject = async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
    const newProject: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [newProject, ...projects];
    setProjects(next);
    await persistState({ projects: next });
    showToast(`Project "${newProject.name}" added.`);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const next = projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    setProjects(next);
    await persistState({ projects: next });
    showToast('Project updated.');
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    const hasInvoices = invoices.some((i) => i.projectId === id);
    if (hasInvoices) {
      showToast('Cannot delete project with issued invoices.', 'error');
      return false;
    }
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    await persistState({ projects: next });
    showToast('Project removed.');
    return true;
  };

  // TIME TRACKER
  const startTimer = (projectId: string, description: string, isBillable = true) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) {
      showToast('Please select a project before starting timer', 'error');
      return;
    }
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      projectId,
      clientId: proj.clientId,
      description: description.trim() || 'Working on project task',
      startTime: new Date().toISOString(),
      isBillable,
      hourlyRate: proj.hourlyRate || 0,
    };
    setActiveTimer(newTimer);
    persistState({ activeTimer: newTimer });
    showToast(`Timer started: ${newTimer.description}`);
  };

  const stopTimer = async (): Promise<TimeEntry | null> => {
    if (!activeTimer) return null;
    const nowIso = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.floor((new Date(nowIso).getTime() - new Date(activeTimer.startTime).getTime()) / 1000));

    const newEntry: TimeEntry = {
      id: `time-${Date.now()}`,
      projectId: activeTimer.projectId,
      clientId: activeTimer.clientId,
      description: activeTimer.description,
      startTime: activeTimer.startTime,
      endTime: nowIso,
      durationSeconds,
      isBillable: activeTimer.isBillable,
      hourlyRate: activeTimer.hourlyRate,
      isInvoiced: false,
      createdAt: nowIso,
    };

    const nextEntries = [newEntry, ...timeEntries];
    setTimeEntries(nextEntries);
    setActiveTimer(null);
    await persistState({ timeEntries: nextEntries, activeTimer: null });
    showToast(`Timer logged: ${(durationSeconds / 3600).toFixed(2)} hrs.`);
    return newEntry;
  };

  const cancelTimer = () => {
    setActiveTimer(null);
    persistState({ activeTimer: null });
    showToast('Timer discarded.', 'info');
  };

  const addManualTimeEntry = async (entry: {
    projectId: string;
    clientId: string;
    description: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    isBillable: boolean;
    hourlyRate: number;
  }): Promise<TimeEntry> => {
    const newEntry: TimeEntry = {
      ...entry,
      id: `time-${Date.now()}`,
      isInvoiced: false,
      createdAt: new Date().toISOString(),
    };
    const next = [newEntry, ...timeEntries];
    setTimeEntries(next);
    await persistState({ timeEntries: next });
    showToast('Time entry logged.');
    return newEntry;
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    const next = timeEntries.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTimeEntries(next);
    await persistState({ timeEntries: next });
    showToast('Time entry updated.');
  };

  const deleteTimeEntry = async (id: string) => {
    const next = timeEntries.filter((t) => t.id !== id);
    setTimeEntries(next);
    await persistState({ timeEntries: next });
    showToast('Time entry deleted.');
  };

  // INVOICES
  const createInvoice = async (invoiceData: {
    clientId: string;
    projectId?: string;
    issueDate: string;
    dueDate: string;
    items: InvoiceItem[];
    taxRate: number;
    discountRate: number;
    notes?: string;
    paymentTerms?: string;
    linkedTimeEntryIds?: string[];
    isRecurring?: boolean;
    repeat?: RecurringRepeatType;
    nextDate?: string;
  }): Promise<Invoice> => {
    const nextNum = generateNextInvoiceNumber(invoices);
    const { subtotal, taxAmount, discountAmount, totalAmount } = calculateInvoiceTotals(
      invoiceData.items,
      invoiceData.taxRate,
      invoiceData.discountRate
    );

    const calculatedNextDate = invoiceData.isRecurring
      ? invoiceData.nextDate || formatNextDate(getNextDate(invoiceData.dueDate || new Date(), invoiceData.repeat || 'monthly'))
      : undefined;

    const invoiceId = `inv-${Date.now()}`;
    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber: nextNum,
      clientId: invoiceData.clientId,
      projectId: invoiceData.projectId,
      issueDate: invoiceData.issueDate,
      dueDate: invoiceData.dueDate,
      status: 'sent',
      items: invoiceData.items,
      subtotal,
      taxRate: invoiceData.taxRate,
      taxAmount,
      discountRate: invoiceData.discountRate,
      discountAmount,
      totalAmount,
      amount: totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      notes: invoiceData.notes || settings.invoiceNotesTemplate,
      paymentTerms: invoiceData.paymentTerms || settings.defaultPaymentTerms,
      isRecurring: invoiceData.isRecurring || false,
      repeat: invoiceData.repeat,
      nextDate: calculatedNextDate,
      source: 'real',
      businessId: DEFAULT_BUSINESS_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If linked time entries were marked, update them
    let nextTimeEntries = timeEntries;
    if (invoiceData.linkedTimeEntryIds && invoiceData.linkedTimeEntryIds.length > 0) {
      nextTimeEntries = timeEntries.map((t) =>
        invoiceData.linkedTimeEntryIds?.includes(t.id) ? { ...t, isInvoiced: true, invoiceId } : t
      );
      setTimeEntries(nextTimeEntries);
    }

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);
    await persistState({ invoices: nextInvoices, timeEntries: nextTimeEntries });
    showToast(`Invoice ${newInvoice.invoiceNumber} generated.`);
    return newInvoice;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const next = invoices.map((inv) => {
      if (inv.id !== id) return inv;
      const combined = { ...inv, ...updates, updatedAt: new Date().toISOString() };
      // recalculate balanceDue
      combined.balanceDue = Math.max(0, combined.totalAmount - combined.amountPaid);
      combined.amount = combined.totalAmount;
      return combined;
    });
    setInvoices(next);
    await persistState({ invoices: next });
    showToast('Invoice updated.');
  };

  const deleteInvoice = async (id: string) => {
    // Unlink any time entries associated with this invoice
    const nextTimeEntries = timeEntries.map((t) => (t.invoiceId === id ? { ...t, isInvoiced: false, invoiceId: undefined } : t));
    // Remove linked payments
    const nextPayments = payments.filter((p) => p.invoiceId !== id);
    const nextInvoices = invoices.filter((i) => i.id !== id);

    setTimeEntries(nextTimeEntries);
    setPayments(nextPayments);
    setInvoices(nextInvoices);
    await persistState({
      invoices: nextInvoices,
      timeEntries: nextTimeEntries,
      payments: nextPayments,
    });
    showToast('Invoice deleted.');
  };

  const markInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    const next = invoices.map((inv) => (inv.id === id ? { ...inv, status, updatedAt: new Date().toISOString() } : inv));
    setInvoices(next);
    await persistState({ invoices: next });
    showToast(`Invoice status marked as ${status}.`);
  };

  const toggleInvoiceRecurring = async (invoiceId: string, repeat: RecurringRepeatType = 'monthly') => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const nowRecurring = !inv.isRecurring;
    const nextDateStr = nowRecurring ? formatNextDate(getNextDate(new Date(), repeat)) : undefined;

    const next = invoices.map((i) =>
      i.id === invoiceId
        ? {
            ...i,
            isRecurring: nowRecurring,
            repeat: nowRecurring ? repeat : undefined,
            nextDate: nextDateStr,
            updatedAt: new Date().toISOString(),
          }
        : i
    );
    setInvoices(next);
    await persistState({ invoices: next });
    showToast(
      nowRecurring
        ? `Invoice #${inv.invoiceNumber} set to repeat ${repeat} (next: ${nextDateStr}).`
        : `Recurring stopped for #${inv.invoiceNumber}.`,
      'info'
    );
  };

  const checkAndRunRecurringInvoices = useCallback(async (): Promise<number> => {
    const result = checkRecurringInvoices(invoices);
    if (result.generatedCount > 0) {
      setInvoices(result.updatedInvoices);
      await persistState({ invoices: result.updatedInvoices });
      showToast(`Generated ${result.generatedCount} recurring invoice(s) due today!`, 'success');
      return result.generatedCount;
    }
    showToast('Recurring check done: All recurring invoices are up to date.', 'info');
    return 0;
  }, [invoices, persistState, showToast]);

  // Daily interval check: setInterval(checkRecurringInvoices, 24*60*60*1000)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRunRecurringInvoices();
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndRunRecurringInvoices]);

  // RECURRING INVOICE SCHEDULES
  const addRecurringSchedule = async (
    data: Omit<RecurringInvoiceSchedule, 'id' | 'generatedInvoiceCount' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringInvoiceSchedule> => {
    const newSchedule: RecurringInvoiceSchedule = {
      ...data,
      id: `rec-${Date.now()}`,
      generatedInvoiceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [newSchedule, ...recurringSchedules];
    setRecurringSchedules(next);
    await persistState({ recurringSchedules: next });
    showToast(`Recurring schedule "${newSchedule.title}" created.`);
    return newSchedule;
  };

  const updateRecurringSchedule = async (
    id: string,
    updates: Partial<Omit<RecurringInvoiceSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const next = recurringSchedules.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    setRecurringSchedules(next);
    await persistState({ recurringSchedules: next });
    showToast('Recurring schedule updated.');
  };

  const deleteRecurringSchedule = async (id: string) => {
    const next = recurringSchedules.filter((s) => s.id !== id);
    setRecurringSchedules(next);
    await persistState({ recurringSchedules: next });
    showToast('Recurring schedule deleted.');
  };

  const toggleRecurringSchedule = async (id: string) => {
    const next = recurringSchedules.map((s) =>
      s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date().toISOString() } : s
    );
    setRecurringSchedules(next);
    await persistState({ recurringSchedules: next });
    const target = next.find((s) => s.id === id);
    showToast(`Schedule ${target?.isActive ? 'activated' : 'paused'}.`);
  };

  const generateInvoiceFromSchedule = async (scheduleId: string): Promise<Invoice> => {
    const sch = recurringSchedules.find((s) => s.id === scheduleId);
    if (!sch) throw new Error('Schedule not found');

    const today = new Date().toISOString().split('T')[0];
    const nextNum = generateNextInvoiceNumber(invoices);
    const { subtotal, taxAmount, discountAmount, totalAmount } = calculateInvoiceTotals(
      sch.items,
      sch.taxRate,
      sch.discountRate
    );

    const due = new Date();
    due.setDate(due.getDate() + 15);
    const dueDateStr = due.toISOString().split('T')[0];

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNum,
      clientId: sch.clientId,
      projectId: sch.projectId,
      issueDate: today,
      dueDate: dueDateStr,
      status: 'draft',
      items: sch.items.map((it, idx) => ({
        ...it,
        id: `item-${Date.now()}-${idx}`,
      })),
      subtotal,
      taxRate: sch.taxRate,
      taxAmount,
      discountRate: sch.discountRate,
      discountAmount,
      totalAmount,
      amount: totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      notes: sch.notes || settings.invoiceNotesTemplate,
      paymentTerms: sch.paymentTerms || settings.defaultPaymentTerms,
      source: 'real',
      businessId: DEFAULT_BUSINESS_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextInvoices = [newInv, ...invoices];
    const nextRun = computeNextRunDate(sch.nextRunDate, sch.frequency);
    const nextSchedules = recurringSchedules.map((s) =>
      s.id === scheduleId
        ? {
            ...s,
            nextRunDate: nextRun,
            lastGeneratedDate: today,
            generatedInvoiceCount: (s.generatedInvoiceCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    setInvoices(nextInvoices);
    setRecurringSchedules(nextSchedules);
    await persistState({ invoices: nextInvoices, recurringSchedules: nextSchedules });
    showToast(`Draft invoice ${newInv.invoiceNumber} created from schedule.`);
    return newInv;
  };

  // PAYMENTS
  const recordPayment = async (data: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    method: Payment['method'];
    reference?: string;
    notes?: string;
  }): Promise<Payment> => {
    const inv = invoices.find((i) => i.id === data.invoiceId);
    if (!inv) {
      showToast('Invoice not found for payment', 'error');
      throw new Error('Invoice not found');
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId: data.invoiceId,
      clientId: inv.clientId,
      amount: Number(data.amount),
      paymentDate: data.paymentDate,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    // Update invoice paid balance and status
    const newAmountPaid = (Number(inv.amountPaid) || 0) + newPayment.amount;
    const newBalanceDue = Math.max(0, inv.totalAmount - newAmountPaid);
    let newStatus: InvoiceStatus = inv.status;
    if (newBalanceDue <= 0.009) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partially_paid';
    }

    const nextInvoices = invoices.map((i) =>
      i.id === data.invoiceId
        ? {
            ...i,
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }
        : i
    );

    const nextPayments = [newPayment, ...payments];
    setInvoices(nextInvoices);
    setPayments(nextPayments);
    await persistState({ invoices: nextInvoices, payments: nextPayments });
    showToast(`Payment of $${newPayment.amount.toFixed(2)} recorded for ${inv.invoiceNumber}.`);
    return newPayment;
  };

  const deletePayment = async (id: string) => {
    const pay = payments.find((p) => p.id === id);
    if (!pay) return;

    // Adjust invoice balance back
    const nextInvoices = invoices.map((inv) => {
      if (inv.id === pay.invoiceId) {
        const nextPaid = Math.max(0, inv.amountPaid - pay.amount);
        const nextBalance = Math.max(0, inv.totalAmount - nextPaid);
        let nextStatus: InvoiceStatus = 'sent';
        if (nextBalance <= 0.009) {
          nextStatus = 'paid';
        } else if (nextPaid > 0) {
          nextStatus = 'partially_paid';
        }
        return {
          ...inv,
          amountPaid: nextPaid,
          balanceDue: nextBalance,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    });

    const nextPayments = payments.filter((p) => p.id !== id);
    setInvoices(nextInvoices);
    setPayments(nextPayments);
    await persistState({ invoices: nextInvoices, payments: nextPayments });
    showToast('Payment removed.');
  };

  // EXPENSES
  const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    const newExpense: Expense = {
      ...data,
      amount: Number(data.amount),
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [newExpense, ...expenses];
    setExpenses(next);
    await persistState({ expenses: next });
    showToast(`Expense logged: ${newExpense.description}`);
    return newExpense;
  };

  const updateExpense = async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    const next = expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setExpenses(next);
    await persistState({ expenses: next });
    showToast('Expense updated.');
  };

  const deleteExpense = async (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    await persistState({ expenses: next });
    showToast('Expense deleted.');
  };

  // SETTINGS
  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    const next = { ...settings, ...newSettings };
    setSettings(next);
    await persistState({ settings: next });
    showToast('Business settings updated.');
  };

  // DATA MANAGEMENT
  const loadDemoData = async () => {
    const demo = generateDemoData();
    const existingInvoices = [...invoices];
    for (const dInv of demo.invoices) {
      if (!existingInvoices.some((i) => i.id === dInv.id || i.invoiceNumber === dInv.invoiceNumber)) {
        existingInvoices.push(dInv);
      }
    }

    setClients(demo.clients);
    setProjects(demo.projects);
    setTimeEntries(demo.timeEntries);
    setInvoices(existingInvoices);
    setPayments(demo.payments);
    setExpenses(demo.expenses);
    setRecurringSchedules(demo.recurringSchedules || []);
    setSettings(demo.settings);
    setActiveTimer(null);
    await storageService.saveData({
      ...demo,
      invoices: existingInvoices,
    });
    showToast('Demo data loaded successfully.');
  };

  const clearAllData = async () => {
    const fresh = {
      ...EMPTY_DATA,
      invoices: [],
      settings: { ...DEFAULT_SETTINGS, isDemoMode: false },
    };
    setClients(fresh.clients);
    setProjects(fresh.projects);
    setTimeEntries(fresh.timeEntries);
    setInvoices([]);
    setPayments(fresh.payments);
    setExpenses(fresh.expenses);
    setRecurringSchedules([]);
    setSettings(fresh.settings);
    setActiveTimer(null);
    await storageService.clearData();
    await storageService.saveData(fresh);
    showToast('Demo data cleared. Protected invoice INV-2026-009 safely retained.', 'info');
  };

  const exportDataJSON = () => {
    const payload: AppData = {
      clients,
      projects,
      timeEntries,
      invoices,
      payments,
      expenses,
      recurringSchedules,
      settings,
      activeTimer,
    };
    const str = JSON.stringify(payload, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biztrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully.');
  };

  const importDataJSON = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format');
      }
      const loaded: AppData = {
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        timeEntries: Array.isArray(parsed.timeEntries) ? parsed.timeEntries : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        recurringSchedules: Array.isArray(parsed.recurringSchedules) ? parsed.recurringSchedules : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        activeTimer: null,
      };

      setClients(loaded.clients);
      setProjects(loaded.projects);
      setTimeEntries(loaded.timeEntries);
      setInvoices(loaded.invoices);
      setPayments(loaded.payments);
      setExpenses(loaded.expenses);
      setRecurringSchedules(loaded.recurringSchedules);
      setSettings(loaded.settings);
      setActiveTimer(null);
      await storageService.saveData(loaded);
      showToast('Data imported successfully!');
      return true;
    } catch (err) {
      console.error('Import failure:', err);
      showToast('Failed to import JSON file: invalid format.', 'error');
      return false;
    }
  };

  // DYNAMIC COMPUTATIONS
  const totalRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalInvoiced = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'void')
      .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'void' && i.status !== 'paid')
      .reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const netProfit = useMemo(() => {
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);

  const profitMarginPercent = useMemo(() => {
    if (totalRevenue <= 0) return 0;
    return Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100);
  }, [totalRevenue, totalExpenses]);

  const totalHoursLogged = useMemo(() => {
    const totalSecs = timeEntries.reduce((sum, t) => sum + (Number(t.durationSeconds) || 0), 0);
    return Math.round((totalSecs / 3600) * 10) / 10;
  }, [timeEntries]);

  const billableHours = useMemo(() => {
    const billableSecs = timeEntries
      .filter((t) => t.isBillable)
      .reduce((sum, t) => sum + (Number(t.durationSeconds) || 0), 0);
    return Math.round((billableSecs / 3600) * 10) / 10;
  }, [timeEntries]);

  const unbilledHours = useMemo(() => {
    const unbilledSecs = timeEntries
      .filter((t) => t.isBillable && !t.isInvoiced)
      .reduce((sum, t) => sum + (Number(t.durationSeconds) || 0), 0);
    return Math.round((unbilledSecs / 3600) * 10) / 10;
  }, [timeEntries]);

  const unbilledEarnings = useMemo(() => {
    return timeEntries
      .filter((t) => t.isBillable && !t.isInvoiced)
      .reduce((sum, t) => {
        const hours = (Number(t.durationSeconds) || 0) / 3600;
        return sum + hours * (Number(t.hourlyRate) || 0);
      }, 0);
  }, [timeEntries]);

  const value: AppContextValue = {
    isLoading,
    activeModule,
    setActiveModule,
    clients,
    projects,
    timeEntries,
    invoices,
    payments,
    expenses,
    recurringSchedules,
    settings,
    activeTimer,
    timerSeconds,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    startTimer,
    stopTimer,
    cancelTimer,
    addManualTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceStatus,
    toggleInvoiceRecurring,
    checkAndRunRecurringInvoices,
    addRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    toggleRecurringSchedule,
    generateInvoiceFromSchedule,
    recordPayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
    loadDemoData,
    clearAllData,
    exportDataJSON,
    importDataJSON,
    toasts,
    showToast,
    dismissToast,
    totalRevenue,
    totalInvoiced,
    totalOutstanding,
    totalExpenses,
    netProfit,
    profitMarginPercent,
    totalHoursLogged,
    billableHours,
    unbilledHours,
    unbilledEarnings,
    getClientById,
    getProjectById,
    getInvoiceById,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
