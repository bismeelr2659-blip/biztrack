import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  let appState: ReturnType<typeof useApp> | null = null;
  try {
    appState = useApp();
  } catch {
    return null;
  }

  if (!appState || !appState.toasts || appState.toasts.length === 0) return null;
  const { toasts, dismissToast } = appState;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          info: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
        }[toast.type];

        const borderColor = {
          success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
          error: 'border-rose-200 bg-rose-50/90 text-rose-950',
          info: 'border-blue-200 bg-blue-50/90 text-blue-950',
        }[toast.type];

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-xs text-xs font-medium ${borderColor} animate-in slide-in-from-bottom-2 duration-150`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 opacity-70 hover:opacity-100 rounded transition-opacity"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
