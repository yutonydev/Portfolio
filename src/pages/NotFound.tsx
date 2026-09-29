import { Link } from 'react-router-dom';
import { NAV_LINKS, CONTACT_CTA, NOT_FOUND } from '../lib/content';
import FoldText from '../components/FoldText/FoldText';

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-[clamp(24px,6vw,80px)] py-[clamp(48px,10vh,120px)]">
      <p className="mb-3 font-mono text-sm font-semibold tracking-[0.08em] text-accent">{NOT_FOUND.label}</p>
      <h1 className="mb-4">
        <FoldText
          text={NOT_FOUND.heading}
          splitBy="char"
          hinge="top"
          trigger="mount"
          color="#f2f4fb"
          fontSize="clamp(34px, 5vw, 52px)"
          fontWeight={800}
          className="font-sans"
        />
      </h1>
      <p className="mb-7 font-sans text-[17px] leading-[1.55] text-ink-soft">{NOT_FOUND.body}</p>
      <div className="flex flex-wrap gap-4">
        {[...NAV_LINKS, CONTACT_CTA].map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="rounded-full bg-pill px-5 py-2.5 font-sans text-sm font-bold text-ink-soft no-underline transition-colors hover:bg-accent hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
