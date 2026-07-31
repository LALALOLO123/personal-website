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

/** One artifact, chosen because you can click it and it responds. */
export const flagship = {
  title: "CarScout",
  live: "https://d1j3m9qdbgs5ik.cloudfront.net",
  repo: "https://github.com/jiacheng-fu/CarScout",
  blurb:
    "Describe the car you want in plain English and get back ranked real listings. An LLM pipeline turns free-form text into validated JSON, and a 10-level constraint-relaxation algorithm makes sure you get useful matches instead of an empty page when nothing satisfies every filter. It runs serverless on Lambda with a DynamoDB cache that keeps the whole thing inside a 1,000-call/month API budget.",
  stack: ["React", "FastAPI", "AWS Lambda", "DynamoDB", "PostgreSQL"],
};
