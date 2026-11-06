import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { CurrencyCode } from '../../types';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface FinancialChartProps {
  data: MonthlyData[];
  currency?: CurrencyCode;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({ data, currency = 'USD' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No transaction records available for charting.
      </div>
    );
  }

  // Find max value for scaling
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.expenses, Math.abs(d.profit))),
    1000
  );
  
  const chartHeight = 180;

  return (
    <div className="w-full">
      {/* Legend & Hover Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
            <span>Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span>Net Profit</span>
          </div>
        </div>

        {hoveredIdx !== null ? (
          <div className="text-xs font-mono flex items-center gap-3 text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="font-semibold text-slate-900">{data[hoveredIdx].month}:</span>
            <span>Rev: {formatCurrency(data[hoveredIdx].revenue, currency)}</span>
            <span>Exp: {formatCurrency(data[hoveredIdx].expenses, currency)}</span>
            <span className={data[hoveredIdx].profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              Net: {formatCurrency(data[hoveredIdx].profit, currency)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Hover over bars for exact monthly figures</span>
        )}
      </div>

      {/* SVG Bar Chart */}
      <div className="relative h-52 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-slate-400 w-full" />
        </div>

        {data.map((item, idx) => {
          const revHeight = Math.max(4, (item.revenue / maxVal) * chartHeight);
          const expHeight = Math.max(4, (item.expenses / maxVal) * chartHeight);
          const profitHeight = Math.max(4, (Math.max(0, item.profit) / maxVal) * chartHeight);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Bars cluster */}
              <div className="flex items-end gap-1 w-full max-w-[54px] justify-center transition-transform group-hover:scale-105 duration-150">
                {/* Revenue bar */}
                <div
                  style={{ height: `${revHeight}px` }}
                  className={`w-3.5 rounded-t-sm transition-colors ${
                    isHovered ? 'bg-slate-800' : 'bg-slate-900'
                  }`}
                  title={`Revenue: ${formatCurrency(item.revenue, currency)}`}
                />
                {/* Expense bar */}
                <div
                  style={{ height: `${expHeight}px` }}
                  className={`w-3.5 rounded-t-sm transition-colors ${
                    isHovered ? 'bg-rose-600' : 'bg-rose-500'
                  }`}
                  title={`Expenses: ${formatCurrency(item.expenses, currency)}`}
                />
                {/* Net Profit bar */}
                <div
                  style={{ height: `${profitHeight}px` }}
                  className={`w-3.5 rounded-t-sm transition-colors ${
                    isHovered ? 'bg-emerald-600' : 'bg-emerald-500'
                  }`}
                  title={`Net Profit: ${formatCurrency(item.profit, currency)}`}
                />
              </div>

              {/* Month label */}
              <div className="mt-2 text-[11px] font-medium text-slate-500 text-center tracking-tight truncate max-w-full">
                {item.month}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
