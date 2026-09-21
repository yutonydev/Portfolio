import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import FoldText from '../components/FoldText/FoldText';
import TagPill from '../components/TagPill';
import CardDeck from '../components/CardDeck/CardDeck';
import { PROJECTS, type ProjectDetail } from '../lib/content';

/** Width of the embed box's border, in px — kept out of the scale maths. */
const BOX_BORDER = 1;

const PREVIEW_TILE = 'block h-[200px] w-full rounded-2xl border border-border-soft';

/** The overshoot in the curve is what makes it bounce rather than glide. */
const TILE_HOVER =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ' +
  'group-hover:-translate-y-1 group-hover:scale-[1.03] ' +
  'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100';

type Shot = { src: string; alt: string; caption?: string };

/** Portalled to the body: a transformed ancestor is the containing block for position: fixed. */
function Lightbox({
  shots,
  index,
  onIndex,
  onClose
}: {
  shots: Shot[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);

  const step = useCallback(
    (by: number) => onIndex((index + by + shots.length) % shots.length),
    [index, shots.length, onIndex]
  );

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, step]);

  const shot = shots[index];

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={shot.alt}
      tabIndex={-1}
      onClick={onClose}
      // Scrolls rather than shrinking: these are 918px tall, and height-fitting
      // them caps the width below the 436px they were captured at.
      className="fixed inset-0 z-[100] flex flex-col items-center gap-4 overflow-y-auto bg-black/85 p-[clamp(16px,4vw,48px)] backdrop-blur-sm outline-none"
    >
      <img
        src={shot.src}
        alt={shot.alt}
        // Only the backdrop dismisses.
        onClick={(e) => e.stopPropagation()}
        // Native width, so the text is as sharp as the capture allows.
        className="my-auto h-auto w-[min(436px,92vw)] max-w-full rounded-2xl border border-border-soft"
      />
      {shot.caption && (
        <p className="max-w-[52ch] text-center font-sans text-sm text-ink-soft">{shot.caption}</p>
      )}

      {shots.length > 1 && (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous screenshot"
            className="rounded-full border border-border-soft px-4 py-2 font-sans text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            ←
          </button>
          <span className="font-mono text-xs text-ink-softer">
            {index + 1} / {shots.length}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next screenshot"
            className="rounded-full border border-border-soft px-4 py-2 font-sans text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            →
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-[clamp(12px,3vw,28px)] top-[clamp(12px,3vw,28px)] rounded-full border border-border-soft px-3.5 py-1.5 font-sans text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Esc ✕
      </button>
    </div>,
    document.body
  );
}

