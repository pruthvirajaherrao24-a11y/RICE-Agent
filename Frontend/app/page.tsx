"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeroBackground from "@/components/ui/herobackground";
import BorderBeamChatInput, { RiceHeader } from "@/components/hero_input_box";
import { FileText, Globe, Sparkles } from "lucide-react";

const LOGO_PATH = "M0,0 C-20.8,-12.5 -25,-45.8 0,-75 C12.5,-50 10,-16.7 0,0 Z";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");

  // ── Logo position measurement ────────────────────────────────────────────
  const logoRef = useRef<HTMLDivElement>(null);
  const [logoTarget, setLogoTarget] = useState({ x: 0.5, y: 0.35 });

  useEffect(() => {
    function measure() {
      if (!logoRef.current) return;
      const rect = logoRef.current.getBoundingClientRect();
      setLogoTarget({
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      });
    }
    // First measure after layout paint
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const researchPresets = [
    { label: "Summarize PDF or Paper", icon: FileText },
    { label: "Deep Academic Search", icon: Globe },
    { label: "Synthesize Market Trends", icon: Sparkles },
  ];

  const handleSend = (message: string) => {
    if (message.trim()) {
      router.push(`/workspace?prompt=${encodeURIComponent(message.trim())}`);
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden text-white select-none">

      {/* ── Particle canvas — target follows the real logo position ── */}
      <HeroBackground
        targetXRatio={logoTarget.x}
        targetYRatio={logoTarget.y}
      />

      {/* ── Top scrim ── */}
      <div className="absolute top-0 inset-x-0 h-40 z-10 pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent" />

      {/* ── Top nav bar ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-5">
        {/* Left: RICE wordmark */}
        <Link href="/" className="text-sm font-semibold tracking-widest text-white/80 uppercase hover:text-white transition-colors">
          RICE
        </Link>

        {/* Right: Try RICE pill */}
        <Link
          href="/workspace"
          className="inline-flex items-center px-5 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-wide hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_16px_rgba(255,255,255,0.25)] cursor-pointer"
        >
          Try RICE
        </Link>
      </div>

      {/* ── Foreground content, vertically centered ── */}
      <div className="relative z-20 flex items-center justify-center h-full w-full px-4 sm:px-6">
        <div className="flex flex-col items-center w-full max-w-4xl text-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">

          {/* ── Spinning RICE logo ── */}
          <div
            ref={logoRef}
            className="w-[220px] h-[220px] shrink-0 cursor-pointer"
            onClick={() => router.push("/workspace")}
            title="Open RICE Workspace"
            style={{
              animation: "rice-spin 22s linear infinite",
              filter:
                "drop-shadow(0 0 16px rgba(255,255,255,0.55)) drop-shadow(0 0 36px rgba(255,255,255,0.22))",
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <g transform="translate(100,100)">
                <path d={LOGO_PATH} fill="#ffffff" />
                <path d={LOGO_PATH} fill="#ffffff" transform="rotate(120)" />
                <path d={LOGO_PATH} fill="#ffffff" transform="rotate(240)" />
              </g>
            </svg>
          </div>

          {/* ── Tagline ── */}
          <RiceHeader />

          {/* ── Input box ── */}
          <div className="w-full">
            <BorderBeamChatInput onSend={handleSend} value={value} setValue={setValue} />
          </div>

          {/* ── Quick suggestion chips ── */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            {researchPresets.map((preset, idx) => {
              const Icon = preset.icon;
              return (
                <button
                  key={idx}
                  onClick={() => router.push(`/workspace?prompt=${encodeURIComponent(preset.label)}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1c1e] text-xs text-[#c4c7cc] hover:text-[#e2e2e6] shadow-[-3px_-3px_8px_rgba(255,255,255,0.05),3px_3px_10px_rgba(0,0,0,0.5)] active:shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.05),inset_3px_3px_10px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-[#ffffffdc]" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes rice-spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>

    </main>
  );
}

