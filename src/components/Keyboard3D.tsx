import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { LEGENDS } from "../data/legends";
import { useKeycapGeometry, capGeometry, HEIGHT_RATIO } from "../data/keycapGeometry";
import { legendGeometry } from "../data/legendGeometry";
import { playPress, playRelease, toggleSound } from "../data/keySound";

/* ---------------------------------------------------------------------------
   Layout

   Four rows, ANSI-style stagger. Order is deliberate: the board is tilted
   toward the viewer, so the front rows sit closest and read first. The AWS /
   data-layer keys are on the front row, the daily drivers on the home row,
   and tooling recedes to the back.
   --------------------------------------------------------------------------- */

type CapAction = "github" | "email" | "linkedin" | "sound" | "wave";
type Cap = { label: string; w: number; blank?: boolean; action?: CapAction };

const k = (label: string): Cap => ({ label, w: 1 });

/* A real 60%-style layout: every row sums to exactly 10u so the edges are
   flush, and the wordmark skills ride the wide modifier caps the way Tab,
   Caps, and Enter would. Bottom row: blank mods flanking the spacebar. */
const ROWS: { caps: Cap[] }[] = [
  { caps: [k("Vite"), k("Next.js"), k("Bash"), k("Git"), k("CI/CD"), k("Docker"), k("LLVM"), { label: "GLSL", w: 1.5 }, { label: "WebGL", w: 1.5 }] },
  { caps: [{ label: "C#", w: 1.5 }, k("Node"), k("Deno"), k("Java"), k("Unity"), k("TypeScript"), k("Python"), k("C++"), { label: "SQL", w: 1.5 }] },
  { caps: [{ label: "REST APIs", w: 1.75 }, k("React"), k("FastAPI"), k("PostgreSQL"), k("Supabase"), k("AWS Lambda"), k("DynamoDB"), { label: "Row-Level Security", w: 2.25 }] },
  {
    caps: [
      { label: "GitHub", w: 1.25, action: "github" },
      { label: "Email", w: 1.25, action: "email" },
      { label: "shipped, not read about", w: 5, blank: true, action: "wave" },
      { label: "Sound", w: 1.25, action: "sound" },
      { label: "LinkedIn", w: 1.25, action: "linkedin" },
    ],
  },
];

const U = 1.0; // one key unit
const GAP = 0.16; // airy gaps: every cap reads as its own object
const TRAVEL = 0.22; // how far a key sinks when hovered
const BASE = U - GAP; // a 1u cap footprint
const CAP_H = HEIGHT_RATIO * BASE; // his cap proportions exactly

/* Uniform rows, no sculpt: the toy-like grid reads cleaner at product scale
   than a realistic Cherry profile ever did. */
const ROW_LIFT = [0.3, 0.3, 0.3, 0.3];
const ROW_TILT = [0, 0, 0, 0];

/* The product pose from Brian's reference photo: standing on one corner,
   LONG SIDE VERTICAL with a slight lean, face toward the camera. Composed in
   world space - first tip the face to the camera, then roll around the view
   axis - so the angles mean what they say. */
const FINAL_Q = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(Math.PI / 2 - 0.32))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.32));
const FLAT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.22);

/* Everything the whole board shares per frame; Key legends read the lamp so
   the unlit logo materials cannot glow before the spotlight is on. */
const STAGE = { lamp: 1 };

/** Timestamp of the last spacebar hit; every key ripples off it. */
const WAVE = { at: 0 };

type Placed = Cap & { x: number; z: number; row: number; capW: number };

