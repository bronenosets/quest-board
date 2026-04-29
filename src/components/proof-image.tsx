"use client";

import { useEffect, useState } from "react";
import { getProofSignedUrl } from "@/lib/storage";

export function ProofImage({ path, className }: { path: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    if (path.startsWith("http")) { setSrc(path); return; }
    getProofSignedUrl(path)
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [path]);

  if (error) return null;
  if (!src) return <div className={`bg-card-soft animate-pulse rounded-lg ${className || "h-32"}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="proof" className={`rounded-lg object-cover ${className || ""}`} />;
}
