// Database types — hand-written to match the migration. Regenerate with the
// Supabase CLI later if you want full type coverage:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types.gen.ts

export type Role = "parent" | "hero";
export type QuestStatus = "available" | "submitted" | "approved";
export type Recurrence = "daily" | "weekly" | null;
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type PenaltyMode = "manual" | "auto";

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  avatar: string;
  created_at: string;
}

export interface Hero {
  member_id: string;
  level: number;
  xp: number;
  gold: number;
  money: number;
  streak: number;
  best_streak: number;
  total_completed: number;
  last_active_date: string | null;
  achievements_unlocked: string[];
}

export interface Section {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Quest {
  id: string;
  household_id: string;
  hero_member_id: string | null;
  section_id: string | null;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp: number;
  gold: number;
  money: number;
  recurring: Recurrence;
  due_date: string | null;
  due_at: string | null;
  status: QuestStatus;
  last_completed: string | null;
  completed_at: string | null;
  approved_at: string | null;
  proof_note: string;
  proof_url: string;
  parent_note: string;
  penalty_xp: number;
  penalty_gold: number;
  penalty_money: number;
  penalty_mode: PenaltyMode;
  penalty_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopItem {
  id: string;
  household_id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  money_value: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  household_id: string;
  hero_member_id: string;
  shop_item_id: string | null;
  name: string;
  icon: string;
  cost: number;
  money_value: number;
  status: PurchaseStatus;
  purchased_at: string;
  approved_at: string | null;
}

export interface HistoryEntry {
  id: string;
  household_id: string;
  hero_member_id: string;
  type: "quest" | "purchase" | "penalty";
  title: string;
  icon: string;
  xp: number;
  gold: number;
  money: number;
  cost: number;
  proof_url: string;
  approved_at: string;
}

// Minimal Database shape — sufficient for `createClient<Database>()` typing.
export interface Database {
  public: {
    Tables: {
      households: { Row: Household; Insert: Partial<Household>; Update: Partial<Household>; Relationships: [] };
      household_members: { Row: HouseholdMember; Insert: Partial<HouseholdMember>; Update: Partial<HouseholdMember>; Relationships: [] };
      heroes: { Row: Hero; Insert: Partial<Hero>; Update: Partial<Hero>; Relationships: [] };
      sections: { Row: Section; Insert: Partial<Section>; Update: Partial<Section>; Relationships: [] };
      quests: { Row: Quest; Insert: Partial<Quest>; Update: Partial<Quest>; Relationships: [] };
      shop_items: { Row: ShopItem; Insert: Partial<ShopItem>; Update: Partial<ShopItem>; Relationships: [] };
      purchases: { Row: Purchase; Insert: Partial<Purchase>; Update: Partial<Purchase>; Relationships: [] };
      history: { Row: HistoryEntry; Insert: Partial<HistoryEntry>; Update: Partial<HistoryEntry>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_household: { Args: { name: string; display_name: string; avatar?: string }; Returns: { household_id: string; member_id: string; invite_code: string }[] };
      join_household: { Args: { code: string; role: Role; display_name: string; avatar?: string }; Returns: { household_id: string; member_id: string }[] };
      add_hero_record: { Args: { p_member_id: string }; Returns: undefined };
      submit_quest: { Args: { quest_id: string; proof_note?: string; proof_url?: string }; Returns: undefined };
      approve_quest: { Args: { quest_id: string; parent_note?: string }; Returns: undefined };
      reject_quest: { Args: { quest_id: string; parent_note?: string }; Returns: undefined };
      mark_quest_missed: { Args: { quest_id: string }; Returns: undefined };
      sweep_overdue_penalties: { Args: Record<string, never>; Returns: undefined };
      purchase_shop_item: { Args: { item_id: string }; Returns: string };
      approve_purchase: { Args: { purchase_id: string }; Returns: undefined };
      reject_purchase: { Args: { purchase_id: string }; Returns: undefined };
      seed_starter_data: { Args: { p_household_id: string }; Returns: undefined };
      unlock_achievement: { Args: { p_member_id: string; ach: string }; Returns: undefined };
    };
    Enums: {
      member_role: Role;
      quest_status: QuestStatus;
      recurrence: "daily" | "weekly";
      purchase_status: PurchaseStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
