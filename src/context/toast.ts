import { createContext } from 'react';

export const TOAST_MS = 4000;

export interface ToastContextValue {
  /** Shows a short message in the polite live region. A new message replaces the current one. */
  toast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
