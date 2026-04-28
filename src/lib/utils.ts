import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isQuestAvailableToday(q: { recurring: "daily" | "weekly" | null; status: string; last_completed: string | null }): boolean {
  if (q.status === "submitted") return false;
  if (!q.recurring) return q.status !== "approved";
  if (!q.last_completed) return true;
  const last = new Date(q.last_completed);
  const now = new Date();
  if (q.recurring === "daily") {
    return last.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  }
  if (q.recurring === "weekly") {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - last.getTime() >= weekMs;
  }
  return true;
}

export function xpForLevel(level: number) {
  return level * 100;
}

export function xpProgress(level: number, xp: number) {
  const need = xpForLevel(level);
  return Math.min(100, (xp / need) * 100);
}

export function formatMoney(n: number) {
  return "$" + (Number(n) || 0).toFixed(2);
}
