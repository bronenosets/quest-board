export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      heroes: {
        Row: {
          achievements_unlocked: string[]
          best_streak: number
          gold: number
          last_active_date: string | null
          level: number
          member_id: string
          money: number
          streak: number
          total_completed: number
          xp: number
        }
        Insert: {
          achievements_unlocked?: string[]
          best_streak?: number
          gold?: number
          last_active_date?: string | null
          level?: number
          member_id: string
          money?: number
          streak?: number
          total_completed?: number
          xp?: number
        }
        Update: {
          achievements_unlocked?: string[]
          best_streak?: number
          gold?: number
          last_active_date?: string | null
          level?: number
          member_id?: string
          money?: number
          streak?: number
          total_completed?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "heroes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      history: {
        Row: {
          approved_at: string | null
          cost: number | null
          gold: number | null
          hero_member_id: string
          household_id: string
          icon: string | null
          id: string
          money: number | null
          title: string
          type: string
          xp: number | null
        }
        Insert: {
          approved_at?: string | null
          cost?: number | null
          gold?: number | null
          hero_member_id: string
          household_id: string
          icon?: string | null
          id?: string
          money?: number | null
          title: string
          type: string
          xp?: number | null
        }
        Update: {
          approved_at?: string | null
          cost?: number | null
          gold?: number | null
          hero_member_id?: string
          household_id?: string
          icon?: string | null
          id?: string
          money?: number | null
          title?: string
          type?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "history_hero_member_id_fkey"
            columns: ["hero_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          avatar: string | null
          created_at: string | null
          display_name: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          display_name: string
          household_id: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          display_name?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          approved_at: string | null
          cost: number
          hero_member_id: string
          household_id: string
          icon: string
          id: string
          name: string
          purchased_at: string | null
          shop_item_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
        }
        Insert: {
          approved_at?: string | null
          cost: number
          hero_member_id: string
          household_id: string
          icon: string
          id?: string
          name: string
          purchased_at?: string | null
          shop_item_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
        }
        Update: {
          approved_at?: string | null
          cost?: number
          hero_member_id?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
          purchased_at?: string | null
          shop_item_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
        }
        Relationships: [
          {
            foreignKeyName: "purchases_hero_member_id_fkey"
            columns: ["hero_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          approved_at: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          gold: number
          hero_member_id: string | null
          household_id: string
          icon: string | null
          id: string
          last_completed: string | null
          money: number
          parent_note: string | null
          proof_note: string | null
          recurring: Database["public"]["Enums"]["recurrence"] | null
          status: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at: string | null
          xp: number
        }
        Insert: {
          approved_at?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          gold?: number
          hero_member_id?: string | null
          household_id: string
          icon?: string | null
          id?: string
          last_completed?: string | null
          money?: number
          parent_note?: string | null
          proof_note?: string | null
          recurring?: Database["public"]["Enums"]["recurrence"] | null
          status?: Database["public"]["Enums"]["quest_status"]
          title: string
          updated_at?: string | null
          xp?: number
        }
        Update: {
          approved_at?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          gold?: number
          hero_member_id?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          last_completed?: string | null
          money?: number
          parent_note?: string | null
          proof_note?: string | null
          recurring?: Database["public"]["Enums"]["recurrence"] | null
          status?: Database["public"]["Enums"]["quest_status"]
          title?: string
          updated_at?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "quests_hero_member_id_fkey"
            columns: ["hero_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          cost: number
          created_at: string | null
          description: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          cost?: number
          created_at?: string | null
          description?: string | null
          household_id: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          description?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_hero_record: { Args: { p_member_id: string }; Returns: undefined }
      approve_purchase: { Args: { purchase_id: string }; Returns: undefined }
      approve_quest: {
        Args: { parent_note?: string; quest_id: string }
        Returns: undefined
      }
      create_household: {
        Args: { avatar?: string; display_name: string; name: string }
        Returns: {
          household_id: string
          invite_code: string
          member_id: string
        }[]
      }
      is_household_member: { Args: { hid: string }; Returns: boolean }
      is_household_parent: { Args: { hid: string }; Returns: boolean }
      join_household: {
        Args: {
          avatar?: string
          code: string
          display_name: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Returns: {
          household_id: string
          member_id: string
        }[]
      }
      purchase_shop_item: { Args: { item_id: string }; Returns: string }
      reject_purchase: { Args: { purchase_id: string }; Returns: undefined }
      reject_quest: {
        Args: { parent_note?: string; quest_id: string }
        Returns: undefined
      }
      seed_starter_data: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      submit_quest: {
        Args: { proof_note?: string; quest_id: string }
        Returns: undefined
      }
      unlock_achievement: {
        Args: { ach: string; p_member_id: string }
        Returns: undefined
      }
    }
    Enums: {
      member_role: "parent" | "hero"
      purchase_status: "pending" | "approved" | "rejected"
      quest_status: "available" | "submitted" | "approved"
      recurrence: "daily" | "weekly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: ["parent", "hero"],
      purchase_status: ["pending", "approved", "rejected"],
      quest_status: ["available", "submitted", "approved"],
      recurrence: ["daily", "weekly"],
    },
  },
} as const
