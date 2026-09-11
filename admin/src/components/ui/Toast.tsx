import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let borderAndBg = 'bg-white border-slate-200 text-slate-900 shadow-xl';
        let icon = <Info className="w-5 h-5 text-sky-600 shrink-0" />;

        if (toast.type === 'success') {
          borderAndBg = 'bg-white border-emerald-300 text-slate-900 shadow-xl';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        } else if (toast.type === 'error') {
          borderAndBg = 'bg-white border-rose-300 text-slate-900 shadow-xl';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
        } else if (toast.type === 'warning') {
          borderAndBg = 'bg-white border-amber-300 text-slate-900 shadow-xl';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 transform translate-y-0 ${borderAndBg}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug text-slate-900">{toast.message}</p>
              {toast.description && (
                <p className="text-xs text-slate-500 mt-1 leading-normal">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
