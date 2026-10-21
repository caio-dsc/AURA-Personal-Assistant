import React, { useEffect, useRef, useState, useId } from 'react';
import { AuraState } from '../types/aura';

interface AuraCoreProps {
  state: AuraState;
  audioLevel?: number; // 0 to 1, measured from microphone or TTS cadence
  size?: number; // base size in px (e.g. 170 to 280)
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  pulsePhase: number;
}

export const AuraCore: React.FC<AuraCoreProps> = ({
  state,
  audioLevel = 0,
  size = 250,
  interactive = true,
  onClick,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const filterId = useId().replace(/:/g, '');

  const [reducedMotion, setReducedMotion] = useState(false);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', listener);
    return () => mediaQuery.removeEventListener?.('change', listener);
  }, []);

  // Initialize floating holographic particles
  useEffect(() => {
    const count = 32;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 55,
        speed: (0.006 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        size: 1.2 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.6,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Render Canvas Particle Cloud & Sonic Shockwaves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || size;
      const h = canvas.clientHeight || size;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const scaleFactor = Math.min(w, h) / 400; // Normalized to 400x400 SVG coordinate space

      // Color palette based on state
      let primaryColor = 'rgba(0, 240, 255, '; // Cyan
      let secondaryColor = 'rgba(14, 165, 233, '; // Electric Blue
      let particleSpeedMultiplier = 1.0;

      if (state === 'thinking') {
        primaryColor = 'rgba(192, 132, 252, '; // Quantum Purple
        secondaryColor = 'rgba(0, 240, 255, '; // Cyan
        particleSpeedMultiplier = 2.8;
      } else if (state === 'speaking') {
        primaryColor = 'rgba(168, 85, 247, '; // Violet
        secondaryColor = 'rgba(34, 211, 238, '; // Bright Cyan
        particleSpeedMultiplier = 1.6;
      } else if (state === 'error') {
        primaryColor = 'rgba(244, 63, 94, '; // Crimson Rose
        secondaryColor = 'rgba(251, 146, 60, '; // Amber
        particleSpeedMultiplier = 0.4;
      } else if (state === 'listening') {
        primaryColor = 'rgba(34, 211, 238, '; // High-luminance Cyan
        secondaryColor = 'rgba(56, 189, 248, '; // Sky
        particleSpeedMultiplier = 1.5;
      }

      // Audio-reactive expansion
      const safeAudio = Math.max(0, Math.min(1, audioLevel));
      const dynamicPulse =
        state === 'listening'
          ? 1.0 + safeAudio * 0.45
          : state === 'speaking'
          ? 1.0 + safeAudio * 0.35 + Math.sin(time * 3) * 0.05
          : state === 'thinking'
          ? 1.0 + Math.sin(time * 6) * 0.08
          : 1.0 + Math.sin(time * 1.5) * 0.04;

      // 1. Sonic Ripple Waves for Listening and Speaking
      if (state === 'listening' || state === 'speaking') {
        const ripplePhase = (time * 1.2) % 1;
        const rippleRadius = (55 + ripplePhase * 95) * scaleFactor;
        const rippleAlpha = (1 - ripplePhase) * (state === 'speaking' ? 0.4 : 0.3 + safeAudio * 0.3);

        ctx.strokeStyle = primaryColor + `${rippleAlpha})`;
        ctx.lineWidth = 1.6 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();

        const ripplePhase2 = (time * 1.2 + 0.5) % 1;
        const rippleRadius2 = (55 + ripplePhase2 * 95) * scaleFactor;
        const rippleAlpha2 = (1 - ripplePhase2) * 0.25;

        ctx.strokeStyle = secondaryColor + `${rippleAlpha2})`;
        ctx.lineWidth = 1.0 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Central Fluid Plasma Sparks (Particles)
      particlesRef.current.forEach((p) => {
        if (!reducedMotion) {
          p.angle += p.speed * particleSpeedMultiplier;
        }
        const pr = p.radius * scaleFactor * dynamicPulse;
        const px = cx + Math.cos(p.angle) * pr;
        const py = cy + Math.sin(p.angle) * pr;

        const pulse = 0.5 + Math.sin(time * 4 + p.pulsePhase) * 0.5;
        const alpha = p.alpha * (0.6 + pulse * 0.4);

        ctx.fillStyle = primaryColor + `${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size * scaleFactor, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, audioLevel, size, reducedMotion]);

  // Audio modulation calculations
  const safeAudio = Math.max(0, Math.min(1, audioLevel));
  const audioPulseScale =
    state === 'listening'
      ? 1.0 + safeAudio * 0.22
      : state === 'speaking'
      ? 1.0 + safeAudio * 0.16
      : 1.0;

  // Rotation duration mapping based on state (in seconds)
  const getRotationDurations = () => {
    if (reducedMotion) {
      return { ring1: '90s', ring2: '120s', ring3: '80s', turbine: '60s' };
    }
    switch (state) {
      case 'thinking':
        return { ring1: '4.5s', ring2: '3.2s', ring3: '5.5s', turbine: '2.5s' };
      case 'listening':
        return { ring1: '14s', ring2: '10s', ring3: '16s', turbine: '8s' };
      case 'speaking':
        return { ring1: '12s', ring2: '9s', ring3: '14s', turbine: '7s' };
      case 'error':
        return { ring1: '40s', ring2: '50s', ring3: '45s', turbine: '30s' };
      case 'idle':
      default:
        return { ring1: '28s', ring2: '20s', ring3: '32s', turbine: '16s' };
    }
  };

  const durations = getRotationDurations();

  // Color theme definitions based on state
  const getTheme = () => {
    switch (state) {
      case 'thinking':
        return {
          primaryHex: '#c084fc',
          secondaryHex: '#00f0ff',
          glowHex: '#a855f7',
          coreStop1: '#ffffff',
          coreStop2: '#c084fc',
          coreStop3: '#7e22ce',
          badgeText: 'text-purple-300',
          badgeBg: 'bg-purple-950/40 border-purple-500/40',
          badgeDot: 'bg-purple-400 shadow-[0_0_10px_#a855f7]',
          label: 'Pensando...',
          telemetry: 'CALC.NEURAL // 4.8 GHz',
        };
      case 'listening':
        return {
          primaryHex: '#00f0ff',
          secondaryHex: '#38bdf8',
          glowHex: '#0284c7',
          coreStop1: '#ffffff',
          coreStop2: '#22d3ee',
          coreStop3: '#0369a1',
          badgeText: 'text-cyan-300',
          badgeBg: 'bg-cyan-950/40 border-cyan-400/50',
          badgeDot: 'bg-cyan-300 shadow-[0_0_12px_#00f0ff] animate-ping',
          label: 'Ouvindo...',
          telemetry: `AUDIO.IN // MIC ${Math.round(safeAudio * 100)}%`,
        };
      case 'speaking':
        return {
          primaryHex: '#38bdf8',
          secondaryHex: '#a855f7',
          glowHex: '#8b5cf6',
          coreStop1: '#ffffff',
          coreStop2: '#60a5fa',
          coreStop3: '#6d28d9',
          badgeText: 'text-cyan-200',
          badgeBg: 'bg-cyan-950/40 border-cyan-500/40',
          badgeDot: 'bg-cyan-400 shadow-[0_0_10px_#38bdf8]',
          label: 'Falando...',
          telemetry: 'VOCAL // TTS pt-BR',
        };
      case 'error':
        return {
          primaryHex: '#f43f5e',
          secondaryHex: '#fb923c',
          glowHex: '#be123c',
          coreStop1: '#ffffff',
          coreStop2: '#f43f5e',
          coreStop3: '#881337',
          badgeText: 'text-rose-300',
          badgeBg: 'bg-rose-950/40 border-rose-500/40',
          badgeDot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
          label: 'Alerta / Erro',
          telemetry: 'SYS.WARN // ERR.DIAG',
        };
      case 'idle':
      default:
        return {
          primaryHex: '#00f0ff',
          secondaryHex: '#0ea5e9',
          glowHex: '#0284c7',
          coreStop1: '#ffffff',
          coreStop2: '#00f0ff',
          coreStop3: '#0369a1',
          badgeText: 'text-cyan-400',
          badgeBg: 'bg-[#061224]/70 border-cyan-500/30',
          badgeDot: 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]',
          label: 'Repouso',
          telemetry: 'STANDBY // SYS.READY',
        };
    }
  };

  const theme = getTheme();

  // Generate 72 radial compass tick marks
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 360) / 72;
    const isMajor = i % 6 === 0;
    const isQuarter = i % 18 === 0;
    const innerR = isQuarter ? 168 : isMajor ? 172 : 175;
    const outerR = 180;
    const rad = (angle * Math.PI) / 180;
    const x1 = 200 + Math.cos(rad) * innerR;
    const y1 = 200 + Math.sin(rad) * innerR;
    const x2 = 200 + Math.cos(rad) * outerR;
    const y2 = 200 + Math.sin(rad) * outerR;
    return {
      id: i,
      x1,
      y1,
      x2,
      y2,
      strokeWidth: isQuarter ? 1.8 : isMajor ? 1.2 : 0.75,
      opacity: isQuarter ? 0.95 : isMajor ? 0.65 : 0.3,
    };
  });

  // Generate 28 circular equalizer bars
  const eqBars = Array.from({ length: 28 }, (_, i) => {
    const angle = (i * 360) / 28;
    const rad = (angle * Math.PI) / 180;
    const baseR = 76;
    // Modulate height based on audio level or state
    const barMod =
      state === 'listening'
        ? Math.sin(i * 1.5 + safeAudio * 10) * 0.5 + 0.5
        : state === 'speaking'
        ? Math.sin(i * 2.2 + safeAudio * 8) * 0.5 + 0.5
        : state === 'thinking'
        ? Math.sin(i * 1.8) * 0.4 + 0.4
        : 0.15;
    const barLength = 4 + barMod * (12 + safeAudio * 18);
    const x1 = 200 + Math.cos(rad) * baseR;
    const y1 = 200 + Math.sin(rad) * baseR;
    const x2 = 200 + Math.cos(rad) * (baseR + barLength);
    const y2 = 200 + Math.sin(rad) * (baseR + barLength);
    return { id: i, x1, y1, x2, y2, opacity: 0.4 + barMod * 0.55 };
  });

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : -1}
      aria-label={`Núcleo Holográfico AURA JARVIS em estado de ${theme.label}`}
      title={
        interactive
          ? 'HUD Holográfico AURA (clique para alternar microfone ou interromper)'
          : undefined
      }
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Container for Holographic HUD */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Layer 1: Ambient Background Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none transition-all duration-700 ease-out"
          style={{
            background: `radial-gradient(circle, ${theme.primaryHex}25 0%, ${theme.glowHex}12 45%, transparent 70%)`,
            transform: `scale(${audioPulseScale})`,
          }}
        />

        {/* Layer 2: Vector Holographic SVG HUD */}
        <svg
          viewBox="0 0 400 400"
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            interactive ? 'cursor-pointer' : ''
          }`}
          style={{
            transform: `scale(${audioPulseScale})`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Holographic Glow Filters */}
            <filter id={`bloom-${filterId}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={`subtle-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Core Arc Reactor Radial Gradient */}
            <radialGradient id={`reactor-core-${filterId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={theme.coreStop1} stopOpacity="1" />
              <stop offset="35%" stopColor={theme.coreStop2} stopOpacity="0.9" />
              <stop offset="75%" stopColor={theme.coreStop3} stopOpacity="0.5" />
              <stop offset="100%" stopColor={theme.primaryHex} stopOpacity="0.05" />
            </radialGradient>

            {/* Outer Halo Gradient */}
            <radialGradient id={`outer-halo-${filterId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={theme.primaryHex} stopOpacity="0.3" />
              <stop offset="60%" stopColor={theme.secondaryHex} stopOpacity="0.1" />
              <stop offset="100%" stopColor={theme.primaryHex} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ======================================================== */}
          {/* SECTION 1: Outer Framing & Coordinate Brackets            */}
          {/* ======================================================== */}
          {/* Technical Corner Bracket Reticles */}
          <g stroke={theme.primaryHex} strokeWidth="1.2" opacity="0.45" fill="none">
            {/* Top-Left Bracket */}
            <path d="M 24 44 L 24 24 L 44 24" />
            {/* Top-Right Bracket */}
            <path d="M 376 44 L 376 24 L 356 24" />
            {/* Bottom-Left Bracket */}
            <path d="M 24 356 L 24 376 L 44 376" />
            {/* Bottom-Right Bracket */}
            <path d="M 376 356 L 376 376 L 356 376" />
          </g>

          {/* Outermost Bounding Circle */}
          <circle
            cx="200"
            cy="200"
            r="192"
            fill="none"
            stroke={theme.primaryHex}
            strokeWidth="0.8"
            opacity="0.3"
            strokeDasharray="4 6 12 6"
          />

          {/* ======================================================== */}
          {/* SECTION 2: Radial Azimuth Compass Scale (72 Ticks)       */}
          {/* ======================================================== */}
          <g>
            {ticks.map((t) => (
              <line
                key={t.id}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={theme.primaryHex}
                strokeWidth={t.strokeWidth}
                opacity={t.opacity}
              />
            ))}
          </g>

          {/* Cardinal Coordinate Glyphs (000°, 090°, 180°, 270°) */}
          <g
            fill={theme.primaryHex}
            opacity="0.65"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
            dominantBaseline="central"
          >
            <text x="200" y="15">
              000° // N
            </text>
            <text x="382" y="200">
              090° // E
            </text>
            <text x="200" y="388">
              180° // S
            </text>
            <text x="18" y="200">
              270° // W
            </text>
          </g>

          {/* ======================================================== */}
          {/* SECTION 3: Rotating Incomplete Technical Arc Rings       */}
          {/* ======================================================== */}

          {/* Ring A: Outer Segmented Arc Ring (Clockwise) */}
          <g
            style={{
              transformOrigin: '200px 200px',
              animation: `hud-spin-cw ${durations.ring1} linear infinite`,
            }}
            className="hud-animated-rotate"
          >
            <circle
              cx="200"
              cy="200"
              r="156"
              fill="none"
              stroke={theme.primaryHex}
              strokeWidth="2.5"
              strokeDasharray="140 35 45 25 90 45"
              filter={`url(#subtle-${filterId})`}
              opacity="0.85"
            />
            {/* Orbital node dots along the track */}
            <circle cx="356" cy="200" r="3" fill={theme.primaryHex} filter={`url(#bloom-${filterId})`} />
            <circle cx="44" cy="200" r="2.2" fill={theme.secondaryHex} />
            <circle cx="200" cy="44" r="2.5" fill={theme.primaryHex} />
          </g>

          {/* Ring B: Counter-Rotating Fine Calibrated Arc (Counter-Clockwise) */}
          <g
            style={{
              transformOrigin: '200px 200px',
              animation: `hud-spin-ccw ${durations.ring2} linear infinite`,
            }}
            className="hud-animated-rotate"
          >
            <circle
              cx="200"
              cy="200"
              r="138"
              fill="none"
              stroke={theme.secondaryHex}
              strokeWidth="1.4"
              strokeDasharray="8 6 24 6 50 12"
              opacity="0.75"
            />
            {/* Tech markers on Ring B */}
            <polygon
              points="196,62 204,62 200,56"
              fill={theme.primaryHex}
              opacity="0.8"
            />
            <polygon
              points="196,338 204,338 200,344"
              fill={theme.primaryHex}
              opacity="0.8"
            />
          </g>

          {/* Ring C: Intermediate Hex / Tachymeter Segmented Ring (Clockwise) */}
          <g
            style={{
              transformOrigin: '200px 200px',
              animation: `hud-spin-cw ${durations.ring3} linear infinite`,
            }}
            className="hud-animated-rotate"
          >
            <circle
              cx="200"
              cy="200"
              r="114"
              fill="none"
              stroke={theme.primaryHex}
              strokeWidth="1.8"
              strokeDasharray="80 30 30 20 120 40"
              opacity="0.7"
            />
            {/* Fine secondary track */}
            <circle
              cx="200"
              cy="200"
              r="104"
              fill="none"
              stroke={theme.secondaryHex}
              strokeWidth="0.8"
              strokeDasharray="4 8"
              opacity="0.4"
            />
          </g>

          {/* Ring D: JARVIS Arc Turbine Notches (Counter-Clockwise) */}
          <g
            style={{
              transformOrigin: '200px 200px',
              animation: `hud-spin-ccw ${durations.turbine} linear infinite`,
            }}
            className="hud-animated-rotate"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 360) / 12;
              const rad = (angle * Math.PI) / 180;
              const x1 = 200 + Math.cos(rad) * 90;
              const y1 = 200 + Math.sin(rad) * 90;
              const x2 = 200 + Math.cos(rad) * 96;
              const y2 = 200 + Math.sin(rad) * 96;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={theme.primaryHex}
                  strokeWidth="2"
                  opacity={i % 3 === 0 ? 0.9 : 0.45}
                />
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* SECTION 4: Circular Dynamic Equalizer Bars               */}
          {/* ======================================================== */}
          <g>
            {eqBars.map((b) => (
              <line
                key={b.id}
                x1={b.x1}
                y1={b.y1}
                x2={b.x2}
                y2={b.y2}
                stroke={theme.primaryHex}
                strokeWidth="1.5"
                opacity={b.opacity}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* ======================================================== */}
          {/* SECTION 5: Central Holographic Arc Reactor Core          */}
          {/* ======================================================== */}

          {/* Core Outer Glow Border */}
          <circle
            cx="200"
            cy="200"
            r="60"
            fill={`url(#outer-halo-${filterId})`}
            stroke={theme.primaryHex}
            strokeWidth="1.5"
            opacity="0.65"
          />

          {/* Central Reactor Arc Shutter (Stark Iris Blades) */}
          <g
            style={{
              transformOrigin: '200px 200px',
              animation: `hud-spin-cw ${durations.turbine} linear infinite`,
            }}
            className="hud-animated-rotate"
          >
            {Array.from({ length: 6 }, (_, i) => {
              const a1 = (i * 60 * Math.PI) / 180;
              const a2 = ((i * 60 + 35) * Math.PI) / 180;
              const rInner = 38;
              const rOuter = 54;
              const x1 = 200 + Math.cos(a1) * rInner;
              const y1 = 200 + Math.sin(a1) * rInner;
              const x2 = 200 + Math.cos(a2) * rInner;
              const y2 = 200 + Math.sin(a2) * rInner;
              const x3 = 200 + Math.cos(a2) * rOuter;
              const y3 = 200 + Math.sin(a2) * rOuter;
              const x4 = 200 + Math.cos(a1) * rOuter;
              const y4 = 200 + Math.sin(a1) * rOuter;

              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={theme.primaryHex}
                  opacity="0.25"
                  stroke={theme.primaryHex}
                  strokeWidth="0.8"
                />
              );
            })}
          </g>

          {/* Central Luminous Sphere */}
          <circle
            cx="200"
            cy="200"
            r="36"
            fill={`url(#reactor-core-${filterId})`}
            filter={`url(#bloom-${filterId})`}
          />

          {/* High-Intensity Center Hotspot */}
          <circle
            cx="200"
            cy="200"
            r="14"
            fill="#ffffff"
            opacity="0.95"
            filter={`url(#bloom-${filterId})`}
          />

          {/* Central Crosshair Notch */}
          <g stroke={theme.secondaryHex} strokeWidth="1" opacity="0.6">
            <line x1="190" y1="200" x2="210" y2="200" />
            <line x1="200" y1="190" x2="200" y2="210" />
          </g>

          {/* Telemetry Micro-Text Overlay within HUD */}
          <text
            x="200"
            y="290"
            fill={theme.primaryHex}
            opacity="0.75"
            fontSize="7"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing="1"
          >
            {theme.telemetry}
          </text>
        </svg>

        {/* Layer 3: Canvas Particle Cloud & Sonic Shockwaves (transparent overlay) */}
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* State Label & Telemetry Badge */}
      <div
        className={`mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wide border backdrop-blur-md transition-all duration-300 ${theme.badgeBg} ${theme.badgeText}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot}`} />
        <span className="font-semibold uppercase tracking-wider">{theme.label}</span>
      </div>
    </div>
  );
};
