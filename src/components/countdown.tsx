"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): { text: string; overdue: boolean; urgent: boolean } {
  if (ms <= 0) return { text: "Overdue", overdue: true, urgent: true };
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return { text: `${days}d ${hours % 24}h`, overdue: false, urgent: false };
  if (hours >= 1) return { text: `${hours}h ${minutes % 60}m`, overdue: false, urgent: hours < 2 };
  return { text: `${minutes}m`, overdue: false, urgent: true };
}

export function Countdown({ dueAt }: { dueAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const due = new Date(dueAt).getTime();
  const remaining = due - now;
  const { text, overdue, urgent } = formatRemaining(remaining);

  const cls = overdue
    ? "chip-due"
    : urgent
    ? "chip-due"
    : "chip-recurring";

  return <span className={`chip ${cls}`}>{overdue ? "⏰" : "⏳"} {text}</span>;
}
