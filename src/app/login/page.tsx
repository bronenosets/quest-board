"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  async function send() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="topbar-card max-w-md w-full p-8 text-center">
      <div className="text-5xl mb-3">⚔️</div>
      <h1 className="text-3xl font-extrabold mb-2 heading-gradient">Quest Board</h1>
      <p className="text-text-soft mb-6 text-sm">Sign in to your family's adventure.</p>

      {sent ? (
        <div className="bg-card-soft p-5 rounded-xl">
          <div className="text-2xl mb-2">📬</div>
          <div className="font-bold mb-1">Check your email</div>
          <div className="text-sm text-text-soft">
            We sent a magic link to <span className="font-bold text-text">{email}</span>. Tap it to sign in.
          </div>
        </div>
      ) : (
        <>
          <input
            type="email"
            className="input mb-3"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && email) send(); }}
            autoFocus
          />
          {error && <div className="text-red text-sm mb-3">{error}</div>}
          <button
            className="btn btn-primary btn-block"
            onClick={send}
            disabled={!email || loading}
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
          <p className="text-xs text-text-soft mt-4">
            No password needed. We'll email you a sign-in link.
          </p>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <Suspense fallback={<div className="text-text-soft">Loading…</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
