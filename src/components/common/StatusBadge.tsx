import React from 'react';
import { InvoiceStatus, ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: InvoiceStatus | ProjectStatus | 'billable' | 'non_billable';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  // Editorial clean statuses complying with zero-pill discipline
  switch (status) {
    // Invoice statuses
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          {label || 'Paid'}
        </span>
      );
    case 'partially_paid':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          {label || 'Partially Paid'}
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
          {label || 'Sent'}
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" aria-hidden="true" />
          {label || 'Overdue'}
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          {label || 'Draft'}
        </span>
      );
    case 'void':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 line-through">
          {label || 'Void'}
        </span>
      );

    // Project statuses
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
          {label || 'In Progress'}
        </span>
      );
    case 'planning':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" aria-hidden="true" />
          {label || 'Planning'}
        </span>
      );
    case 'on_hold':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          {label || 'On Hold'}
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          {label || 'Completed'}
        </span>
      );

    // Billable statuses
    case 'billable':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          {label || 'Billable'}
        </span>
      );
    case 'non_billable':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
          {label || 'Non-billable'}
        </span>
      );

    default:
      return <span className="text-xs text-slate-600">{label || status}</span>;
  }
};
