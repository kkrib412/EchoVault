import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-5555 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  key?: any;
  toast: ToastMessage;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    info: <Info className="w-5 h-5 text-sky-450 text-sky-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />
  };

  const borders = {
    success: "border-emerald-500/20 bg-emerald-950/20",
    info: "border-sky-500/20 bg-sky-950/20",
    warning: "border-amber-500/20 bg-amber-950/20"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl ${borders[toast.type]} text-white`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-bold tracking-tight">{toast.title}</h4>
        <p className="text-[11px] text-slate-350 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
