const si = require("simple-icons");
const fs = require("fs");

// slug -> [label, simple-icons slug]. `null` slug means the key gets a text
// legend instead: real keyboards have text on the modifiers, and it beats
// inventing a logo that doesn't exist.
const MAP = [
  ["TypeScript",          "typescript"],
  ["JavaScript",          "javascript"],
  ["Haskell",             "haskell"],
  ["HTML",                "html5"],
  ["CSS",                 "css"],
  ["Vercel",              "vercel"],
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
  ["GitHub Actions",      "githubactions"],
  ["Three.js",            "threedotjs"],
  ["OpenRouter",          "openrouter"],
  ["npm",                 "npm"],
  ["Poetry",              "poetry"],
  ["Vim",                 "vim"],
  ["Linux",               "linux"],
  ["PyTorch",             "pytorch"],
  ["Swift",               "swift"],
  // bottom-row function keys
  ["GitHub",              "github"],
];

// Simple Icons carries no Amazon marks, so these two are drawn by hand:
// a lambda glyph (which is the Lambda mark) and the universal database
// cylinder (which is what the DynamoDB mark is built on).
const CUSTOM = {
  Playwright: {
    hex: "45BA4B",
    // a browser window with a passing check - end-to-end testing
    path: "M21 3H3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm-1 16H4V9h16v10zM4 7V5h16v2H4zm6.6 9.8l-2.9-2.9 1.4-1.4 1.5 1.5 3.9-3.9 1.4 1.4-5.3 5.3z",
  },
  "API Gateway": {
    // AWS's Networking & Content Delivery purple
    hex: "8C4FFF",
    // many callers in, one gate, one route out - solid subpaths only, no
    // holes, because a filled ShapeGeometry triangulates those badly
    path: "M10.6 2h2.8v20h-2.8zM2 6.2h4.6v2.4H2zM6.2 4.4l3.4 3-3.4 3zM2 15.4h4.6v2.4H2zM6.2 13.6l3.4 3-3.4 3zM14.6 10.8h3.8v2.4h-3.8zM18 9l3.4 3-3.4 3z",
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
  Source: {
    hex: "9CC0E7",
    // angle brackets: this site's own repo
    path: "M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
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

/* These get text legends, which is also what a real board does with its wide
   modifiers.

   Accellera does publish official logos for all three HDLs
   (accellera.org/about/policies-and-procedures/logo-use), but they cannot be
   used here. The policy forbids altering them or recolouring them, and every
   legend on this board is a white monochrome mark - and worse, the
   SystemVerilog and VHDL files are white-background rasters with no alpha at
   all, so on a coloured keycap they would render as a white sticker. Keying
   that background out is precisely the alteration that is not permitted.
   LinkedIn's is trademarked too, and is drawn in legendTexture instead (a
   tile with the letters knocked out). */
const TEXT = {
  "LinkedIn": "7FB3E8",
  "C#": "F5A97F",
  "SystemVerilog": "9CC0E7",
  "VHDL": "9CC0E7",
  "SystemRDL": "9CC0E7",
};
const TEXT_LEGEND = {
  "LinkedIn": "in",
  "C#": "C#",
  "SystemVerilog": "SystemVerilog", // it sits on the 2.75u shift, so it fits
  "VHDL": "VHDL",
  "SystemRDL": "RDL",
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

/* These hexes used to be nudged so a near-black brand would still read as a
   MARK on a pale cap. The mark is white now and the cap wears the colour, so
   lifting them here only produced washed-out caps and forced a pile of
   corrections downstream. Left exactly as the brand publishes them: the ones
   that are black (Deno, Next.js, OpenJDK, Three.js) land on charcoal in
   Keyboard3D, which is what they should be. */

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
