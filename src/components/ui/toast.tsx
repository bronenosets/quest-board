"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Toast = { id: number; emoji: string; msg: string };
let listeners: ((t: Toast) => void)[] = [];
let nextId = 1;

export function toast(msg: string, emoji = "✨") {
  const t: Toast = { id: nextId++, emoji, msg };
  listeners.forEach(l => l(t));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const sub = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 2900);
    };
    listeners.push(sub);
    return () => { listeners = listeners.filter(l => l !== sub); };
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-white rounded-full shadow-lg border border-border px-5 py-3 flex items-center gap-2.5 font-bold pointer-events-auto"
          >
            <span className="text-xl">{t.emoji}</span>
            <span>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
