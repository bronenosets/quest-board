"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useHouseholdData } from "@/hooks/use-household-data";
import { Topbar } from "@/components/topbar";
import { TabBar, Panel } from "@/components/tabs";
import { QuestCard } from "@/components/quest-card";
import { Empty } from "@/components/empty";
import { QuestFormDialog } from "@/components/quest-form-dialog";
import { ShopFormDialog } from "@/components/shop-form-dialog";
import { ApproveQuestDialog } from "@/components/approve-quest-dialog";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatMoney } from "@/lib/utils";
import { approvePurchase, rejectPurchase, deleteQuest, deleteShopItem } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import type { Quest, ShopItem } from "@/lib/types";

export default function ParentPage() {
  const router = useRouter();
  const { data, isLoading, error } = useHouseholdData();
  const [tab, setTab] = useState("approvals");

  const [questDialogOpen, setQuestDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopItem | null>(null);
  const [approving, setApproving] = useState<Quest | null>(null);

  if (isLoading) return <div className="p-10 text-center text-text-soft">Loading…</div>;
  if (error) {
    const msg = (error as Error).message;
    if (msg === "no household") { router.push("/onboarding"); return null; }
    return <div className="p-10 text-center text-red">Error: {msg}</div>;
  }
  if (!data) return null;

  if (data.member.role !== "parent") {
    router.push("/app/hero");
    return null;
  }

  const { household, member, hero, quests, shop, purchases, history, members } = data;
  const heroes = members.filter(m => m.role === "hero");
  const submitted = quests.filter(q => q.status === "submitted");
  const pendingPurchases = purchases.filter(p => p.status === "pending");
  const totalPending = submitted.length + pendingPurchases.length;

  return (
    <>
      <Topbar household={household} member={member} hero={hero} />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "approvals", label: "Approvals", badge: totalPending },
          { id: "quests", label: "Manage Quests" },
          { id: "shop", label: "Manage Shop" },
          { id: "stats", label: "Stats" },
          { id: "settings", label: "Settings" },
        ]}
      />

      <Panel>
        {tab === "approvals" && (
          <ApprovalsView
            submitted={submitted}
            pending={pendingPurchases}
            onApproveQuest={setApproving}
            heroes={heroes}
          />
        )}
        {tab === "quests" && (
          <ManageQuestsView
            quests={quests}
            onAdd={() => { setEditingQuest(null); setQuestDialogOpen(true); }}
            onEdit={(q) => { setEditingQuest(q); setQuestDialogOpen(true); }}
          />
        )}
        {tab === "shop" && (
          <ManageShopView
            shop={shop}
            onAdd={() => { setEditingShop(null); setShopDialogOpen(true); }}
            onEdit={(s) => { setEditingShop(s); setShopDialogOpen(true); }}
          />
        )}
        {tab === "stats" && <StatsView hero={hero} history={history} />}
        {tab === "settings" && <SettingsView />}
      </Panel>

      <QuestFormDialog
        open={questDialogOpen}
        onClose={() => setQuestDialogOpen(false)}
        existing={editingQuest}
        householdId={household.id}
        heroes={heroes}
      />
      <ShopFormDialog
        open={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
        existing={editingShop}
        householdId={household.id}
      />
      <ApproveQuestDialog quest={approving} onClose={() => setApproving(null)} />
    </>
  );
}

