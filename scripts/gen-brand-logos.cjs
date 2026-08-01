/* ---------------------------------------------------------------------------
   Full-colour official logos for the hover card.

   The keycaps wear simple-icons' monochrome glyphs, which is right for a
   legend but is a stylised stand-in for the real mark. The card shows the
   logo as the brand actually publishes it, in colour, so these are devicon's
   `-original` files (MIT, github.com/devicons/devicon).

   Fetched into public/ rather than bundled: they are only needed when a key is
   hovered, and inlining 35 SVGs would put ~70KB into the 3D chunk for
   something most visitors never trigger.

   Dev-only, run by hand:  node scripts/gen-brand-logos.cjs
   --------------------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");

const BASE = "https://raw.githubusercontent.com/devicons/devicon/master/icons";
const OUT = "public/logos/brand";

/* label -> devicon slug. Only entries whose devicon logo is genuinely the
   same product: "SQL" is deliberately absent, because devicon's nearest match
   is Azure SQL Database, which is a different thing. */
const BRAND = {
  "C++": "cplusplus",
  "C#": "csharp",
  Java: "java",
  Python: "python",
  TypeScript: "typescript",
  JavaScript: "javascript",
  Swift: "swift",
  Haskell: "haskell",
  Bash: "bash",
  HTML: "html5",
  CSS: "css3",
  React: "react",
  "Next.js": "nextjs",
  Vite: "vitejs",
  Node: "nodejs",
  npm: "npm",
  Deno: "denojs",
  Vercel: "vercel",
  "Three.js": "threejs",
  Unity: "unity",
  FastAPI: "fastapi",
  PyTorch: "pytorch",
  PostgreSQL: "postgresql",
  Supabase: "supabase",
  DynamoDB: "dynamodb",
  Docker: "docker",
  Linux: "linux",
  Vim: "vim",
  Git: "git",
  "GitHub Actions": "githubactions",
  Playwright: "playwright",
  LLVM: "llvm",
  GitHub: "github",
  LinkedIn: "linkedin",
  Poetry: "poetry",
};

/* These get extruded into solid geometry at runtime, one mesh per fill, so
   path count is a real cost - not just download size. Tux is 712 paths of
   detailed shading and LLVM's dragon is 172KB of curve data; both would melt
   the frame rate for a logo that reads fine as the monochrome mark. Anything
   past these limits falls back to the simple-icons glyph. */
const MAX_PATHS = 60;
const MAX_BYTES = 40 * 1024;

/** SVGLoader cannot resolve `fill="url(#grad)"` - Color.setStyle rejects it
 *  and the path silently stays white. Gradients are flattened to a single
 *  representative colour here so the runtime only ever sees plain fills. */
function flattenGradients(svg) {
  const stops = {};
  for (const m of svg.matchAll(/<(?:linear|radial)Gradient[^>]*\bid="([^"]+)"([\s\S]*?)<\/(?:linear|radial)Gradient>/g)) {
    const cols = [...m[2].matchAll(/stop-color\s*[:=]\s*"?(#[0-9a-fA-F]{3,6})/g)].map((s) => s[1]);
    if (cols.length) stops[m[1]] = cols[Math.floor((cols.length - 1) / 2)];
  }
  // xlink:href chains - a gradient that only carries coordinates
  for (const m of svg.matchAll(/<(?:linear|radial)Gradient[^>]*\bid="([^"]+)"[^>]*(?:xlink:)?href="#([^"]+)"/g)) {
    if (!stops[m[1]] && stops[m[2]]) stops[m[1]] = stops[m[2]];
  }
  svg = svg.replace(/url\(#([^)]+)\)/g, (whole, id) => stops[id] ?? whole);
  /* Anything still unresolved is a gradient whose stops carry no colour -
     Supabase's is a black-to-transparent shading overlay laid over the mark.
     Those are decoration, not brand colour: dropped, because rendering them
     as flat black would put a dark slab across the logo. */
  return svg.replace(/(fill|stroke)="url\(#[^)]+\)"/g, '$1="none"');
}

async function grab(slug, variant) {
  const res = await fetch(`${BASE}/${slug}/${slug}-${variant}.svg`);
  if (!res.ok) return null;
  const svg = flattenGradients(await res.text());
  const shapes = (svg.match(/<(path|circle|ellipse|polygon|polyline|rect)\b/g) || []).length;
  const bytes = Buffer.byteLength(svg);
  if (shapes > MAX_PATHS || bytes > MAX_BYTES) {
    return { tooHeavy: `${shapes} shapes, ${(bytes / 1024) | 0}KB` };
  }
  return { svg };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  const notes = [];
  let wordmarks = 0;

  for (const [label, slug] of Object.entries(BRAND)) {
    const icon = await grab(slug, "original");
    if (!icon?.svg) {
      notes.push(`${label}: monochrome mark${icon?.tooHeavy ? ` (${icon.tooHeavy})` : ""}`);
      continue;
    }
    fs.writeFileSync(path.join(OUT, `${slug}.svg`), icon.svg);
    const entry = { logo: `/logos/brand/${slug}.svg` };

    /* The brand's own lockup: the mark plus its name set in THEIR typeface.
       Where this exists the card shows it in place of icon-plus-caption, so
       the name is never in a generic 3D font. */
    const wm = await grab(slug, "original-wordmark");
    if (wm?.svg) {
      fs.writeFileSync(path.join(OUT, `${slug}-wordmark.svg`), wm.svg);
      entry.wordmark = `/logos/brand/${slug}-wordmark.svg`;
      wordmarks++;
    } else if (wm?.tooHeavy) {
      notes.push(`${label}: no wordmark (${wm.tooHeavy})`);
    }
    manifest[label] = entry;
  }

  fs.writeFileSync("scripts/brand-logos.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `${Object.keys(manifest).length}/${Object.keys(BRAND).length} logos, ` +
      `${wordmarks} with the brand's own logotype -> ${OUT}`
  );
  if (notes.length) console.log("fallbacks:\n  " + notes.join("\n  "));
})();
