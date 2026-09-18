import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';

export const Toast: React.FC = () => {
  const { error, toast, clearError } = useGameSocket();

  if (!error && !toast) return null;

  const isError = Boolean(error);
  const message = error || toast?.message;
  const type = isError ? 'error' : toast?.type || 'info';

  const typeConfig = {
    error: {
      bg: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/50 text-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    },
  }[type];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md ${typeConfig.bg} animate-in fade-in slide-in-from-bottom-3 duration-200`}
      >
        <div className="flex items-center gap-3">
          {typeConfig.icon}
          <p className="text-sm font-medium leading-snug">{message}</p>
        </div>
        {isError && (
          <button
            onClick={clearError}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
