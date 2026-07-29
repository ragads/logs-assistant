const RINGS = [220, 320, 420];
const RAYS = Array.from({ length: 14 }, (_, i) => i * (360 / 14));
const PARTICLES = [
  { top: "18%", left: "22%", size: 3 },
  { top: "28%", left: "78%", size: 4 },
  { top: "62%", left: "14%", size: 3 },
  { top: "74%", left: "68%", size: 5 },
  { top: "40%", left: "88%", size: 3 },
  { top: "85%", left: "40%", size: 3 },
  { top: "12%", left: "58%", size: 3 },
  { top: "55%", left: "6%", size: 4 }
];

export function AuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_62%_48%,#0d3b45_0%,#082230_38%,#050d16_75%)]">
      {/* ambient glow blobs */}
      <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -left-10 bottom-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* radiating rays */}
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {RAYS.map((deg) => (
          <div
            key={deg}
            className="absolute left-0 top-0 h-px w-[420px] origin-left bg-gradient-to-r from-cyan-300/25 via-cyan-300/10 to-transparent"
            style={{ transform: `rotate(${deg}deg)` }}
          />
        ))}
      </div>

      {/* concentric rings */}
      {RINGS.map((size) => (
        <div
          key={size}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-300/15"
          style={{ width: size, height: size }}
        />
      ))}

      {/* particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-cyan-200/70 shadow-[0_0_8px_2px_rgba(103,232,249,0.6)]"
          style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
        />
      ))}

      {/* shield + keyhole mark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="150" height="164" viewBox="0 0 150 164" fill="none" className="drop-shadow-[0_0_30px_rgba(34,211,238,0.55)]">
          <defs>
            <linearGradient id="shieldFill" x1="0" y1="0" x2="150" y2="164" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7DF1FF" />
              <stop offset="55%" stopColor="#22B8D8" />
              <stop offset="100%" stopColor="#0E6E86" />
            </linearGradient>
          </defs>
          <path
            d="M75 4 L140 28 V78 C140 118 113 148 75 160 C37 148 10 118 10 78 V28 Z"
            fill="url(#shieldFill)"
            fillOpacity="0.16"
            stroke="url(#shieldFill)"
            strokeWidth="2.5"
          />
          <path
            d="M75 22 L124 40 V78 C124 108 103 130 75 140 C47 130 26 108 26 78 V40 Z"
            fill="none"
            stroke="#67E8F9"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <circle cx="75" cy="80" r="15" fill="#04121a" stroke="#7DF1FF" strokeWidth="2" />
          <path d="M70 92 L80 92 L77 110 L73 110 Z" fill="#04121a" stroke="#7DF1FF" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
