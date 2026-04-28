"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { ICONS, CATEGORIES } from "@/lib/icons";
import { saveQuest } from "@/lib/mutations";
import type { Quest, HouseholdMember } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: Quest | null;
  householdId: string;
  heroes: HouseholdMember[];
}

export function QuestFormDialog({ open, onClose, existing, householdId, heroes }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [category, setCategory] = useState("School");
  const [xp, setXp] = useState(10);
  const [gold, setGold] = useState(5);
  const [money, setMoney] = useState(0);
  const [recurring, setRecurring] = useState<"" | "daily" | "weekly">("");
  const [dueDate, setDueDate] = useState("");
  const [heroId, setHeroId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(existing?.title ?? "");
      setDescription(existing?.description ?? "");
      setIcon(existing?.icon ?? "⭐");
      setCategory(existing?.category ?? "School");
      setXp(existing?.xp ?? 10);
      setGold(existing?.gold ?? 5);
      setMoney(existing?.money ?? 0);
      setRecurring((existing?.recurring as "" | "daily" | "weekly") ?? "");
      setDueDate(existing?.due_date ?? "");
      setHeroId(existing?.hero_member_id ?? (heroes[0]?.id ?? ""));
    }
  }, [open, existing, heroes]);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await saveQuest({
        id: existing?.id,
        household_id: householdId,
        hero_member_id: heroId || null,
        title: title.trim(),
        description: description.trim(),
        icon,
        category,
        xp,
        gold,
        money,
        recurring: recurring || null,
        due_date: dueDate || null,
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

      <label className="label">Category</label>
      <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

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

      <div className="flex gap-2 justify-end mt-4">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!title.trim() || busy} onClick={save}>
          {existing ? "Save changes" : "Add quest"}
        </button>
      </div>
    </Dialog>
  );
}
