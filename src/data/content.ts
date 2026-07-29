export const profile = {
  name: "Brian Fu",
  role: "Developer & Creative Technologist",
  tagline:
    "I build fast, tactile interfaces for the web — and occasionally let the GPU show off.",
  email: "brian.fu123321@gmail.com",
  github: "https://github.com/jiacheng-fu",
  location: "On the web",
};

export type Project = {
  index: string;
  title: string;
  blurb: string;
  stack: string[];
  year: string;
  href?: string;
};

// Placeholder work — swap these for real projects anytime.
export const projects: Project[] = [
  {
    index: "01",
    title: "Aurora Engine",
    blurb:
      "A GPU-driven generative background system. The shader on this very page.",
    stack: ["WebGL", "GLSL", "React"],
    year: "2026",
  },
  {
    index: "02",
    title: "Signal",
    blurb:
      "Real-time collaborative editor with conflict-free sync and a buttery presence layer.",
    stack: ["TypeScript", "CRDT", "WebSockets"],
    year: "2025",
  },
  {
    index: "03",
    title: "Cartograph",
    blurb:
      "Interactive data-viz toolkit that turns messy CSVs into explorable spatial stories.",
    stack: ["D3", "Canvas", "Vite"],
    year: "2025",
  },
  {
    index: "04",
    title: "Latermind",
    blurb:
      "A tiny, opinionated read-later app with offline-first sync and zero tracking.",
    stack: ["React", "IndexedDB", "PWA"],
    year: "2024",
  },
];

export const stack = [
  "TypeScript",
  "React",
  "WebGL / GLSL",
  "Node",
  "Rust",
  "Vite",
  "Framer Motion",
  "Postgres",
];
