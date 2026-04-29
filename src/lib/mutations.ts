"use client";

import { createClient } from "@/lib/supabase/client";
import type { Quest, ShopItem } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { toast } from "@/components/ui/toast";
import { fireConfetti } from "@/components/confetti";
import { notify } from "@/lib/push-client";

// ----- Helpers for finding notification recipients (background, fire-and-forget) -----
async function membersOfRole(householdId: string, role: "parent" | "hero"): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("role", role);
  return (data || []).map((m: any) => m.id);
}

function bg(fn: () => Promise<void>) {
  fn().catch(e => console.warn("[notify] background task failed:", e));
}

// ============================================================
// Quest mutations
// ============================================================

export async function submitQuest(questId: string, note: string, proofUrl?: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_quest", {
    quest_id: questId,
    proof_note: note,
    proof_url: proofUrl || "",
  });
  if (error) throw error;
  toast("Sent for approval — nice work!", "📨");

  bg(async () => {
    const { data: q } = await supabase.from("quests").select("title, icon, household_id").eq("id", questId).maybeSingle();
    if (!q) return;
    const parents = await membersOfRole((q as any).household_id, "parent");
    await notify(parents, {
      title: `📨 Quest submitted`,
      body: `${(q as any).icon || ""} ${(q as any).title} — needs approval`,
      url: "/app/parent",
      tag: `submit-${questId}`,
    });
  });
}

export async function markQuestMissed(questId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_quest_missed", { quest_id: questId });
  if (error) throw error;
  toast("Penalty applied", "⚠️");
}

export async function approveQuest(questId: string, parentNote: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_quest", { quest_id: questId, parent_note: parentNote });
  if (error) throw error;
  fireConfetti();
  toast("Approved!", "🎉");

  bg(async () => {
    const { data: q } = await supabase.from("quests").select("title, icon, hero_member_id, xp, gold").eq("id", questId).maybeSingle();
    if (!q || !(q as any).hero_member_id) return;
    await notify([(q as any).hero_member_id], {
      title: `🎉 Approved!`,
      body: `${(q as any).icon || ""} ${(q as any).title} — +${(q as any).xp} XP, +${(q as any).gold} 🪙`,
      url: "/app/hero",
      tag: `approve-${questId}`,
    });
  });
}

export async function rejectQuest(questId: string, parentNote: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_quest", { quest_id: questId, parent_note: parentNote });
  if (error) throw error;
  toast("Sent back for another try", "↩️");

  bg(async () => {
    const { data: q } = await supabase.from("quests").select("title, icon, hero_member_id").eq("id", questId).maybeSingle();
    if (!q || !(q as any).hero_member_id) return;
    await notify([(q as any).hero_member_id], {
      title: `↩️ Sent back`,
      body: `${(q as any).icon || ""} ${(q as any).title} — try again${parentNote ? `: "${parentNote}"` : ""}`,
      url: "/app/hero",
      tag: `reject-${questId}`,
    });
  });
}

export async function saveQuest(input: Partial<Quest> & { household_id: string }) {
  const supabase = createClient();
  const isNew = !input.id;
  let savedId = input.id;

  if (input.id) {
    const { id, household_id: _hh, created_at, updated_at, ...rest } = input as any;
    const { error } = await supabase.from("quests").update(rest).eq("id", id);
    if (error) throw error;
    toast("Quest updated", "✨");
  } else {
    const { data, error } = await supabase.from("quests").insert(input as any).select("id").single();
    if (error) throw error;
    savedId = (data as any)?.id;
    toast("Quest added!", "✨");
  }

  if (isNew) {
    bg(async () => {
      const heroId = (input as any).hero_member_id as string | null | undefined;
      const recipients = heroId ? [heroId] : await membersOfRole(input.household_id, "hero");
      if (recipients.length === 0) return;
      await notify(recipients, {
        title: `🆕 New quest`,
        body: `${input.icon || ""} ${input.title} — +${input.xp} XP, +${input.gold} 🪙`,
        url: "/app/hero",
        tag: `new-quest-${savedId}`,
      });
    });
  }
}

export async function deleteQuest(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("quests").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Shop mutations
// ============================================================

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

  bg(async () => {
    const { data: item } = await supabase.from("shop_items").select("name, icon, cost, money_value, household_id").eq("id", itemId).maybeSingle();
    if (!item) return;
    const parents = await membersOfRole((item as any).household_id, "parent");
    const isCash = ((item as any).money_value || 0) > 0;
    await notify(parents, {
      title: isCash ? `💵 Cash-out request` : `🛍️ Reward requested`,
      body: `${(item as any).icon || ""} ${(item as any).name}${isCash ? ` (+$${Number((item as any).money_value).toFixed(2)})` : ""} — ${(item as any).cost} 🪙`,
      url: "/app/parent",
      tag: `purchase-${itemId}`,
    });
  });
}

