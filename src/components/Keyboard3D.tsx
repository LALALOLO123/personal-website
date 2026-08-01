import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text3D } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { LEGENDS } from "../data/legends";
import { studioMatcap } from "../data/matcap";
import { useKeycapGeometry, capGeometry, HEIGHT_RATIO } from "../data/keycapGeometry";
import { legendGeometry, legendExtrude, brandLogo } from "../data/legendGeometry";
import { playPress, playRelease, playStageLight } from "../data/keySound";

/* ---------------------------------------------------------------------------
   Layout

   Four rows, ANSI-style stagger. Order is deliberate: the board is tilted
   toward the viewer, so the front rows sit closest and read first. The AWS /
   data-layer keys are on the front row, the daily drivers on the home row,
   and tooling recedes to the back.
   --------------------------------------------------------------------------- */

type CapAction = "github" | "email" | "linkedin" | "source" | "wave";
type Cap = { label: string; w: number; blank?: boolean; action?: CapAction };

/* Proportioned like a 60% board. The left column GROWS as it descends -
   1u number row, 1.5u tab, 1.75u caps, 2.25u shift - and the right column
   carries the wide backspace / backslash / enter / shift caps. Everything
   between the two edges is 1u, the way it is on a real board.

   Rows are laid out left-aligned from x=0, so those differing left caps
   produce the genuine ANSI stagger for free: no row lines up with the one
   above it, which is exactly what makes a keyboard read as a keyboard.

   Rows are grouped by kind: languages, then the browser, then backend and
   cloud, then systems and silicon, then the function row. Everything here is
   on one of Brian's resumes or in this repo. */
const ROW_W = 12;

const row = (left: number, right: number, labels: string[]): Cap[] =>
  labels.map((label, i) => ({
    label,
    w: i === 0 ? left : i === labels.length - 1 ? right : 1,
  }));

const ROWS: { caps: Cap[] }[] = [
  // number row: 1u through, wide "backspace" on the right
  { caps: row(1, 2, ["C++", "C#", "Java", "Python", "TypeScript", "JavaScript", "Swift", "Haskell", "Bash", "SQL", "HTML"]) },
  // tab row
  { caps: row(1.5, 1.5, ["CSS", "React", "Next.js", "Vite", "Node", "npm", "Deno", "Vercel", "Three.js", "WebGL", "Unity"]) },
  // caps row, ending on the wide "enter"
  { caps: row(1.75, 2.25, ["FastAPI", "Poetry", "PyTorch", "OpenRouter", "PostgreSQL", "Supabase", "DynamoDB", "AWS Lambda", "API Gateway", "Docker"]) },
  // shift row: the two widest caps on the board bracket it
  { caps: row(2.25, 2.75, ["VHDL", "Linux", "Vim", "Git", "GitHub Actions", "Playwright", "LLVM", "SystemRDL", "SystemVerilog"]) },
  {
    caps: [
      { label: "GitHub", w: 1.5, action: "github" },
      { label: "Email", w: 1.5, action: "email" },
      { label: "shipped, not read about", w: 6, blank: true, action: "wave" },
      { label: "Source", w: 1.5, action: "source" },
      { label: "LinkedIn", w: 1.5, action: "linkedin" },
    ],
  },
];

const U = 1.0; // one key unit
const GAP = 0.16; // airy gaps: every cap reads as its own object
const TRAVEL = 0.22; // how far a key sinks when hovered
const BASE = U - GAP; // a 1u cap footprint
const CAP_H = HEIGHT_RATIO * BASE; // his cap proportions exactly

/* Uniform rows, no sculpt: the toy-like grid reads cleaner at product scale
   than a realistic Cherry profile ever did. Flat values rather than a
   per-row table, which silently returned undefined the moment a row was
   added. */
const ROW_LIFT = 0.3;
const ROW_TILT = 0;

/* The product pose from Brian's reference photo: standing on one corner,
   LONG SIDE VERTICAL with a slight lean, face toward the camera. Composed in
   world space - first tip the face to the camera, then roll around the view
   axis - so the angles mean what they say. */
const POSE_TIP = 1.42; // about X: face square-on to the camera, bottom edge nearest
const POSE_ROLL = -0.75; // about Z: halfway between standing on a corner and flat
const POSE_YAW = -0.16; // about Y: a hint of turn only - the face stays toward us
/* Applied LAST, so it acts on the finished pose in world space rather than in
   the board's own frame: a tilt about the horizontal screen axis. Negative
   pushes the upper half away from the viewer and swings the lower half
   toward them - the depth cue TIP/YAW could not give, because both of those
   act before the roll and end up turning the face instead of leaning it. */
const POSE_LEAN = -0.26;
const FINAL_Q = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), POSE_LEAN)
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), POSE_YAW))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), POSE_ROLL))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), POSE_TIP));
const FLAT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.62);
/** Where the board rests before it stands up: inside the spotlight, fully in
 *  frame, tipped enough that you can read it as a keyboard. */
const FLAT_POS = new THREE.Vector3(0, -1.15, 1.0);
const POSE_POS = new THREE.Vector3(0, 0.55, 0);

/* Everything the whole board shares per frame; Key legends read the lamp so
   the unlit logo materials cannot glow before the spotlight is on. */
/* `ready` is false until the board has finished standing up. A stray mouse
   position over where a key WILL be was popping company names on screen
   mid-move, before the board had even landed. */
/* lamp STARTS at 0, and that matters. The canvas mounts before the section is
   entered (an IntersectionObserver brings it in early) and R3F renders that
   commit immediately - before any useFrame has run. At lamp 1 the legends,
   which are unlit and multiplied by it, drew at full brightness for that one
   frame: every logo flashing white against black caps just as the section
   arrives. Measured at 612ms after the scroll: max channel 241 with zero
   saturation, black either side of it. */
