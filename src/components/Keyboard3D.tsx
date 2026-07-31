import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "motion/react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { LEGENDS } from "../data/legends";

/* ---------------------------------------------------------------------------
   Layout

   Four rows, ANSI-style stagger. Order is deliberate: the board is tilted
   toward the viewer, so the front rows sit closest and read first. The AWS /
   data-layer keys are on the front row, the daily drivers on the home row,
   and tooling recedes to the back.
   --------------------------------------------------------------------------- */

type Cap = { label: string; w: number; blank?: boolean };

const k = (label: string): Cap => ({ label, w: 1 });

const ROWS: { stagger: number; caps: Cap[] }[] = [
  { stagger: 0.0, caps: ["Vite", "Next.js", "Bash", "Git", "CI/CD", "Docker", "LLVM"].map(k) },
  { stagger: 0.3, caps: ["Node", "Deno", "Java", "C#", "GLSL", "WebGL", "Unity"].map(k) },
  { stagger: 0.6, caps: ["TypeScript", "Python", "C++", "React", "FastAPI", "PostgreSQL", "SQL"].map(k) },
  {
    stagger: 0.15,
    caps: [
      k("AWS Lambda"),
      k("DynamoDB"),
      { label: "shipped, not read about", w: 3, blank: true },
      k("Supabase"),
      k("REST APIs"),
      k("Row-Level Security"),
    ],
  },
];

const U = 1.0; // one key unit
const GAP = 0.07; // gap between adjacent caps
const TRAVEL = 0.2; // how far a key sinks when hovered
const CAP_H = 0.54;

/* Cherry-style sculpting: each row is a different height and angle so the tops
   all face the same point in front of the board instead of lying flat. */
const ROW_LIFT = [0.34, 0.22, 0.17, 0.22];
const ROW_TILT = [-0.17, -0.07, 0.02, 0.12];

const BASE_TILT = 0.07; // back edge raised, like a board sitting on its feet
const YAW = -0.42; // three-quarter product angle, per the Apple treatment

type Placed = Cap & { x: number; z: number; row: number; capW: number };

