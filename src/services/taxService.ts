import { Invoice, Expense } from '../types';

export interface TaxSettings {
  defaultTaxRate: number; // e.g. 16, 5, 0
  taxIdNumber: string; // e.g. VAT-92830192
  taxName: string; // e.g. 'VAT', 'Sales Tax', 'GST'
  pricesIncludeTax: boolean;
  enabled: boolean;
}

export interface TaxReportSummary {
  taxableRevenue: number;
  taxCollected: number;
  deductibleExpenses: number;
  taxDeductions: number;
  netTaxPayable: number;
  taxBreakdownByMonth: {
    month: string;
    grossInvoiced: number;
    taxCollected: number;
    expenses: number;
    taxDeductible: number;
  }[];
}

const TAX_SETTINGS_STORAGE_KEY = 'biztrack_tax_settings_v1';

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  defaultTaxRate: 16, // Default 16% as requested in sample
  taxIdNumber: '',
  taxName: 'VAT / Sales Tax',
  pricesIncludeTax: false,
  enabled: true,
};

export const COMMON_TAX_PRESETS = [0, 5, 10, 13, 16, 18, 20];

class TaxService {
  public getTaxSettings(): TaxSettings {
    if (typeof localStorage === 'undefined') return DEFAULT_TAX_SETTINGS;
    try {
      const raw = localStorage.getItem(TAX_SETTINGS_STORAGE_KEY);
      return raw ? { ...DEFAULT_TAX_SETTINGS, ...JSON.parse(raw) } : DEFAULT_TAX_SETTINGS;
    } catch {
      return DEFAULT_TAX_SETTINGS;
    }
  }

  public saveTaxSettings(settings: Partial<TaxSettings>): TaxSettings {
    const current = this.getTaxSettings();
    const updated = { ...current, ...settings };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(TAX_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save tax settings:', e);
      }
    }
    return updated;
  }

  public calculateTax(subtotal: number, taxRate: number): {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  } {
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const safeRate = Math.max(0, Number(taxRate) || 0);
    const taxAmount = Math.round(((safeSubtotal * safeRate) / 100) * 100) / 100;
    const total = Math.round((safeSubtotal + taxAmount) * 100) / 100;

    return {
      subtotal: safeSubtotal,
      taxRate: safeRate,
      taxAmount,
      total,
    };
  }

  public generateTaxReport(invoices: Invoice[], expenses: Expense[]): TaxReportSummary {
    let taxableRevenue = 0;
    let taxCollected = 0;

    // Filter valid invoices (exclude void)
    const validInvoices = invoices.filter(inv => inv.status !== 'void');

    validInvoices.forEach(inv => {
      taxableRevenue += Number(inv.subtotal) || 0;
      taxCollected += Number(inv.taxAmount) || 0;
    });

    let deductibleExpenses = 0;
    let taxDeductions = 0;

    expenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      if (exp.isTaxDeductible) {
        deductibleExpenses += amt;
        // Estimated input tax deduction based on default rate
        taxDeductions += (amt * 0.16) / 1.16; // approximate input tax portion
      }
    });

    const netTaxPayable = Math.max(0, taxCollected - taxDeductions);

    // Monthly breakdown
    const monthsMap: Record<string, {
      month: string;
      grossInvoiced: number;
      taxCollected: number;
      expenses: number;
      taxDeductible: number;
    }> = {};

    // Populate last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthsMap[key] = {
        month: label,
        grossInvoiced: 0,
        taxCollected: 0,
        expenses: 0,
        taxDeductible: 0,
      };
    }

    validInvoices.forEach(inv => {
      const key = inv.issueDate?.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].grossInvoiced += Number(inv.totalAmount) || 0;
        monthsMap[key].taxCollected += Number(inv.taxAmount) || 0;
      }
    });

    expenses.forEach(exp => {
      const key = exp.date?.substring(0, 7);
      if (monthsMap[key]) {
        monthsMap[key].expenses += Number(exp.amount) || 0;
        if (exp.isTaxDeductible) {
          monthsMap[key].taxDeductible += Number(exp.amount) || 0;
        }
      }
    });

    return {
      taxableRevenue: Math.round(taxableRevenue * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      deductibleExpenses: Math.round(deductibleExpenses * 100) / 100,
      taxDeductions: Math.round(taxDeductions * 100) / 100,
      netTaxPayable: Math.round(netTaxPayable * 100) / 100,
      taxBreakdownByMonth: Object.values(monthsMap),
    };
  }
}

export const taxService = new TaxService();
