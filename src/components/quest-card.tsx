"use client";

import type { Quest, Section } from "@/lib/types";
import { isQuestAvailableToday } from "@/lib/utils";
import { Countdown } from "@/components/countdown";

interface QuestCardProps {
  quest: Quest;
  parentMode?: boolean;
  sections?: Section[];
  hasPendingExtension?: boolean;
  onSubmit?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkMissed?: () => void;
  onRequestExtension?: () => void;
}

export function QuestCard({ quest: q, parentMode, sections, hasPendingExtension, onSubmit, onEdit, onDelete, onMarkMissed, onRequestExtension }: QuestCardProps) {
  const available = !parentMode && (q.status === "available" || (q.recurring && isQuestAvailableToday(q)));
  const isOverdue = q.due_at && new Date(q.due_at).getTime() < Date.now() && q.status !== "approved";
  const section = sections?.find(s => s.id === q.section_id);
  const hasPenalty = (q.penalty_xp || 0) > 0 || (q.penalty_gold || 0) > 0;

  let cardClass = "card p-4 flex flex-col gap-3 relative";
  if (q.status === "submitted") {
    cardClass = "rounded-2xl border p-4 flex flex-col gap-3 relative";
  } else if (q.status === "approved" && !q.recurring) {
    cardClass += " opacity-60";
  } else if (isOverdue) {
    cardClass += " border-red";
  }

  const cardStyle = q.status === "submitted"
    ? { background: "linear-gradient(135deg, #fff8e8, #fff0c8)", borderColor: "#ffb800", boxShadow: "0 0 0 3px rgba(255,184,0,0.15)" }
    : isOverdue
    ? { background: "linear-gradient(135deg, #fff5f5, #ffe8eb)", borderColor: "#ff5a7a", boxShadow: "0 0 0 3px rgba(255,90,122,0.12)" }
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
          {isOverdue && q.status !== "submitted" && (
            <div className="bg-red text-white text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block mb-1">
              Overdue
            </div>
          )}
          <div className={`font-extrabold leading-tight ${q.status === "approved" && !q.recurring ? "line-through" : ""}`}>
            {q.title}
          </div>
          {q.description && <div className="text-xs text-text-soft mt-1">{q.description}</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {section && <span className="chip" style={{ background: "#f4ecff", color: "#5b2bcf", borderColor: "#d6c1ff" }}>{section.icon} {section.name}</span>}
        {q.category && <span className="chip chip-cat">{q.category}</span>}
        {q.xp > 0 && <span className="chip chip-xp">✨ {q.xp} XP</span>}
        {q.gold > 0 && <span className="chip chip-gold">🪙 {q.gold}</span>}
        {q.recurring && <span className="chip chip-recurring">🔁 {q.recurring}</span>}
        {q.due_at ? <Countdown dueAt={q.due_at} /> : q.due_date ? <span className="chip chip-due">📅 {q.due_date}</span> : null}
      </div>

      {hasPenalty && (
        <div className="text-[11px] text-red font-bold flex flex-wrap gap-1 items-center">
          <span>⚠️ Penalty if missed:</span>
          {(q.penalty_xp || 0) > 0 && <span>−{q.penalty_xp} XP</span>}
          {(q.penalty_gold || 0) > 0 && <span>−{q.penalty_gold} 🪙</span>}
          {q.penalty_mode === "auto" && <span className="opacity-70">(auto)</span>}
        </div>
      )}

      {q.parent_note && (
        <div className="text-xs bg-[#f4eeff] border-l-[3px] border-primary rounded-lg px-2.5 py-2 text-text">
          <strong>Parent: </strong>{q.parent_note}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {parentMode ? (
          <>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit</button>
            {isOverdue && !q.penalty_applied && hasPenalty && onMarkMissed && (
              <button className="btn btn-danger btn-sm" onClick={onMarkMissed}>⚠️ Apply penalty</button>
            )}
          </>
        ) : available ? (
          <>
            <button className="btn btn-primary flex-1" onClick={onSubmit}>✓ Mark complete</button>
            {q.due_at && onRequestExtension && !hasPendingExtension && (
              <button className="btn btn-ghost btn-sm" onClick={onRequestExtension}>⏰ More time</button>
            )}
            {hasPendingExtension && (
              <span className="chip chip-due">⏰ Extension pending</span>
            )}
          </>
        ) : q.status === "submitted" ? (
          <button className="btn btn-ghost btn-block" disabled>Waiting for parent…</button>
        ) : (
          <button className="btn btn-ghost btn-block" disabled>✓ Done!</button>
        )}
      </div>
    </div>
  );
}
