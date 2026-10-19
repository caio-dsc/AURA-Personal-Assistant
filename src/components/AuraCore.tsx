import React, { useEffect, useRef } from 'react';
import { AuraState } from '../types/aura';

interface AuraCoreProps {
  state: AuraState;
  audioLevel?: number; // 0 to 1, from microphone or TTS
  size?: number; // base size in px (e.g., 280)
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  hueShift: number; // offset between cyan (185) and violet (275)
}

export const AuraCore: React.FC<AuraCoreProps> = ({
  state,
  audioLevel = 0,
  size = 280,
  interactive = true,
  onClick,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef<AuraState>(state);
  const audioLevelRef = useRef<number>(audioLevel);
  const particlesRef = useRef<Particle[]>([]);

  // Keep refs synchronized with props for the animation loop
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Initialize particle cloud
  useEffect(() => {
    const particleCount = 42;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: 0,
        y: 0,
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 85,
        speed: (0.004 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1),
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.6,
        hueShift: Math.random(),
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.025;
      const currentState = stateRef.current;
      const currentAudio = audioLevelRef.current;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || size;
      const height = canvas.clientHeight || size;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.22;

      // Dynamic multipliers based on current state
      let pulseMultiplier = 1.0;
      let rotationSpeed = 1.0;
      let ringCount = 2;
      let primaryColor = 'rgba(0, 240, 255, '; // Cyan
      let secondaryColor = 'rgba(168, 85, 247, '; // Violet
      let innerCoreColor = 'rgba(255, 255, 255, ';

      switch (currentState) {
        case 'idle':
          pulseMultiplier = 1 + Math.sin(time * 1.5) * 0.06;
          rotationSpeed = 0.5;
          ringCount = 2;
          primaryColor = 'rgba(0, 240, 255, ';
          secondaryColor = 'rgba(168, 85, 247, ';
          break;

        case 'listening':
          // Modulate with microphone volume or acoustic organic wave
          const micPulse = currentAudio > 0.02 ? currentAudio * 0.6 : Math.sin(time * 4) * 0.12;
          pulseMultiplier = 1.08 + micPulse;
          rotationSpeed = 1.8;
          ringCount = 3;
          primaryColor = 'rgba(34, 211, 238, '; // Bright vibrant cyan
          secondaryColor = 'rgba(14, 165, 233, '; // Electric blue
          break;

        case 'thinking':
          pulseMultiplier = 0.98 + Math.sin(time * 3) * 0.08;
          rotationSpeed = 3.6; // accelerated quantum orbits
          ringCount = 4;
          primaryColor = 'rgba(192, 132, 252, '; // Bright purple
          secondaryColor = 'rgba(56, 189, 248, '; // Sky cyan
          break;

        case 'speaking':
          // Pulsing harmonic waveform
          const speechPulse = currentAudio > 0.02 ? currentAudio * 0.8 : Math.sin(time * 5.2) * 0.18 + Math.cos(time * 2.8) * 0.09;
          pulseMultiplier = 1.12 + Math.abs(speechPulse);
          rotationSpeed = 1.6;
          ringCount = 3;
          primaryColor = 'rgba(168, 85, 247, '; // Violet
          secondaryColor = 'rgba(0, 240, 255, '; // Cyan
          break;

        case 'error':
          pulseMultiplier = 1.0 + Math.sin(time * 6) * 0.05;
          rotationSpeed = 0.3;
          ringCount = 2;
          primaryColor = 'rgba(244, 63, 94, '; // Rose / crimson
          secondaryColor = 'rgba(251, 146, 60, '; // Amber
          innerCoreColor = 'rgba(255, 220, 220, ';
          break;
      }

      const activeRadius = baseRadius * pulseMultiplier;

      // 1. Outermost Ambient Atmospheric Glow
      const ambientGrad = ctx.createRadialGradient(cx, cy, activeRadius * 0.2, cx, cy, activeRadius * 2.4);
      ambientGrad.addColorStop(0, primaryColor + '0.28)');
      ambientGrad.addColorStop(0.5, secondaryColor + '0.12)');
      ambientGrad.addColorStop(1, 'rgba(5, 7, 15, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, activeRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wave Ripples for listening and speaking states
      if (currentState === 'listening' || currentState === 'speaking') {
        const ripplePhase = (time * 1.5) % 1;
        const rippleRadius = activeRadius * (1.2 + ripplePhase * 1.0);
        const rippleAlpha = (1 - ripplePhase) * (currentState === 'speaking' ? 0.45 : 0.35);

        ctx.strokeStyle = primaryColor + `${rippleAlpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();

        const ripplePhase2 = (time * 1.5 + 0.5) % 1;
        const rippleRadius2 = activeRadius * (1.2 + ripplePhase2 * 1.0);
        const rippleAlpha2 = (1 - ripplePhase2) * 0.25;

        ctx.strokeStyle = secondaryColor + `${rippleAlpha2})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Rotating Quantum Orbital Rings
      for (let r = 0; r < ringCount; r++) {
        const ringRadius = activeRadius * (1.18 + r * 0.22);
        const ringAngle = time * (0.6 + r * 0.4) * rotationSpeed * (r % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ringAngle);

        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * (0.86 - r * 0.12), r * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = r % 2 === 0 ? primaryColor + '0.45)' : secondaryColor + '0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash(r % 2 === 0 ? [8, 12, 24, 12] : [4, 8, 16, 8]);
        ctx.stroke();

        // Node dots along the ring
        const nodeAngle = time * 2 + r * 1.5;
        const nx = Math.cos(nodeAngle) * ringRadius;
        const ny = Math.sin(nodeAngle) * (ringRadius * (0.86 - r * 0.12));
        ctx.fillStyle = primaryColor + '0.85)';
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Floating Bioluminescent Particles
      particlesRef.current.forEach((p) => {
        p.angle += p.speed * rotationSpeed;
        const pr = p.radius * pulseMultiplier;
        const px = cx + Math.cos(p.angle) * pr;
        const py = cy + Math.sin(p.angle) * (pr * 0.88);

        const particleColor = p.hueShift > 0.5 ? primaryColor : secondaryColor;
        ctx.fillStyle = particleColor + `${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Central Fluid Luminous Sphere (Main Core)
      const coreGrad = ctx.createRadialGradient(
        cx - activeRadius * 0.15,
        cy - activeRadius * 0.15,
        activeRadius * 0.05,
        cx,
        cy,
        activeRadius
      );
      coreGrad.addColorStop(0, innerCoreColor + '0.98)');
      coreGrad.addColorStop(0.25, primaryColor + '0.88)');
      coreGrad.addColorStop(0.7, secondaryColor + '0.65)');
      coreGrad.addColorStop(1, primaryColor + '0.05)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, activeRadius, 0, Math.PI * 2);
      ctx.fill();

      // 6. High-Luminance Central Aperture
      const centerSparkGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, activeRadius * 0.35);
      centerSparkGrad.addColorStop(0, innerCoreColor + '1)');
      centerSparkGrad.addColorStop(0.4, primaryColor + '0.8)');
      centerSparkGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = centerSparkGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, activeRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size]);

  // Status text and color mapping for human-readable state feedback
  const stateLabels: Record<AuraState, { label: string; tagClass: string; dotClass: string }> = {
    idle: {
      label: 'Repouso',
      tagClass: 'text-cyan-400/90 border-cyan-500/20 bg-cyan-950/20',
      dotClass: 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]',
    },
    listening: {
      label: 'Ouvindo...',
      tagClass: 'text-cyan-300 border-cyan-400/40 bg-cyan-900/30',
      dotClass: 'bg-cyan-300 shadow-[0_0_12px_#22d3ee] animate-ping',
    },
    thinking: {
      label: 'Pensando...',
      tagClass: 'text-purple-300 border-purple-500/30 bg-purple-950/30',
      dotClass: 'bg-purple-400 shadow-[0_0_10px_#a855f7]',
    },
    speaking: {
      label: 'Falando...',
      tagClass: 'text-violet-300 border-violet-500/30 bg-violet-950/30',
      dotClass: 'bg-violet-400 shadow-[0_0_10px_#8b5cf6]',
    },
    error: {
      label: 'Alerta / Erro',
      tagClass: 'text-rose-300 border-rose-500/30 bg-rose-950/30',
      dotClass: 'bg-rose-400 shadow-[0_0_10px_#f43f5e]',
    },
  };

  const currentInfo = stateLabels[state];

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : -1}
      aria-label={`Núcleo da IA AURA em estado de ${currentInfo.label}`}
      title={interactive ? 'Clique para interagir com o microfone ou interromper' : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* HTML5 Canvas Core Sphere */}
      <div className="relative w-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className={`cursor-pointer transition-transform duration-300 ${
            interactive ? 'hover:scale-[1.03] active:scale-[0.98]' : ''
          }`}
        />
      </div>

      {/* State label badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide border backdrop-blur-md transition-all duration-300 ${currentInfo.tagClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentInfo.dotClass}`} />
        <span>{currentInfo.label}</span>
      </div>
    </div>
  );
};
