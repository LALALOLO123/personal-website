import * as THREE from "three";

/* ---------------------------------------------------------------------------
   Studio shading without a studio.

   Shading baked into a texture and sampled by surface normal, so a mesh reads
   as lit while emitting nothing into the scene. Two reasons this is used
   rather than a light:

     - lights spill. The hover card's own point lights were washing the
       keyboard whenever a key was hovered, and three filters light layers by
       CAMERA rather than per object, so there is no way to light one thing and
       not another.
     - a light needs a room to make sense of. Everything in these sections
       floats in a void, and a void gives a real light nothing to fall on.
   --------------------------------------------------------------------------- */

let cached: THREE.CanvasTexture | null = null;

export function studioMatcap(): THREE.CanvasTexture {
  if (cached) return cached;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;

  // light from above, falling away toward the bottom of the sphere
  const base = ctx.createLinearGradient(0, 0, 0, S);
  base.addColorStop(0, "#ffffff");
  base.addColorStop(0.55, "#9aa0ac");
  base.addColorStop(1, "#3a3e47");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // key highlight, upper left
  const key = ctx.createRadialGradient(S * 0.34, S * 0.28, 0, S * 0.34, S * 0.28, S * 0.42);
  key.addColorStop(0, "rgba(255,255,255,0.95)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, S, S);

  // a rim, so extruded edges catch and the silhouette reads
  const rim = ctx.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
  rim.addColorStop(0, "rgba(255,255,255,0)");
  rim.addColorStop(1, "rgba(226,234,255,0.55)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, S, S);

  cached = new THREE.CanvasTexture(c);
  cached.colorSpace = THREE.SRGBColorSpace;
  return cached;
}