const STAGE = { lamp: 0, dark: true, ready: false };

/* Full black before the lamp strikes. Measured from when the section ARMS,
   which is the start of the 850ms scroll, not the end of it - so this has to
   cover the journey as well as the pause. Nets out around 1.5s of black once
   the page has actually settled. */
const BLACKOUT = 2.4;
/** And then it is just ON - a switch thrown, not a fade. */
const STRIKE = 0.2;

/** Timestamp of the last spacebar hit; every key ripples off it. */
const WAVE = { at: 0 };

/** Someone who asked for less motion gets none of the parallax. */
const STILL =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// scratch, so the parallax allocates nothing per frame
const parQ = new THREE.Quaternion();
const parE = new THREE.Euler();

type Placed = Cap & { x: number; z: number; row: number; capW: number };

function buildLayout() {
  // A row that does not add up to ROW_W just renders slightly ragged, which
  // is easy to miss and maddening to chase. Say so instead. Five rows, so
  // this is not worth gating behind a dev flag.
  ROWS.forEach((r, i) => {
    const w = r.caps.reduce((s, c) => s + c.w, 0);
    if (Math.abs(w - ROW_W) > 1e-9) {
      console.warn(`Keyboard row ${i} is ${w}u wide, expected ${ROW_W}u`);
    }
  });

  const placed: Placed[] = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    for (const cap of row.caps) {
      placed.push({ ...cap, capW: cap.w * U - GAP, x: x + (cap.w * U) / 2, z: r * U, row: r });
      x += cap.w * U;
    }
  });

  // Centre the whole board on the origin rather than guessing at the offsets.
  const xs = placed.flatMap((p) => [p.x - p.capW / 2, p.x + p.capW / 2]);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const midX = (lo + hi) / 2;
  const midZ = ((ROWS.length - 1) * U) / 2;
  for (const p of placed) {
    p.x -= midX;
    p.z -= midZ;
  }

  return { placed, width: hi - lo, depth: (ROWS.length - 1) * U + (U - GAP) };
}

/* ---------------------------------------------------------------------------
   Legends

   Drawn to a canvas in white on transparent, then tinted by the material
   colour so one texture serves both the resting and hovered states.
   --------------------------------------------------------------------------- */

/** Ink bounds of a 24x24 path, found by rasterising it once and scanning alpha.
 *  Simple Icons paths do not all fill their viewBox - some are inset, and the
 *  wordmarks (WebGL) are wide and short. Centring on the viewBox instead of on
 *  the actual ink leaves those marks small and off-centre on the cap. */
