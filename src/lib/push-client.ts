"use client";

import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushSupport = "supported" | "unsupported" | "ios-not-installed";

export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window)) return "unsupported";
  if (!("Notification" in window)) return "unsupported";

  // iOS Safari only allows web push from a home-screen-installed PWA.
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // navigator.standalone is true when launched from home screen on iOS.
  if (isIOS && !(navigator as any).standalone) return "ios-not-installed";

  return "supported";
}

export async function getPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function subscribePush(memberId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const support = detectPushSupport();
  if (support === "unsupported") return { ok: false, reason: "This browser doesn't support web push notifications." };
  if (support === "ios-not-installed") return { ok: false, reason: "On iPhone, install the app to your home screen first (Share → Add to Home Screen), then enable notifications from there." };

  if (Notification.permission === "denied") {
    return { ok: false, reason: "Notifications are blocked. Enable them in your browser settings." };
  }
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "Permission denied." };
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "VAPID key missing on server (admin needs to configure)." };

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not signed in." };

  // Upsert subscription
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        member_id: memberId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      } as any,
      { onConflict: "member_id,endpoint" }
    );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function unsubscribePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const supabase = createClient();
  // Delete from DB before unsubscribing locally (so we have the endpoint)
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function isSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/** Send a push notification through the API route. */
export async function notify(memberIds: string[], payload: { title: string; body?: string; url?: string; tag?: string }) {
  if (memberIds.length === 0) return;
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds, payload }),
    });
  } catch (e) {
    // Notifications are best-effort; never block the main flow
    console.warn("[push] notify failed:", e);
  }
}
