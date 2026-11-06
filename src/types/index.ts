export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | 'CHF';

export type DataSource = 'real' | 'demo';

export interface BaseEntity {
  id: string;
  source?: DataSource;
  businessId?: string;
  createdAt: string;
}

export interface Client extends BaseEntity {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  currency: CurrencyCode;
  notes?: string;
  updatedAt: string;
}

export type ProjectBillingType = 'hourly' | 'fixed';
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed';

export interface Project extends BaseEntity {
  clientId: string;
  name: string;
  description?: string;
  billingType: ProjectBillingType;
  hourlyRate: number; // e.g. 85
  fixedBudget: number; // e.g. 5000 if fixed
  status: ProjectStatus;
  startDate?: string;
  deadline?: string;
  updatedAt: string;
}

export interface TimeEntry extends BaseEntity {
  projectId: string;
  clientId: string;
  description: string;
  startTime: string; // ISO
  endTime?: string; // ISO, undefined if in-progress
  durationSeconds: number;
  isBillable: boolean;
  hourlyRate: number;
  isInvoiced?: boolean;
  invoiceId?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  timeEntryId?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void';

export interface Invoice extends BaseEntity {
  invoiceNumber: string; // e.g., INV-2026-001 or INV-2026-009
  clientId: string;
  projectId?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // percentage, e.g. 10
  taxAmount: number;
  discountRate: number; // percentage, e.g. 5
  discountAmount: number;
  totalAmount: number;
  amount: number; // compatible with { amount: number }
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  paymentTerms?: string;
  isRecurring?: boolean;
  repeat?: 'weekly' | 'monthly' | 'yearly';
  nextDate?: string;
  originalId?: string;
  isProtected?: boolean;
  updatedAt: string;
}

export type PaymentMethod = 
  | 'airtm'
  | 'wise'
  | 'upi'
  | 'bank_transfer' 
  | 'credit_card' 
  | 'stripe' 
  | 'paypal' 
  | 'cash' 
  | 'check' 
  | 'other';

export interface Payment extends BaseEntity {
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'software'
  | 'hardware'
  | 'contractors'
  | 'marketing'
  | 'office'
  | 'travel'
  | 'utilities'
  | 'legal'
  | 'meals'
  | 'other';

export interface Expense extends BaseEntity {
  category: ExpenseCategory;
  description: string;
  vendor: string;
  amount: number;
  date: string; // YYYY-MM-DD
  projectId?: string;
  isBillable: boolean;
  isTaxDeductible: boolean;
  receiptNote?: string;
}

export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  adminEmail?: string;
  showEmailPublicly?: boolean;
  website: string;
  address: string;
  taxId: string;
  defaultCurrency: CurrencyCode;
  currencySymbol: string;
  defaultTaxRate: number;
  defaultPaymentTerms: string;
  bankDetails: string;
  invoiceNotesTemplate: string;
  isDemoMode: boolean;
  autoEmailReminders?: boolean;
  logoUrl?: string;
}

export interface ActiveTimer {
  id: string;
  projectId: string;
  clientId: string;
  description: string;
  startTime: string; // ISO
  isBillable: boolean;
  hourlyRate: number;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export interface RecurringInvoiceSchedule {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  frequency: RecurringFrequency;
  items: InvoiceItem[];
  taxRate: number;
  discountRate: number;
  paymentTerms?: string;
  notes?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  nextRunDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD
  isActive: boolean;
  generatedInvoiceCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AppModule = 
  | 'dashboard'
  | 'clients'
  | 'projects'
  | 'time_tracker'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'financials'
  | 'reports'
  | 'tax'
  | 'team'
  | 'profile'
  | 'settings';
