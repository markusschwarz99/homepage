import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft-Fallback: Wenn Provider nicht gemountet ist, no-op statt Crash.
    // Erleichtert Tests und Stories.
    return { show: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  const variantClasses = {
    success: 'bg-bg-secondary border-border text-text-primary',
    error: 'bg-bg-secondary border-red-500/40 text-text-primary',
    info: 'bg-bg-secondary border-border text-text-primary',
  }[toast.variant];

  return (
    <div
      role="status"
      className={`pointer-events-auto px-4 py-2.5 text-sm rounded-lg border shadow-md ${variantClasses}`}
    >
      {toast.message}
    </div>
  );
}