export async function approvePurchase(purchaseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_purchase", { purchase_id: purchaseId });
  if (error) throw error;
  toast("Reward approved!", "🎁");

  bg(async () => {
    const { data: p } = await supabase.from("purchases").select("name, icon, hero_member_id, money_value").eq("id", purchaseId).maybeSingle();
    if (!p) return;
    const isCash = ((p as any).money_value || 0) > 0;
    await notify([(p as any).hero_member_id], {
      title: isCash ? `💵 Cash-out approved!` : `🎁 Reward approved!`,
      body: `${(p as any).icon || ""} ${(p as any).name}${isCash ? ` (+$${Number((p as any).money_value).toFixed(2)})` : ""}`,
      url: "/app/hero",
      tag: `purchase-approved-${purchaseId}`,
    });
  });
}

export async function rejectPurchase(purchaseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_purchase", { purchase_id: purchaseId });
  if (error) throw error;
  toast("Purchase declined — gold refunded", "↩️");

  bg(async () => {
    const { data: p } = await supabase.from("purchases").select("name, icon, hero_member_id, cost").eq("id", purchaseId).maybeSingle();
    if (!p) return;
    await notify([(p as any).hero_member_id], {
      title: `↩️ Purchase declined`,
      body: `${(p as any).icon || ""} ${(p as any).name} — gold refunded`,
      url: "/app/hero",
      tag: `purchase-rejected-${purchaseId}`,
    });
  });
}

// ============================================================
// Section mutations
// ============================================================

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

// ============================================================
// Time-extension mutations
// ============================================================

export async function requestExtension(questId: string, extendMinutes: number, reason: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("request_extension", {
    quest_id: questId,
    extend_minutes: extendMinutes,
    reason,
  });
  if (error) throw error;
  toast("Extension requested", "⏰");

  bg(async () => {
    const { data: q } = await supabase.from("quests").select("title, icon, household_id").eq("id", questId).maybeSingle();
    if (!q) return;
    const parents = await membersOfRole((q as any).household_id, "parent");
    const hours = Math.round((extendMinutes / 60) * 10) / 10;
    const label = extendMinutes < 60 ? `${extendMinutes} min` : `${hours} hr${hours === 1 ? "" : "s"}`;
    await notify(parents, {
      title: `⏰ More time requested`,
      body: `${(q as any).icon || ""} ${(q as any).title} — needs ${label}${reason ? `. "${reason}"` : ""}`,
      url: "/app/parent",
      tag: `extension-${questId}`,
    });
  });
}

export async function approveExtension(requestId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_extension", { request_id: requestId });
  if (error) throw error;
  toast("Extension approved", "⏰");

  bg(async () => {
    const { data: r } = await supabase
      .from("extension_requests")
      .select("hero_member_id, extend_minutes, quest_id")
      .eq("id", requestId).maybeSingle();
    if (!r) return;
    const { data: q } = await supabase.from("quests").select("title, icon").eq("id", (r as any).quest_id).maybeSingle();
    const minutes = (r as any).extend_minutes;
    const label = minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60 * 10) / 10} hrs`;
    await notify([(r as any).hero_member_id], {
      title: `⏰ More time granted`,
      body: q ? `${(q as any).icon || ""} ${(q as any).title} — +${label}` : `+${label}`,
      url: "/app/hero",
      tag: `ext-approved-${requestId}`,
    });
  });
}

export async function rejectExtension(requestId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_extension", { request_id: requestId });
  if (error) throw error;
  toast("Extension declined", "↩️");

  bg(async () => {
    const { data: r } = await supabase
      .from("extension_requests")
      .select("hero_member_id, quest_id")
      .eq("id", requestId).maybeSingle();
    if (!r) return;
    const { data: q } = await supabase.from("quests").select("title, icon").eq("id", (r as any).quest_id).maybeSingle();
    await notify([(r as any).hero_member_id], {
      title: `↩️ More time denied`,
      body: q ? `${(q as any).icon || ""} ${(q as any).title} — no extension` : `Extension declined`,
      url: "/app/hero",
      tag: `ext-rejected-${requestId}`,
    });
  });
}

// ============================================================
// Achievements
// ============================================================

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
