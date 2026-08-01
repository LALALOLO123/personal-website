const si = require("simple-icons");
const fs = require("fs");

// slug -> [label, simple-icons slug]. `null` slug means the key gets a text
// legend instead: real keyboards have text on the modifiers, and it beats
// inventing a logo that doesn't exist.
const MAP = [
  ["TypeScript",          "typescript"],
  ["Python",              "python"],
  ["C++",                 "cplusplus"],
  ["React",               "react"],
  ["FastAPI",             "fastapi"],
  ["PostgreSQL",          "postgresql"],
  ["Node",                "nodedotjs"],
  ["Deno",                "deno"],
  ["Java",                "openjdk"],
  ["Docker",              "docker"],
  ["LLVM",                "llvm"],
  ["Supabase",            "supabase"],
  ["WebGL",               "webgl"],
  ["Unity",               "unity"],
  ["Vite",                "vite"],
  ["Next.js",             "nextdotjs"],
  ["Bash",                "gnubash"],
  ["Git",                 "git"],
  ["CI/CD",               "githubactions"],
  // bottom-row function keys
  ["GitHub",              "github"],
];

// Simple Icons carries no Amazon marks, so these two are drawn by hand:
// a lambda glyph (which is the Lambda mark) and the universal database
// cylinder (which is what the DynamoDB mark is built on).
const CUSTOM = {
  "AWS Lambda": {
    hex: "FF9900",
    path:
      "M5.696 3.927L8.304 2.073L21.104 20.073L18.496 21.927ZM11.582 8.563L14.018 10.637L4.818 21.437L2.382 19.363Z",
  },
  DynamoDB: {
    hex: "4053D6",
    path:
      "M12 2C7.58 2 4 3.34 4 5s3.58 3 8 3 8-1.34 8-3-3.58-3-8-3zM4 8.5V11c0 1.66 3.58 3 8 3s8-1.34 8-3V8.5c-1.82 1.2-4.79 1.9-8 1.9s-6.18-.7-8-1.9zM4 14.5V17c0 1.66 3.58 3 8 3s8-1.34 8-3v-2.5c-1.82 1.2-4.79 1.9-8 1.9s-6.18-.7-8-1.9z",
  },
};

// No mark exists (or the mark is a wordmark), so these are legends.
const TEXT = {
  "Email": "E8C37E",
  "LinkedIn": "7FB3E8",
  "Sound": "9CC0E7",
  "C#": "F5A97F",
  GLSL: "9CC0E7",
  WebGL: "E06060",
  SQL: "C8A2E0",
  "REST APIs": "E8C37E",
  "Row-Level Security": "8FD3B6",
};
const TEXT_LEGEND = {
  "Email": "@",
  "LinkedIn": "in",
  "Sound": "VOL",
  "C#": "C#",
  GLSL: "GLSL",
  WebGL: "WebGL",
  SQL: "SQL",
  "REST APIs": "REST",
  "Row-Level Security": "RLS",
};

const out = {};
for (const [label, slug] of MAP) {
  const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
  const icon = si[key];
  if (!icon) throw new Error("missing " + slug);
  out[label] = { path: icon.path, hex: icon.hex };
}
for (const [label, v] of Object.entries(CUSTOM)) out[label] = v;
for (const [label, hex] of Object.entries(TEXT)) out[label] = { text: TEXT_LEGEND[label], hex };

// Brand black reads as a hole on a dark keycap. Lift the near-blacks.
const LIFT = { Deno: "E8E4DC", "Next.js": "E8E4DC", OpenJDK: "E8E4DC", Java: "E8E4DC", LLVM: "9FB0C9", WebGL: "E06060" };
for (const [k, hex] of Object.entries(LIFT)) if (out[k]) out[k].hex = hex;

const body = Object.entries(out)
  .map(([label, v]) => {
    const fields = [`hex: "#${v.hex}"`];
    if (v.path) fields.push(`path: "${v.path}"`);
    if (v.text) fields.push(`text: "${v.text}"`);
    return `  ${JSON.stringify(label)}: { ${fields.join(", ")} },`;
  })
  .join("\n");

fs.writeFileSync(
  "src/data/legends.ts",
  `// GENERATED - do not edit by hand. Regenerate with scripts/gen-legends.js.
// Logo outlines extracted from simple-icons at build time so the 3,000-icon
// package never reaches the bundle. Paths are in a 24x24 viewBox.
export type Legend = { hex: string; path?: string; text?: string };

export const LEGENDS: Record<string, Legend> = {
${body}
};
`
);
console.log("wrote src/data/legends.ts  (" + Object.keys(out).length + " legends)");
