"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { ICONS } from "@/lib/icons";
import { saveSection } from "@/lib/mutations";
import type { Section } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: Section | null;
  householdId: string;
}

export function SectionFormDialog({ open, onClose, existing, householdId }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [sortOrder, setSortOrder] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setIcon(existing?.icon ?? "📁");
      setSortOrder(existing?.sort_order ?? 0);
    }
  }, [open, existing]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await saveSection({
        id: existing?.id,
        household_id: householdId,
        name: name.trim(),
        icon,
        sort_order: sortOrder,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={existing ? "Edit Section" : "Add Section"}>
      <label className="label">Section name</label>
      <input className="input" placeholder="e.g. Music" value={name} onChange={e => setName(e.target.value)} />
      <label className="label">Icon</label>
      <IconPicker options={ICONS} value={icon} onChange={setIcon} />
      <label className="label">Sort order</label>
      <input type="number" className="input" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value) || 0)} />
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!name.trim() || busy} onClick={save}>
          {existing ? "Save" : "Add section"}
        </button>
      </div>
    </Dialog>
  );
}
