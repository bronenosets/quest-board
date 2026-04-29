"use client";

import { useEffect, useState } from "react";
import { detectPushSupport, isSubscribed, subscribePush, unsubscribePush } from "@/lib/push-client";
import { toast } from "@/components/ui/toast";

export function NotificationToggle({ memberId }: { memberId: string }) {
  const [support, setSupport] = useState<"supported" | "unsupported" | "ios-not-installed" | "loading">("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupport(detectPushSupport());
    isSubscribed().then(setSubscribed);
  }, []);

  async function enable() {
    setBusy(true);
    const res = await subscribePush(memberId);
    setBusy(false);
    if (res.ok) {
      setSubscribed(true);
      toast("Notifications enabled!", "🔔");
    } else {
      toast(res.reason, "⚠️");
    }
  }

  async function disable() {
    setBusy(true);
    await unsubscribePush();
    setBusy(false);
    setSubscribed(false);
    toast("Notifications disabled", "🔕");
  }

  if (support === "loading") return null;
  if (support === "unsupported") {
    return (
      <div className="text-sm text-text-soft">
        🔕 Your browser doesn't support push notifications.
      </div>
    );
  }
  if (support === "ios-not-installed") {
    return (
      <div className="text-sm text-text-soft">
        On iPhone, push notifications only work after adding the app to your home screen.
        Tap Share (📤) → "Add to Home Screen", then open the app from the home-screen icon
        and come back here to enable.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm">
        {subscribed
          ? "🔔 Notifications are on for this device."
          : "🔕 Notifications are off."}
      </div>
      {subscribed ? (
        <button className="btn btn-ghost" disabled={busy} onClick={disable}>
          Turn off notifications
        </button>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={enable}>
          🔔 Enable notifications
        </button>
      )}
      <p className="text-xs text-text-soft">
        Each device needs to be enabled separately. You can turn off any time.
      </p>
    </div>
  );
}
