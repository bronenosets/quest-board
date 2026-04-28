"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

let listeners: ((lvl: number) => void)[] = [];

export function showLevelUp(level: number) {
  listeners.forEach(l => l(level));
}

export function LevelUpHost() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const sub = (lvl: number) => setLevel(lvl);
    listeners.push(sub);
    return () => { listeners = listeners.filter(l => l !== sub); };
  }, []);

  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2200] bg-text/65 backdrop-blur-md flex items-center justify-center"
          onClick={() => setLevel(null)}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="bg-gradient-to-br from-white to-[#f0e8ff] rounded-[28px] p-10 text-center shadow-lg border-2 border-primary"
          >
            <div className="text-7xl leading-none mb-2">🎉</div>
            <h1 className="text-4xl font-extrabold mb-2 heading-gradient">LEVEL UP!</h1>
            <div className="text-text-soft mb-4 text-lg">You reached level {level}</div>
            <button className="btn btn-primary" onClick={() => setLevel(null)}>Awesome!</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
