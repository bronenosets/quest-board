"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { ICONS, CATEGORIES } from "@/lib/icons";
import { saveQuest } from "@/lib/mutations";
import type { Quest, HouseholdMember, Section } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: Quest | null;
  householdId: string;
  heroes: HouseholdMember[];
  sections: Section[];
}

export function QuestFormDialog({ open, onClose, existing, householdId, heroes, sections }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [category, setCategory] = useState("School");
  const [sectionId, setSectionId] = useState<string>("");
  const [xp, setXp] = useState(10);
  const [gold, setGold] = useState(5);
  const [money, setMoney] = useState(0);
  const [recurring, setRecurring] = useState<"" | "daily" | "weekly">("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [heroId, setHeroId] = useState("");
  const [penaltyXp, setPenaltyXp] = useState(0);
  const [penaltyGold, setPenaltyGold] = useState(0);
  const [penaltyMoney, setPenaltyMoney] = useState(0);
  const [penaltyMode, setPenaltyMode] = useState<"manual" | "auto">("manual");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(existing?.title ?? "");
      setDescription(existing?.description ?? "");
      setIcon(existing?.icon ?? "⭐");
      setCategory(existing?.category ?? "School");
      setSectionId(existing?.section_id ?? sections[0]?.id ?? "");
      setXp(existing?.xp ?? 10);
      setGold(existing?.gold ?? 5);
      setMoney(existing?.money ?? 0);
      setRecurring((existing?.recurring as "" | "daily" | "weekly") ?? "");
      // Parse due_at if set, otherwise fall back to due_date
      if (existing?.due_at) {
        const d = new Date(existing.due_at);
        setDueDate(d.toISOString().slice(0, 10));
        setDueTime(d.toTimeString().slice(0, 5));
      } else {
        setDueDate(existing?.due_date ?? "");
        setDueTime("");
      }
      setHeroId(existing?.hero_member_id ?? (heroes[0]?.id ?? ""));
      setPenaltyXp(existing?.penalty_xp ?? 0);
      setPenaltyGold(existing?.penalty_gold ?? 0);
      setPenaltyMoney(existing?.penalty_money ?? 0);
      setPenaltyMode((existing?.penalty_mode as "manual" | "auto") ?? "manual");
    }
  }, [open, existing, heroes, sections]);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      // Combine due_date + due_time into a timestamp if both set
      let dueAt: string | null = null;
      if (dueDate && dueTime) {
        dueAt = new Date(`${dueDate}T${dueTime}:00`).toISOString();
      } else if (dueDate) {
        dueAt = new Date(`${dueDate}T23:59:59`).toISOString();
      }

      await saveQuest({
        id: existing?.id,
        household_id: householdId,
        hero_member_id: heroId || null,
        section_id: sectionId || null,
        title: title.trim(),
        description: description.trim(),
        icon,
        category,
        xp,
        gold,
        money,
        recurring: recurring || null,
        due_date: dueDate || null,
        due_at: dueAt,
        penalty_xp: penaltyXp,
        penalty_gold: penaltyGold,
        penalty_money: penaltyMoney,
        penalty_mode: penaltyMode,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={existing ? "Edit Quest" : "Add New Quest"}>
      <label className="label">Quest title</label>
      <input className="input" placeholder="e.g. Math homework" value={title} onChange={e => setTitle(e.target.value)} />

      <label className="label">Description (optional)</label>
      <textarea className="input min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} />

      <label className="label">Icon</label>
      <IconPicker options={ICONS} value={icon} onChange={setIcon} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Section</label>
          <select className="input" value={sectionId} onChange={e => setSectionId(e.target.value)}>
            <option value="">— None —</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {heroes.length > 1 && (
        <>
          <label className="label">Assign to</label>
          <select className="input" value={heroId} onChange={e => setHeroId(e.target.value)}>
            {heroes.map(h => <option key={h.id} value={h.id}>{h.avatar} {h.display_name}</option>)}
          </select>
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">XP</label>
          <input type="number" className="input" min="0" value={xp} onChange={e => setXp(Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Gold 🪙</label>
          <input type="number" className="input" min="0" value={gold} onChange={e => setGold(Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Money $</label>
          <input type="number" step="0.25" className="input" min="0" value={money} onChange={e => setMoney(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Repeats</label>
          <select className="input" value={recurring} onChange={e => setRecurring(e.target.value as "" | "daily" | "weekly")}>
            <option value="">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <label className="label">Due time (optional)</label>
      <input type="time" className="input" value={dueTime} onChange={e => setDueTime(e.target.value)} />

      <details className="mb-3 mt-2">
        <summary className="cursor-pointer font-bold text-sm text-text-soft py-2">⚠️ Penalty settings (optional)</summary>
        <div className="pt-2">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="label">−XP</label>
              <input type="number" className="input" min="0" value={penaltyXp} onChange={e => setPenaltyXp(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">−Gold</label>
              <input type="number" className="input" min="0" value={penaltyGold} onChange={e => setPenaltyGold(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">−Money</label>
              <input type="number" step="0.25" className="input" min="0" value={penaltyMoney} onChange={e => setPenaltyMoney(Number(e.target.value) || 0)} />
            </div>
          </div>
          <label className="label">When does the penalty apply?</label>
          <select className="input" value={penaltyMode} onChange={e => setPenaltyMode(e.target.value as "manual" | "auto")}>
            <option value="manual">Wait for parent (manual)</option>
            <option value="auto">Automatically when overdue</option>
          </select>
          <p className="text-xs text-text-soft mt-1">Penalty also breaks the streak.</p>
        </div>
      </details>

      <div className="flex gap-2 justify-end mt-4">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!title.trim() || busy} onClick={save}>
          {existing ? "Save changes" : "Add quest"}
        </button>
      </div>
    </Dialog>
  );
}
