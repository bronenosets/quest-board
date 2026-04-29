// Server-only push helpers. Imported by /api/notify and /api/cron/*.
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/** Send a push to every subscription belonging to the given member IDs. */
export async function sendPushToMembers(memberIds: string[], payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    console.warn("[push] VAPID keys missing; skipping send");
    return { sent: 0, failed: 0 };
  }
  if (memberIds.length === 0) return { sent: 0, failed: 0 };
  configure();

  const supabase = createAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("member_id", memberIds);
  if (error) {
    console.error("[push] subscription fetch failed:", error);
    return { sent: 0, failed: 0 };
  }
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all((subs as any[]).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      );
      sent++;
    } catch (e: any) {
      failed++;
      // 404 / 410 = subscription gone. Drop it.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("[push] send failed:", e?.statusCode, e?.body || e?.message);
      }
    }
  }));
  return { sent, failed };
}

/** Helper: members in a household with the given role. */
export async function membersByRole(householdId: string, role: "parent" | "hero"): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("role", role);
  return (data || []).map((m: any) => m.id);
}
