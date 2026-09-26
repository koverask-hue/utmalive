"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon } from "./icons";

type Toast = { id: number; text: string; tone: "ok" | "gold" | "error" };
const Ctx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <CheckIcon />
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
