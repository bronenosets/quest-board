import type { Hero, Purchase } from "@/lib/types";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (hero: Hero, purchases: Purchase[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_quest", icon: "🌱", title: "First Steps", desc: "Complete your first quest", check: h => h.total_completed >= 1 },
  { id: "ten_quests", icon: "🎯", title: "Quest Master", desc: "Complete 10 quests", check: h => h.total_completed >= 10 },
  { id: "fifty_quests", icon: "🏆", title: "Champion", desc: "Complete 50 quests", check: h => h.total_completed >= 50 },
  { id: "hundred_quests", icon: "👑", title: "Legend", desc: "Complete 100 quests", check: h => h.total_completed >= 100 },
  { id: "level_5", icon: "⭐", title: "Rising Star", desc: "Reach level 5", check: h => h.level >= 5 },
  { id: "level_10", icon: "🌟", title: "Epic Hero", desc: "Reach level 10", check: h => h.level >= 10 },
  { id: "streak_3", icon: "🔥", title: "On Fire", desc: "3-day streak", check: h => h.best_streak >= 3 },
  { id: "streak_7", icon: "💥", title: "Week Warrior", desc: "7-day streak", check: h => h.best_streak >= 7 },
  { id: "streak_30", icon: "🚀", title: "Unstoppable", desc: "30-day streak", check: h => h.best_streak >= 30 },
  { id: "rich_50", icon: "💰", title: "Coin Collector", desc: "Save 50 gold", check: h => h.gold >= 50 },
  { id: "rich_200", icon: "💎", title: "Treasure Hoarder", desc: "Save 200 gold", check: h => h.gold >= 200 },
  { id: "first_purchase", icon: "🛍️", title: "First Reward", desc: "Spend gold in the loot shop", check: (_, p) => p.some(x => x.status === "approved") },
];