function ApprovalsView({ submitted, pending, onApproveQuest, heroes }: {
  submitted: Quest[];
  pending: any[];
  onApproveQuest: (q: Quest) => void;
  heroes: any[];
}) {
  if (submitted.length === 0 && pending.length === 0) {
    return <Empty icon="✅" title="Nothing waiting" hint="Inbox zero!" />;
  }

  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]));

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">📨 Pending Approvals</h2>

      {submitted.length > 0 && (
        <>
          <div className="font-extrabold text-text-soft text-xs uppercase tracking-wide mt-2 mb-2.5">Quests</div>
          {submitted.map(q => {
            const h = q.hero_member_id ? heroById[q.hero_member_id] : null;
            return (
              <div key={q.id} className="rounded-2xl border p-4 mb-3 flex gap-3.5 items-start" style={{ background: "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: "#ffb800" }}>
                <div className="text-4xl flex-shrink-0">{q.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold">{q.title}</div>
                  {h && <div className="text-xs text-text-soft mb-0.5">From {h.avatar} {h.display_name}</div>}
                  <div className="text-xs text-text-soft mb-1.5">
                    +{q.xp} XP, +{q.gold} 🪙{q.money > 0 ? `, +${formatMoney(q.money)}` : ""}
                  </div>
                  {q.proof_note && (
                    <div className="bg-white rounded-lg px-2.5 py-2 text-sm border border-border mb-2">{q.proof_note}</div>
                  )}
                  <div className="flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={() => onApproveQuest(q)}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onApproveQuest(q)}>↩ Send back</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {pending.length > 0 && (
        <>
          <div className="font-extrabold text-text-soft text-xs uppercase tracking-wide mt-5 mb-2.5">Loot Shop Purchases</div>
          {pending.map(p => {
            const h = heroById[p.hero_member_id];
            return (
              <div key={p.id} className="rounded-2xl border p-4 mb-3 flex gap-3.5 items-start" style={{ background: "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: "#ffb800" }}>
                <div className="text-4xl">{p.icon}</div>
                <div className="flex-1">
                  <div className="font-extrabold">{p.name}</div>
                  {h && <div className="text-xs text-text-soft mb-0.5">From {h.avatar} {h.display_name}</div>}
                  <div className="text-xs text-text-soft mb-2">🪙 {p.cost} spent</div>
                  <div className="flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={async () => {
                      try { await approvePurchase(p.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                    }}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={async () => {
                      try { await rejectPurchase(p.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                    }}>↩ Decline & refund</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ManageQuestsView({ quests, onAdd, onEdit }: { quests: Quest[]; onAdd: () => void; onEdit: (q: Quest) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-extrabold">📜 Manage Quests</h2>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Quest</button>
      </div>
      {quests.length === 0 ? (
        <Empty icon="📝" title="No quests yet" hint="Add the first one!" />
      ) : (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map(q => (
            <QuestCard
              key={q.id}
              quest={q}
              parentMode
              onEdit={() => onEdit(q)}
              onDelete={async () => {
                if (confirm(`Delete "${q.title}"?`)) {
                  try { await deleteQuest(q.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ManageShopView({ shop, onAdd, onEdit }: { shop: ShopItem[]; onAdd: () => void; onEdit: (s: ShopItem) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-extrabold">🛍️ Manage Loot Shop</h2>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Reward</button>
      </div>
      {shop.length === 0 ? (
        <Empty icon="🎁" title="No rewards yet" hint="Add the first one!" />
      ) : (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {shop.map(s => (
            <div key={s.id} className="rounded-2xl border p-4 flex flex-col gap-2.5" style={{ background: "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: "#ffd968" }}>
              <div className="flex items-center gap-3">
                <div className="text-4xl">{s.icon}</div>
                <div className="flex-1">
                  <div className="font-extrabold">{s.name}</div>
                  {s.description && <div className="text-xs text-text-soft">{s.description}</div>}
                </div>
              </div>
              <span className="bg-gold text-[#5a3d00] font-extrabold px-3 py-1 rounded-full self-start text-sm">🪙 {s.cost}</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm flex-1" onClick={() => onEdit(s)}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => {
                  if (confirm(`Remove "${s.name}"?`)) {
                    try { await deleteShopItem(s.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                  }
                }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsView({ hero, history }: { hero: any; history: any[] }) {
  const last7 = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    history.forEach(h => {
      if (h.type !== "quest") return;
      const ds = new Date(h.approved_at).toISOString().slice(0, 10);
      if (ds in map) map[ds]++;
    });
    return map;
  }, [history]);
  const max = Math.max(1, ...Object.values(last7));

  if (!hero) return <Empty icon="📊" title="No hero data yet" hint="The hero hasn't started any quests yet." />;

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">📊 Stats</h2>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-4">
        <BigStat num={hero.level} label="Level" />
        <BigStat num={hero.total_completed} label="Quests Done" />
        <BigStat num={hero.streak} label="Current Streak" />
        <BigStat num={hero.best_streak} label="Best Streak" />
        <BigStat num={`${hero.gold} 🪙`} label="Gold" />
        <BigStat num={formatMoney(hero.money)} label="Money" />
        <BigStat num={`${hero.achievements_unlocked.length}/${ACHIEVEMENTS.length}`} label="Achievements" />
      </div>
      <h3 className="text-base font-extrabold mb-2">Last 7 days</h3>
      <div className="card p-4 flex gap-2 items-end h-36">
        {Object.entries(last7).map(([d, c]) => {
          const dayLabel = new Date(d).toLocaleDateString(undefined, { weekday: "short" });
          const h = (c / max) * 90;
          return (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[11px] font-bold text-text-soft">{c || ""}</div>
              <div className="w-full max-w-[36px] rounded-t-lg" style={{
                height: `${h}px`, minHeight: "4px",
                background: "linear-gradient(180deg, #7c4dff, #ff6b9d)"
              }} />
              <div className="text-[11px] text-text-soft">{dayLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BigStat({ num, label }: { num: any; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold heading-gradient">{num}</div>
      <div className="text-xs text-text-soft font-bold uppercase tracking-wide">{label}</div>
    </div>
  );
}

function SettingsView() {
  const { data } = useHouseholdData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!data || !data.household || !data.member) {
    return <div className="p-6 text-text-soft text-center">Loading settings…</div>;
  }
  const { household, member } = data;

  async function signOut() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (e) {
      toast((e as Error).message || "Sign-out failed", "⚠️");
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(household.invite_code);
        toast("Invite code copied!", "📋");
      } else {
        // Fallback for browsers without clipboard API (or insecure contexts)
        toast(`Code: ${household.invite_code}`, "📋");
      }
    } catch (e) {
      toast(`Code: ${household.invite_code}`, "📋");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">⚙️ Settings</h2>

      <div className="card p-5 mb-3.5">
        <div className="font-extrabold mb-2">Family</div>
        <div className="text-sm text-text-soft mb-3">{household.name}</div>
        <div className="font-extrabold text-xs uppercase tracking-wide text-text-soft mb-1">Invite code</div>
        <div className="flex gap-2 items-center">
          <code className="bg-card-soft border border-border rounded-lg px-3 py-2 text-base font-mono font-bold">{household.invite_code}</code>
          <button className="btn btn-ghost btn-sm" onClick={copyInvite}>📋 Copy</button>
        </div>
        <p className="text-xs text-text-soft mt-2">Share this with another parent or your hero so they can join the family.</p>
      </div>

      <div className="card p-5 mb-3.5">
        <div className="font-extrabold mb-2">Your account</div>
        <div className="text-sm text-text-soft mb-3">{member.avatar} {member.display_name} ({member.role})</div>
        <button className="btn btn-ghost" disabled={busy} onClick={signOut}>Sign out</button>
      </div>

      <div className="card p-5">
        <div className="font-extrabold mb-2">Get help</div>
        <div className="text-sm text-text-soft">Questions or trouble? Check the README that came with this app, or contact whoever set this up for your family.</div>
      </div>
    </div>
  );
}
