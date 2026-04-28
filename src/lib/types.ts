// Database types — hand-written to match the migration. Regenerate with the
// Supabase CLI later if you want full type coverage:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types.gen.ts

export type Role = "parent" | "hero";
export type QuestStatus = "available" | "submitted" | "approved";
export type Recurrence = "daily" | "weekly" | null;
export type PurchaseStatus = "pending" | "approved" | "rejected";

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

export interface Quest {
  id: string;
  household_id: string;
  hero_member_id: string | null;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp: number;
  gold: number;
  money: number;
  recurring: Recurrence;
  due_date: string | null;
  status: QuestStatus;
  last_completed: string | null;
  completed_at: string | null;
  approved_at: string | null;
  proof_note: string;
  parent_note: string;
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
  status: PurchaseStatus;
  purchased_at: string;
  approved_at: string | null;
}

export interface HistoryEntry {
  id: string;
  household_id: string;
  hero_member_id: string;
  type: "quest" | "purchase";
  title: string;
  icon: string;
  xp: number;
  gold: number;
  money: number;
  cost: number;
  approved_at: string;
}

// Minimal Database shape — sufficient for `createClient<Database>()` typing.
export interface Database {
  public: {
    Tables: {
      households: { Row: Household; Insert: Partial<Household>; Update: Partial<Household> };
      household_members: { Row: HouseholdMember; Insert: Partial<HouseholdMember>; Update: Partial<HouseholdMember> };
      heroes: { Row: Hero; Insert: Partial<Hero>; Update: Partial<Hero> };
      quests: { Row: Quest; Insert: Partial<Quest>; Update: Partial<Quest> };
      shop_items: { Row: ShopItem; Insert: Partial<ShopItem>; Update: Partial<ShopItem> };
      purchases: { Row: Purchase; Insert: Partial<Purchase>; Update: Partial<Purchase> };
      history: { Row: HistoryEntry; Insert: Partial<HistoryEntry>; Update: Partial<HistoryEntry> };
    };
    Functions: {
      create_household: { Args: { name: string; display_name: string; avatar?: string }; Returns: { household_id: string; member_id: string; invite_code: string }[] };
      join_household: { Args: { code: string; role: Role; display_name: string; avatar?: string }; Returns: { household_id: string; member_id: string }[] };
      add_hero_record: { Args: { p_member_id: string }; Returns: void };
      submit_quest: { Args: { quest_id: string; proof_note?: string }; Returns: void };
      approve_quest: { Args: { quest_id: string; parent_note?: string }; Returns: void };
      reject_quest: { Args: { quest_id: string; parent_note?: string }; Returns: void };
      purchase_shop_item: { Args: { item_id: string }; Returns: string };
      approve_purchase: { Args: { purchase_id: string }; Returns: void };
      reject_purchase: { Args: { purchase_id: string }; Returns: void };
      seed_starter_data: { Args: { p_household_id: string }; Returns: void };
      unlock_achievement: { Args: { p_member_id: string; ach: string }; Returns: void };
    };
    Enums: {
      member_role: Role;
      quest_status: QuestStatus;
      recurrence: "daily" | "weekly";
      purchase_status: PurchaseStatus;
    };
  };
}
