import * as THREE from "three";
import { SVGLoader } from "three-stdlib";
import { LEGENDS } from "./legends";

/* ---------------------------------------------------------------------------
   Legends as geometry, not pixels.

   Naresh Khatri's keycaps carry their logo as a real mesh (his `legend`
   objects are ~500-vert flat shapes), which is why they stay razor sharp at
   any zoom while a canvas texture goes soft. Same idea here: the simple-icons
   path is parsed into shapes and triangulated once, then shared by every cap
   that uses it.

   Text legends (C#, SQL, REST, ...) still use the canvas path - they need a
   webfont, and triangulating type would mean shipping a font loader for six
   keys.
   --------------------------------------------------------------------------- */

const cache = new Map<string, THREE.BufferGeometry | null>();
const solidCache = new Map<string, THREE.BufferGeometry | null>();
const loader = new SVGLoader();

/** The shapes behind a mark, or null when it has no vector path. */
function legendShapes(label: string) {
  const path = LEGENDS[label]?.path;
  if (!path) return null;
  const box = LEGENDS[label]?.box ?? 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}"><path d="${path}"/></svg>`;
  const shapes = loader
    .parse(svg)
    .paths.flatMap((p) =>
      SVGLoader.createShapes(p as unknown as Parameters<typeof SVGLoader.createShapes>[0])
    );
  return shapes.length ? { shapes, box } : null;
}

/** Fit a mark into a 1x1 square on the origin, keeping its aspect. */
function normalise(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  geo.translate(
    -(b.min.x + b.max.x) / 2,
    -(b.min.y + b.max.y) / 2,
    -(b.min.z + b.max.z) / 2
  );
  const span = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
  if (span > 0) geo.scale(1 / span, 1 / span, 1 / span);
  geo.computeBoundingSphere();
  return geo;
}

/** The same mark as real extruded solid, standing in the XY plane facing the
 *  camera - for the hover card, where it is the hero rather than a legend.
 *
 *  Note the SVG y-down fix is a rotateX(PI), NOT a scale(1,-1,1): negative
 *  scale flips the determinant and turns a solid inside out. A proper
 *  rotation keeps the normals honest. */
export function legendExtrude(label: string): THREE.BufferGeometry | null {
  const hit = solidCache.get(label);
  if (hit !== undefined) return hit;

  const found = legendShapes(label);
  if (!found) {
    solidCache.set(label, null);
    return null;
  }
  const { shapes, box } = found;

  // Bevel and depth are in path units, so they scale with the source viewBox
  // (24 for simple-icons, 128 for devicon) and survive normalisation.
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: box * 0.1,
    bevelEnabled: true,
    bevelThickness: box * 0.012,
    bevelSize: box * 0.01,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.rotateX(Math.PI);
  normalise(geo);
  geo.computeVertexNormals();

  solidCache.set(label, geo);
  return geo;
}

/** Flat logo geometry, centred on the origin and lying in the XZ plane
 *  facing up, scaled so its longest side is 1. Returns null when the label
 *  has no vector mark (text legends fall back to the canvas texture). */
export function legendGeometry(label: string): THREE.BufferGeometry | null {
  const hit = cache.get(label);
  if (hit !== undefined) return hit;

  const path = LEGENDS[label]?.path;
  if (!path) {
    cache.set(label, null);
    return null;
  }

  // simple-icons is a 24-unit box; marks lifted from elsewhere (devicon's C#
  // is 128) carry their own. The geometry is normalised below either way, but
  // the parser needs the right extents.
  const box = LEGENDS[label]?.box ?? 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}"><path d="${path}"/></svg>`;
  const parsed = loader.parse(svg);
  // three-stdlib types SVGResultPaths slightly looser than ShapePath; the
  // runtime object is the same thing.
  const shapes = parsed.paths.flatMap((p) =>
    SVGLoader.createShapes(p as unknown as Parameters<typeof SVGLoader.createShapes>[0])
  );
  if (!shapes.length) {
    cache.set(label, null);
    return null;
  }

  const geo = new THREE.ShapeGeometry(shapes, 8);

  // SVG's y axis points down, so flip it before laying the shape flat; the
  // flip reverses winding, which the material answers with DoubleSide.
  geo.scale(1, -1, 1);
  geo.rotateX(-Math.PI / 2);

  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  geo.translate(
    -(b.min.x + b.max.x) / 2,
    -(b.min.y + b.max.y) / 2,
    -(b.min.z + b.max.z) / 2
  );
  const span = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  if (span > 0) geo.scale(1 / span, 1 / span, 1 / span);
  geo.computeBoundingSphere();

  cache.set(label, geo);
  return geo;
}
