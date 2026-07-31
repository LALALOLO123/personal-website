export const profile = {
  name: "Brian Fu",
  role: "Software Engineer",
  tagline:
    "CS at Texas A&M, graduating December 2027. I gravitate to problems where correctness is checkable — compilers, backends, and the security boundaries in between.",
  email: "brian.fu123321@gmail.com",
  github: "https://github.com/jiacheng-fu",
  linkedin: "https://linkedin.com/in/jiachengfu",
  location: "Austin, Texas",
};

export type Project = {
  index: string;
  title: string;
  blurb: string;
  stack: string[];
  year: string;
  href?: string;
  live?: string;
};

/** Real work only. Every entry is backed by a repo, a live URL, or shipped employment. */
export const projects: Project[] = [
  {
    index: "01",
    title: "CarScout",
    blurb:
      "An AI-powered used-car platform I built and own end to end. Free-form input becomes validated JSON through an LLM pipeline with schema sanitization and automatic failover; a 10-level constraint-relaxation algorithm ranks listings so you never hit an empty page. Deployed on Lambda with a DynamoDB cache that keeps it inside a 1,000-call/month budget.",
    stack: ["React", "FastAPI", "AWS Lambda", "DynamoDB", "PostgreSQL"],
    year: "2026",
    href: "https://github.com/jiacheng-fu/CarScout",
    live: "https://d1j3m9qdbgs5ik.cloudfront.net",
  },
  {
    index: "02",
    title: "vDSP Compiler Backend",
    blurb:
      "An LLVM backend for a proprietary vector DSP at Bridgecom Semiconductors — instruction selection, register allocation, lowering strategies, and a technical report that steered the architecture. The abstraction bottoms out here, which is the part I liked.",
    stack: ["LLVM", "C++", "SystemRDL"],
    year: "2025",
  },
  {
    index: "03",
    title: "Platform Hardening",
    blurb:
      "Application security at ThingsX. Closed a cross-tenant leak exposing 11,000+ records through an RPC missing authorization checks, then proved it dead by reproducing the exploit in reverse. Every guard is mutation-tested — reverted individually to confirm the suite actually fails without it.",
    stack: ["TypeScript", "Deno", "PostgreSQL", "RLS"],
    year: "2026",
  },
  {
    index: "04",
    title: "Project Horizon",
    blurb:
      "A narrative exploration game built solo in Unity. Branching storyline with multiple outcomes, dialogue with voiceover sync, state management, and the full development cycle owned start to finish.",
    stack: ["C#", "Unity"],
    year: "2023",
    href: "https://github.com/jiacheng-fu/project-horizon",
  },
  {
    index: "05",
    title: "CarStatus",
    blurb:
      "A CLI for live BMW telemetry over the Smartcar API — odometer, fuel and battery, location. Small, but it talks to a real car.",
    stack: ["JavaScript", "Node", "Smartcar API"],
    year: "2025",
    href: "https://github.com/jiacheng-fu/CarStatus",
  },
  {
    index: "06",
    title: "Wild West Party Game",
    blurb:
      "A live-multiplayer western party game built in 24 hours at HowdyHack 2024. I built the frontend: the frame system that sequences every connected client through the game's states together, scene transitions, the drawing canvas, and the player input components.",
    stack: ["TypeScript", "Next.js", "WebSockets"],
    year: "2024",
    href: "https://github.com/jiacheng-fu/wild-west-party-game",
  },
  {
    index: "07",
    title: "This Site",
    blurb:
      "A hand-written WebGL fragment shader that warps toward your cursor, with scroll-linked reveals throughout. No component library, no template.",
    stack: ["WebGL", "GLSL", "Motion"],
    year: "2026",
    href: "https://github.com/jiacheng-fu/personal-website",
  },
];

export const stack = [
  "TypeScript",
  "Python",
  "C++",
  "Java",
  "React",
  "FastAPI",
  "Node / Deno",
  "PostgreSQL",
  "AWS",
  "Docker",
  "LLVM",
  "WebGL / GLSL",
];

export const facts = [
  { label: "Education", value: "Texas A&M — BS CS, Math minor" },
  { label: "Graduating", value: "December 2027 · 3.87 GPA" },
  { label: "Based", value: "Austin, Texas" },
  { label: "Seeking", value: "Summer 2027 SWE internship" },
];