function inkBounds(path: string, box = 24) {
  const N = 64;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.scale(N / box, N / box);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(path));

  const d = ctx.getImageData(0, 0, N, N).data;
  let minX = N, minY = N, maxX = -1, maxY = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (d[(y * N + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const u = box / N; // back to path units
  return {
    x: minX * u,
    y: minY * u,
    w: (maxX - minX + 1) * u,
    h: (maxY - minY + 1) * u,
  };
}

/** The patch of cap a legend gets. Raster wordmarks (the Accellera marks)
 *  are wide and short, so they are given nearly the whole cap - at the 0.78
 *  used for logo marks they came out noticeably smaller than the vector
 *  wordmarks next to them, which get scaled up separately via MARK_SCALE.
 *  Shared, so the texture's aspect and the mesh it lands on cannot drift. */
function legendPlane(cap: Cap) {
  const capW = cap.w * U - GAP;
  return { w: capW * (LEGENDS[cap.label]?.img ? 0.94 : 0.78), d: (U - GAP) * 0.7 };
}

function legendTexture(cap: Cap): THREE.CanvasTexture | null {
  if (!cap.label) return null; // blank modifier caps carry nothing
  const S = 256;
  // Canvas aspect matches the legend plane on this cap, so wide caps get
  // wide textures and nothing ever stretches.
  const plane = legendPlane(cap);
  const W = Math.max(1, Math.round(S * (plane.w / plane.d)));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const L = LEGENDS[cap.label];
  if (cap.label === "LinkedIn") {
    /* LinkedIn's mark is a rounded square with the letters knocked OUT of it.
       Drawing the letters alone - which is all a text legend can do - just
       reads as the word "in". Simple Icons carries no LinkedIn path
       (trademark), so it is punched here instead: fill the tile, then erase
       the type so the cap colour shows through. */
    const s = Math.min(W, S) * 0.66;
    const x0 = (W - s) / 2;
    const y0 = (S - s) / 2;
    ctx.beginPath();
    ctx.roundRect(x0, y0, s, s, s * 0.2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.font = `700 ${s * 0.6}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText("in", W / 2, S / 2 + s * 0.03);
    ctx.globalCompositeOperation = "source-over";
  } else if (cap.blank) {
    // the spacebar motto: letterspaced type, shrunk to fit
    const spaced = cap.label.split("").join(" ");
    const face = (n: number) => `500 ${n}px "JetBrains Mono", ui-monospace, monospace`;
    let size = S * 0.16;
    ctx.font = face(size);
    const measured = ctx.measureText(spaced).width;
    if (measured > W * 0.88) {
      size *= (W * 0.88) / measured;
      ctx.font = face(size);
    }
    ctx.fillText(spaced, W / 2, S / 2);
  } else if (L?.path) {
    const b = inkBounds(L.path, L.box);
    if (!b) return null;
    const scale = Math.min((W * 0.56) / b.w, (S * 0.6) / b.h);
    ctx.save();
    ctx.translate(W / 2 - (b.x + b.w / 2) * scale, S / 2 - (b.y + b.h / 2) * scale);
    ctx.scale(scale, scale);
    ctx.fill(new Path2D(L.path));
    ctx.restore();
  } else if (L?.text) {
    let size = L.text.length > 3 ? S * 0.26 : S * 0.34;
    ctx.font = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`;
    const measured = ctx.measureText(L.text).width;
    if (measured > W * 0.8) {
      size *= (W * 0.8) / measured;
      ctx.font = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`;
    }
    ctx.fillText(L.text, W / 2, S / 2 + size * 0.04);
  } else if (!L?.img) {
    return null;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  if (L?.img) {
    /* The official Accellera marks are raster only, pre-flattened to white
       ink on transparent. Drawn after the fact because decoding is async -
       the texture is already on the material by then, so it just needs to be
       told it changed. Wordmarks, so they take the cap's full width. */
    const im = new Image();
    im.onload = () => {
      const s = Math.min((W * 0.98) / im.width, (S * 0.8) / im.height);
      ctx.drawImage(
        im,
        W / 2 - (im.width * s) / 2,
        S / 2 - (im.height * s) / 2,
        im.width * s,
        im.height * s
      );
      tex.needsUpdate = true;
    };
    im.src = L.img;
  }

  return tex;
}

/* ---------------------------------------------------------------------------
   A single key
   --------------------------------------------------------------------------- */

/* Colourway. "white" is the post-black-section variant from the hero video
   plan: clean glossy white like the BRIAN FU street letters. */
const KB_VARIANT = "candy" as "dark" | "white" | "candy";

const DARKWAY = { cap: "#26262c", hover: "#3a3a44", mute: "#d5d1c8", case: "#17171c", plate: "#0d0d11", capRough: 0.58, capMetal: 0.14 };
const WHITEWAY = { cap: "#f1efe9", hover: "#ffffff", mute: "#7a766c", case: "#e6e3dc", plate: "#cfccc4", capRough: 0.3, capMetal: 0.05 };
/* candy: each cap wears its brand colour with a white legend; the case goes
   near-black soap-bar. Blanks and the spacebar stay charcoal fillers. */
/* Satin, not gloss: at roughness 0.38 the lamp threw a broad specular sheen
   across each top face and the near caps washed out to pastel. A rougher,
   non-metallic cap keeps the brand colour instead of the highlight. */
const CANDYWAY = { cap: "#2b2b31", hover: "#3a3a44", mute: "#e8e5de", case: "#1b1b20", plate: "#101014", capRough: 0.54, capMetal: 0 };
const WAY = KB_VARIANT === "white" ? WHITEWAY : KB_VARIANT === "candy" ? CANDYWAY : DARKWAY;

const CAP_COLOR = WAY.cap;
const CAP_HOVER = new THREE.Color(WAY.hover);
const CAP_REST = new THREE.Color(CAP_COLOR);
const LEGEND_MUTE = new THREE.Color(WAY.mute);

function luminance(hex: string): number {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** On white caps, near-white brand marks (Unity, Deno, Next.js, OpenJDK)
 *  would vanish; pull any too-light legend down to ink. */
function legibleHex(hex: string): string {
  if (KB_VARIANT !== "white") return hex;
  return luminance(hex) > 0.62 ? "#26262c" : hex;
}

/** The charcoal every cap falls back to. */
const NEUTRAL = CANDYWAY.cap;

/* legends.ts now publishes brand colours untouched, so this only covers what
   it cannot: text legends (whose hex is the ink colour, not a brand colour),
   Java, and the keys with no brand at all. */
const CAP_TINT: Record<string, string> = {
  // simple-icons publishes OpenJDK as black; the Java logo's own blue keeps
  // the languages row from turning into a wall of charcoal.
  LinkedIn: "#0A66C2",
  // no brand of its own: chosen, not sourced
  SQL: "#3E5C76",
  // the function keys stay charcoal, like the modifiers on a real board
  Email: NEUTRAL,
  Source: NEUTRAL,
};

/* The band a white legend can actually sit on. */
const CAP_LUM_MIN = 0.05;
const CAP_LUM_MAX = 0.55;

const hsl = { h: 0, s: 0, l: 0 };

/** Pull an out-of-band brand into the band WITHOUT throwing its hue away, so
 *  a yellow brand stays yellow instead of becoming yet another black key.
 *  Only genuinely colourless brands fall through to charcoal. */
function fitToCap(hex: string): string {
  const c = new THREE.Color(hex);
  c.getHSL(hsl, THREE.SRGBColorSpace);
  // Vercel, Next.js, Deno, Three.js, Unity and GitHub are not "missing" a
  // colour - their marks really are black or white. Nothing to preserve.
  if (hsl.s < 0.14) return NEUTRAL;
  c.setHSL(
    hsl.h,
    Math.max(hsl.s, 0.42),
    THREE.MathUtils.clamp(hsl.l, 0.2, 0.38),
    THREE.SRGBColorSpace
  );
  return `#${c.getHexString()}`;
}

/** The cap's colour: the brand's own where it can carry a white legend, a
 *  deepened version of it where it cannot, charcoal only when there is no
 *  colour to keep. */
function capColor(label: string, blank?: boolean): string {
  if (blank) return NEUTRAL;
  const hex = CAP_TINT[label] ?? LEGENDS[label]?.hex;
  if (!hex) return NEUTRAL;
  const lum = luminance(hex);
  return lum < CAP_LUM_MIN || lum > CAP_LUM_MAX ? fitToCap(hex) : hex;
}

/** Wordmarks normalise to their longest side, so a wide, short mark like
 *  WebGL's ends up a thin strip on the cap. These get scaled back up. */
const MARK_SCALE: Record<string, number> = {
  WebGL: 1.85,
  LLVM: 1.2,
  OpenRouter: 1.1,
};

type KeyProps = {
  cap: Placed;
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture | null;
  active: boolean;
  onEnter: (label: string) => void;
  onLeave: (label: string) => void;
  onAction: (a: CapAction) => void;
  /** Ripple offset in seconds; the wave easter egg staggers by column. */
  waveAt: number;
};

const Key = memo(function Key({ cap, geometry, texture, active, onEnter, onLeave, onAction, waveAt }: KeyProps) {
  const group = useRef<THREE.Group>(null);
  const capMat = useRef<THREE.MeshStandardMaterial>(null);
  const legendMat = useRef<THREE.MeshBasicMaterial>(null);
  const press = useRef(0);

  const baseY = ROW_LIFT;

  // Resting legends sit slightly back from full brightness so the board reads
  // as one object; hovering brings the mark all the way up.
  const [rest, brand, capRest, capHover] = useMemo(() => {
    if (KB_VARIANT === "candy") {
      const base = new THREE.Color(capColor(cap.label, cap.blank));
      const hover = base.clone().offsetHSL(0, 0.02, 0.09);
      // ONE ink colour for the whole board. Switching the mark between white
      // and black to chase contrast made the board look like two keyboards
      // shuffled together; capColor guarantees every cap can hold white, so
      // the ink never has to move.
      const mark = new THREE.Color("#ffffff");
      return [mark.clone().multiplyScalar(cap.blank ? 0.6 : 0.88), mark, base, hover];
    }
    const b = new THREE.Color(legibleHex(cap.blank ? (KB_VARIANT === "dark" ? "#9a958a" : "#8a8578") : LEGENDS[cap.label]?.hex ?? "#d5d1c8"));
    return [b.clone().lerp(LEGEND_MUTE, 0.28), b, CAP_REST, CAP_HOVER];
  }, [cap.label, cap.blank]);

  useFrame((_, dt) => {
    // Frame-rate independent easing, clamped so a long frame cannot overshoot.
    const step = 1 - Math.pow(0.0001, Math.min(dt, 0.1));
    press.current += ((active ? 1 : 0) - press.current) * step;
    const p = press.current;

    // hover press + the ripple, so a key can ride both at once
    let sink = p * TRAVEL;
    if (WAVE.at > 0) {
      const since = performance.now() / 1000 - WAVE.at - waveAt;
      if (since > 0 && since < 0.5) {
        // deep enough to read as a wave rolling across the board
        sink += Math.sin((since / 0.5) * Math.PI) * TRAVEL * 2.4;
      }
    }
    if (group.current) group.current.position.y = baseY - sink;
    if (legendMat.current) {
      legendMat.current.color.lerpColors(rest, brand, p);
      legendMat.current.color.multiplyScalar(STAGE.lamp);
    }
    if (capMat.current) capMat.current.color.lerpColors(capRest, capHover, p);
  });

  const enter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      playPress();
      onEnter(cap.label);
    },
    [cap.label, onEnter]
  );
  const leave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      playRelease();
      onLeave(cap.label);
    },
    [cap.label, onLeave]
  );
  const click = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!cap.action) return;
      e.stopPropagation();
      onAction(cap.action);
    },
    [cap.action, onAction]
  );

  // Sit the legend just clear of the un-dished rim. Floating it above the whole
  // top face rather than tucking it into the scoop means it can never be
  // swallowed by the cap, and 4 thousandths of a unit is invisible at this size.
  const legendY = CAP_H / 2 + 0.004;
  const vector = cap.blank ? null : legendGeometry(cap.label);
  // marks sit at a consistent share of the 1u cap regardless of cap width
  const markSize = BASE * 0.46 * (MARK_SCALE[cap.label] ?? 1);
  const { w: legendW, d: legendD } = legendPlane(cap);

  return (
    <group ref={group} position={[cap.x, baseY, cap.z]} rotation={[ROW_TILT, 0, 0]}>
      <mesh
        geometry={geometry}
        scale={BASE}
        castShadow
        onPointerOver={enter}
        onPointerOut={leave}
        /* Touch has no hover, so a tap has to stand in for one. */
        onPointerDown={enter}
        onClick={cap.action ? click : undefined}
      >
        <meshStandardMaterial ref={capMat} color={CAP_COLOR} roughness={WAY.capRough} metalness={WAY.capMetal} />
      </mesh>

      {/* Vector mark: real geometry, sharp at any zoom (his approach). */}
      {vector && (
        <mesh
          geometry={vector}
          position={[0, legendY, 0]}
          scale={markSize}
          renderOrder={2}
        >
          <meshBasicMaterial
            ref={legendMat}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Wordmarks and text legends keep the canvas path. */}
      {!vector && texture && (
        <mesh position={[0, legendY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[legendW, legendD]} />
          <meshBasicMaterial
            ref={legendMat}
            map={texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
});

/* ---------------------------------------------------------------------------
   Hover card

   The name used to be a DOM tooltip pinned to the cursor, which meant it lived
   on the website layer rather than in the room. This is the same information
   as an object ON the set: the brand's own mark, extruded and standing on the
   floor to the left of and below the board, with the name cut in bold behind
   it. It carries its own light, because the studio spot is aimed at the board
   and this sits well outside that cone.

   Swaps are snappy on purpose - punch in, settle - so hovering across the
   board feels like moving a selection through a menu.
   --------------------------------------------------------------------------- */

const CARD_LOGO_SIZE = 1.7;
const CARD_TEXT_SIZE = 0.82;
const CARD_WORDMARK_W = 3.7; // wordmarks are sized by width, not height
/** Deep slab, like the freestanding letters in the hero plan - not signage. */
const CARD_TEXT_DEPTH = 0.3;
/** The floor plane. The letters STAND on it rather than hovering over it. */
const CARD_FLOOR_Y = -5.4;
/** Below this a fill cannot be read against the studio floor. */
const CARD_MIN_LUM = 0.07;
/** Turned to face right. Negative would swing the face to the left, which is
 *  away from the board it belongs to. */
const CARD_YAW = 0.3;

/** The card sits in an unlit corner, so a brand that is black - Vercel,
 *  Next.js, Deno, Three.js, GitHub - would be an invisible silhouette against
 *  the floor. Those get lifted; everything else keeps its own colour. */
function cardInk(hex: string): string {
  return luminance(hex) < 0.06 ? "#eceff5" : hex;
}

type CardTex = { tex: THREE.Texture; aspect: number };
const cardTexCache = new Map<string, CardTex>();

/** Decoding is async, so the aspect is not known on the frame that asks for
 *  it - the plane would be built square and the wordmark squashed. The aspect
 *  is cached alongside the texture and `onLoad` nudges a re-render once it is
 *  actually known. */
function cardTexture(label: string, onLoad?: () => void): CardTex | null {
  const img = LEGENDS[label]?.img;
  if (!img) return null;
  let entry = cardTexCache.get(label);
  if (!entry) {
    entry = { tex: new THREE.Texture(), aspect: 1 };
    cardTexCache.set(label, entry);
    new THREE.TextureLoader().load(img, (loaded) => {
      entry!.tex.image = loaded.image;
      entry!.tex.colorSpace = THREE.SRGBColorSpace;
      entry!.tex.anisotropy = 8;
      entry!.tex.needsUpdate = true;
      entry!.aspect = loaded.image.width / loaded.image.height;
      onLoad?.();
    });
  }
  return entry;
}

function HoverCard({ label, offset }: { label: string | null; offset: { x: number; z: number } }) {
  const group = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Group>(null);
  const open = useRef(0);
  const punch = useRef(0);
  // Keep the last real label mounted so leaving a key does not tear the
  // geometry down and rebuild it on the next hover.
  const [shown, setShown] = useState<string | null>(null);

  /* Bail on null rather than clearing prevLabel: moving from one key to the
     next sends a null in between as the first key's pointerout lands before
     the second's pointerover. Holding the last label across that gap is what
     lets a genuine swap be told apart from a first appearance - and only a
     swap gets the settle. */
  const prevLabel = useRef<string | null>(null);
  useEffect(() => {
    if (!label) return;
    if (prevLabel.current && prevLabel.current !== label) punch.current = 1;
    prevLabel.current = label;
    setShown(label);
  }, [label]);

  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((n) => n + 1), []);
  /* Preference order: the brand's real full-colour logo, then the monochrome
     glyph the keycap uses, then the raster mask. The colour logo arrives a
     frame or two late (it is fetched on hover), so the glyph shows meanwhile
     and is simply replaced - no flash of empty. */
  /* The brand's own lockup wins: mark plus name set in THEIR typeface, so the
     name is never in a generic 3D font. 23 of the 33 publish one. The rest
     fall back to the icon with the name set in Text3D underneath. */
  const lockup = shown ? LEGENDS[shown]?.logoWordmark : undefined;
  const logo = shown ? brandLogo(lockup ?? LEGENDS[shown]?.logo, rerender) : null;
  const solid = shown && !logo ? legendExtrude(shown) : null;
  const card = shown && !logo && !solid ? cardTexture(shown, rerender) : null;
  const brand = useMemo(
    () => new THREE.Color(cardInk(shown ? LEGENDS[shown]?.hex ?? "#ffffff" : "#ffffff")),
    [shown]
  );
  /* Judged PER FILL, not per mark. Most lockups set the company name in a
     near-black or very dark ink - Docker's "docker" is a deep navy - which is
     unreadable on this floor even though the mark beside it is bright. Any
     fill too dark to read goes white; everything above the line keeps the
     brand's own colour, so Docker's blue whale and Java's outline survive
     while their names turn white. Threshold is low enough that only genuinely
     unreadable fills are touched. */
  const logoColors = useMemo(() => {
    if (!logo) return null;
    return logo.map((p) => {
      const c = new THREE.Color(p.color);
      const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      return lum < CARD_MIN_LUM ? new THREE.Color("#f4f6fa") : c;
    });
  }, [logo]);

  /* A lockup already carries the name, so no caption goes under it. Decided
     from `lockup` rather than from whether it has finished loading, or the
     card would show icon-plus-caption for a frame and then swap. */
  const isWordmark = !!lockup || !!(shown && LEGENDS[shown]?.wordmark);
  // Wordmarks are wide and short, so they are sized by WIDTH; a logo mark is
  // roughly square and is sized by height. Sizing both the same way either
  // shrinks the wordmark to a strip or runs it off the side of the frame.
  const cardW = card
    ? Math.min(CARD_LOGO_SIZE * card.aspect, CARD_WORDMARK_W)
    : CARD_LOGO_SIZE;
  const logoScale = isWordmark ? CARD_WORDMARK_W : CARD_LOGO_SIZE;

  /* Everything is stacked UP from the floor, so the group's origin can sit on
     the ground plane: caption first, mark above it. A wordmark has no caption
     under it, so it stands on the ground itself. */
  const solidH = useMemo(() => {
    const geos = logo ? logo.map((p) => p.geo) : solid ? [solid] : [];
    if (!geos.length) return 0;
    const box = new THREE.Box3();
    for (const g of geos) {
      g.computeBoundingBox();
      box.union(g.boundingBox!);
    }
    return (box.max.y - box.min.y) * logoScale;
  }, [logo, solid, logoScale]);
  const logoH = card ? cardW / card.aspect : solidH;
  const capBase = isWordmark ? 0 : CARD_TEXT_SIZE + 0.42;
  const logoY = capBase + logoH / 2;

  /* Sit the word on the floor and centre it across, measured from the built
     geometry. Text3D lays glyphs out from a baseline at y=0 with descenders
     hanging BELOW it, so "Playwright" and "Python" dipped through the ground.
     Reading the box here rather than assuming a nominal descender depth also
     means it runs after the font has actually resolved. */
  useEffect(() => {
    const g = textRef.current;
    const mesh = g?.children[0] as THREE.Mesh | undefined;
    if (!g || !mesh?.geometry) return;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox;
    if (!b) return;
    g.position.y = -b.min.y;
    g.position.x = -(b.min.x + b.max.x) / 2;
  }, [shown, isWordmark]);

  /* The card simply APPEARS - full size, in place. `open` is a visibility
     latch only and deliberately drives neither scale nor position; ramping
     those made it grow up out of the floor on first hover. The small ramp is
     still there so the one-frame gap between leaving one key and entering the
     next does not flicker it off and on.
     `punch` is the only motion left, and it fires only when SWAPPING between
     keys - a small settle that reads as the selection changing. */
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    open.current += ((label ? 1 : 0) - open.current) * (1 - Math.exp(-dt * 16));
    punch.current += (0 - punch.current) * (1 - Math.exp(-dt * 7));

    const p = punch.current;
    // matcap is unlit, so it would happily shine through the blackout
    g.visible = open.current > 0.02 && !STAGE.dark && STAGE.ready;
    g.scale.setScalar(1 + p * 0.12);
    g.position.set(offset.x, CARD_FLOOR_Y, offset.z);
    g.rotation.y = CARD_YAW + p * 0.42;
    g.rotation.x = p * -0.1;
  });

  if (!shown) return null;

  return (
    <group ref={group} visible={false}>
      {/* its own key light: the studio spot never reaches out here */}

      {/* the real logo: one solid per fill, each in its own colour */}
      {logo && (
        <group scale={logoScale} position={[0, logoY, 0]}>
          {logo.map((part, i) => (
            <mesh key={i} geometry={part.geo} castShadow>
              <meshMatcapMaterial matcap={studioMatcap()} color={logoColors![i]} />
            </mesh>
          ))}
        </group>
      )}

      {solid && (
        <mesh geometry={solid} scale={logoScale} position={[0, logoY, 0]} castShadow>
          <meshMatcapMaterial matcap={studioMatcap()} color={brand} />
        </mesh>
      )}

      {/* no vector for this one: the official mark, flat but still in-world */}
      {card && (
        <mesh position={[0, logoY, 0]}>
          <planeGeometry args={[cardW, logoH]} />
          <meshBasicMaterial map={card.tex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* A wordmark already says the name; setting it again underneath just
          prints the word twice. */}
      {!isWordmark && (
        /* Placed from its own bounding box rather than by drei's <Center>:
           its baseline sits at y=0, so descenders on y, g, p and j sank
           through the floor, and Center's vertical alignment measures the box
           the other way round and buried the whole word. Reading min.y and
           lifting by it rests the LOWEST point on the ground, which is how
           cast letters actually sit. */
        <group ref={textRef}>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={CARD_TEXT_SIZE}
            height={CARD_TEXT_DEPTH}
            bevelEnabled
            bevelThickness={0.022}
            bevelSize={0.016}
            bevelSegments={3}
            curveSegments={6}
            castShadow
          >
            {shown}
            <meshMatcapMaterial matcap={studioMatcap()} color="#f2f1ee" />
          </Text3D>
        </group>
      )}
    </group>
  );
}

/* ---------------------------------------------------------------------------
   Camera

   The board is a fixed-size object, so the camera is solved for it rather than
   hard-coded: at a narrow viewport the old fixed position clipped both ends.
   --------------------------------------------------------------------------- */

function FitCamera({ width, depth }: { width: number; depth: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useEffect(() => {
    // Solving the framing from the board's centre distance under-counts badly:
    // seen from three-quarters, the front corners sit much closer to the
    // camera than the centre does and blow past the edge of frame. So project
    // the real bounding corners and pull back until the worst one fits.
    // Match the case, which is built at width+1.15 / depth+1.15 - fitting to
    // the key field alone let the case corners hang off the frame.
    const hw = width / 2 + 0.62;
    const hd = depth / 2 + 0.62;

    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const sy of [-0.9, 0.68]) {
          const corner = new THREE.Vector3(sx * hw, sy, sz * hd).applyQuaternion(FINAL_Q);
          corner.y += 0.55; // the board's resting lift
          corners.push(corner);
        }
      }
    }

    const FILL = 0.93; // fraction of the frame the board should occupy
    const probe = new THREE.Vector3();
    let dist = 8;

    for (let i = 0; i < 8; i++) {
      camera.aspect = size.width / Math.max(1, size.height);
      camera.position.set(dist * 0.02, -dist * 0.04, dist);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      let worst = 0;
      for (const c of corners) {
        probe.copy(c).project(camera);
        worst = Math.max(worst, Math.abs(probe.x), Math.abs(probe.y));
      }
      if (Math.abs(worst - FILL) < 0.005) break;
      dist *= worst / FILL;
    }

    camera.position.set(dist * 0.02, -dist * 0.04, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, width, depth]);

  return null;
}

/* ---------------------------------------------------------------------------
   Board
   --------------------------------------------------------------------------- */

function Board({
  onHover,
  live = true,
  onLight,
  armed = true,
}: {
  onHover: (label: string | null) => void;
  /** True once this is the section on screen. Going true ARMS the sequence;
   *  from there everything runs on its own clock: pitch black -> spotlight
   *  snaps on over the board lying flat -> half a second of stillness -> the
   *  board tilts up into the pose. False means "skip the theatre". */
  live?: boolean;
  /** true when the lamp comes on, false when the scene resets to darkness;
   *  drives the CSS spotlight cone and the copy fade. */
  onLight?: (on: boolean) => void;
  /** False once the section has left the viewport. Going false rewinds the
   *  whole sequence so it plays again on the next visit rather than being a
   *  one-shot that leaves the board already standing. */
  armed?: boolean;
}) {
  const { placed, width, depth } = useMemo(buildLayout, []);
  // leftmost cap edge: the ripple's origin for per-key stagger
  const originX = useMemo(() => Math.min(...placed.map((c) => c.x)), [placed]);
  const boardGroup = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const par = useRef({ x: 0, y: 0 }); // smoothed pointer, for the parallax lean
  const startAt = useRef<number | null>(live ? null : -99); // null = waiting in the dark
  const litFired = useRef(!live);

  // Rewind when the section leaves. The board is snapped back to flat and
  // dark here rather than in useFrame, because the render loop is parked
  // while the section is off-screen and would never run the reset.
  useEffect(() => {
    if (armed || !live) return;
    startAt.current = null;
    litFired.current = false;
    STAGE.ready = false; // the next visit starts mid-move again
    STAGE.lamp = 0; // and starts dark, so re-entry cannot flash either
    STAGE.dark = true;
    onLight?.(false);
    const g = boardGroup.current;
    if (g) {
      g.quaternion.copy(FLAT_Q);
      g.position.copy(FLAT_POS);
    }
  }, [armed, live, onLight]);

  /* Timeline (seconds from trigger, wall-clock so frame stalls cannot slow
     the choreography - a dropped frame skips ahead instead of dragging):
     0.00 - 0.45  spotlight ramps on with a flicker, board flat on the floor
     0.45 - 0.95  hold: half a second of the board just lying there
     0.95 - 2.45  the stand-up, smootherstep eased at both ends

     It used ease-out cubic, whose velocity is at its MAXIMUM on frame one -
     the board snapped off the table from a dead stop. */
  useFrame((state, dt) => {
    const g = boardGroup.current;
    if (!g) return;

    const now = state.clock.elapsedTime;
    if (!armed) return; // rewound and off-screen; nothing to draw

    if (startAt.current === null && live) {
      // armed, but the room stays dark for a while yet
      startAt.current = now;
    }
    const t = startAt.current === null ? -1 : startAt.current === -99 ? 99 : now - startAt.current;

    /* -- the strike --
       Nothing at all for BLACKOUT seconds: no board, no floor, no copy, no
       cone. Everything in the scene is a lit material with no emissive, and
       the legends multiply by STAGE.lamp, so at lamp 0 the frame is genuinely
       black rather than dark - nothing to glow. Then the lamp hits hard and
       fast, which is what makes it read as a switch being thrown rather than
       a fade-up. */
    const s = t - BLACKOUT;
    let lamp = 0;
    if (s >= 0) {
      const r = THREE.MathUtils.clamp(s / STRIKE, 0, 1);
      lamp = r * r;
      if (s < 0.26) {
        // two brief dips, like the ballast catching
        if (s > 0.05 && s < 0.09) lamp *= 0.25;
        if (s > 0.15 && s < 0.18) lamp *= 0.45;
      }
      if (!litFired.current) {
        litFired.current = true;
        onLight?.(true);
        playStageLight();
      }
    }
    STAGE.dark = lamp < 0.04;
    STAGE.lamp = lamp;
    /* The old 880 was set when the legends were dark ink on pale caps and
       needed all the help they could get. It put roughly 15 units of
       irradiance on the board - but a saturated cap clips once its brightest
       channel passes ~3, so every top face bleached to pastel while the side
       faces (which the lamp rakes) kept the real colour. The legends are unlit
       and tone-mapping-exempt, so they stay readable however far this drops;
       only the caps care. */
    if (spotRef.current) spotRef.current.intensity = 300 * lamp;
    if (ambRef.current) ambRef.current.intensity = 0.55 * lamp;
    if (fillRef.current) fillRef.current.intensity = 0.45 * lamp;
    if (rimRef.current) rimRef.current.intensity = 0.5 * lamp;

    // -- board: flat and near the lens, then it recedes as it stands up --
    // Smootherstep (Perlin): 6x^5 - 15x^4 + 10x^3. Velocity AND acceleration
    // are both zero at each end, so the board eases out of rest and eases
    // into the pose with nothing to snap at either edge. Driven off the wall
    // clock, so it is frame-rate independent by construction.
    const RISE = 1.6;
    const x = THREE.MathUtils.clamp((s - 0.5) / RISE, 0, 1);
    const u = x * x * x * (x * (x * 6 - 15) + 10);

    STAGE.ready = x >= 1;
    g.quaternion.slerpQuaternions(FLAT_Q, FINAL_Q, u);
    g.position.lerpVectors(FLAT_POS, POSE_POS, u);

    /* A few degrees of lean toward the pointer. premultiply, so it acts on
       the finished pose in WORLD space - composed the other way it would go
       through the board's own tumbled frame and read as a wobble instead of
       parallax. Deliberately tiny: it should register as the board being a
       real object in the room, not as an effect. */
    if (!STILL) {
      const k = 1 - Math.exp(-dt * 3.5); // slow follow, no snapping
      par.current.x += (state.pointer.x - par.current.x) * k;
      par.current.y += (state.pointer.y - par.current.y) * k;
      parE.set(par.current.y * 0.045, par.current.x * 0.06, 0);
      g.quaternion.premultiply(parQ.setFromEuler(parE));
      g.position.x += par.current.x * 0.16;
      g.position.y += par.current.y * 0.09;
    }
  });
  const [active, setActive] = useState<string | null>(null);

  // Text legends need the webfont, which is very likely still loading on first
  // paint. Rebuild once it lands so those five keys are not drawn in fallback
  // monospace.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // One shared cap mesh for the whole board; per-cap width comes from scale.
  const capMesh = useKeycapGeometry();

  const textures = useMemo(() => {
    void fontsReady;
    return new Map(placed.map((p) => [p.label, legendTexture(p)]));
  }, [placed, fontsReady]);
  useEffect(() => () => textures.forEach((t) => t?.dispose()), [textures]);

  const caseGeo = useMemo(
    () => new RoundedBoxGeometry(width + 1.15, 0.95, depth + 1.15, 6, 0.34),
    [width, depth]
  );
  useEffect(() => () => caseGeo.dispose(), [caseGeo]);

  const enter = useCallback(
    (label: string) => {
      setActive(label);
      onHover(label);
    },
    [onHover]
  );
  const leave = useCallback(
    (label: string) => {
      setActive((cur) => (cur === label ? null : cur));
      onHover(null);
    },
    [onHover]
  );

  const clear = useCallback(() => {
    setActive(null);
    onHover(null);
  }, [onHover]);

  const runAction = useCallback((a: CapAction) => {
    switch (a) {
      case "github":
        window.open("https://github.com/jiacheng-fu", "_blank", "noopener");
        break;
      case "linkedin":
        window.open("https://linkedin.com/in/jiachengfu", "_blank", "noopener");
        break;
      case "email":
        window.location.href = "mailto:brian.fu123321@gmail.com";
        break;
      case "source":
        window.open("https://github.com/jiacheng-fu/personal-website", "_blank", "noopener");
        break;
      case "wave":
        WAVE.at = performance.now() / 1000;
        break;
    }
  }, []);

  const activeCap = active ? placed.find((p) => p.label === active) : null;
  /* Sits off the board's lower-left corner, derived from the board size so it
     stays put if the layout changes. The board is posed on its corner, so
     that part of frame is empty. */
  /* Off the board's lower-left, standing on the floor. The board is posed on
     its corner, so that part of frame is empty. z brings it forward of the
     board so it reads as nearer to camera, not tucked behind. */
  /* z matters for FRAMING as much as depth: the camera sits just below the
     origin looking slightly up, so bringing the card toward the lens pushes
     it DOWN the frame and off the bottom. Held near the board's own depth. */
  const cardAt = useMemo(() => ({ x: -width * 0.4, z: -0.4 }), [width]);

  return (
    <>
      <FitCamera width={width} depth={depth} />

      <HoverCard label={activeCap && !activeCap.blank ? activeCap.label : null} offset={cardAt} />

      {/* the studio rig: everything starts dark and the sequence ramps it */}
      <ambientLight ref={ambRef} intensity={0} color="#dfe3ea" />
      {/* Further from the board and swung toward the camera. Inverse-square
          falloff is much flatter when the lamp is far relative to the object,
          and the board stands nearly upright in its final pose - lighting it
          from almost directly overhead scorched the top row and starved the
          bottom one. */}
      <spotLight
        ref={spotRef}
        position={[1.5, 14, 13]}
        angle={0.6}
        penumbra={0.9}
        intensity={0}
        decay={1.6}
        color="#f4f2ee"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0012}
      />
      <directionalLight ref={fillRef} position={[0, 1, 10]} intensity={0} color="#cdd3dc" />
      <directionalLight ref={rimRef} position={[-6, 8, -3]} intensity={0} color="#aebacc" />

      {/* the table the board lies on when the light finds it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.4, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#121214" roughness={0.95} metalness={0.04} />
      </mesh>

      <group ref={boardGroup} quaternion={FINAL_Q} position={[0, 0.55, 0]} onPointerMissed={clear}>
        <mesh geometry={caseGeo} position={[0, -0.34, 0]} castShadow>
          <meshStandardMaterial color={WAY.case} roughness={0.36} metalness={KB_VARIANT === "white" ? 0.25 : 0.8} />
        </mesh>

        {/* switch plate, visible in the gaps between caps */}
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[width + 0.34, 0.06, depth + 0.34]} />
          <meshStandardMaterial color={WAY.plate} roughness={0.9} metalness={0.2} />
        </mesh>

        {placed.map((cap, i) => (
          <Key
            key={`${cap.label}|${i}`}
            cap={cap}
            geometry={capGeometry(capMesh, cap.capW / BASE)}
            texture={textures.get(cap.label) ?? null}
            active={active === cap.label}
            onEnter={enter}
            onLeave={leave}
            onAction={runAction}
            waveAt={(cap.x - originX) * 0.06}
          />
        ))}

      </group>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Canvas
   --------------------------------------------------------------------------- */

export default function Keyboard3D({
  paused = false,
  active = true,
  onLight,
}: {
  paused?: boolean;
  active?: boolean;
  onLight?: (on: boolean) => void;
}) {
  const [label, setLabel] = useState<string | null>(null);

  return (
    <div className="kb">
      <Canvas
        className="kb__canvas"
        shadows
        dpr={[1, 1.75]}
        frameloop={paused ? "never" : "always"}
        camera={{ position: [0, 5.5, 6.7], fov: 26 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          // ACES desaturates as it rolls off, so an over-lit cap does not just
          // get brighter, it goes pale. Backing the exposure off keeps the
          // brand colours where they belong.
          gl.toneMappingExposure = 1.02;
        }}
      >
        {/* Black studio from the reference photo. The void and the visible
            light cone are painted by the section CSS behind this transparent
            canvas; the scene contributes the lit board, floor pool, shadow.
            Lights live inside Board so the switch-on sequence can drive them. */}
        <Board onHover={setLabel} live={active} onLight={onLight} armed={active && !paused} />
      </Canvas>

      <p className="kb__caption" aria-live="polite">
        {label ?? "Hover a key."}
      </p>

    </div>
  );
}
