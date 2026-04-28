"use client";

import type { Quest } from "@/lib/types";
import { isQuestAvailableToday } from "@/lib/utils";

interface QuestCardProps {
  quest: Quest;
  parentMode?: boolean;
  onSubmit?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function QuestCard({ quest: q, parentMode, onSubmit, onEdit, onDelete }: QuestCardProps) {
  const available = !parentMode && (q.status === "available" || (q.recurring && isQuestAvailableToday(q)));

  let cardClass = "card p-4 flex flex-col gap-3 relative";
  if (q.status === "submitted") {
    cardClass = "rounded-2xl border p-4 flex flex-col gap-3 relative";
  } else if (q.status === "approved" && !q.recurring) {
    cardClass += " opacity-60";
  }

  const cardStyle = q.status === "submitted"
    ? { background: "linear-gradient(135deg, #fff8e8, #fff0c8)", borderColor: "#ffb800", boxShadow: "0 0 0 3px rgba(255,184,0,0.15)" }
    : undefined;

  return (
    <div className={cardClass} style={cardStyle}>
      {parentMode && (
        <button onClick={onDelete} className="absolute top-2 right-2 bg-white border border-border text-text-soft rounded-lg px-2 py-1 text-xs font-bold hover:bg-red hover:text-white hover:border-red transition-colors">
          🗑
        </button>
      )}

      <div className="flex gap-3 items-start">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-border"
          style={{ background: "linear-gradient(135deg, #f0e8ff, #fff5f9)" }}>
          {q.icon}
        </div>
        <div className="flex-1 min-w-0">
          {q.status === "submitted" && (
            <div className="bg-gold text-[#5a3d00] text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block mb-1">
              Awaiting approval
            </div>
          )}
          <div className={`font-extrabold leading-tight ${q.status === "approved" && !q.recurring ? "line-through" : ""}`}>
            {q.title}
          </div>
          {q.description && <div className="text-xs text-text-soft mt-1">{q.description}</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {q.category && <span className="chip chip-cat">{q.category}</span>}
        {q.xp > 0 && <span className="chip chip-xp">✨ {q.xp} XP</span>}
        {q.gold > 0 && <span className="chip chip-gold">🪙 {q.gold}</span>}
        {q.money > 0 && <span className="chip chip-money">💵 ${Number(q.money).toFixed(2)}</span>}
        {q.recurring && <span className="chip chip-recurring">🔁 {q.recurring}</span>}
        {q.due_date && <span className="chip chip-due">📅 {q.due_date}</span>}
      </div>

      {q.parent_note && (
        <div className="text-xs bg-[#f4eeff] border-l-[3px] border-primary rounded-lg px-2.5 py-2 text-text">
          <strong>Parent: </strong>{q.parent_note}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {parentMode ? (
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit</button>
        ) : available ? (
          <button className="btn btn-primary btn-block" onClick={onSubmit}>✓ Mark complete</button>
        ) : q.status === "submitted" ? (
          <button className="btn btn-ghost btn-block" disabled>Waiting for parent…</button>
        ) : (
          <button className="btn btn-ghost btn-block" disabled>✓ Done!</button>
        )}
      </div>
    </div>
  );
}
