import { Invoice } from '../types';
import { generateNextInvoiceNumber } from './formatters';

export type RecurringRepeatType = 'weekly' | 'monthly' | 'yearly';

/**
 * 2. Calculate next recurring billing date
 * getNextDate(currentDate, repeatType)
 * Calculates the next billing cycle date given a current date and repeat interval.
 */
export function getNextDate(currentDate: Date | string, repeatType: RecurringRepeatType = 'monthly'): Date {
  const next = new Date(currentDate);
  if (isNaN(next.getTime())) {
    const fallback = new Date();
    return getNextDate(fallback, repeatType);
  }

  if (repeatType === 'weekly') next.setDate(next.getDate() + 7);
  if (repeatType === 'monthly') next.setMonth(next.getMonth() + 1);
  if (repeatType === 'yearly') next.setFullYear(next.getFullYear() + 1);

  return next;
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatNextDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 1. Create a new recurring invoice template
 * createRecurringInvoice(invoice)
 * Converts or creates a recurring invoice template with nextDate calculated.
 */
export function createRecurringInvoice(
  invoice: Partial<Invoice> & { repeat?: RecurringRepeatType; id?: string }
): Invoice {
  const repeat = invoice.repeat || 'monthly';
  const next = getNextDate(new Date(), repeat);
  const nextDateStr = formatNextDate(next);
  const now = new Date().toISOString();

  return {
    ...invoice,
    id: invoice.id ? invoice.id : 'INV-' + Date.now(),
    invoiceNumber: invoice.invoiceNumber || ('INV-' + Date.now()),
    clientId: invoice.clientId || '',
    issueDate: invoice.issueDate || formatNextDate(new Date()),
    dueDate: invoice.dueDate || nextDateStr,
    status: invoice.status || 'draft',
    items: invoice.items || [],
    subtotal: invoice.subtotal || 0,
    taxRate: invoice.taxRate || 0,
    taxAmount: invoice.taxAmount || 0,
    discountRate: invoice.discountRate || 0,
    discountAmount: invoice.discountAmount || 0,
    totalAmount: invoice.totalAmount || 0,
    amountPaid: invoice.amountPaid || 0,
    balanceDue: invoice.balanceDue || (invoice.totalAmount || 0),
    isRecurring: true,
    repeat,
    nextDate: nextDateStr,
    originalId: invoice.id || undefined,
    createdAt: invoice.createdAt || now,
    updatedAt: now,
  } as Invoice;
}

/**
 * 3. Daily check for recurring invoices due today
 * checkRecurringInvoices(invoicesList)
 * Checks all recurring invoices whose nextDate is due today (or overdue),
 * generates the new child invoice, and updates the parent invoice's nextDate:
 *
 *   inv.nextDate = newInv.nextDate;
 */
export function checkRecurringInvoices(invoicesList: Invoice[]): {
  updatedInvoices: Invoice[];
  generatedInvoices: Invoice[];
  generatedCount: number;
} {
  const allInvoices = [...invoicesList];
  const today = new Date().toDateString();
  const todayISO = new Date().toISOString().split('T')[0];
  const generatedInvoices: Invoice[] = [];

  allInvoices.forEach((inv, index) => {
    if (!inv.isRecurring || !inv.nextDate) return;

    const nextDateObj = new Date(inv.nextDate);
    const isDueTodayOrPast = nextDateObj.toDateString() === today || inv.nextDate <= todayISO;

    if (isDueTodayOrPast) {
      // Calculate next cycle date for the recurring schedule
      const nextCycleDate = getNextDate(new Date(), inv.repeat || 'monthly');
      const nextCycleDateStr = formatNextDate(nextCycleDate);

      // Due date for the generated invoice (15 days from today)
      const dueObj = new Date();
      dueObj.setDate(dueObj.getDate() + 15);
      const dueDateStr = formatNextDate(dueObj);

      const nextNum = generateNextInvoiceNumber([...allInvoices, ...generatedInvoices]);

      // Create new invoice for the current billing cycle
      const newInv: Invoice = {
        ...inv,
        id: 'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        invoiceNumber: nextNum,
        issueDate: todayISO,
        dueDate: dueDateStr,
        status: 'sent',
        amountPaid: 0,
        balanceDue: inv.totalAmount,
        isRecurring: false, // Child issued invoice is not recurring itself
        originalId: inv.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextDate: nextCycleDateStr,
      };

      generatedInvoices.push(newInv);

      // Update the parent recurring invoice's nextDate
      allInvoices[index] = {
        ...inv,
        nextDate: nextCycleDateStr,
        updatedAt: new Date().toISOString(),
      };
    }
  });

  const finalInvoices = [...generatedInvoices, ...allInvoices];
  return {
    updatedInvoices: finalInvoices,
    generatedInvoices,
    generatedCount: generatedInvoices.length,
  };
}
