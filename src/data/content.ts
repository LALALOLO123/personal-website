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

/**
 * The interactive field. Ordered roughly by how much of it I've actually
 * written rather than alphabetically, so the density reads as a shape.
 * Only things I've shipped with belong here.
 */
export const skills = [
  "TypeScript",
  "Python",
  "C++",
  "React",
  "FastAPI",
  "PostgreSQL",
  "AWS Lambda",
  "DynamoDB",
  "Node",
  "Deno",
  "Java",
  "C#",
  "GLSL",
  "WebGL",
  "Docker",
  "LLVM",
  "SQL",
  "Supabase",
  "REST APIs",
  "CI/CD",
  "Row-Level Security",
  "Unity",
  "Vite",
  "Next.js",
  "Bash",
  "Git",
];

/**
 * Everything else, newest work first.
 *
 * Only real repos, and the ROLE is stated where it was not solo - Wild West
 * was a team hackathon build and Brian wrote the frontend, so it says so.
 * Dates are when the work happened, not when the repo was pushed to GitHub:
 * Project Horizon has been going since 2023 but the repo was created in 2026.
 */
/* What the projector throws on the screen.
 *
 * `clip` is an mp4 and wins when present; `still` is a fallback frame. A
 * project with neither gets a film leader on screen instead - honest about
 * there being no footage yet, and on-theme, rather than a broken black
 * rectangle. Drop an mp4 in public/reels and set `clip` to light it up.
 *
 * Only real material: CarScout is a capture of the live site, Wild West is
 * the game's own background art from its repo. Horizon and CarStatus need
 * footage recorded - neither can be captured from here (one is a Unity
 * build, the other a CLI against a live car). */
export const projects = [
  {
    title: "Project Horizon",
    reel: {},
    years: "2023 — now",
    repo: "https://github.com/jiacheng-fu/project-horizon",
    blurb:
      "A narrative exploration game, solo. Branching dialogue with voiceover sync, third-person traversal, and a life system.",
    stack: ["C#", "Unity"],
  },
  {
    title: "Wild West Party Game",
    reel: { still: "/shots/wild-west.jpg" },
    years: "2024",
    repo: "https://github.com/jiacheng-fu/wild-west-party-game",
    blurb:
      "Live multiplayer party game built in 24 hours at HowdyHack. Team project — I built the frontend: inter-scene mechanics, transitions, and UI across distinct client states.",
    stack: ["TypeScript", "React"],
  },
  {
    title: "CarStatus",
    reel: {},
    years: "2026",
    repo: "https://github.com/jiacheng-fu/CarStatus",
    blurb:
      "A CLI that reads a BMW's live status over the Smartcar API — odometer, fuel and battery, location.",
    stack: ["JavaScript", "Smartcar API"],
  },
];

/** One artifact, chosen because you can click it and it responds. */
export const flagship = {
  reel: { still: "/shots/carscout.jpg" },
  title: "CarScout",
  live: "https://d1j3m9qdbgs5ik.cloudfront.net",
  repo: "https://github.com/jiacheng-fu/CarScout",
  blurb:
    "Describe the car you want in plain English and get back ranked real listings. An LLM pipeline turns free-form text into validated JSON, and a 10-level constraint-relaxation algorithm makes sure you get useful matches instead of an empty page when nothing satisfies every filter. It runs serverless on Lambda with a DynamoDB cache that keeps the whole thing inside a 1,000-call/month API budget.",
  stack: ["React", "FastAPI", "AWS Lambda", "DynamoDB", "PostgreSQL"],
};