function buildLayout() {
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
function inkBounds(path: string) {
  const N = 64;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.scale(N / 24, N / 24);
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

  const u = 24 / N; // back to path units
  return {
    x: minX * u,
    y: minY * u,
    w: (maxX - minX + 1) * u,
    h: (maxY - minY + 1) * u,
  };
}

function legendTexture(cap: Cap): THREE.CanvasTexture | null {
  if (!cap.label) return null; // blank modifier caps carry nothing
  const S = 256;
  // Canvas aspect matches the legend plane on this cap, so wide caps get
  // wide textures and nothing ever stretches.
  const capW = cap.w * U - GAP;
  const planeAspect = (capW * 0.78) / ((U - GAP) * 0.7);
  const W = Math.max(1, Math.round(S * planeAspect));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const L = LEGENDS[cap.label];
  if (cap.blank) {
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
    const b = inkBounds(L.path);
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
  } else {
    return null;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
const CANDYWAY = { cap: "#2b2b31", hover: "#3a3a44", mute: "#e8e5de", case: "#1b1b20", plate: "#101014", capRough: 0.38, capMetal: 0.05 };
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

/** Candy cap colour: the brand hex, darkened a touch when it is too pale to
 *  hold a white legend, and lifted when it is near-black. */
function candyCap(label: string): string {
  const hex = LEGENDS[label]?.hex ?? "#4a4a52";
  const lum = luminance(hex);
  const c = new THREE.Color(hex);
  if (lum > 0.55) c.offsetHSL(0, 0.06, -0.2);
  if (lum < 0.08) c.offsetHSL(0, 0, 0.14);
  return `#${c.getHexString()}`;
}

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

  const baseY = ROW_LIFT[cap.row];

  // Resting legends sit slightly back from full saturation so the board reads
  // as one object; hovering brings the mark to its true brand colour.
  const [rest, brand, capRest, capHover] = useMemo(() => {
    if (KB_VARIANT === "candy" && !cap.blank) {
      // white legend on a brand-coloured cap; hover brightens the cap itself
      const white = new THREE.Color("#ffffff");
      const base = new THREE.Color(candyCap(cap.label));
      const hover = base.clone().offsetHSL(0, 0.02, 0.09);
      return [white.clone().multiplyScalar(0.92), white, base, hover];
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
  const markSize = BASE * 0.46;
  const legendW = cap.capW * 0.78;
  const legendD = (U - GAP) * 0.7;

  return (
    <group ref={group} position={[cap.x, baseY, cap.z]} rotation={[ROW_TILT[cap.row], 0, 0]}>
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
    const hw = width / 2 + 0.24; // + the case lip
    const hd = depth / 2 + 0.24;

    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const sy of [-0.5, 0.7]) {
          const corner = new THREE.Vector3(sx * hw, sy, sz * hd).applyQuaternion(FINAL_Q);
          corner.y += 0.55; // the board's resting lift
          corners.push(corner);
        }
      }
    }

    const FILL = 0.99; // fraction of the frame the board should occupy
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
  progress,
  onLit,
  onSound,
}: {
  onHover: (label: string | null) => void;
  /** Scroll progress of the pinned section. Crossing a small threshold ARMS
   *  the sequence; from there everything runs on its own clock:
   *  pitch black -> spotlight snaps on over the board lying flat -> half a
   *  second of stillness -> the board tilts up into the reference pose.
   *  Undefined means "skip the theatre, hold the final pose, lights on". */
  progress?: MotionValue<number>;
  /** Fired the moment the spotlight starts turning on (drives the CSS cone). */
  onLit?: () => void;
  /** Reports the VOL key's new state so the caption can echo it. */
  onSound?: (on: boolean) => void;
}) {
  const { placed, width, depth } = useMemo(buildLayout, []);
  // leftmost cap edge: the ripple's origin for per-key stagger
  const originX = useMemo(() => Math.min(...placed.map((c) => c.x)), [placed]);
  const boardGroup = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const startAt = useRef<number | null>(progress ? null : -99); // null = waiting in the dark
  const stand = useRef(progress ? 0 : 1); // 0 = flat, 1 = posed
  const standVel = useRef(0);
  const litFired = useRef(!progress);

  /* Timeline (seconds from trigger, wall-clock so frame stalls cannot slow
     the choreography - a dropped frame skips ahead instead of dragging):
     0.00 - 0.45  spotlight ramps on with a flicker, board flat on the floor
     0.45 - 0.95  hold: half a second of the board just lying there
     0.95 -       the stand-up, driven by a damped spring

     The stand-up used ease-out cubic and read as a jolt. Ease-out's flaw for
     physical motion is that velocity is at its MAXIMUM on frame one - the
     board snapped into motion from a dead stop. A spring integrates from
     rest instead: it accelerates in, carries momentum slightly past the pose,
     and settles. Same reason UI toolkits moved from bezier curves to spring
     physics for anything meant to feel like an object.

     zeta = DAMP / (2 * sqrt(STIFF)) = 13 / (2*sqrt(105)) ~= 0.63, i.e.
     underdamped: one small overshoot, no visible bounce. */
  const FLAT_Y = -2.6;
  useFrame((state, dt) => {
    const g = boardGroup.current;
    if (!g) return;

    const now = state.clock.elapsedTime;
    if (startAt.current === null) {
      // still dark: armed only once the section is actually engaged
      if (progress && progress.get() > 0.04) {
        startAt.current = now;
        if (!litFired.current) {
          litFired.current = true;
          onLit?.();
        }
      }
    }
    const t = startAt.current === null ? -1 : startAt.current === -99 ? 99 : now - startAt.current;

    // -- light ramp with a fluorescent stutter --
    let lamp = 0;
    if (t >= 0) {
      const r = THREE.MathUtils.clamp(t / 0.45, 0, 1);
      lamp = r * r;
      if (t < 0.3) {
        // two brief dips, like the ballast catching
        if (t > 0.08 && t < 0.13) lamp *= 0.25;
        if (t > 0.19 && t < 0.22) lamp *= 0.45;
      }
    }
    STAGE.lamp = lamp;
    if (spotRef.current) spotRef.current.intensity = 560 * lamp;
    if (ambRef.current) ambRef.current.intensity = 0.34 * lamp;
    if (fillRef.current) fillRef.current.intensity = 0.55 * lamp;
    if (rimRef.current) rimRef.current.intensity = 0.7 * lamp;

    // -- board: flat and near the lens, then it recedes as it stands up --
    const STIFF = 105;
    const DAMP = 13;
    const target = t > 0.95 ? 1 : 0;

    // Fixed-timestep sub-stepping. Simply clamping dt would keep the spring
    // stable but make it run in slow motion on a slow device, because the
    // simulation would advance less than wall-clock time; the rest of the
    // sequence is wall-clock, so the two would drift apart. Instead, consume
    // the whole frame in 1/120s bites - stable at any frame rate, and the
    // spring always finishes when it should.
    const SUB = 1 / 120;
    let remaining = Math.min(dt, 0.25); // never try to catch up a long stall
    while (remaining > 0) {
      const h = Math.min(SUB, remaining);
      standVel.current += (target - stand.current) * STIFF * h;
      standVel.current *= Math.exp(-DAMP * h);
      stand.current += standVel.current * h;
      remaining -= h;
    }

    // slerp extrapolates past 1, so the overshoot carries the pose too
    const u = stand.current;
    g.quaternion.slerpQuaternions(FLAT_Q, FINAL_Q, u);
    g.position.y = THREE.MathUtils.lerp(FLAT_Y, 0.55, u);
    g.position.z = THREE.MathUtils.lerp(2.5, 0, u);
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
      case "sound":
        onSound?.(toggleSound());
        break;
      case "wave":
        WAVE.at = performance.now() / 1000;
        break;
    }
  }, [onSound]);

  const activeCap = active ? placed.find((p) => p.label === active) : null;

  return (
    <>
      <FitCamera width={width} depth={depth} />

      {/* the studio rig: everything starts dark and the sequence ramps it */}
      <ambientLight ref={ambRef} intensity={0} color="#dfe3ea" />
      <spotLight
        ref={spotRef}
        position={[0.5, 14, 4]}
        angle={0.4}
        penumbra={0.85}
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
        <meshStandardMaterial color="#1d1d1f" roughness={0.92} metalness={0.05} />
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

        {activeCap && !activeCap.blank && (
          <Html
            position={[activeCap.x, ROW_LIFT[activeCap.row] + 0.66, activeCap.z]}
            center
            zIndexRange={[20, 0]}
            wrapperClass="kb-label-wrap"
          >
            <span className="kb-label">{activeCap.label}</span>
          </Html>
        )}

      </group>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Canvas
   --------------------------------------------------------------------------- */

export default function Keyboard3D({
  paused = false,
  progress,
  onLit,
}: {
  paused?: boolean;
  progress?: MotionValue<number>;
  onLit?: () => void;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [sound, setSound] = useState(false);

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
          gl.toneMappingExposure = 1.25;
        }}
      >
        {/* Black studio from the reference photo. The void and the visible
            light cone are painted by the section CSS behind this transparent
            canvas; the scene contributes the lit board, floor pool, shadow.
            Lights live inside Board so the switch-on sequence can drive them. */}
        <Board onHover={setLabel} progress={progress} onLit={onLit} onSound={setSound} />
      </Canvas>

      <p className="kb__caption" aria-live="polite">
        {label ?? (sound ? "Sound on." : "Hover a key.")}
      </p>
    </div>
  );
}
