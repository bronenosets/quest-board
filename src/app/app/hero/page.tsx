"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Quest, Section } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "@/components/ui/toast";

export default function HeroPage() {
  const router = useRouter();
  const { data, isLoading, error } = useHouseholdData();
  const [tab, setTab] = useState("today");
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<Quest | null>(null);
  const [lastLevel, setLastLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.hero) return;
    if (lastLevel !== null && data.hero.level > lastLevel) {
      showLevelUp(data.hero.level);
    }
    setLastLevel(data.hero.level);
  }, [data?.hero?.level, lastLevel]);

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
    router.push("/app/parent");
    return null;
  }

  const { household, member, hero, sections, quests, shop, purchases, history } = data;
  const myQuests = quests.filter(q => q.hero_member_id === member.id || q.hero_member_id === null);
  const submittedCount = myQuests.filter(q => q.status === "submitted").length;
  const myPurchases = purchases.filter(p => p.hero_member_id === member.id);

  const todays = myQuests.filter(q => {
    if (q.status === "submitted") return true;
    if (q.recurring) return isQuestAvailableToday(q);
    if (q.status === "approved") return false;
    return true;
  });

  const filteredTodays = sectionFilter
    ? todays.filter(q => q.section_id === sectionFilter)
    : todays;

  return (
    <>
      <Topbar household={household} member={member} hero={hero} />

      <TabBar
        active={tab}
        onChange={(t) => { setTab(t); setSectionFilter(null); }}
        tabs={[
          { id: "today", label: "Today", badge: submittedCount },
          { id: "all", label: "All Quests" },
          { id: "shop", label: "Loot Shop" },
          { id: "wallet", label: "Wallet" },
          { id: "achievements", label: "Achievements" },
          { id: "history", label: "History" },
        ]}
      />

      <Panel>
        {tab === "today" && (
          <>
            <SectionTiles
              sections={sections}
              quests={todays}
              activeId={sectionFilter}
              onChange={setSectionFilter}
            />
            {filteredTodays.length === 0 ? (
              <Empty
                icon="🎉"
                title={sectionFilter ? "Nothing in this section" : "All quests done for today!"}
                hint={sectionFilter ? "Try another section." : "Amazing work, hero. Come back tomorrow for more."}
              />
            ) : (
              <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTodays.map(q => <QuestCard key={q.id} quest={q} sections={sections} onSubmit={() => setSubmitting(q)} />)}
              </div>
            )}
          </>
        )}

        {tab === "all" && (
          myQuests.length === 0 ? (
            <Empty icon="📜" title="No quests yet" hint="Ask a parent to add some!" />
          ) : (
            <AllQuestsBySection
              sections={sections}
              quests={myQuests}
              onSubmit={setSubmitting}
            />
          )
        )}

        {tab === "shop" && (
          <ShopView shop={shop} pending={myPurchases.filter(p => p.status === "pending")} gold={hero?.gold ?? 0} />
        )}

        {tab === "wallet" && (
          <WalletView hero={hero} purchases={myPurchases} history={history.filter(h => h.hero_member_id === member.id)} />
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
                      h.money > 0
                        ? <span className="chip chip-money">+{formatMoney(h.money)}</span>
                        : <span className="chip chip-gold">−{h.cost} 🪙</span>
                    ) : h.type === "penalty" ? (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {h.xp < 0 && <span className="chip" style={{background:"#ffe8e8",color:"#a91d1d",borderColor:"#ffb1b1"}}>{h.xp} XP</span>}
                        {h.gold < 0 && <span className="chip" style={{background:"#ffe8e8",color:"#a91d1d",borderColor:"#ffb1b1"}}>{h.gold}</span>}
                      </div>
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

      <SubmitQuestDialog quest={submitting} householdId={household.id} onClose={() => setSubmitting(null)} />
      <LevelUpHost />
    </>
  );
}

