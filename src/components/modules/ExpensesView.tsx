import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory } from '../../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Tag, 
  Calendar, 
  CheckCircle2,
  Building2,
  Briefcase
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';

export const ExpensesView: React.FC<{
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}> = ({
  isOpenCreateModal,
  onCloseCreateModal,
  onOpenCreateModal,
}) => {
  const {
    expenses,
    projects,
    settings,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('software');
  const [formDescription, setFormDescription] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formIsBillable, setFormIsBillable] = useState(false);
  const [formIsTaxDeductible, setFormIsTaxDeductible] = useState(true);
  const [formReceiptNote, setFormReceiptNote] = useState('');
  const [formError, setFormError] = useState('');

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  const categoryLabels: Record<ExpenseCategory, string> = {
    software: 'Software & SaaS',
    hardware: 'Hardware & Gear',
    contractors: 'Subcontractors',
    marketing: 'Marketing & Ads',
    office: 'Office & Coworking',
    travel: 'Travel & Transport',
    utilities: 'Cloud & Utilities',
    legal: 'Legal & Accounting',
    meals: 'Meals & Entertainment',
    other: 'Other Expenses',
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormDescription(exp.description);
    setFormVendor(exp.vendor);
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setFormProjectId(exp.projectId || '');
    setFormIsBillable(exp.isBillable);
    setFormIsTaxDeductible(exp.isTaxDeductible);
    setFormReceiptNote(exp.receiptNote || '');
    setFormError('');
  };

  const handleCloseForm = () => {
    onCloseCreateModal();
    setEditingExpense(null);
    setFormCategory('software');
    setFormDescription('');
    setFormVendor('');
    setFormAmount(0);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormProjectId('');
    setFormIsBillable(false);
    setFormIsTaxDeductible(true);
    setFormReceiptNote('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!formVendor.trim()) {
      setFormError('Vendor / Payee is required.');
      return;
    }
    const amt = Number(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid expense amount.');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category: formCategory,
          description: formDescription.trim(),
          vendor: formVendor.trim(),
          amount: amt,
          date: formDate,
          projectId: formProjectId || undefined,
          isBillable: formIsBillable,
          isTaxDeductible: formIsTaxDeductible,
          receiptNote: formReceiptNote.trim() || undefined,
        });
      } else {
        await addExpense({
          category: formCategory,
          description: formDescription.trim(),
          vendor: formVendor.trim(),
          amount: amt,
          date: formDate,
          projectId: formProjectId || undefined,
          isBillable: formIsBillable,
          isTaxDeductible: formIsTaxDeductible,
          receiptNote: formReceiptNote.trim() || undefined,
        });
      }
      handleCloseForm();
    } catch {
      setFormError('Failed to save expense.');
    }
  };

  // Metrics
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const taxDeductibleTotal = useMemo(() => {
    return expenses
      .filter((e) => e.isTaxDeductible)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.vendor.toLowerCase().includes(q) ||
        (e.receiptNote && e.receiptNote.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [expenses, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Expenses ({expenses.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track business operating costs, tax deductions, and subcontractor payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Total Expenses</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {formatCurrency(totalExpenses, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {expenses.length} operating items
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Tax Deductible Expenses</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatCurrency(taxDeductibleTotal, currency, symbol)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalExpenses > 0
              ? `${Math.round((taxDeductibleTotal / totalExpenses) * 100)}% of total expenses`
              : '0%'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Project Billable Costs</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {formatCurrency(
              expenses
                .filter((e) => e.isBillable)
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
              currency,
              symbol
            )}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Reimbursable by clients
          </span>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto text-xs">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
            categoryFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Categories
        </button>
        {Object.entries(categoryLabels).map(([cat, label]) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat as ExpenseCategory)}
            className={`px-3 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={searchQuery || categoryFilter !== 'all' ? 'No matching expenses' : 'No expenses logged'}
          description="Track subscriptions, hardware purchases, software tools, and business travel to compute real net profit."
          actionLabel="Log Expense"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-4">Vendor / Payee</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Project</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => {
                  const proj = projects.find((p) => p.id === exp.projectId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-600 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {exp.vendor}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        <div>{exp.description}</div>
                        {exp.receiptNote && (
                          <div className="text-[11px] text-slate-400 truncate">{exp.receiptNote}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-600">
                          {categoryLabels[exp.category] || exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {proj?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                        -{formatCurrency(exp.amount, currency, symbol)}
                      </td>
                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit expense"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={async () => {
          if (deletingExpense) {
            await deleteExpense(deletingExpense.id);
            setDeletingExpense(null);
          }
        }}
        title="Delete Expense"
        message={`Are you sure you want to delete the expense "${deletingExpense?.description}"?`}
      />

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isOpenCreateModal || !!editingExpense}
        onClose={handleCloseForm}
        title={editingExpense ? 'Edit Expense' : 'Log Business Expense'}
        subtitle="Keep track of receipts, vendors, and deductible operating costs."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Vendor / Payee *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Figma, AWS, CalDigit"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual seat subscription renewal"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {Object.entries(categoryLabels).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project Link
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="">None / General Overhead</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsTaxDeductible}
                onChange={(e) => setFormIsTaxDeductible(e.target.checked)}
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Tax Deductible Business Expense</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsBillable}
                onChange={(e) => setFormIsBillable(e.target.checked)}
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Billable to Client Project</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Receipt Reference or Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Receipt #FG-88210 stored in drive folder"
              value={formReceiptNote}
              onChange={(e) => setFormReceiptNote(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors shadow-2xs"
            >
              {editingExpense ? 'Save Expense' : 'Log Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
