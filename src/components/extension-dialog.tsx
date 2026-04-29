"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { requestExtension } from "@/lib/mutations";
import { toast } from "@/components/ui/toast";
import type { Quest } from "@/lib/types";

const PRESETS = [
  { label: "+15 min", minutes: 15 },
  { label: "+30 min", minutes: 30 },
  { label: "+1 hour", minutes: 60 },
  { label: "+3 hours", minutes: 180 },
  { label: "+24 hours", minutes: 24 * 60 },
];

interface Props {
  quest: Quest | null;
  onClose: () => void;
}

export function ExtensionDialog({ quest, onClose }: Props) {
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!quest || minutes <= 0) return;
    setBusy(true);
    try {
      await requestExtension(quest.id, minutes, reason);
      setReason("");
      setMinutes(60);
      onClose();
    } catch (e) {
      toast((e as Error).message, "⚠️");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!quest} onOpenChange={(o) => { if (!o) onClose(); }} title="Request more time">
      {quest && (
        <>
          <div className="flex gap-3 items-center mb-4 p-3 bg-card-soft rounded-xl">
            <div className="text-3xl">{quest.icon}</div>
            <div>
              <div className="font-extrabold">{quest.title}</div>
              {quest.due_at && (
                <div className="text-xs text-text-soft">
                  Currently due: {new Date(quest.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>

          <label className="label">How much extra time?</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.minutes}
                type="button"
                onClick={() => setMinutes(p.minutes)}
                className={`btn btn-sm ${minutes === p.minutes ? "btn-primary" : "btn-ghost"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="label">Why? (optional)</label>
          <textarea
            className="input min-h-[60px]"
            placeholder="e.g. piano lesson runs late today"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />

          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={send} disabled={busy || minutes <= 0}>
              {busy ? "Sending…" : "Request"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
