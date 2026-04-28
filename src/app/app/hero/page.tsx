"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHouseholdData } from "@/hooks/use-household-data";
import { Topbar } from "@/components/topbar";
import { TabBar, Panel } from "@/components/tabs";
import { QuestCard } from "@/components/quest-card";
import { Empty } from "@/components/empty";
import { SubmitQuestDialog } from "@/components/submit-quest-dialog";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { isQuestAvailableToday, formatMoney } from "@/lib/utils";
import { LevelUpHost, showLevelUp } from "@/components/level-up";
import { buyShopItem, checkAndUnlockAchievements } from "@/lib/mutations";
import type { Quest } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "@/components/ui/toast";

export default function HeroPage() {
  const router = useRouter();
  const { data, isLoading, error } = useHouseholdData();
  const [tab, setTab] = useState("today");
  const [submitting, setSubmitting] = useState<Quest | null>(null);
  const [lastLevel, setLastLevel] = useState<number | null>(null);

  // Detect level-up by comparing previous hero.level
  useEffect(() => {
    if (!data?.hero) return;
    if (lastLevel !== null && data.hero.level > lastLevel) {
      showLevelUp(data.hero.level);
    }
    setLastLevel(data.hero.level);
  }, [data?.hero?.level, lastLevel]);

  // Run achievement check when hero state changes
  useEffect(() => {
    if (!data?.hero || !data.member) return;
    if (data.member.role !== "hero") return;
    checkAndUnlockAchievements(data.member.id, data.hero, data.purchases).catch(() => {});
  }, [data?.hero?.total_completed, data?.hero?.level, data?.hero?.gold, data?.purchases?.length, data?.member?.id]);

  if (isLoading) return <div className="p-10 text-center text-text-soft">Loading…</div>;
  if (error) {
    const msg = (error as Error).message;
    if (msg === "no household") { router.push("/onboarding"); return null; }
    return <div className="p-10 text-center text-red">Error: {msg}</div>;
  }
  if (!data) return null;

  if (data.member.role !== "hero") {
    // Wrong role for this page
    router.push("/app/parent");
    return null;
  }

  const { household, member, hero, quests, shop, purchases, history } = data;
  const myQuests = quests.filter(q => q.hero_member_id === member.id || q.hero_member_id === null);
  const submittedCount = myQuests.filter(q => q.status === "submitted").length;
  const myPurchases = purchases.filter(p => p.hero_member_id === member.id);

  const todays = myQuests.filter(q => {
    if (q.status === "submitted") return true;
    if (q.recurring) return isQuestAvailableToday(q);
    if (q.status === "approved") return false;
    return true;
  });

  return (
    <>
      <Topbar household={household} member={member} hero={hero} />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "today", label: "Today's Quests", badge: submittedCount },
          { id: "all", label: "All Quests" },
          { id: "shop", label: "Loot Shop" },
          { id: "achievements", label: "Achievements" },
          { id: "history", label: "History" },
        ]}
      />

      <Panel>
        {tab === "today" && (
          todays.length === 0 ? (
            <Empty icon="🎉" title="All quests done for today!" hint="Amazing work, hero. Come back tomorrow for more." />
          ) : (
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {todays.map(q => <QuestCard key={q.id} quest={q} onSubmit={() => setSubmitting(q)} />)}
            </div>
          )
        )}

        {tab === "all" && (
          myQuests.length === 0 ? (
            <Empty icon="📜" title="No quests yet" hint="Ask a parent to add some!" />
          ) : (
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {myQuests.map(q => <QuestCard key={q.id} quest={q} onSubmit={() => setSubmitting(q)} />)}
            </div>
          )
        )}

        {tab === "shop" && (
          <ShopView shop={shop} pending={myPurchases.filter(p => p.status === "pending")} gold={hero?.gold ?? 0} />
        )}

        {tab === "achievements" && (
          <div>
            <h2 className="text-lg font-extrabold mb-3">🏆 Achievements</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {ACHIEVEMENTS.map(a => {
                const unlocked = hero?.achievements_unlocked.includes(a.id);
                return (
                  <div key={a.id} className={`card p-4 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}>
                    <div className="text-4xl mb-1">{unlocked ? a.icon : "🔒"}</div>
                    <div className="font-extrabold text-xs mb-0.5">{a.title}</div>
                    <div className="text-[11px] text-text-soft leading-tight">{a.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 className="text-lg font-extrabold mb-3">📜 History</h2>
            {history.length === 0 ? (
              <Empty icon="📜" title="Your adventure log starts here!" />
            ) : (
              <div className="flex flex-col gap-2">
                {history.map(h => (
                  <div key={h.id} className="card px-3.5 py-2.5 flex gap-2.5 items-center">
                    <div className="text-2xl">{h.icon || "✨"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{h.title}</div>
                      <div className="text-[11px] text-text-soft">{format(new Date(h.approved_at), "MMM d, h:mm a")}</div>
                    </div>
                    {h.type === "purchase" ? (
                      <span className="chip chip-gold">−{h.cost} 🪙</span>
                    ) : (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {h.xp > 0 && <span className="chip chip-xp">+{h.xp} XP</span>}
                        {h.gold > 0 && <span className="chip chip-gold">+{h.gold}</span>}
                        {h.money > 0 && <span className="chip chip-money">+{formatMoney(h.money)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <SubmitQuestDialog quest={submitting} onClose={() => setSubmitting(null)} />
      <LevelUpHost />
    </>
  );
}

function ShopView({ shop, pending, gold }: { shop: any[]; pending: any[]; gold: number }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(id: string) {
    setBusy(id);
    try { await buyShopItem(id); } catch (e) { toast((e as Error).message, "⚠️"); } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-extrabold">🛍️ Loot Shop</h2>
        <span className="rounded-full px-3.5 py-2 font-bold text-sm border" style={{ background: "linear-gradient(135deg,#fff4cc,#ffe48a)", borderColor: "#ffd968", color: "#7a5500" }}>
          🪙 {gold}
        </span>
      </div>

      {pending.length > 0 && (
        <div className="mb-5">
          <div className="font-extrabold text-text-soft text-xs uppercase tracking-wide mb-2">Waiting for parent</div>
          {pending.map(p => (
            <div key={p.id} className="rounded-2xl border p-4 mb-2 flex gap-3 items-center" style={{ background: "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: "#ffb800" }}>
              <div className="text-3xl">{p.icon}</div>
              <div className="flex-1">
                <div className="font-extrabold">{p.name}</div>
                <div className="text-xs text-text-soft">🪙 {p.cost} spent</div>
              </div>
              <span className="bg-gold text-[#5a3d00] text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full">Pending</span>
            </div>
          ))}
        </div>
      )}

      {shop.length === 0 ? (
        <Empty icon="🎁" title="No rewards yet" hint="Ask a parent to add some in Parent mode!" />
      ) : (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {shop.map(item => {
            const canAfford = gold >= item.cost;
            return (
              <div key={item.id} className="rounded-2xl border p-4 flex flex-col gap-2.5" style={{ background: "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: "#ffd968", boxShadow: "0 2px 8px rgba(124,77,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="font-extrabold">{item.name}</div>
                    {item.description && <div className="text-xs text-text-soft">{item.description}</div>}
                  </div>
                </div>
                <span className="bg-gold text-[#5a3d00] font-extrabold px-3 py-1 rounded-full self-start text-sm">🪙 {item.cost}</span>
                <button
                  className={`btn ${canAfford ? "btn-primary" : "btn-ghost"} btn-block`}
                  disabled={!canAfford || busy === item.id}
                  onClick={() => buy(item.id)}
                >
                  {canAfford ? (busy === item.id ? "Requesting…" : "🎁 Get this reward") : `Need ${item.cost - gold} more 🪙`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
