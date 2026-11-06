import React from 'react';
import { ExpenseCategory, CurrencyCode } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CategoryData {
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdownBarProps {
  categories: CategoryData[];
  total: number;
  currency?: CurrencyCode;
}

export const ExpenseBreakdownBar: React.FC<ExpenseBreakdownBarProps> = ({
  categories,
  total,
  currency = 'USD',
}) => {
  if (categories.length === 0 || total === 0) {
    return (
      <div className="text-xs text-slate-400 py-6 text-center">
        No expense records logged to breakdown.
      </div>
    );
  }

  const categoryColorMap: Record<ExpenseCategory, string> = {
    software: 'bg-indigo-500',
    hardware: 'bg-blue-500',
    contractors: 'bg-emerald-500',
    marketing: 'bg-amber-500',
    office: 'bg-purple-500',
    travel: 'bg-teal-500',
    utilities: 'bg-rose-500',
    legal: 'bg-cyan-500',
    meals: 'bg-orange-500',
    other: 'bg-slate-500',
  };

  return (
    <div className="space-y-4">
      {/* Proportion Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
        {categories.map((c) => (
          <div
            key={c.category}
            style={{ width: `${Math.max(2, c.percentage)}%` }}
            className={`${categoryColorMap[c.category] || 'bg-slate-400'} h-full transition-all`}
            title={`${c.label}: ${c.percentage}% (${formatCurrency(c.amount, currency)})`}
          />
        ))}
      </div>

      {/* Breakdown list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        {categories.map((c) => (
          <div
            key={c.category}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  categoryColorMap[c.category] || 'bg-slate-400'
                }`}
              />
              <span className="font-medium text-slate-700 truncate">{c.label}</span>
              <span className="text-slate-400 font-mono text-[11px] shrink-0">
                {c.percentage}%
              </span>
            </div>
            <span className="font-mono font-medium text-slate-900 shrink-0">
              {formatCurrency(c.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
