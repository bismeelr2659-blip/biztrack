import React from 'react';

export interface PremiumClient {
  id: string;
  name: string;
  company: string;
  email: string;
  revenue: number;
  deals: number;
  health: number;
  status?: string;
  phone?: string;
}

export interface PremiumClientCardProps {
  client: PremiumClient;
  onViewProfile?: (clientId: string) => void;
  onEdit?: (client: PremiumClient) => void;
  onDelete?: (clientId: string) => void;
}

export default function PremiumClientCard({
  client,
  onViewProfile,
  onEdit,
  onDelete,
}: PremiumClientCardProps) {
  const initials = client.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CL';

  return (
    <div className="relative bg-[#11121a] border border-white/10 rounded-[20px] p-5 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 shadow-[0_10px_40px_rgba(124,58,237,0.15)] group flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {/* SaaS Gradient Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-[16px] truncate">{client.name}</h3>
              <p className="text-white/60 text-[13px] truncate">{client.company || 'Independent Client'}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> {client.status || 'Active'}
          </span>
        </div>

        {/* SaaS Stats with Gradient Text */}
        <div className="grid grid-cols-3 gap-2 bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Revenue</p>
            <p className="text-[20px] font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ${client.revenue}k
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Deals</p>
            <p className="text-[20px] font-bold text-white">
              {client.deals}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Health</p>
            <p className="text-[20px] font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {client.health}%
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-white/40 truncate max-w-[150px]" title={client.email}>
          {client.email}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(client)}
              className="text-white/50 hover:text-white transition-colors px-1.5 py-0.5 rounded cursor-pointer"
              title="Edit Client"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(client.id)}
              className="text-rose-400/60 hover:text-rose-400 transition-colors px-1.5 py-0.5 rounded cursor-pointer"
              title="Delete Client"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewProfile?.(client.id)}
            className="text-violet-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transform cursor-pointer"
          >
            <span>View Profile</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export { PremiumClientCard };
