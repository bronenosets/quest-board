import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToMembers, type PushPayload } from "@/lib/push-server";

interface NotifyBody {
  memberIds: string[];
  payload: PushPayload;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: NotifyBody;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  if (!Array.isArray(body.memberIds) || !body.payload?.title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Verify caller is in the same household as every targeted member.
  const admin = createAdminClient();
  const { data: callerMember } = await admin
    .from("household_members")
    .select("id, household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!callerMember) return NextResponse.json({ error: "not in a household" }, { status: 403 });

  const { data: targetMembers } = await admin
    .from("household_members")
    .select("id, household_id")
    .in("id", body.memberIds);
  const targets = (targetMembers || []) as { id: string; household_id: string }[];
  const allInHousehold = targets.every(m => m.household_id === callerMember.household_id);
  if (!allInHousehold) return NextResponse.json({ error: "cross-household" }, { status: 403 });

  const result = await sendPushToMembers(body.memberIds, body.payload);
  return NextResponse.json(result);
}
