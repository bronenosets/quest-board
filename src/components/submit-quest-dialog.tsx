"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { submitQuest } from "@/lib/mutations";
import type { Quest } from "@/lib/types";

interface Props {
  quest: Quest | null;
  onClose: () => void;
}

export function SubmitQuestDialog({ quest, onClose }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!quest) return;
    setBusy(true);
    try {
      await submitQuest(quest.id, note);
      setNote("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!quest} onOpenChange={(o) => { if (!o) onClose(); }} title="Submit for approval?">
      {quest && (
        <>
          <div className="flex gap-3 items-center mb-4 p-3 bg-card-soft rounded-xl">
            <div className="text-3xl">{quest.icon}</div>
            <div className="font-extrabold">{quest.title}</div>
          </div>
          <label className="label">Note for parent (optional)</label>
          <textarea
            className="input min-h-[60px]"
            placeholder="Tell your parent what you did"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-ghost" onClick={onClose}>Not yet</button>
            <button className="btn btn-primary" onClick={send} disabled={busy}>Send for approval</button>
          </div>
        </>
      )}
    </Dialog>
  );
}
