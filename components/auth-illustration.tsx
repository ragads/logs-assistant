const RINGS = [260, 400];
const PARTICLES = [
  { top: "16%", left: "20%", size: 3, opacity: 0.8 },
  { top: "26%", left: "80%", size: 4, opacity: 0.6 },
  { top: "60%", left: "12%", size: 3, opacity: 0.7 },
  { top: "76%", left: "70%", size: 5, opacity: 0.5 },
  { top: "38%", left: "90%", size: 3, opacity: 0.9 },
  { top: "88%", left: "42%", size: 3, opacity: 0.6 },
  { top: "10%", left: "56%", size: 2, opacity: 0.8 },
  { top: "52%", left: "5%", size: 4, opacity: 0.5 },
  { top: "70%", left: "88%", size: 2, opacity: 0.7 }
];

export function AuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#030a12]">
      {/* base depth glow behind everything */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_46%,#0d3844_0%,#082430_35%,#030a12_72%)]" />

      {/* ambient color blobs */}
      <div className="absolute -right-10 top-6 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="absolute -left-14 bottom-6 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

      {/* vortex rays */}
      <div
        className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(125,241,255,0.12) 0deg 1deg, transparent 1deg 7deg)",
          WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 58%)",
          maskImage: "radial-gradient(circle, black 18%, transparent 58%)"
        }}
      />

      {/* faint concentric rings */}
      {RINGS.map((size) => (
        <div
          key={size}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-200/15"
          style={{ width: size, height: size }}
        />
      ))}

      {/* particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-cyan-200"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            boxShadow: "0 0 8px 2px rgba(103,232,249,0.65)"
          }}
        />
      ))}

      {/* shield + keyhole mark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="176" height="192" viewBox="0 0 176 192" fill="none" className="drop-shadow-[0_0_36px_rgba(56,224,255,0.6)]">
          <defs>
            <linearGradient id="shieldFill" x1="0" y1="0" x2="176" y2="192" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8FF6FF" />
              <stop offset="55%" stopColor="#22B8D8" />
              <stop offset="100%" stopColor="#0B5C72" />
            </linearGradient>
          </defs>

          <path
            d="M88 6 L152 34 V88 Q152 148 88 184 Q24 148 24 88 V34 Z"
            fill="url(#shieldFill)"
            fillOpacity="0.28"
            stroke="url(#shieldFill)"
            strokeWidth="2.5"
          />
          <path
            d="M88 24 L136 46 V88 Q136 132 88 160 Q40 132 40 88 V46 Z"
            fill="none"
            stroke="#B6F6FF"
            strokeOpacity="0.4"
            strokeWidth="1"
          />

          {/* circuit traces */}
          <g stroke="#9FF3FF" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round">
            <path d="M24 60 H8 V44" fill="none" />
            <path d="M152 60 H168 V80" fill="none" />
            <path d="M40 130 H20" fill="none" />
            <path d="M136 130 H158 V150" fill="none" />
          </g>
          <g fill="#B6F6FF" fillOpacity="0.8">
            <circle cx="8" cy="44" r="2.5" />
            <circle cx="168" cy="80" r="2.5" />
            <circle cx="20" cy="130" r="2.5" />
            <circle cx="158" cy="150" r="2.5" />
          </g>

          {/* keyhole */}
          <circle cx="88" cy="92" r="17" fill="#030a12" stroke="#DFFBFF" strokeWidth="2" />
          <path d="M82 106 L94 106 L90 128 L86 128 Z" fill="#030a12" stroke="#DFFBFF" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
