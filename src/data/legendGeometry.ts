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
const loader = new SVGLoader();

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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
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