function buildLayout() {
  const placed: Placed[] = [];
  ROWS.forEach((row, r) => {
    let x = row.stagger;
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
   Keycap geometry

   A rounded box is a cube with soft edges - it does not read as a keycap. Two
   vertex passes fix that: a taper so the cap narrows toward the top, and a
   dish so the top face is scooped instead of flat.
   --------------------------------------------------------------------------- */

const DISH = 0.038;

function makeCapGeometry(w: number, d: number) {
  const g = new RoundedBoxGeometry(w, CAP_H, d, 6, 0.075);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(v.y / CAP_H + 0.5, 0, 1); // 0 base, 1 top

    const taper = 1 - 0.165 * t * t;
    v.x *= taper;
    v.z *= taper;

    if (t > 0.8) {
      // radial falloff from the centre of the top face
      const rx = v.x / (w * 0.5);
      const rz = v.z / (d * 0.5);
      const r = Math.min(1, rx * rx + rz * rz);
      v.y -= DISH * (1 - r) * ((t - 0.8) / 0.2);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
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
  const S = 256;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  if (cap.blank) {
    // Novelty spacebar: letterspaced type, shrunk to whatever actually fits.
    c.width = S * 3;
    c.height = S;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const spaced = cap.label.split("").join(" ");
    const face = `500 %dpx "JetBrains Mono", ui-monospace, monospace`;
    let size = S * 0.15;
    ctx.font = face.replace("%d", String(size));
    const maxW = S * 3 * 0.88;
    const measured = ctx.measureText(spaced).width;
    if (measured > maxW) {
      size *= maxW / measured;
      ctx.font = face.replace("%d", String(size));
    }
    ctx.fillText(spaced, (S * 3) / 2, S / 2);
  } else {
    const L = LEGENDS[cap.label];
    if (!L) return null;
    c.width = c.height = S;
    ctx.fillStyle = "#ffffff";

    if (L.path) {
      const b = inkBounds(L.path);
      if (!b) return null;
      // Wordmarks may run wider than square marks, so width and height get
      // separate ceilings and the tighter one wins.
      const scale = Math.min((S * 0.74) / b.w, (S * 0.62) / b.h);
      ctx.save();
      ctx.translate(S / 2 - (b.x + b.w / 2) * scale, S / 2 - (b.y + b.h / 2) * scale);
      ctx.scale(scale, scale);
      ctx.fill(new Path2D(L.path));
      ctx.restore();
    } else if (L.text) {
      const size = L.text.length > 3 ? S * 0.26 : S * 0.34;
      ctx.font = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(L.text, S / 2, S / 2 + size * 0.04);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------------------------------------------------------------------------
   A single key
   --------------------------------------------------------------------------- */

const CAP_COLOR = "#26262c";
const CAP_HOVER = new THREE.Color("#3a3a44");
const CAP_REST = new THREE.Color(CAP_COLOR);
const LEGEND_MUTE = new THREE.Color("#d5d1c8");

type KeyProps = {
  cap: Placed;
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture | null;
  active: boolean;
  onEnter: (label: string) => void;
  onLeave: (label: string) => void;
};

const Key = memo(function Key({ cap, geometry, texture, active, onEnter, onLeave }: KeyProps) {
  const group = useRef<THREE.Group>(null);
  const capMat = useRef<THREE.MeshStandardMaterial>(null);
  const legendMat = useRef<THREE.MeshBasicMaterial>(null);
  const press = useRef(0);

  const baseY = ROW_LIFT[cap.row];

  // Resting legends sit slightly back from full saturation so the board reads
  // as one object; hovering brings the mark to its true brand colour.
  const [rest, brand] = useMemo(() => {
    const b = new THREE.Color(cap.blank ? "#9a958a" : LEGENDS[cap.label]?.hex ?? "#d5d1c8");
    return [b.clone().lerp(LEGEND_MUTE, 0.28), b];
  }, [cap.label, cap.blank]);

  useFrame((_, dt) => {
    // Frame-rate independent easing, clamped so a long frame cannot overshoot.
    const step = 1 - Math.pow(0.0001, Math.min(dt, 0.1));
    press.current += ((active ? 1 : 0) - press.current) * step;
    const p = press.current;

    if (group.current) group.current.position.y = baseY - p * TRAVEL;
    if (legendMat.current) legendMat.current.color.lerpColors(rest, brand, p);
    if (capMat.current) capMat.current.color.lerpColors(CAP_REST, CAP_HOVER, p);
  });

  const enter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onEnter(cap.label);
    },
    [cap.label, onEnter]
  );
  const leave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onLeave(cap.label);
    },
    [cap.label, onLeave]
  );

  // Sit the legend just clear of the un-dished rim. Floating it above the whole
  // top face rather than tucking it into the scoop means it can never be
  // swallowed by the cap, and 4 thousandths of a unit is invisible at this size.
  const legendY = CAP_H / 2 + 0.004;
  const legendW = cap.capW * (cap.blank ? 0.74 : 0.64);
  const legendD = (U - GAP) * 0.64;

  return (
    <group ref={group} position={[cap.x, baseY, cap.z]} rotation={[ROW_TILT[cap.row], 0, 0]}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={enter}
        onPointerOut={leave}
        /* Touch has no hover, so a tap has to stand in for one. */
        onPointerDown={enter}
      >
        <meshStandardMaterial ref={capMat} color={CAP_COLOR} roughness={0.58} metalness={0.14} />
      </mesh>

      {texture && (
        <mesh position={[0, legendY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[legendW, cap.blank ? legendW / 3 : legendD]} />
          {/* Unlit on purpose: a printed legend should read at full strength
              from any angle instead of falling into the cap's own shading. */}
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
    const hw = width / 2 + 0.42; // + the case lip
    const hd = depth / 2 + 0.42;
    const rot = new THREE.Euler(BASE_TILT, YAW, 0);
    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const sy of [-0.5, 0.7]) {
          corners.push(new THREE.Vector3(sx * hw, sy, sz * hd).applyEuler(rot));
        }
      }
    }

    const FILL = 0.97; // fraction of the frame the board should occupy
    const probe = new THREE.Vector3();
    let dist = 8;

    for (let i = 0; i < 8; i++) {
      camera.aspect = size.width / Math.max(1, size.height);
      camera.position.set(dist * 0.16, dist * 0.44, dist * 0.88);
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

    camera.position.set(dist * 0.16, dist * 0.44, dist * 0.88);
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
}: {
  onHover: (label: string | null) => void;
  /** Scroll progress of the pinned section. Drives the product lift: the
   *  board starts lying low like it is on a desk and rises into the hero
   *  pose. Undefined means "just hold the final pose". */
  progress?: MotionValue<number>;
}) {
  const { placed, width, depth } = useMemo(buildLayout, []);
  const lift = useRef(progress ? 0 : 1);
  const boardGroup = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const g = boardGroup.current;
    if (!g) return;
    const target = progress ? THREE.MathUtils.clamp(progress.get() / 0.72, 0, 1) : 1;
    const step = 1 - Math.pow(0.0002, Math.min(dt, 0.1));
    lift.current += (target - lift.current) * step;
    // ease the tail so the settle is gentle
    const u = 1 - Math.pow(1 - lift.current, 2.2);
    g.rotation.x = THREE.MathUtils.lerp(0.72, BASE_TILT, u);
    g.rotation.y = THREE.MathUtils.lerp(0.34, YAW, u);
    g.position.y = THREE.MathUtils.lerp(-1.5, 0, u);
    const sc = THREE.MathUtils.lerp(0.82, 1, u);
    g.scale.setScalar(sc);
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

  const geometries = useMemo(() => {
    const cache = new Map<number, THREE.BufferGeometry>();
    for (const p of placed) {
      if (!cache.has(p.w)) cache.set(p.w, makeCapGeometry(p.capW, U - GAP));
    }
    return cache;
  }, [placed]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  const textures = useMemo(() => {
    void fontsReady;
    return new Map(placed.map((p) => [p.label, legendTexture(p)]));
  }, [placed, fontsReady]);
  useEffect(() => () => textures.forEach((t) => t?.dispose()), [textures]);

  const caseGeo = useMemo(
    () => new RoundedBoxGeometry(width + 0.78, 0.56, depth + 0.78, 4, 0.16),
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

  const activeCap = active ? placed.find((p) => p.label === active) : null;

  return (
    <>
      <FitCamera width={width} depth={depth} />

      {/* The board is deliberately static. The only thing that moves is the
          key under the pointer. */}
      <group rotation={[BASE_TILT, 0, 0]} onPointerMissed={clear}>
        <mesh geometry={caseGeo} position={[0, -0.16, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#17171c" roughness={0.36} metalness={0.8} />
        </mesh>

        {/* switch plate, visible in the gaps between caps */}
        <mesh position={[0, 0.13, 0]} receiveShadow>
          <boxGeometry args={[width + 0.34, 0.06, depth + 0.34]} />
          <meshStandardMaterial color="#0d0d11" roughness={0.9} metalness={0.2} />
        </mesh>

        {placed.map((cap) => (
          <Key
            key={cap.label}
            cap={cap}
            geometry={geometries.get(cap.w)!}
            texture={textures.get(cap.label) ?? null}
            active={active === cap.label}
            onEnter={enter}
            onLeave={leave}
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

        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.3}
          scale={width + 2}
          blur={4.2}
          far={2.2}
          resolution={512}
          color="#2a2622"
        />
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
}: {
  paused?: boolean;
  progress?: MotionValue<number>;
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
          gl.toneMappingExposure = 1.25;
        }}
      >
        {/* Studio setup for a dark object on light paper: strong key from the
            upper left, cool fill from the right, and a low front bounce so the
            near edge of the case does not go solid black. */}
        <ambientLight intensity={1.15} color="#fffaf2" />
        <directionalLight
          position={[-5, 8, 5.5]}
          intensity={2.6}
          color="#fff4e2"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
          shadow-bias={-0.0015}
        />
        <directionalLight position={[7, 5, -4]} intensity={1.15} color="#cfe0ff" />
        <directionalLight position={[0, 1.5, 9]} intensity={0.75} color="#ffffff" />

        <Board onHover={setLabel} progress={progress} />
      </Canvas>

      <p className="kb__caption" aria-live="polite">
        {label ?? "Hover a key."}
      </p>
    </div>
  );
}
