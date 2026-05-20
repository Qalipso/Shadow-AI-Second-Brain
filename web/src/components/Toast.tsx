"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `t-${++idRef.current}`;
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastList items={items} onDismiss={(id) => setItems((p) => p.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

// ─── UI ──────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS: Record<ToastVariant, string> = {
  success: "var(--state-success)",
  error: "var(--state-danger)",
  info: "var(--accent-warm)",
};

function ToastList({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[item.variant];
  const color = COLORS[item.variant];

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="alert"
      className="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300"
      style={{
        background: "var(--bg-elev2)",
        borderColor: `${color}40`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        maxWidth: 360,
        minWidth: 260,
      }}
    >
      <Icon size={15} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <p className="flex-1 text-sm text-zinc-200 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="text-zinc-600 hover:text-zinc-300 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}
