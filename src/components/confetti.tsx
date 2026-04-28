"use client";

import { useEffect, useState } from "react";

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; bg: string; delay: number; rot: number; round: boolean }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const colors = ["#7c4dff","#ff6b9d","#ffb800","#20c997","#4dafff","#b14dff"];
    const next = Array.from({ length: 60 }, (_, i) => ({
      id: trigger * 100 + i,
      left: Math.random() * 100,
      bg: colors[i % colors.length],
      delay: Math.random() * 0.4,
      rot: Math.random() * 360,
      round: Math.random() > 0.5,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (pieces.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1500]">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left + "%",
            background: p.bg,
            animationDelay: p.delay + "s",
            transform: `rotate(${p.rot}deg)`,
            borderRadius: p.round ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

let confettiTrigger = 0;
const confettiListeners: ((n: number) => void)[] = [];

export function fireConfetti() {
  confettiTrigger++;
  confettiListeners.forEach(l => l(confettiTrigger));
}

export function ConfettiHost() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sub = (x: number) => setN(x);
    confettiListeners.push(sub);
    return () => { const idx = confettiListeners.indexOf(sub); if (idx >= 0) confettiListeners.splice(idx, 1); };
  }, []);
  return <Confetti trigger={n} />;
}
