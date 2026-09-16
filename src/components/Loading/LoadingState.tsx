import { useEffect, useState } from 'react';
import { PIXEL_PURPLE } from '../../lib/theme';

// Delays grow with distance from the left edge, so the pulse sweeps rightwards.
const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return (col + Math.abs(row - 1)) * 90;
});

const PULSE_MS = 650;

type LoadingStateProps = {
  /** Cycled through while the work runs; one is picked at random to start. */
  labels: string[];
  /** Milliseconds a label holds before its length is counted. */
  baseMs?: number;
  /** Added per character, so long words are not rushed past. */
  perCharMs?: number;
  /** False freezes the grid and holds one label, for reduced-motion viewers. */
  animate?: boolean;
};

export default function LoadingState({ labels, baseMs = 260, perCharMs = 22, animate = true }: LoadingStateProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * labels.length));

  // Re-armed per word, so each holds for as long as it takes to read.
  useEffect(() => {
    if (!animate || labels.length < 2) return;
    const hold = baseMs + perCharMs * labels[index].length;
    const id = setTimeout(() => setIndex(i => (i + 1) % labels.length), hold);
    return () => clearTimeout(id);
  }, [animate, baseMs, perCharMs, index, labels]);

  return (
    <div className="flex w-fit items-center gap-4">
      <span aria-hidden className="grid grid-cols-[repeat(3,9px)] gap-[3px]">
        {CHEVRON_DELAYS.map((delay, i) => (
          <span
            key={i}
            className="h-[9px] w-[9px] rounded-[2px]"
            style={{
              backgroundColor: PIXEL_PURPLE,
              opacity: animate ? 0.15 : 0.35,
              animation: animate ? `pixelOn ${PULSE_MS}ms ease-in-out ${delay}ms infinite` : 'none',
              // Composites the pulse, keeping it off the main thread during startup.
              willChange: animate ? 'opacity' : undefined
            }}
          />
        ))}
      </span>
      {/* Labels share one cell, so the row never shifts width as words swap. */}
      <span aria-hidden className="grid">
        {labels.map(label => (
          <span
            key={label}
            className="invisible col-start-1 row-start-1 font-sans text-[19px] font-medium"
          >
            {label}
          </span>
        ))}
        <span
          className="col-start-1 row-start-1 bg-clip-text font-sans text-[19px] font-medium text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--color-ink-soft) 35%, var(--color-ink) 50%, var(--color-ink-soft) 65%)',
            backgroundSize: '200% 100%',
            animation: animate ? 'shimmerText 1.4s linear infinite' : 'none'
          }}
        >
          {labels[index]}
        </span>
      </span>
    </div>
  );
}
