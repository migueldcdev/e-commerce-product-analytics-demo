import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TOAST_MS, ToastContext, type ToastContextValue } from './toast';

interface Toast {
  id: number;
  message: string;
}

/**
 * One toast at a time, in an aria-live region that is always mounted so screen readers
 * announce it. Modal dialogs leave [aria-live] elements unhidden, so it works over the cart.
 * Bottom-left from sm up and top on phones, so it never covers the cart's checkout button.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Toast | null>(null);

  const toast = useCallback((message: string) => {
    setCurrent((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 top-12 z-[60] flex justify-center sm:top-auto sm:right-auto sm:bottom-6 sm:left-8 sm:justify-start"
      >
        {current && (
          <p
            key={current.id}
            className="pointer-events-auto max-w-sm animate-in bg-foreground px-5 py-3 text-sm text-background shadow-lg duration-200 fade-in-0 slide-in-from-bottom-2"
          >
            {current.message}
          </p>
        )}
      </div>
    </ToastContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook lives with its provider
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a <ToastProvider>');
  return context;
}
