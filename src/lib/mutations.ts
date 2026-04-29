"use client";

import { createClient } from "@/lib/supabase/client";
import type { Quest, ShopItem } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { toast } from "@/components/ui/toast";
import { fireConfetti } from "@/components/confetti";

export async function submitQuest(questId: string, note: string, proofUrl?: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_quest", {
    quest_id: questId,
    proof_note: note,
    proof_url: proofUrl || "",
  });
  if (error) throw error;
  toast("Sent for approval — nice work!", "📨");
}

export async function markQuestMissed(questId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_quest_missed", { quest_id: questId });
  if (error) throw error;
  toast("Penalty applied", "⚠️");
}

export async function saveSection(input: { id?: string; household_id: string; name: string; icon?: string; sort_order?: number }) {
  const supabase = createClient();
  if (input.id) {
    const { id, household_id: _hh, ...rest } = input as any;
    const { error } = await supabase.from("sections").update(rest).eq("id", id);
    if (error) throw error;
    toast("Section updated", "📁");
  } else {
    const { error } = await supabase.from("sections").insert(input as any);
    if (error) throw error;
    toast("Section added", "📁");
  }
}

export async function deleteSection(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw error;
}

export async function approveQuest(questId: string, parentNote: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_quest", { quest_id: questId, parent_note: parentNote });
  if (error) throw error;
  fireConfetti();
  toast("Approved!", "🎉");
  // Re-check achievements (best-effort, runs on next data load)
}

export async function rejectQuest(questId: string, parentNote: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_quest", { quest_id: questId, parent_note: parentNote });
  if (error) throw error;
  toast("Sent back for another try", "↩️");
}

export async function saveQuest(input: Partial<Quest> & { household_id: string }) {
  const supabase = createClient();
  if (input.id) {
    const { id, household_id: _hh, created_at, updated_at, ...rest } = input as any;
    const { error } = await supabase.from("quests").update(rest).eq("id", id);
    if (error) throw error;
    toast("Quest updated", "✨");
  } else {
    const { error } = await supabase.from("quests").insert(input as any);
    if (error) throw error;
    toast("Quest added!", "✨");
  }
}

export async function deleteQuest(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("quests").delete().eq("id", id);
  if (error) throw error;
}

export async function saveShopItem(input: Partial<ShopItem> & { household_id: string }) {
  const supabase = createClient();
  if (input.id) {
    const { id, household_id: _hh, created_at, ...rest } = input as any;
    const { error } = await supabase.from("shop_items").update(rest).eq("id", id);
    if (error) throw error;
    toast("Reward updated", "🎁");
  } else {
    const { error } = await supabase.from("shop_items").insert(input as any);
    if (error) throw error;
    toast("Reward added!", "🎁");
  }
}

export async function deleteShopItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("shop_items").delete().eq("id", id);
  if (error) throw error;
}

export async function buyShopItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("purchase_shop_item", { item_id: itemId });
  if (error) throw error;
  toast("Reward requested! Waiting for parent…", "🛍️");
}

export async function approvePurchase(purchaseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_purchase", { purchase_id: purchaseId });
  if (error) throw error;
  toast("Reward approved!", "🎁");
}

export async function rejectPurchase(purchaseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_purchase", { purchase_id: purchaseId });
  if (error) throw error;
  toast("Purchase declined — gold refunded", "↩️");
}

export async function checkAndUnlockAchievements(memberId: string, hero: any, purchases: any[]) {
  const supabase = createClient();
  const newly: typeof ACHIEVEMENTS = [];
  for (const a of ACHIEVEMENTS) {
    if (!hero.achievements_unlocked.includes(a.id) && a.check(hero, purchases)) {
      newly.push(a);
    }
  }
  for (const a of newly) {
    await supabase.rpc("unlock_achievement", { p_member_id: memberId, ach: a.id });
    toast(`Achievement unlocked: ${a.title}`, a.icon);
  }
}
