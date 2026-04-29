"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "quest-proofs";

export async function uploadProof(file: File, householdId: string, questId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${householdId}/${questId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function getProofSignedUrl(path: string, expiresInSeconds = 60 * 60 * 24 * 365): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
