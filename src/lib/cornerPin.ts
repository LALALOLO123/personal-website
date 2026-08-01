/* ---------------------------------------------------------------------------
   Corner pinning

   Maps an upright rectangle onto an arbitrary convex quadrilateral - the
   projector screen inside a photographed or generated plate, which is never
   axis-aligned.

   This is a plain 2D homography expressed as a CSS matrix3d. Using a real
   transform rather than drawing to a canvas matters: the transformed element
   is still a DOM element, so text stays selectable, video keeps decoding on
   the compositor, and hit-testing follows the warp for free - a click near
   the far corner lands where it looks like it lands.
   --------------------------------------------------------------------------- */

export type Point = { x: number; y: number };
/** Clockwise from the top left. */
export type Quad = [Point, Point, Point, Point];

/** Solve A·x = b by Gauss-Jordan with partial pivoting. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    // a degenerate quad (collinear or crossed corners) has no homography
    if (Math.abs(M[piv][col]) < 1e-10) return null;
    [M[col], M[piv]] = [M[piv], M[col]];

    const p = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * A CSS transform mapping the rectangle (0,0)-(w,h) onto `quad`.
 * Apply with `transform-origin: 0 0`.
 */
export function cornerPin(w: number, h: number, quad: Quad): string | null {
  const src: Quad = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  /* Eight unknowns, eight equations - two per corner. The projective terms
     (g, i) are what make this a homography rather than an affine transform,
     and they are the whole point: an affine map cannot represent perspective,
     so a screen viewed at an angle would shear instead of converge. */
  const A: number[][] = [];
  const b: number[] = [];
  for (let k = 0; k < 4; k++) {
    const s = src[k];
    const d = quad[k];
    A.push([s.x, s.y, 1, 0, 0, 0, -s.x * d.x, -s.y * d.x]);
    b.push(d.x);
    A.push([0, 0, 0, s.x, s.y, 1, -s.x * d.y, -s.y * d.y]);
    b.push(d.y);
  }

  const H = solve(A, b);
  if (!H) return null;
  const [a, c, e, f, g, i, j, k] = H;

  // column-major 4x4, with the 2D homography's third row moved to w
  const m = [a, f, 0, j, c, g, 0, k, 0, 0, 1, 0, e, i, 0, 1];
  return `matrix3d(${m.map((v) => Number(v.toFixed(6))).join(",")})`;
}
