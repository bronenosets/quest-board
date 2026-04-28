"use client";

import type { Hero, Household, HouseholdMember } from "@/lib/types";
import { xpForLevel, xpProgress, formatMoney } from "@/lib/utils";

interface TopbarProps {
  household: Household;
  member: HouseholdMember;
  hero: Hero | null;
}

export function Topbar({ household, member, hero }: TopbarProps) {
  const level = hero?.level ?? 1;
  const xp = hero?.xp ?? 0;
  const need = xpForLevel(level);
  const pct = xpProgress(level, xp);

  return (
    <div className="topbar-card grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 items-center p-5 mb-4">
      <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white"
        style={{ background: "linear-gradient(135deg, #7c4dff, #ff6b9d)", boxShadow: "0 6px 16px rgba(124,77,255,0.35)" }}>
        {member.avatar}
        {hero && (
          <div className="absolute -bottom-1.5 -right-1.5 bg-gold text-[#5a3d00] text-xs font-extrabold px-2 py-0.5 rounded-full border-2 border-white shadow">
            L{level}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="text-xl font-extrabold heading-gradient">
          {hero ? `${member.display_name}'s Quest Board` : household.name}
        </div>
        <div className="text-text-soft text-xs mb-2">
          {hero
            ? `Level ${level} • ${hero.total_completed} quests completed`
            : `${household.name} • ${member.role === "parent" ? "Parent" : "Hero"} mode`}
        </div>
        {hero && (
          <div className="relative h-3 bg-[#efeaff] rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 xp-glow" style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #7c4dff 0%, #ff6b9d 100%)",
              transition: "width 0.6s cubic-bezier(.2,.8,.2,1)",
            }} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text" style={{ textShadow: "0 1px 2px rgba(255,255,255,0.6)" }}>
              {xp} / {need} XP
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
        {hero && (
          <>
            <span className="rounded-full px-3.5 py-2 font-bold text-sm flex items-center gap-1.5 border" style={{ background: "linear-gradient(135deg,#fff4cc,#ffe48a)", borderColor: "#ffd968", color: "#7a5500" }}>
              🪙 {hero.gold}
            </span>
            <span className="rounded-full px-3.5 py-2 font-bold text-sm flex items-center gap-1.5 border" style={{ background: "linear-gradient(135deg,#d8f7e5,#aeefce)", borderColor: "#7cd9a4", color: "#155f3b" }}>
              💵 {formatMoney(hero.money)}
            </span>
            <span className="rounded-full px-3.5 py-2 font-bold text-sm flex items-center gap-1.5 border" style={{ background: "linear-gradient(135deg,#ffd6e3,#ffaec5)", borderColor: "#ff85a6", color: "#7a1f3b" }}>
              🔥 {hero.streak}d
            </span>
          </>
        )}
      </div>
    </div>
  );
}
