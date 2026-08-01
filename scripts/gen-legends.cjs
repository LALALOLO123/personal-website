const si = require("simple-icons");
/* Full-colour official logos for the hover card, written by
   scripts/gen-brand-logos.cjs. The keycap keeps its monochrome glyph. */
const BRAND_LOGOS = require("./brand-logos.json");
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

/* Real logos that simple-icons does not carry, or carries wrongly. Unlike
   CUSTOM these are the actual marks rather than glyphs standing in for one,
   so they keep the brand's own colour and their source viewBox. */
const VECTOR = {
  // simple-icons only carries OpenJDK, whose mark is Duke the mascot - a
  // rocket shape nobody reads as Java. This is the actual cup logo.
  Java: {
    hex: "5382A1",
    box: 128,
    // devicon (MIT, github.com/devicons/devicon) - java-plain
    path: "M47.617 98.12c-19.192 5.362 11.677 16.439 36.115 5.969-4.003-1.556-6.874-3.351-6.874-3.351-10.897 2.06-15.952 2.222-25.844 1.092-8.164-.935-3.397-3.71-3.397-3.71zm33.189-10.46c-14.444 2.779-22.787 2.69-33.354 1.6-8.171-.845-2.822-4.805-2.822-4.805-21.137 7.016 11.767 14.977 41.309 6.336-3.14-1.106-5.133-3.131-5.133-3.131zm11.319-60.575c.001 0-42.731 10.669-22.323 34.187 6.024 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.793 15.634-29.58zm9.998 81.144s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.095.171-4.45-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.952-3.487-32.013 6.85-13.742 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM85 77.896c2.395-1.634 5.703-3.053 5.703-3.053s-9.424 1.685-18.813 2.474c-11.494.964-23.823 1.154-30.012.326-14.652-1.959 8.033-7.348 8.033-7.348s-8.812-.596-19.644 4.644C17.455 81.134 61.958 83.958 85 77.896zm5.609 15.145c-.108.29-.468.616-.468.616 31.273-8.221 19.775-28.979 4.822-23.725-1.312.464-2 1.543-2 1.543s.829-.334 2.678-.72c7.559-1.575 18.389 10.119-5.032 22.286zM64.181 70.069c-4.614-10.429-20.26-19.553.007-35.559C89.459 14.563 76.492 1.587 76.492 1.587c5.23 20.608-18.451 26.833-26.999 39.667-5.821 8.745 2.857 18.142 14.688 28.815zm27.274 51.748c-19.187 3.612-42.854 3.191-56.887.874 0 0 2.874 2.38 17.646 3.331 22.476 1.437 57-.8 57.816-11.436.001 0-1.57 4.032-18.575 7.231z",
  },
  "C#": {
    hex: "9B4F96",
    box: 128,
    // devicon (MIT, github.com/devicons/devicon) - csharp-plain: the official
    // hex mark with the C# knocked out of it. simple-icons has no C# at all.
    path: "M117.5 33.5l.3-.2c-.6-1.1-1.5-2.1-2.4-2.6L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.3.9 3.4l-.2.1c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c.1-.8 0-1.7-.4-2.6zm-53.5 70c-21.8 0-39.5-17.7-39.5-39.5S42.2 24.5 64 24.5c14.7 0 27.5 8.1 34.3 20l-13 7.5C81.1 44.5 73.1 39.5 64 39.5c-13.5 0-24.5 11-24.5 24.5s11 24.5 24.5 24.5c9.1 0 17.1-5 21.3-12.4l12.9 7.6c-6.8 11.8-19.6 19.8-34.2 19.8zM115 62h-3.2l-.9 4h4.1v5h-5l-1.2 6h-4.9l1.2-6h-3.8l-1.2 6h-4.8l1.2-6H94v-5h3.5l.9-4H94v-5h5.3l1.2-6h4.9l-1.2 6h3.8l1.2-6h4.8l-1.2 6h2.2v5zm-12.7 4h3.8l.9-4h-3.8z",
  },
};

/* Accellera publishes official logos for all three HDLs and grants use of
   them freely (accellera.org/about/policies-and-procedures/logo-use), but
   only as raster - and two of the three are white-background files with no
   alpha at all. scripts/gen-logo-masks.cjs turns each into a white-ink mask
   so it can sit on a coloured cap like every other legend, and the cap takes
   the logo's own dominant colour. This does recolour them, which their policy
   discourages; Brian asked for the logos over text. */
const IMG = {
  SystemVerilog: { hex: "1A5388", img: "/logos/systemverilog.png" },
  VHDL: { hex: "38AA8C", img: "/logos/vhdl.png" },
  SystemRDL: { hex: "01468B", img: "/logos/systemrdl.png" },
};

/* Marks that ARE the name - setting the name in type underneath them on the
   hover card just prints the word twice. These show the logo alone. */
const WORDMARK = ["SystemVerilog", "VHDL", "SystemRDL", "WebGL"];

/* LinkedIn's mark is trademarked and simple-icons carries no path for it, so
   it is drawn in legendTexture instead - a tile with the letters knocked out,
   which is the actual logo rather than the bare word. Nothing else on the
   board is type. */
const TEXT = {
  "LinkedIn": "7FB3E8",
};
const TEXT_LEGEND = {
  "LinkedIn": "in",
};

const out = {};
for (const [label, slug] of MAP) {
  const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
  const icon = si[key];
  if (!icon) throw new Error("missing " + slug);
  out[label] = { path: icon.path, hex: icon.hex };
}
for (const [label, v] of Object.entries(CUSTOM)) out[label] = v;
for (const [label, v] of Object.entries(VECTOR)) out[label] = v;
for (const [label, v] of Object.entries(IMG)) out[label] = v;
for (const [label, hex] of Object.entries(TEXT)) out[label] = { text: TEXT_LEGEND[label], hex };
for (const label of WORDMARK) if (out[label]) out[label].wordmark = true;
for (const [label, v] of Object.entries(BRAND_LOGOS)) {
  if (!out[label]) continue;
  out[label].logo = v.logo;
  if (v.wordmark) out[label].logoWordmark = v.wordmark;
}

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
    if (v.box) fields.push(`box: ${v.box}`);
    if (v.img) fields.push(`img: "${v.img}"`);
    if (v.text) fields.push(`text: "${v.text}"`);
    if (v.wordmark) fields.push("wordmark: true");
    if (v.logo) fields.push(`logo: "${v.logo}"`);
    if (v.logoWordmark) fields.push(`logoWordmark: "${v.logoWordmark}"`);
    return `  ${JSON.stringify(label)}: { ${fields.join(", ")} },`;
  })
  .join("\n");

fs.writeFileSync(
  "src/data/legends.ts",
  `// GENERATED - do not edit by hand. Regenerate with scripts/gen-legends.js.
// Logo outlines extracted from simple-icons at build time so the 3,000-icon
// package never reaches the bundle. Paths are in a 24x24 viewBox.
export type Legend = {
  hex: string;
  /** Vector mark, in a \`box\`-unit square viewBox (default 24). */
  path?: string;
  box?: number;
  /** White-ink mask served from /public, for logos that only exist as raster. */
  img?: string;
  text?: string;
  /** The mark already spells the name; the hover card omits the caption. */
  wordmark?: boolean;
  /** Full-colour official logo, for the hover card only. */
  logo?: string;
  /** The brand's own lockup: mark plus name in their typeface. */
  logoWordmark?: string;
};

export const LEGENDS: Record<string, Legend> = {
${body}
};
`
);
console.log("wrote src/data/legends.ts  (" + Object.keys(out).length + " legends)");
