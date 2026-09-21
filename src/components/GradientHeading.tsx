import type { ReactNode } from 'react';

type GradientHeadingProps = {
  children: ReactNode;
  className?: string;
};

export default function GradientHeading({ children, className = '' }: GradientHeadingProps) {
  return (
    <h1
      // Theme tokens, not the shipped literals: those were near-black on a dark page.
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--color-ink), var(--color-accent), var(--color-ink))',
        backgroundSize: '200% auto'
      }}
      className={`animate-gradient-shift bg-clip-text font-sans font-extrabold leading-[1.02] tracking-[-0.03em] text-transparent ${className}`}
    >
      {children}
    </h1>
  );
}
