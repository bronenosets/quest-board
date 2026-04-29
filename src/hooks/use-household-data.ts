"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Household, HouseholdMember, Hero, Quest, ShopItem, Purchase, HistoryEntry } from "@/lib/types";

export interface HouseholdData {
  user: { id: string; email: string | null };
  household: Household;
  member: HouseholdMember;
  members: HouseholdMember[];
  hero: Hero | null; // for current user if hero, OR the first hero in the household if user is parent
  quests: Quest[];
  shop: ShopItem[];
  purchases: Purchase[];
  history: HistoryEntry[];
}

const KEY = ["household-data"] as const;

export function useHouseholdData() {
  const qc = useQueryClient();

  const query = useQuery<HouseholdData>({
    queryKey: KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp.user;
      if (!user) throw new Error("not authenticated");

      const { data: members, error: mErr } = await supabase
        .from("household_members").select("*").eq("user_id", user.id);
      if (mErr) throw mErr;
      if (!members || members.length === 0) throw new Error("no household");

      const member = members[0];

      const { data: household, error: hErr } = await supabase
        .from("households").select("*").eq("id", member.household_id).single();
      if (hErr) throw hErr;

      const { data: allMembers } = await supabase
        .from("household_members").select("*").eq("household_id", member.household_id);

      let heroRow: Hero | null = null;
      if (member.role === "hero") {
        const { data } = await supabase.from("heroes").select("*").eq("member_id", member.id).maybeSingle();
        heroRow = data;
        if (!heroRow) {
          // Self-heal: create the hero record if missing
          await supabase.rpc("add_hero_record", { p_member_id: member.id });
          const { data: again } = await supabase.from("heroes").select("*").eq("member_id", member.id).maybeSingle();
          heroRow = again;
        }
      } else {
        // Parent: load first hero in the household for stats display
        const heroMembers = (allMembers || []).filter(m => m.role === "hero");
        if (heroMembers.length > 0) {
          const { data } = await supabase.from("heroes").select("*").eq("member_id", heroMembers[0].id).maybeSingle();
          heroRow = data;
        }
      }

      const { data: quests } = await supabase
        .from("quests").select("*").eq("household_id", member.household_id).order("created_at", { ascending: true });

      const { data: shop } = await supabase
        .from("shop_items").select("*").eq("household_id", member.household_id).order("cost", { ascending: true });

      const { data: purchases } = await supabase
        .from("purchases").select("*").eq("household_id", member.household_id).order("purchased_at", { ascending: false });

      const { data: history } = await supabase
        .from("history").select("*").eq("household_id", member.household_id).order("approved_at", { ascending: false }).limit(100);

      return {
        user: { id: user.id, email: user.email || null },
        household,
        member,
        members: allMembers || [],
        hero: heroRow,
        quests: quests || [],
        shop: shop || [],
        purchases: purchases || [],
        history: history || [],
      };
    },
  });

  // Real-time subscriptions.
  // Channel name uses a random suffix so multiple components calling this hook
  // each get their own channel (Supabase throws if you `.on()` an already-subscribed channel).
  useEffect(() => {
    if (!query.data) return;
    const supabase = createClient();
    const hid = query.data.household.id;
    const channelName = `household:${hid}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "quests", filter: `household_id=eq.${hid}` },
        () => qc.invalidateQueries({ queryKey: KEY }))
      .on("postgres_changes", { event: "*", schema: "public", table: "purchases", filter: `household_id=eq.${hid}` },
        () => qc.invalidateQueries({ queryKey: KEY }))
      .on("postgres_changes", { event: "*", schema: "public", table: "heroes" },
        () => qc.invalidateQueries({ queryKey: KEY }))
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_items", filter: `household_id=eq.${hid}` },
        () => qc.invalidateQueries({ queryKey: KEY }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [query.data?.household.id, qc]);

  return query;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return useMemo(() => () => qc.invalidateQueries({ queryKey: KEY }), [qc]);
}
