
export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
];

export const CONTACT_CTA: NavLink = { label: 'Contact', href: '/contact' };

export const BRAND = { name: 'yutony', tld: 'dev' };

export type SocialLink = { label: string; href: string; external: boolean };

export const SOCIAL_LINKS: SocialLink[] = [
  { label: '✉ yutony115@gmail.com', href: 'mailto:yutony115@gmail.com', external: false },
  { label: 'LinkedIn ↗', href: 'https://www.linkedin.com/in/yutony03/', external: true },
];

export const FOOTER = {
  copyright: '© 2026 Tony Yu',
  links: [
    { label: 'GitHub', href: 'https://github.com/yutonydev' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yutony03/' },
    { label: 'Instagram', href: 'https://instagram.com/yu.tonyy' },
    { label: 'Email', href: 'mailto:yutony115@gmail.com' },
  ],
};

export const HERO_ROLES = ['PRODUCT MANAGER', 'GAME DESIGNER', 'BUILDER', 'PROBLEM SOLVER'];

export const HERO = {
  name: 'Tony Yu',
  tagline:
    'CS + Game Design graduate who likes building things end to end, now figuring out how to turn "I made this" into "people actually want this."',
};

export type Tag = string;

export type StatusBadge = { label: string; accentClass: string; dot?: boolean };

export type FeaturedProject = {
  slug: string;
  status: StatusBadge;
  title: string;
  description: string;
  tags: Tag[];
  href: string;
};

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    slug: 'strengthai',
    status: { label: 'WEB APP · LIVE', accentClass: 'text-strength' },
    title: 'StrengthAI',
    description: "The perfect workout tracker. Every other one I've used sucked, so I made my own.",
    tags: ['React', 'Supabase', 'Claude API'],
    href: '/projects?project=strengthai',
  },
  {
    slug: 'bubblemage',
    status: { label: 'GAME · STEAM', accentClass: 'text-game' },
    title: 'BubbleMage',
    description: 'An open world fantasy game built in Unity with a five-person team, headed to Steam.',
    tags: ['Unity', 'C#', 'Team Project'],
    href: '/projects?project=bubblemage',
  },
];

export type ProjectDemo =
  | {
      type: 'iframe';
      src: string;
      fallbackHref: string;
      /** The embed's own canvas size; scaled to fit the card, or it crops. */
      naturalWidth: number;
      naturalHeight: number;
      /** Sits above the embed; omit where the demo speaks for itself. */
      note?: string;
      /** Starts as soon as it scrolls into view, for demos that are quiet and cheap. */
      autoPlay?: boolean;
      /** The embedded page's own background, so the box matches before it paints. */
      boxColor?: string;
      /** The embedded page's body margin, cropped off so no scrollbars appear. */
      embedInset?: number;
      /** Follows the title on the play button; defaults to 'playable demo'. */
      label?: string;
    }
  | {
      type: 'media';
      video?: { src: string; poster?: string };
      images: { src: string; alt: string; caption?: string }[];
    };

export type ProjectDetail = {
  slug: string;
  status: StatusBadge;
  title: string;
  description: string;
  tags: Tag[];
  links: { label: string; href: string }[];
  demo: ProjectDemo;
};

