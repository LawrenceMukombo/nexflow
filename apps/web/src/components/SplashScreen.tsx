import React, { useEffect, useRef, useState } from "react";

// --- Version & Build Metadata -------------------------------------------------
const APP_META = {
  name: "NexFlow",
  subtitle: "Enterprise Engineering Design Platform",
  version: "2.0.0",
  build: "20261002",
  author: "Lawrence Mukombo",
  company: "NexFlow Technologies",
  year: "2026",
  stack: "React · TypeScript · Vite · Zustand",
  milestones: [
    "Multi-domain Engineering Canvas",
    "Live Simulation & Packet Animation",
    "Component Library & Wizard Builder",
    "Domain Isolation & Smart Filtering",
  ],
};

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  r: 1 + Math.random() * 3,
  delay: Math.random() * 3,
  duration: 3 + Math.random() * 4,
}));

const STAGES = [
  { label: "Initialising core engine…", pct: 15 },
  { label: "Loading component libraries…", pct: 35 },
  { label: "Bootstrapping simulation runtime…", pct: 55 },
  { label: "Preparing canvas renderer…", pct: 72 },
  { label: "Applying domain configurations…", pct: 88 },
  { label: "Ready.", pct: 100 },
];

interface SplashScreenProps {
  onDone: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone, duration = 4200 }) => {
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGES[0].label);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100);
    const t2 = setTimeout(() => setTextVisible(true), 500);
    const t3 = setTimeout(() => setDetailsVisible(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / (duration - 700)) * 100, 100);
      setProgress(pct);
      const stage = STAGES.find((s) => pct <= s.pct) ?? STAGES[STAGES.length - 1];
      setStageLabel(stage.label);
      if (pct < 100) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [duration]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 700);
    }, duration - 700);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  const dismiss = () => { setFadeOut(true); setTimeout(onDone, 700); };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 50% 40%, #0d1f3c 0%, #060e1e 55%, #020609 100%)",
      opacity: fadeOut ? 0 : 1, transition: "opacity 0.7s ease", overflow: "hidden", userSelect: "none",
    }}>
      {/* Background circuit layer */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <line x1="0" y1="30" x2="100" y2="30" stroke="#0ea5e9" strokeWidth="0.08" />
        <line x1="0" y1="70" x2="100" y2="70" stroke="#06b6d4" strokeWidth="0.08" />
        <line x1="20" y1="0" x2="20" y2="100" stroke="#0ea5e9" strokeWidth="0.08" />
        <line x1="80" y1="0" x2="80" y2="100" stroke="#06b6d4" strokeWidth="0.08" />
        <line x1="0" y1="0" x2="100" y2="100" stroke="#0284c7" strokeWidth="0.05" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#0284c7" strokeWidth="0.05" />
        {[[20, 30], [80, 30], [20, 70], [80, 70], [50, 50]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="0.6" fill="#22d3ee" />
        ))}
        {PARTICLES.map((p) => (
          <circle key={p.id} cx={p.x} cy={p.y} r={p.r * 0.3} fill="#38bdf8">
            <animate attributeName="opacity" values="0;0.8;0" dur={`${p.duration}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${p.y};${p.y - 8};${p.y}`} dur={`${p.duration * 1.5}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Logo emblem */}
      <div style={{ opacity: logoVisible ? 1 : 0, transform: logoVisible ? "scale(1) translateY(0)" : "scale(0.6) translateY(-20px)", transition: "opacity 0.8s cubic-bezier(0.34,1.56,0.64,1), transform 0.8s cubic-bezier(0.34,1.56,0.64,1)", marginBottom: 24 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0284c7" /></linearGradient>
            <linearGradient id="nGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#7dd3fc" /><stop offset="100%" stopColor="#0ea5e9" /></linearGradient>
          </defs>
          <polygon points="48,4 88,26 88,70 48,92 8,70 8,26" fill="none" stroke="url(#hexGrad)" strokeWidth="2.5" filter="url(#glow)" />
          <polygon points="48,14 80,32 80,64 48,82 16,64 16,32" fill="rgba(2,132,199,0.12)" stroke="#0ea5e9" strokeWidth="1" />
          <text x="48" y="60" textAnchor="middle" fontSize="36" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fill="url(#nGrad)" filter="url(#glow)">N</text>
        </svg>
      </div>

      {/* Title */}
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s ease", textAlign: "center", marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(3rem,8vw,5.5rem)", fontWeight: 900, fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "-0.03em", background: "linear-gradient(135deg,#7dd3fc 0%,#22d3ee 45%,#0ea5e9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 24px rgba(14,165,233,0.5))", lineHeight: 1 }}>NexFlow</h1>
        <p style={{ margin: "10px 0 0", fontSize: "clamp(0.85rem,2.5vw,1.15rem)", color: "#94a3b8", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 400 }}>{APP_META.subtitle}</p>
      </div>

      {/* Feature badges */}
      <div style={{ opacity: detailsVisible ? 1 : 0, transform: detailsVisible ? "translateY(0)" : "translateY(12px)", transition: "all 0.6s ease 0.2s", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "20px 0", maxWidth: 600, padding: "0 24px" }}>
        {APP_META.milestones.map((m, i) => (
          <span key={i} style={{ fontSize: "0.7rem", fontFamily: "Inter, system-ui, sans-serif", color: "#38bdf8", background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", borderRadius: 20, padding: "3px 12px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{m}</span>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ opacity: detailsVisible ? 1 : 0, transition: "opacity 0.5s ease 0.3s", width: "clamp(260px,50%,520px)", padding: "0 24px", marginTop: 8 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 4, overflow: "hidden", border: "1px solid rgba(14,165,233,0.15)" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#0284c7,#22d3ee)", borderRadius: 999, transition: "width 0.15s ease", boxShadow: "0 0 10px rgba(34,211,238,0.6)" }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "#475569", fontFamily: "Inter, system-ui, sans-serif", textAlign: "center", letterSpacing: "0.04em", minHeight: "1.1em" }}>{stageLabel}</p>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, opacity: detailsVisible ? 0.55 : 0, transition: "opacity 0.6s ease 0.5s", flexWrap: "wrap", padding: "0 32px" }}>
        {[`v${APP_META.version}`, null, `© ${APP_META.year} ${APP_META.author}`, null, APP_META.company, null, `Build ${APP_META.build}`, null, APP_META.stack].map((item, i) =>
          item === null
            ? <span key={i} style={{ color: "#1e293b", fontSize: "0.65rem" }}>|</span>
            : <span key={i} style={{ fontSize: "0.7rem", fontFamily: "Inter, system-ui, sans-serif", color: i === 0 ? "#38bdf8" : "#64748b", fontWeight: i === 0 ? 700 : 400, letterSpacing: "0.06em" }}>{item}</span>
        )}
      </div>

      {/* Skip */}
      <button onClick={dismiss} style={{ position: "absolute", top: 20, right: 24, background: "transparent", border: "none", color: "#334155", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "0.08em", padding: "4px 8px" }}>
        SKIP ›
      </button>
    </div>
  );
};

export default SplashScreen;
