"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconPicker } from "@/components/icon-picker";
import { AVATARS } from "@/lib/icons";
import { toast } from "@/components/ui/toast";

type Step = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="topbar-card max-w-md w-full p-7">
        {step === "choose" && <ChooseStep onSelect={setStep} />}
        {step === "create" && <CreateStep onBack={() => setStep("choose")} onDone={() => router.push("/app")} />}
        {step === "join" && <JoinStep onBack={() => setStep("choose")} onDone={() => router.push("/app")} />}
      </div>
    </div>
  );
}

function ChooseStep({ onSelect }: { onSelect: (s: Step) => void }) {
  return (
    <>
      <div className="text-5xl mb-3 text-center">🏰</div>
      <h1 className="text-2xl font-extrabold text-center mb-2 heading-gradient">Welcome!</h1>
      <p className="text-text-soft text-center mb-6 text-sm">
        Are you setting up a new family Quest Board, or joining one someone in your family already created?
      </p>
      <div className="flex flex-col gap-3">
        <button className="btn btn-primary btn-block py-4" onClick={() => onSelect("create")}>
          🏰 Start a new family
        </button>
        <button className="btn btn-ghost btn-block py-4" onClick={() => onSelect("join")}>
          🔗 Join with invite code
        </button>
      </div>
    </>
  );
}

function CreateStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("👤");
  const [seed, setSeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!familyName.trim() || !displayName.trim()) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_household", {
      name: familyName.trim(),
      display_name: displayName.trim(),
      avatar,
    });
    if (error) { setError(error.message); setBusy(false); return; }
    const row = (data as { household_id: string; member_id: string; invite_code: string }[] | null)?.[0];
    if (!row) { setError("No household created"); setBusy(false); return; }

    if (seed) {
      await supabase.rpc("seed_starter_data", { p_household_id: row.household_id });
    }
    toast(`Created — invite code: ${row.invite_code}`, "🎉");
    onDone();
  }

  return (
    <>
      <button onClick={onBack} className="text-text-soft text-sm mb-2">← Back</button>
      <h2 className="text-xl font-extrabold mb-1">Start a new family</h2>
      <p className="text-text-soft text-sm mb-5">You'll be a parent. Invite the rest of your family next.</p>

      <label className="label">Family name</label>
      <input className="input" placeholder="The Smiths" value={familyName} onChange={e => setFamilyName(e.target.value)} />

      <label className="label">Your name</label>
      <input className="input" placeholder="Mom / Dad / your name" value={displayName} onChange={e => setDisplayName(e.target.value)} />

      <label className="label">Your avatar</label>
      <IconPicker options={AVATARS} value={avatar} onChange={setAvatar} />

      <label className="flex gap-2 items-center mb-4 cursor-pointer">
        <input type="checkbox" checked={seed} onChange={e => setSeed(e.target.checked)} />
        <span className="text-sm font-bold">Seed with starter quests &amp; rewards (recommended)</span>
      </label>

      {error && <div className="text-red text-sm mb-3">{error}</div>}

      <button className="btn btn-primary btn-block" disabled={busy || !familyName.trim() || !displayName.trim()} onClick={submit}>
        {busy ? "Creating…" : "Create family"}
      </button>
    </>
  );
}

function JoinStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"parent" | "hero">("hero");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("🦄");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || !displayName.trim()) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_household", {
      code: code.trim().toLowerCase(),
      role,
      display_name: displayName.trim(),
      avatar,
    });
    if (error) { setError(error.message); setBusy(false); return; }
    const row = (data as { household_id: string; member_id: string }[] | null)?.[0];
    if (!row) { setError("Couldn't join"); setBusy(false); return; }
    toast(`Welcome to the family!`, "🎉");
    onDone();
  }

  return (
    <>
      <button onClick={onBack} className="text-text-soft text-sm mb-2">← Back</button>
      <h2 className="text-xl font-extrabold mb-1">Join a family</h2>
      <p className="text-text-soft text-sm mb-5">Get the invite code from a parent in your family.</p>

      <label className="label">Invite code</label>
      <input className="input" placeholder="abc12345" value={code} onChange={e => setCode(e.target.value)} />

      <label className="label">Your role</label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={() => setRole("hero")}
          className={`btn ${role === "hero" ? "btn-primary" : "btn-ghost"} py-3`}>
          🦸‍♀️ Hero (kid)
        </button>
        <button type="button" onClick={() => setRole("parent")}
          className={`btn ${role === "parent" ? "btn-primary" : "btn-ghost"} py-3`}>
          👨‍👩 Parent
        </button>
      </div>

      <label className="label">Display name</label>
      <input className="input" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} />

      <label className="label">Avatar</label>
      <IconPicker options={AVATARS} value={avatar} onChange={setAvatar} />

      {error && <div className="text-red text-sm mb-3">{error}</div>}

      <button className="btn btn-primary btn-block" disabled={busy || !code.trim() || !displayName.trim()} onClick={submit}>
        {busy ? "Joining…" : "Join family"}
      </button>
    </>
  );
}
