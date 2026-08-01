/* ---------------------------------------------------------------------------
   Real props for the work section, from Poly Haven.

   The projector and screen were primitives - a rounded box with two cylinders
   stuck on it - which is exactly what "rough shapes posing as objects" looks
   like. These are scanned models with real geometry and PBR maps, CC0, so no
   attribution is required (credited anyway in the footer).

   1k textures: the props are never more than a third of the frame, and the 2k
   set triples the payload for detail nobody sees at this distance.

   Dev-only, run by hand:  node scripts/gen-models.cjs
   --------------------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const RES = "1k";
const ASSETS = ["filmstrip_projector_8mm", "projector_screen"];
const OUT = "public/models";

async function grab(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async () => {
  for (const id of ASSETS) {
    const meta = await (
      await fetch(`https://api.polyhaven.com/files/${id}`, { headers: { "User-Agent": UA } })
    ).json();
    const entry = meta.gltf?.[RES]?.gltf;
    if (!entry) {
      console.log(`  MISS ${id} (no ${RES} gltf)`);
      continue;
    }

    const dir = path.join(OUT, id);
    let total = await grab(entry.url, path.join(dir, `${id}.gltf`));

    // the .gltf references these by relative path, so the tree has to match
    for (const [rel, file] of Object.entries(entry.include ?? {})) {
      total += await grab(file.url, path.join(dir, rel));
    }
    console.log(`${id}: ${(total / 1048576).toFixed(2)}MB -> ${dir}`);
  }
  console.log("\nPoly Haven, CC0. No attribution required; credited in the footer anyway.");
})();
