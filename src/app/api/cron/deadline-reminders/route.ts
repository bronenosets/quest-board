import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToMembers } from "@/lib/push-server";

// Threshold definitions: (label, minutes-until-due window)
// We send a push when "now + threshold" >= due_at, but only once per (quest, threshold, due_at) tuple.
const THRESHOLDS = [
  { label: "1 day", minutes: 24 * 60 },
  { label: "4 hours", minutes: 4 * 60 },
  { label: "1 hour", minutes: 60 },
];

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>. Reject if mismatched.
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowMs = Date.now();
  const nowDate = new Date(nowMs).toISOString();

  // Find quests with a future-or-near-due due_at, not yet completed.
  const horizonMs = 25 * 60 * 60 * 1000; // 25h
  const horizonDate = new Date(nowMs + horizonMs).toISOString();

  const { data: quests, error } = await admin
    .from("quests")
    .select("id, title, icon, hero_member_id, due_at, status, penalty_applied")
    .not("due_at", "is", null)
    .gte("due_at", nowDate)
    .lte("due_at", horizonDate);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let totalSent = 0;
  for (const q of (quests || []) as any[]) {
    if (!q.hero_member_id) continue;
    if (q.status === "approved") continue;
    if (q.status === "submitted") continue; // already in parent's queue
    if (q.penalty_applied) continue;

    const dueMs = new Date(q.due_at).getTime();
    const minutesLeft = Math.floor((dueMs - nowMs) / 60000);
    if (minutesLeft <= 0) continue;

    for (const t of THRESHOLDS) {
      // Has the deadline crossed within this threshold window?
      // We send when minutesLeft <= t.minutes, but only once per (quest, threshold, due_at).
      if (minutesLeft > t.minutes) continue;

      // Dedupe via sent_reminders (composite unique key)
      const { error: insertErr } = await admin
        .from("sent_reminders")
        .insert({
          quest_id: q.id,
          threshold_minutes: t.minutes,
          due_at: q.due_at,
        } as any);
      if (insertErr) {
        // Already exists (unique violation = already sent). Move on.
        continue;
      }

      // Send the push
      await sendPushToMembers([q.hero_member_id], {
        title: `⏳ Due in ${t.label}`,
        body: `${q.icon || ""} ${q.title}`,
        url: "/app/hero",
        tag: `reminder-${q.id}-${t.minutes}`,
      });
      totalSent++;
      // Don't send multiple thresholds in the same run for the same quest
      break;
    }
  }

  return NextResponse.json({ scanned: quests?.length || 0, sent: totalSent });
}
