"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastCtx = createContext(null);

let idc = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info") => {
      const id = ++idc;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg animate-in",
              t.type === "success" && "border-success/40",
              t.type === "error" && "border-destructive/40"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />}
            {t.type === "error" && <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />}
            {t.type === "info" && <Info className="mt-0.5 h-5 w-5 text-accent" />}
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { toast: () => {} };
  return ctx;
}
