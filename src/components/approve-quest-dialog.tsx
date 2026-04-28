"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { approveQuest, rejectQuest } from "@/lib/mutations";
import type { Quest } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

interface Props {
  quest: Quest | null;
  onClose: () => void;
}

export function ApproveQuestDialog({ quest, onClose }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!quest) return;
    setBusy(true);
    try { await approveQuest(quest.id, note); setNote(""); onClose(); } finally { setBusy(false); }
  }
  async function reject() {
    if (!quest) return;
    setBusy(true);
    try { await rejectQuest(quest.id, note); setNote(""); onClose(); } finally { setBusy(false); }
  }

  return (
    <Dialog open={!!quest} onOpenChange={(o) => { if (!o) onClose(); }} title="Approve quest?">
      {quest && (
        <>
          <div className="flex gap-3 items-center mb-3 p-3 bg-card-soft rounded-xl">
            <div className="text-3xl">{quest.icon}</div>
            <div>
              <div className="font-extrabold">{quest.title}</div>
              <div className="text-xs text-text-soft">
                +{quest.xp} XP, +{quest.gold} 🪙{quest.money > 0 ? `, +${formatMoney(quest.money)}` : ""}
              </div>
            </div>
          </div>
          {quest.proof_note && (
            <div className="bg-[#fffbe8] border-l-[3px] border-gold rounded-lg px-3 py-2.5 mb-3">
              <div className="font-extrabold text-[11px] uppercase tracking-wide text-text-soft mb-0.5">Hero's note</div>
              <div className="text-sm">{quest.proof_note}</div>
            </div>
          )}
          <label className="label">Reply (optional)</label>
          <textarea className="input min-h-[60px]" placeholder="Optional note for the hero" value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-danger" disabled={busy} onClick={reject}>Send back</button>
            <button className="btn btn-success" disabled={busy} onClick={approve}>✓ Approve</button>
          </div>
        </>
      )}
    </Dialog>
  );
}
