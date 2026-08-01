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
  // GLSL is OpenGL's shading language, so the OpenGL mark is the honest one.
  ["GLSL",                "opengl"],
  // Its mark is a wordmark - unreadable as a 256px raster, but the legends
  // are vector geometry now, so it renders crisply.
  ["WebGL",               "webgl"],
  // bottom-row function keys
  ["GitHub",              "github"],
];

// Simple Icons carries no Amazon marks, so these two are drawn by hand:
// a lambda glyph (which is the Lambda mark) and the universal database
// cylinder (which is what the DynamoDB mark is built on).
const CUSTOM = {
  "REST APIs": {
    hex: "E8C37E",
    // request out, response back
    path: "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",
  },
  "Row-Level Security": {
    hex: "8FD3B6",
    // shield: the row-level policy boundary
    path: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  },
  SQL: {
    hex: "C8A2E0",
    // a relational table, distinct from DynamoDB's cylinder
    path: "M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10H3v9z",
  },
  Email: {
    hex: "E8C37E",
    path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  },
  Sound: {
    hex: "9CC0E7",
    path: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  },
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
  "LinkedIn": "7FB3E8",
  "C#": "F5A97F",
};
const TEXT_LEGEND = {
  "LinkedIn": "in",
  "C#": "C#",
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
