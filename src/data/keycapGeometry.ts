import * as THREE from "three";

/* ---------------------------------------------------------------------------
   The keycap mesh, lifted from Naresh Khatri's Spline scene.

   Source: github.com/Naresh-Khatri/3d-portfolio — `skills-keyboard.spline`,
   MIT licensed ("free to use, credit appreciated"). We extracted the
   `keycap-desktop` mesh (5,120 verts / 2,560 tris) and normalised it; the
   sculpting is his, everything around it - layout, legends, lighting,
   choreography - is ours.

   Normalisation: footprint becomes 1 x 1 on x/z centred at the origin, height
   becomes HEIGHT_RATIO, and the cap is centred vertically so it drops into the
   same convention our procedural cap used (top face at +h/2).
   --------------------------------------------------------------------------- */

/** His cap: 226.4 tall over a 296.7 footprint. */
export const HEIGHT_RATIO = 226.4 / 296.7;

type Payload = {
  position: number[];
  normal: number[];
  index: number[] | null;
};

let cached: THREE.BufferGeometry | null = null;
let inflight: Promise<THREE.BufferGeometry> | null = null;

function build(p: Payload): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p.position, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(p.normal, 3));
  if (p.index) g.setIndex(p.index);

  // Normalise into our units: 1 x 1 footprint, HEIGHT_RATIO tall, centred.
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const width = b.max.x - b.min.x;
  const s = 1 / width;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  g.computeBoundingSphere();
  return g;
}

/* Wide caps must not be scaled on x - that stretches the moulded corner
   radius and the cap stops looking like the same object. Instead the mesh is
   sliced at the centreline and the two halves are pushed apart, so the
   profile is untouched and only the flat middle grows. */
const widened = new Map<number, THREE.BufferGeometry>();

export function capGeometry(base: THREE.BufferGeometry, widthRatio: number): THREE.BufferGeometry {
  const key = Math.round(widthRatio * 1000);
  const hit = widened.get(key);
  if (hit) return hit;
  if (widthRatio <= 1.001) {
    widened.set(key, base);
    return base;
  }

  const g = base.clone();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const delta = (widthRatio - 1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setX(i, x >= 0 ? x + delta : x - delta);
  }
  pos.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  widened.set(key, g);
  return g;
}

/** Suspense-friendly: throws the fetch promise until the mesh is ready.
 *  Keyboard3D already renders inside a <Suspense> boundary. */
export function useKeycapGeometry(): THREE.BufferGeometry {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/models/keycap-geo.json")
      .then((r) => {
        if (!r.ok) throw new Error(`keycap geometry ${r.status}`);
        return r.json() as Promise<Payload>;
      })
      .then((p) => {
        cached = build(p);
        return cached;
      });
  }
  throw inflight;
}