/** Rendered at the game's own canvas size and scaled down to fit. */
function ScaledEmbed({
  src,
  title,
  width,
  height,
  inset = 0,
  autoPlay = false,
  // Matches the embedded page, so the box is not a black flash before it paints.
  boxColor = '#000'
}: {
  src: string;
  title: string;
  width: number;
  height: number;
  inset?: number;
  autoPlay?: boolean;
  boxColor?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [fit, setFit] = useState({ scale: 1, offset: 0 });
  const { scale, offset } = fit;
  // Unmounting the frame is the only cross-origin mute. Without an observer to
  // wait on, an autoplaying embed starts now: it has no play button to fall back on.
  const [running, setRunning] = useState(() => autoPlay && typeof IntersectionObserver === 'undefined');
  // A cover fades off once it paints; fading the frame itself in would deprioritise
  // its rendering and delay that paint.
  const [loaded, setLoaded] = useState(false);

  // Autoplaying ones still wait for the viewport, so a card further down the
  // deck does not load its embed while someone is reading the top of the page.
  useEffect(() => {
    const el = outer.current;
    if (!autoPlay || !el || running) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setRunning(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, running]);

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;

    // clientWidth, not the rect: the deck's 3D transform shrinks the rect.
    // Measured up front as well, or it stays unscaled until a resize.
    const measure = () => {
      const box = el.clientWidth - BOX_BORDER * 2;
      const natural = width + inset * 2;
      // Never past 1:1. Anything narrower than the card would be magnified into
      // a soft, oversized version of itself, and grow the box to match.
      const next = Math.min(box / natural, 1);
      setFit({ scale: next, offset: Math.max(0, (box - natural * next) / 2) });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, inset]);

  return (
    <div ref={outer} className="w-full">
      {/* Full width: no fractional centring to round unevenly. */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border-soft"
        style={{ height: (height + inset * 2) * scale + BOX_BORDER * 2, background: boxColor }}
      >
        {running && (
          // Holds the box in the embed's own colour until it has painted, then
          // fades off, so there is no blank flash and nothing pops into place.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
            style={{ background: boxColor, opacity: loaded ? 0 : 1 }}
          />
        )}
        {running ? (
          <iframe
            ref={frame}
            src={src}
            title={title}
            // Includes the page's own margin, so nothing scrolls.
            width={width + inset * 2}
            height={height + inset * 2}
            scrolling="no"
            // Key events need the frame itself focused.
            allow="autoplay; fullscreen; gamepad; keyboard-map"
            onLoad={() => setLoaded(true)}
            className="absolute top-0 border-0"
            style={{ left: offset, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          />
        ) : autoPlay ? null : (
          <button
            type="button"
            onClick={() => setRunning(true)}
            className="absolute inset-0 grid place-items-center gap-2 text-center"
          >
            <span>
              <span className="block font-sans text-lg font-extrabold text-white">▶ Play {title}</span>
              <span className="mt-1 block font-mono text-xs text-white/70">
                loads the game, and it has sound
              </span>
            </span>
          </button>
        )}
      </div>

      {running && !autoPlay && (
        <button
          type="button"
          onClick={() => setRunning(false)}
          className="mt-3 rounded-full border border-border-soft px-4 py-2 font-sans text-sm font-bold text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          ■ Stop
        </button>
      )}
    </div>
  );
}

/** `isActive` gates the costly parts of the demo, not the space they take. */
function ProjectCard({ project, isActive }: { project: ProjectDetail; isActive: boolean }) {
  // Hoisted: the map callback below loses the narrowing to the media variant.
  const shots = project.demo.type === 'media' ? project.demo.images : [];
  const [zoomed, setZoomed] = useState<number | null>(null);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="p-[clamp(32px,5vw,48px)]">
        <div className="mb-4 flex items-center gap-2.5">
          {project.status.dot && <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-live" />}
          <span className={`font-mono text-xs font-semibold tracking-[0.05em] ${project.status.accentClass}`}>
            {project.status.label}
          </span>
        </div>
        <h2 className="mb-3.5 font-sans text-[clamp(26px,3vw,34px)] font-extrabold text-ink">{project.title}</h2>
        <p className="mb-5 max-w-[680px] font-sans text-base leading-[1.65] text-ink-soft">{project.description}</p>
        <div className="mb-7 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3.5">
          {project.links.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener"
              className={
                i === 0
                  ? 'rounded-full bg-accent px-[26px] py-[13px] font-sans text-sm font-bold text-white no-underline transition-colors hover:bg-accent-deep'
                  : 'rounded-full border-[1.5px] border-border-soft px-[26px] py-[13px] font-sans text-sm font-bold text-ink no-underline transition-colors hover:border-accent hover:text-accent'
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* On every card, so heights hold; stand-ins replace the costly parts. */}
      {project.demo.type === 'iframe' ? (
          <div className="border-t border-border bg-surface-alt p-[clamp(20px,3vw,28px)]">
            {project.demo.note && (
              <div className="mb-3 font-mono text-xs text-ink-softer">{project.demo.note}</div>
            )}
            <ScaledEmbed
              src={project.demo.src}
              title={`${project.title} ${project.demo.label ?? 'playable demo'}`}
              width={project.demo.naturalWidth}
              height={project.demo.naturalHeight}
              inset={project.demo.embedInset}
              autoPlay={project.demo.autoPlay}
              boxColor={project.demo.boxColor}
            />
            <div className="mt-2.5 font-sans text-[13px] text-ink-softer">
              If the embed doesn't load,{' '}
              <a href={project.demo.fallbackHref} target="_blank" rel="noopener" className="text-accent">
                open it directly ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="border-t border-border p-[clamp(20px,3vw,28px)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {project.demo.video &&
                (isActive ? (
                  <video
                    controls
                    preload="metadata"
                    poster={project.demo.video.poster}
                    className={`${PREVIEW_TILE} bg-black object-cover`}
                  >
                    <source src={project.demo.video.src} type="video/mp4" />
                    Your browser can&apos;t play this clip.{' '}
                    <a href={project.demo.video.src} className="text-accent">
                      Download it instead ↓
                    </a>
                  </video>
                ) : (
                  <div className={`${PREVIEW_TILE} bg-black`} />
                ))}
              {project.demo.images.map((image, i) => {
                return (
                  <figure key={image.src} className="m-0">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => setZoomed(i)}
                        aria-label={`Enlarge: ${image.alt}`}
                        className="group block w-full cursor-zoom-in rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <img
                          src={image.src}
                          alt={image.alt}
                          loading="lazy"
                          className={`${PREVIEW_TILE} ${TILE_HOVER} object-cover`}
                        />
                      </button>
                    ) : (
                      <div className={`${PREVIEW_TILE} bg-black`} />
                    )}
                    {image.caption && (
                      <figcaption className="mt-2 font-sans text-[12px] leading-[1.45] text-ink-softer">
                        {image.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        )}

      {zoomed !== null && (
        <Lightbox shots={shots} index={zoomed} onIndex={setZoomed} onClose={() => setZoomed(null)} />
      )}
    </div>
  );
}

/** Index of the project named by ?project=<slug>, or 0 when absent or unknown. */
function indexForSlug(slug: string | null) {
  const i = PROJECTS.findIndex((project) => project.slug === slug);
  return i === -1 ? 0 : i;
}

export default function Projects() {
  // Home links to a specific project, so open on that card.
  const [searchParams] = useSearchParams();
  const requestedSlug = searchParams.get('project');
  // Seeded from the URL, so the right card is front on first paint.
  const [active, setActive] = useState(() => indexForSlug(requestedSlug));

  // Adjusted during render, so the old card is never painted first.
  const [appliedSlug, setAppliedSlug] = useState(requestedSlug);
  if (requestedSlug !== appliedSlug) {
    setAppliedSlug(requestedSlug);
    if (requestedSlug) setActive(indexForSlug(requestedSlug));
  }

  return (
    <div>
      <section className="mx-auto max-w-[1100px] px-[clamp(24px,6vw,80px)] pb-10 pt-[clamp(70px,10vh,110px)]">
        {/* h1 for the outline; FoldText renders spans. */}
        <h1 className="mb-4">
          <FoldText
            text="Projects"
            splitBy="char"
            hinge="top"
            trigger="mount"
            color="#f2f4fb"
            fontSize="clamp(36px, 5vw, 56px)"
            fontWeight={800}
            className="font-sans"
          />
        </h1>
        <p className="max-w-[560px] font-sans text-[17px] leading-[1.55] text-white">Cool things I've made</p>
      </section>

      <section className="mx-auto max-w-[1100px] px-[clamp(24px,6vw,80px)] pb-[120px]">
        <CardDeck
          labels={PROJECTS.map((project) => project.title)}
          activeIndex={active}
          onChange={setActive}
          renderCard={(index, isActive) => <ProjectCard project={PROJECTS[index]} isActive={isActive} />}
        />
      </section>
    </div>
  );
}
