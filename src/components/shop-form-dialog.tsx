"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { ICONS } from "@/lib/icons";
import { saveShopItem } from "@/lib/mutations";
import type { ShopItem } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: ShopItem | null;
  householdId: string;
}

export function ShopFormDialog({ open, onClose, existing, householdId }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState(25);
  const [moneyValue, setMoneyValue] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setDescription(existing?.description ?? "");
      setIcon(existing?.icon ?? "🎁");
      setCost(existing?.cost ?? 25);
      setMoneyValue(existing?.money_value ?? 0);
    }
  }, [open, existing]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await saveShopItem({
        id: existing?.id,
        household_id: householdId,
        name: name.trim(),
        description: description.trim(),
        icon,
        cost,
        money_value: moneyValue,
      } as any);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={existing ? "Edit Reward" : "Add Loot Shop Reward"}>
      <label className="label">Reward name</label>
      <input className="input" placeholder="e.g. 30 min screen time" value={name} onChange={e => setName(e.target.value)} />

      <label className="label">Description (optional)</label>
      <textarea className="input min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} />

      <label className="label">Icon</label>
      <IconPicker options={ICONS} value={icon} onChange={setIcon} />

      <label className="label">Gold cost 🪙</label>
      <input type="number" min="0" className="input" value={cost} onChange={e => setCost(Number(e.target.value) || 0)} />

      <details className="mb-3">
        <summary className="cursor-pointer font-bold text-sm text-text-soft py-2">💵 Cash-out (optional)</summary>
        <div className="pt-2">
          <label className="label">Dollar value (for cash-out items)</label>
          <input
            type="number"
            step="0.25"
            min="0"
            className="input"
            value={moneyValue}
            onChange={e => setMoneyValue(Number(e.target.value) || 0)}
            placeholder="0 = regular reward"
          />
          <p className="text-xs text-text-soft mt-1">
            If &gt; 0, approving this purchase credits this amount to her dollar balance (e.g., cost 500 🪙 → +$5 dollars). Leave at 0 for normal physical-world rewards.
          </p>
        </div>
      </details>

      <div className="flex gap-2 justify-end mt-4">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!name.trim() || busy} onClick={save}>
          {existing ? "Save changes" : "Add reward"}
        </button>
      </div>
    </Dialog>
  );
}
