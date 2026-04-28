import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppEntry() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("household_members")
    .select("id, role, household_id")
    .eq("user_id", user.id);

  if (!members || members.length === 0) {
    redirect("/onboarding");
  }

  // If user is in multiple households, prefer the most recent one for now.
  // (Multi-household switching can be added later.)
  const member = members[0];
  redirect(member.role === "parent" ? "/app/parent" : "/app/hero");
}