function SectionTiles({ sections, quests, activeId, onChange }: { sections: Section[]; quests: Quest[]; activeId: string | null; onChange: (id: string | null) => void }) {
  if (sections.length === 0) return null;

  const counts = useMemo(() => {
    const m: Record<string, number> = { __none__: 0 };
    sections.forEach(s => (m[s.id] = 0));
    quests.forEach(q => {
      if (q.status === "submitted") return;
      const k = q.section_id || "__none__";
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [sections, quests]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-4">
      <button
        onClick={() => onChange(null)}
        className={`card p-3 text-left transition-all ${activeId === null ? "ring-2 ring-primary" : ""}`}
      >
        <div className="text-2xl">📋</div>
        <div className="font-extrabold text-sm">All</div>
        <div className="text-xs text-text-soft">{quests.length} task{quests.length === 1 ? "" : "s"}</div>
      </button>
      {sections.map(s => {
        const count = counts[s.id] || 0;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`card p-3 text-left transition-all ${activeId === s.id ? "ring-2 ring-primary" : ""}`}
          >
            <div className="text-2xl">{s.icon}</div>
            <div className="font-extrabold text-sm">{s.name}</div>
            <div className="text-xs text-text-soft">{count} task{count === 1 ? "" : "s"}</div>
          </button>
        );
      })}
    </div>
  );
}

function AllQuestsBySection({ sections, quests, onSubmit }: { sections: Section[]; quests: Quest[]; onSubmit: (q: Quest) => void }) {
  const grouped: { name: string; icon: string; quests: Quest[] }[] = [];
  sections.forEach(s => {
    const qs = quests.filter(q => q.section_id === s.id);
    if (qs.length > 0) grouped.push({ name: s.name, icon: s.icon, quests: qs });
  });
  const unassigned = quests.filter(q => !q.section_id);
  if (unassigned.length > 0) grouped.push({ name: "Other", icon: "📋", quests: unassigned });

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(g => (
        <div key={g.name}>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-text-soft mb-2.5">{g.icon} {g.name}</h3>
          <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {g.quests.map(q => <QuestCard key={q.id} quest={q} sections={sections} onSubmit={() => onSubmit(q)} />)}
          </div>
        </div>
      ))}
    </div>
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
                <div className="text-xs text-text-soft">🪙 {p.cost} {p.money_value > 0 ? `→ +${formatMoney(p.money_value)}` : "spent"}</div>
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
            const isCashOut = (item.money_value || 0) > 0;
            return (
              <div key={item.id} className="rounded-2xl border p-4 flex flex-col gap-2.5" style={{ background: isCashOut ? "linear-gradient(135deg, #fff 0%, #d8f7e5 100%)" : "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: isCashOut ? "#7cd9a4" : "#ffd968", boxShadow: "0 2px 8px rgba(124,77,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="font-extrabold">{item.name}</div>
                    {item.description && <div className="text-xs text-text-soft">{item.description}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-gold text-[#5a3d00] font-extrabold px-3 py-1 rounded-full text-sm">🪙 {item.cost}</span>
                  {isCashOut && <span className="chip chip-money">→ {formatMoney(item.money_value)}</span>}
                </div>
                <button
                  className={`btn ${canAfford ? "btn-primary" : "btn-ghost"} btn-block`}
                  disabled={!canAfford || busy === item.id}
                  onClick={() => buy(item.id)}
                >
                  {canAfford ? (busy === item.id ? "Requesting…" : isCashOut ? "💵 Cash out" : "🎁 Get this reward") : `Need ${item.cost - gold} more 🪙`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WalletView({ hero, purchases, history }: { hero: any; purchases: any[]; history: any[] }) {
  if (!hero) return <Empty icon="💰" title="No wallet yet" hint="Complete a quest to earn rewards." />;

  const pendingCashOuts = purchases.filter(p => p.status === "pending" && (p.money_value || 0) > 0);
  const recent = history.slice(0, 12);

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">💰 Wallet</h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg,#fff4cc,#ffe48a)", borderColor: "#ffd968" }}>
          <div className="text-3xl">🪙</div>
          <div className="text-2xl font-extrabold" style={{ color: "#7a5500" }}>{hero.gold}</div>
          <div className="text-xs uppercase tracking-wide font-bold" style={{ color: "#7a5500" }}>Gold</div>
        </div>
        <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg,#d8f7e5,#aeefce)", borderColor: "#7cd9a4" }}>
          <div className="text-3xl">💵</div>
          <div className="text-2xl font-extrabold" style={{ color: "#155f3b" }}>{formatMoney(hero.money)}</div>
          <div className="text-xs uppercase tracking-wide font-bold" style={{ color: "#155f3b" }}>Dollars</div>
        </div>
      </div>

      {pendingCashOuts.length > 0 && (
        <>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-text-soft mb-2">Pending cash-outs</h3>
          <div className="flex flex-col gap-2 mb-5">
            {pendingCashOuts.map(p => (
              <div key={p.id} className="card px-3.5 py-2.5 flex gap-2.5 items-center">
                <div className="text-2xl">{p.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-[11px] text-text-soft">🪙 {p.cost} → {formatMoney(p.money_value)}</div>
                </div>
                <span className="chip chip-due">Pending</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="font-extrabold text-sm uppercase tracking-wide text-text-soft mb-2">Recent activity</h3>
      {recent.length === 0 ? (
        <div className="text-text-soft text-sm py-4 text-center">No activity yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map(h => (
            <div key={h.id} className="card px-3.5 py-2.5 flex gap-2.5 items-center">
              <div className="text-2xl">{h.icon || "✨"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{h.title}</div>
                <div className="text-[11px] text-text-soft">{format(new Date(h.approved_at), "MMM d, h:mm a")}</div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {h.type === "penalty" ? (
                  <>
                    {h.xp < 0 && <span className="chip" style={{background:"#ffe8e8",color:"#a91d1d",borderColor:"#ffb1b1"}}>{h.xp} XP</span>}
                    {h.gold < 0 && <span className="chip" style={{background:"#ffe8e8",color:"#a91d1d",borderColor:"#ffb1b1"}}>{h.gold}</span>}
                  </>
                ) : h.type === "purchase" ? (
                  h.money > 0
                    ? <span className="chip chip-money">+{formatMoney(h.money)}</span>
                    : <span className="chip chip-gold">−{h.cost} 🪙</span>
                ) : (
                  <>
                    {h.gold > 0 && <span className="chip chip-gold">+{h.gold}</span>}
                    {h.money > 0 && <span className="chip chip-money">+{formatMoney(h.money)}</span>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