export const PROJECTS: ProjectDetail[] = [
  {
    slug: 'strengthai',
    status: { label: 'LIVE · WEB APP', accentClass: 'text-live', dot: true },
    title: 'StrengthAI',
    description:
      "A strength-training log that reads your own data and tells you when a lift has stalled, and why. No exercise database, no dropdowns: you describe a lift in your own words and it becomes a trend line. It watches reps-in-reserve at matched weight and reps to flag real plateaus instead of noise, and a coach chat answers questions using only numbers you've actually logged, never fabricated ones.",
    tags: ['React', 'Vite', 'Supabase', 'Claude API', 'PWA'],
    links: [
      { label: 'Try it live ↗', href: 'https://strength-ai.vercel.app' },
      { label: 'View code ↗', href: 'https://github.com/yutonydev/StrengthAI' },
    ],
    // A trailer, not the live app: that redirects to a login form.
    demo: {
      type: 'iframe',
      src: '/strengthai-trailer.html',
      fallbackHref: '/strengthai-trailer.html',
      autoPlay: true,
      label: 'trailer',
      boxColor: '#0A0B0A',
      // The widest the card's box ever gets, so it always scales to fill rather than sit in bars.
      naturalWidth: 700,
      naturalHeight: 557,
      // The trailer resets the body margin, so there is nothing to crop.
      embedInset: 0,
    },
  },
  {
    slug: 'bubblemage',
    status: { label: 'GAME · STEAM', accentClass: 'text-game' },
    title: 'BubbleMage',
    description:
      'An open world fantasy game built in Unity with a five-person team, on its way to Steam. My focus was gameplay systems and C# tooling, working alongside teammates on art, audio, and level design.',
    tags: ['Unity', 'C#', 'Game Design', 'Team Project'],
    links: [{ label: 'View on Steam ↗', href: 'https://store.steampowered.com/app/4703500/Bubble_Mage/' }],
    // From public/: ~54 MB, fetched only on play.
    demo: {
      type: 'media',
      video: { src: '/bubblemage-preview.mp4' },
      images: [{ src: '/bubblemage-screenshot.jpg', alt: 'BubbleMage gameplay screenshot' }],
    },
  },
  {
    slug: 'space-drift',
    status: { label: 'PLAYABLE · BROWSER GAME', accentClass: 'text-live', dot: true },
    title: 'Space Drift',
    description:
      'An arcade dodger built in Phaser: steer a ship through falling asteroids and grab fuel to trigger nitro, which makes you briefly immune, and stacks if you collect more while it is already running. Every 15 seconds the asteroids get faster and more numerous, so a run is a question of how long you can keep up. The sprites and backgrounds are hand-drawn.',
    tags: ['Phaser', 'JavaScript', 'Game Design', 'Solo Project'],
    links: [
      { label: 'Play full screen ↗', href: 'https://yutonydev.github.io/Space-Drift/' },
      { label: 'View code ↗', href: 'https://github.com/yutonydev/Space-Drift' },
    ],
    demo: {
      type: 'iframe',
      src: 'https://yutonydev.github.io/Space-Drift/',
      fallbackHref: 'https://yutonydev.github.io/Space-Drift/',
      note: 'PLAY IT HERE: press play, then click the game to use the keyboard',
      naturalWidth: 800,
      naturalHeight: 600,
      // This page resets body margin to 0, so nothing needs cropping.
      embedInset: 0,
    },
  },
  {
    slug: 'typing-tutor-turbo',
    status: { label: 'PLAYABLE · BROWSER GAME', accentClass: 'text-live', dot: true },
    title: 'Typing Tutor Turbo',
    description:
      'A typing game built in Phaser with Michael Xi. Words stack up and you pick one with the arrow keys, then clear it letter by letter, but hollow letters are shielded and take several hits, shields regenerate while you work, and a letter you type can count toward other words on screen. Built to make drilling accuracy feel like an arcade run rather than a lesson.',
    tags: ['Phaser', 'JavaScript', 'Game Design', 'Two-Person Team'],
    links: [
      { label: 'Play full screen ↗', href: 'https://xismichael.github.io/typingTutorTurbo/' },
      { label: 'View code ↗', href: 'https://github.com/xismichael/typingTutorTurbo' },
    ],
    demo: {
      type: 'iframe',
      src: 'https://xismichael.github.io/typingTutorTurbo/',
      fallbackHref: 'https://xismichael.github.io/typingTutorTurbo/',
      note: 'PLAY IT HERE: press play, then click the game to use the keyboard',
      naturalWidth: 1500,
      naturalHeight: 1000,
      // This page sets no margin reset, so it inherits the browser default 8px.
      embedInset: 8,
    },
  },
  {
    slug: 'afterimage',
    status: { label: 'PLAYABLE · BROWSER GAME', accentClass: 'text-live', dot: true },
    title: 'Afterimage',
    description:
      "A 2D platformer in Unity about playing blind. You explore a level freely with no timer, then snap back to the spawn and record an eight second run with your character invisible. Only the replay counts: reach the goal there and the level clears. While you record, the level tells you where you are without showing you, so lamps stay lit as you pass them, the screen flashes green when you jump, and the edges glow red as you move. Bounce pads launch you a fixed height, acceleration pads double whatever speed you already carry, and spikes cost you time.",
    tags: ['Unity', 'C#', 'Game Design', 'Rapid Prototype'],
    links: [
      { label: 'Play on itch.io ↗', href: 'https://yutony03.itch.io/afterimage' },
      { label: 'View code ↗', href: 'https://github.com/yutonydev/Prototype-4' },
    ],
    demo: {
      type: 'iframe',
      // itch's embed page: framing the build host serves an anti-hotlink notice.
      // The id is per upload, so re-uploading breaks this; the fallback covers it.
      src: 'https://itch.io/embed-upload/19017111?color=0b0d12',
      fallbackHref: 'https://yutony03.itch.io/afterimage',
      note: 'PLAY IT HERE: press play, then click the game to use the keyboard',
      naturalWidth: 1280,
      // 720 canvas + Unity's 38px footer; 720 alone would halve it.
      naturalHeight: 758,
      // The template resets the body margin, so there is nothing to crop.
      embedInset: 0,
    },
  },
];

export const ABOUT = {
  bio: [
    "I'm a computer science and game design major who likes taking things from a blank file to something people can actually use. That's meant building web apps, writing gameplay systems in Unity, and lately spending more time thinking about why people click what they click than how the code works underneath.",
    "Right now I'm aiming toward product management. I like being close enough to the code to know what's actually hard to build, and close enough to the user to know what's actually worth building.",
  ],
  // From public/, so the URL stays stable rather than content-hashed.
  resume: {
    heading: 'Resume',
    body: 'The full rundown, one PDF.',
    cta: { label: 'Download resume ↓', href: '/Tony-Yu-Resume.pdf' }
  },
};

export type SkillGroup = { label: string; accentClass: string; items: string[] };

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: 'BUILD',
    accentClass: 'text-accent',
    items: [
      'React',
      'HTML/CSS',
      'JavaScript',
      'TypeScript',
      'Python',
      'SQL',
      'APIs',
      'Unity',
      'C#',
      'Shell Scripting',
      'Git / GitHub',
    ],
  },
  {
    label: 'SHAPE',
    accentClass: 'text-game',
    items: [
      'Product Thinking',
      'User Research',
      'Product Success',
      'Prototyping',
      'Game Design',
      'Team Collaboration',
    ],
  },
];

export const CONTACT = {
  heading: "Let's talk",
  body: 'Got a project, a role, or just want to talk shop? Drop a note below or reach me directly.',
  errorBody: 'Something went wrong sending that. Try again, or email me directly.',
};
