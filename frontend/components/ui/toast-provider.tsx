"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastApi = {
  success: (title: string, message?: string, durationMs?: number) => void;
  error: (title: string, message?: string, durationMs?: number) => void;
  info: (title: string, message?: string, durationMs?: number) => void;
  warning: (title: string, message?: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let toastIdCounter = 1;

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  error: "bg-rose-50 border-rose-200 text-rose-900",
  info: "bg-indigo-50 border-indigo-200 text-indigo-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  error: <AlertCircle className="w-4 h-4 text-rose-600" />,
  info: <Info className="w-4 h-4 text-indigo-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, message?: string, durationMs = 4500) => {
      const id = toastIdCounter++;
      setToasts((prev) => [...prev, { id, title, message, variant, durationMs }]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message, durationMs) => push("success", title, message, durationMs),
      error: (title, message, durationMs) => push("error", title, message, durationMs),
      info: (title, message, durationMs) => push("info", title, message, durationMs),
      warning: (title, message, durationMs) => push("warning", title, message, durationMs),
      dismiss,
    }),
    [dismiss, push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[120] w-full max-w-sm space-y-2 px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto border rounded-2xl shadow-xl p-4 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 ${variantStyles[toast.variant]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{variantIcons[toast.variant]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{toast.title}</p>
                {toast.message ? (
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{toast.message}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 hover:bg-black/5 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
