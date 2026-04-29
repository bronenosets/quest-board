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
import { SectionFormDialog } from "@/components/section-form-dialog";
import { ApproveQuestDialog } from "@/components/approve-quest-dialog";
import { ProofImage } from "@/components/proof-image";
import { NotificationToggle } from "@/components/notification-toggle";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatMoney } from "@/lib/utils";
import { approvePurchase, rejectPurchase, deleteQuest, deleteShopItem, deleteSection, markQuestMissed, approveExtension, rejectExtension } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import type { Quest, ShopItem, Section } from "@/lib/types";

export default function ParentPage() {
  const router = useRouter();
  const { data, isLoading, error } = useHouseholdData();
  const [tab, setTab] = useState("approvals");

  const [questDialogOpen, setQuestDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopItem | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
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

  const { household, member, hero, sections, quests, shop, purchases, history, members, extensions } = data;
  const heroes = members.filter(m => m.role === "hero");
  const submitted = quests.filter(q => q.status === "submitted");
  const pendingPurchases = purchases.filter(p => p.status === "pending");
  const pendingExtensions = extensions.filter(e => e.status === "pending");
  const totalPending = submitted.length + pendingPurchases.length + pendingExtensions.length;
  const overdueWithPenalty = quests.filter(q =>
    q.due_at && new Date(q.due_at).getTime() < Date.now()
    && !q.penalty_applied
    && (q.penalty_xp > 0 || q.penalty_gold > 0)
    && q.status !== "approved"
  );

  return (
    <>
      <Topbar household={household} member={member} hero={hero} />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "approvals", label: "Approvals", badge: totalPending + overdueWithPenalty.length },
          { id: "quests", label: "Manage Quests" },
          { id: "shop", label: "Manage Shop" },
          { id: "sections", label: "Sections" },
          { id: "stats", label: "Stats" },
          { id: "settings", label: "Settings" },
        ]}
      />

      <Panel>
        {tab === "approvals" && (
          <ApprovalsView
            submitted={submitted}
            pending={pendingPurchases}
            extensions={pendingExtensions}
            quests={quests}
            overdueWithPenalty={overdueWithPenalty}
            onApproveQuest={setApproving}
            heroes={heroes}
          />
        )}
        {tab === "quests" && (
          <ManageQuestsView
            quests={quests}
            sections={sections}
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
        {tab === "sections" && (
          <ManageSectionsView
            sections={sections}
            quests={quests}
            onAdd={() => { setEditingSection(null); setSectionDialogOpen(true); }}
            onEdit={(s) => { setEditingSection(s); setSectionDialogOpen(true); }}
          />
        )}
        {tab === "stats" && <StatsView hero={hero} history={history} />}
        {tab === "settings" && <SettingsView household={household} member={member} />}
      </Panel>

      <QuestFormDialog
        open={questDialogOpen}
        onClose={() => setQuestDialogOpen(false)}
        existing={editingQuest}
        householdId={household.id}
        heroes={heroes}
        sections={sections}
      />
      <ShopFormDialog
        open={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
        existing={editingShop}
        householdId={household.id}
      />
      <SectionFormDialog
        open={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        existing={editingSection}
        householdId={household.id}
      />
      <ApproveQuestDialog quest={approving} onClose={() => setApproving(null)} />
    </>
  );
}

function ApprovalsView({ submitted, pending, extensions, quests, overdueWithPenalty, onApproveQuest, heroes }: {
  submitted: Quest[];
  pending: any[];
  extensions: any[];
  quests: Quest[];
  overdueWithPenalty: Quest[];
  onApproveQuest: (q: Quest) => void;
  heroes: any[];
}) {
  if (submitted.length === 0 && pending.length === 0 && overdueWithPenalty.length === 0 && extensions.length === 0) {
    return <Empty icon="✅" title="Nothing waiting" hint="Inbox zero!" />;
  }

  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]));
  const questById = Object.fromEntries(quests.map(q => [q.id, q]));

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
                    +{q.xp} XP, +{q.gold} 🪙
                  </div>
                  {q.proof_note && (
                    <div className="bg-white rounded-lg px-2.5 py-2 text-sm border border-border mb-2">{q.proof_note}</div>
                  )}
                  {q.proof_url && (
                    <ProofImage path={q.proof_url} className="max-h-64 w-full mb-2" />
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

      {overdueWithPenalty.length > 0 && (
        <>
          <div className="font-extrabold text-text-soft text-xs uppercase tracking-wide mt-5 mb-2.5">Overdue (penalty available)</div>
          {overdueWithPenalty.map(q => {
            const h = q.hero_member_id ? heroById[q.hero_member_id] : null;
            return (
              <div key={q.id} className="rounded-2xl border p-4 mb-3 flex gap-3.5 items-start" style={{ background: "linear-gradient(135deg, #fff5f5, #ffe8eb)", borderColor: "#ff5a7a" }}>
                <div className="text-4xl flex-shrink-0">{q.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold">{q.title}</div>
                  {h && <div className="text-xs text-text-soft mb-0.5">For {h.avatar} {h.display_name}</div>}
                  <div className="text-xs text-red font-bold mb-2">
                    Penalty: {q.penalty_xp ? `−${q.penalty_xp} XP ` : ""}{q.penalty_gold ? `−${q.penalty_gold} 🪙 ` : ""}+ streak reset
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-danger btn-sm" onClick={async () => {
                      if (confirm(`Apply penalty for missing "${q.title}"?`)) {
                        try { await markQuestMissed(q.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                      }
                    }}>⚠️ Apply penalty</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {extensions.length > 0 && (
        <>
          <div className="font-extrabold text-text-soft text-xs uppercase tracking-wide mt-5 mb-2.5">⏰ Time Extension Requests</div>
          {extensions.map(r => {
            const q = questById[r.quest_id];
            const h = heroById[r.hero_member_id];
            const minutes = r.extend_minutes;
            const label = minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60 * 10) / 10} hrs`;
            return (
              <div key={r.id} className="rounded-2xl border p-4 mb-3 flex gap-3.5 items-start" style={{ background: "linear-gradient(135deg, #fff 0%, #e3f2ff 100%)", borderColor: "#4dafff" }}>
                <div className="text-4xl flex-shrink-0">{q?.icon || "⏰"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold">{q?.title || "(quest)"}</div>
                  {h && <div className="text-xs text-text-soft mb-0.5">From {h.avatar} {h.display_name}</div>}
                  <div className="text-xs text-text-soft mb-1">Wants +{label}{q?.due_at ? ` (currently due ${new Date(q.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })})` : ""}</div>
                  {r.reason && <div className="bg-white rounded-lg px-2.5 py-2 text-sm border border-border mb-2">"{r.reason}"</div>}
                  <div className="flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={async () => {
                      try { await approveExtension(r.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                    }}>✓ Grant</button>
                    <button className="btn btn-danger btn-sm" onClick={async () => {
                      try { await rejectExtension(r.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                    }}>↩ Decline</button>
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
            const isCashOut = (p.money_value || 0) > 0;
            return (
              <div key={p.id} className="rounded-2xl border p-4 mb-3 flex gap-3.5 items-start" style={{ background: isCashOut ? "linear-gradient(135deg, #fff 0%, #d8f7e5 100%)" : "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: isCashOut ? "#7cd9a4" : "#ffb800" }}>
                <div className="text-4xl">{p.icon}</div>
                <div className="flex-1">
                  <div className="font-extrabold">{p.name}</div>
                  {h && <div className="text-xs text-text-soft mb-0.5">From {h.avatar} {h.display_name}</div>}
                  <div className="text-xs text-text-soft mb-2">
                    {isCashOut ? `Cash out: 🪙 ${p.cost} → +${formatMoney(p.money_value)}` : `🪙 ${p.cost} spent`}
                  </div>
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

function ManageQuestsView({ quests, sections, onAdd, onEdit }: { quests: Quest[]; sections: Section[]; onAdd: () => void; onEdit: (q: Quest) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
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
              sections={sections}
              onEdit={() => onEdit(q)}
              onDelete={async () => {
                if (confirm(`Delete "${q.title}"?`)) {
                  try { await deleteQuest(q.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                }
              }}
              onMarkMissed={async () => {
                if (confirm(`Apply penalty for "${q.title}"?`)) {
                  try { await markQuestMissed(q.id); } catch (e) { toast((e as Error).message, "⚠️"); }
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
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-extrabold">🛍️ Manage Loot Shop</h2>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Reward</button>
      </div>
      {shop.length === 0 ? (
        <Empty icon="🎁" title="No rewards yet" hint="Add the first one!" />
      ) : (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {shop.map(s => {
            const isCashOut = (s.money_value || 0) > 0;
            return (
              <div key={s.id} className="rounded-2xl border p-4 flex flex-col gap-2.5" style={{ background: isCashOut ? "linear-gradient(135deg, #fff 0%, #d8f7e5 100%)" : "linear-gradient(135deg, #fff 0%, #fff8e8 100%)", borderColor: isCashOut ? "#7cd9a4" : "#ffd968" }}>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{s.icon}</div>
                  <div className="flex-1">
                    <div className="font-extrabold">{s.name}</div>
                    {s.description && <div className="text-xs text-text-soft">{s.description}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-gold text-[#5a3d00] font-extrabold px-3 py-1 rounded-full text-sm">🪙 {s.cost}</span>
                  {isCashOut && <span className="chip chip-money">→ {formatMoney(s.money_value)}</span>}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1" onClick={() => onEdit(s)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={async () => {
                    if (confirm(`Remove "${s.name}"?`)) {
                      try { await deleteShopItem(s.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                    }
                  }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManageSectionsView({ sections, quests, onAdd, onEdit }: { sections: Section[]; quests: Quest[]; onAdd: () => void; onEdit: (s: Section) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-extrabold">📁 Manage Sections</h2>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Section</button>
      </div>
      {sections.length === 0 ? (
        <Empty icon="📁" title="No sections yet" hint="Add School and Home to start." />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(s => {
            const count = quests.filter(q => q.section_id === s.id).length;
            return (
              <div key={s.id} className="card p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{s.icon}</div>
                  <div className="flex-1">
                    <div className="font-extrabold">{s.name}</div>
                    <div className="text-xs text-text-soft">{count} quest{count === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1" onClick={() => onEdit(s)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={async () => {
                    if (count > 0) {
                      if (!confirm(`"${s.name}" has ${count} quests. Delete the section anyway? Quests will become unassigned.`)) return;
                    } else if (!confirm(`Remove "${s.name}"?`)) return;
                    try { await deleteSection(s.id); } catch (e) { toast((e as Error).message, "⚠️"); }
                  }}>🗑</button>
                </div>
              </div>
            );
          })}
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

function SettingsView({ household, member }: { household: any; member: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!household || !member) {
    return <div className="p-6 text-text-soft text-center">Loading settings…</div>;
  }

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
        toast(`Code: ${household.invite_code}`, "📋");
      }
    } catch {
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
        <div className="flex gap-2 items-center flex-wrap">
          <code className="bg-card-soft border border-border rounded-lg px-3 py-2 text-base font-mono font-bold">{household.invite_code}</code>
          <button className="btn btn-ghost btn-sm" onClick={copyInvite}>📋 Copy</button>
        </div>
        <p className="text-xs text-text-soft mt-2">Share this with another parent or your hero so they can join the family.</p>
      </div>

      <div className="card p-5 mb-3.5">
        <div className="font-extrabold mb-2">Notifications</div>
        <NotificationToggle memberId={member.id} />
      </div>

      <div className="card p-5 mb-3.5">
        <div className="font-extrabold mb-2">Your account</div>
        <div className="text-sm text-text-soft mb-3">{member.avatar} {member.display_name} ({member.role})</div>
        <button className="btn btn-ghost" disabled={busy} onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
