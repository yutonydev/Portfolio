import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import ScrollReveal from '../components/ScrollReveal';
import TiltCard from '../components/TiltCard';
import RoleCycler from '../components/RoleCycler';
import GradientHeading from '../components/GradientHeading';
import SpotlightCard from '../components/SpotlightCard/SpotlightCard';
import cardFront from '../components/Lanyard/card-front.jpg';
import cardBack from '../components/Lanyard/card-back.png';
import strapTy from '../components/Lanyard/strap-ty.png';
import TagPill from '../components/TagPill';
import { HERO, FEATURED_PROJECTS } from '../lib/content';

const loadLanyard = () => import('../components/Lanyard/Lanyard');
const Lanyard = lazy(loadLanyard);

const LG = '(min-width: 64rem)';
const subscribeLg = (onChange: () => void) => {
  const mql = window.matchMedia(LG);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};
const isLg = () => window.matchMedia(LG).matches;

// Fetch the lanyard early, but only on Home: App imports every page up front.
if (typeof window !== 'undefined' && window.location.pathname === '/' && isLg()) {
  void loadLanyard();
}

/** True after the first painted frame, once the main thread is idle. */
function useAfterFirstPaint() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idle = 0;
    const raf = requestAnimationFrame(() => {
      const go = () => setReady(true);
      idle = typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 500 }) : window.setTimeout(go, 1);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, []);

  return ready;
}

export default function Home() {
  const wide = useSyncExternalStore(subscribeLg, isLg, () => false);
  const afterPaint = useAfterFirstPaint();

  return (
    <div className="relative">
      {/* Lanyard: z-30, above the page but below the sticky nav. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-[900px] lg:block">
        <div className="pointer-events-none h-full w-full">
          {/* Fixed card height, rope clears "View all", low gravity slows the drop. */}
          {wide && afterPaint && (
            <Suspense fallback={null}>
              <Lanyard
                gravity={[0, -14, 0]}
                cardHeightPx={255}
                anchorRightPx={333}
                ropeSegmentLength={0.77}
                lanyardImage={strapTy}
                strapTileLength={0.8}
                frontImage={cardFront}
                backImage={cardBack}
              />
            </Suspense>
          )}
        </div>
      </div>

      <section className="relative mx-auto grid max-w-[1140px] gap-10 overflow-hidden px-[clamp(24px,6vw,80px)] pb-[clamp(70px,10vh,130px)] pt-[clamp(90px,15vh,170px)] lg:grid-cols-[1fr_360px]">
        {/* On a card, so the background reads behind the text. */}
        <SpotlightCard
          className="z-10 self-start rounded-3xl border border-border bg-surface/85 p-[clamp(24px,4vw,44px)] backdrop-blur-md"
          spotlightColor="rgba(111, 116, 232, 0.45)"
        >
          <RoleCycler />
          <GradientHeading className="mt-5 text-[clamp(42px,7.5vw,88px)]">{HERO.name}</GradientHeading>
          <p className="max-w-[600px] font-sans text-[clamp(18px,2.1vw,23px)] leading-[1.55] text-ink-soft">
            {HERO.tagline}
          </p>
        </SpotlightCard>
      </section>

      <ScrollReveal className="mx-auto max-w-[1140px] px-[clamp(24px,6vw,80px)] pb-[130px]">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-sans text-[clamp(26px,3vw,34px)] font-extrabold text-ink">Featured projects</h2>
          <Link to="/projects" className="font-sans text-sm font-bold text-accent no-underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          {FEATURED_PROJECTS.map((project) => (
            <TiltCard key={project.slug} href={project.href} className="h-full">
              <SpotlightCard
                className="h-full rounded-[20px] border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                spotlightColor="rgba(111, 116, 232, 0.45)"
              >
                <div
                  className={`mb-3.5 font-mono text-xs font-semibold tracking-[0.05em] ${project.status.accentClass}`}
                >
                  {project.status.label}
                </div>
                <h3 className="mb-2.5 font-sans text-[23px] font-extrabold text-ink">{project.title}</h3>
                <p className="mb-[18px] font-sans text-[15px] leading-[1.55] text-ink-soft">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              </SpotlightCard>
            </TiltCard>
          ))}
        </div>
      </ScrollReveal>

    </div>
  );
}
