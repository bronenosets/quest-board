"use client";

import { type ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1.5 border-b-2 border-border mb-4 overflow-x-auto -mb-[2px]">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl border-b-[3px] transition-colors whitespace-nowrap ${
            active === t.id
              ? "text-primary border-primary"
              : "text-text-soft border-transparent hover:bg-card-soft hover:text-text"
          }`}
        >
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="ml-1.5 bg-red text-white text-[11px] px-1.5 py-0.5 rounded-full font-extrabold">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className="animate-fade">{children}</div>;
}
