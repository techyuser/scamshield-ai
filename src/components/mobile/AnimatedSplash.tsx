"use client";

import { useEffect, useState } from "react";

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadingOut(true), 820);
    const t2 = setTimeout(() => onDone(), 1140);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      className={`mobile-splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#06070c] transition-all duration-300 ease-out ${
        fadingOut ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Radial obsidian glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(124,58,237,0.22) 0%, rgba(6,182,212,0.10) 32%, rgba(6,7,12,0) 65%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Expanding radar shield rings */}
        <div className="relative flex items-center justify-center w-36 h-36">
          <span className="splash-ring absolute inset-0 rounded-full border border-purple-500/35" />
          <span
            className="splash-ring absolute inset-3 rounded-full border border-cyan-400/30"
            style={{ animationDelay: "180ms" }}
          />
          <div className="splash-emblem relative w-20 h-20 rounded-[22px] shadow-2xl shadow-purple-900/60 overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
              <defs>
                <linearGradient id="splashGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="16" fill="url(#splashGrad)" />
              <path
                d="M32 14L47 20.5V31.5C47 41.2 40.6 49.4 32 52C23.4 49.4 17 41.2 17 31.5V20.5L32 14Z"
                stroke="#fff"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path d="M32 25V34M32 39.5H32.02" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <div className="splash-sweep absolute inset-x-0 h-5 bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="splash-text mt-4 text-center space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            ScamShield <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Active Threat Defense
          </p>
        </div>

        <div className="mt-6 w-36 h-1 rounded-full bg-slate-800/90 overflow-hidden">
          <div className="splash-bar h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400" />
        </div>
      </div>
    </div>
  );
}
