"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { submitQuest } from "@/lib/mutations";
import { uploadProof } from "@/lib/storage";
import { toast } from "@/components/ui/toast";
import type { Quest } from "@/lib/types";

interface Props {
  quest: Quest | null;
  householdId: string;
  onClose: () => void;
}

export function SubmitQuestDialog({ quest, householdId, onClose }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function send() {
    if (!quest) return;
    setBusy(true);
    try {
      let proofPath = "";
      if (file) {
        proofPath = await uploadProof(file, householdId, quest.id);
      }
      await submitQuest(quest.id, note, proofPath);
      setNote(""); pickFile(null);
      onClose();
    } catch (e) {
      toast((e as Error).message, "⚠️");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!quest} onOpenChange={(o) => { if (!o) { onClose(); pickFile(null); } }} title="Submit for approval?">
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

          <label className="label">Photo proof (optional)</label>
          {preview ? (
            <div className="relative mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="absolute top-2 right-2 bg-white border border-border rounded-full w-8 h-8 font-bold shadow"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="block mb-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => pickFile(e.target.files?.[0] || null)}
              />
              <div className="btn btn-ghost btn-block py-4">📸 Add a photo</div>
            </label>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-ghost" onClick={() => { onClose(); pickFile(null); }}>Not yet</button>
            <button className="btn btn-primary" onClick={send} disabled={busy}>
              {busy ? "Sending…" : "Send for approval"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
