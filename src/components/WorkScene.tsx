import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D } from "@react-three/drei";
import * as THREE from "three";
import { projects, flagship } from "../data/content";
import { studioMatcap } from "../data/matcap";
import { playStageLight } from "../data/keySound";

/* ---------------------------------------------------------------------------
   Work — the projection

   There is no room. No projector model, no reels, no floor: those made a
   diorama, and a diorama only works if the environment around it is
   convincing enough to hold photoreal props, which is a far larger job than
   it looks and is what sank the previous version.

   This is the recipe the keyboard section already proves out - ONE hero
   element in a void - pointed at a beam of light rather than an object. The
   projector is behind the viewer, which is where it sits in a real cinema
   anyway, so the only things on screen are the throw and what it lands on.
   Nothing to model means nothing to look cheap.
   --------------------------------------------------------------------------- */

const FONT = "/fonts/helvetiker_bold.typeface.json";

const SCREEN_W = 5.75;
const SCREEN_H = SCREEN_W / (16 / 9);
const SCREEN_Y = 1.02;
const TITLE_Y = -1.95;

type Reel = { still?: string; clip?: string };
type Item = {
  title: string;
  years?: string;
  blurb: string;
  stack: string[];
  repo: string;
  reel: Reel;
};

/* ------------------------------- the reel --------------------------------- */

/** A film leader for anything with no footage yet: countdown ring, crosshair,
 *  project name. Honest about the gap, and on-theme rather than a black hole. */
function leaderTexture(title: string): THREE.CanvasTexture {
  const W = 1024;
  const H = Math.round(W / (16 / 9));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.fillStyle = "#111114";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(236,233,226,0.45)";
  g.lineWidth = 2;
  const cx = W / 2;
  const cy = H / 2;
  for (const r of [H * 0.36, H * 0.26]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(cx, 0);
  g.lineTo(cx, H);
  g.moveTo(0, cy);
  g.lineTo(W, cy);
  g.stroke();

  g.fillStyle = "#ece9e2";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${H * 0.17}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillText(title, cx, cy - H * 0.02);
  g.font = `500 ${H * 0.05}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillStyle = "rgba(236,233,226,0.5)";
  g.fillText("REEL NOT LOADED", cx, cy + H * 0.13);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function useReel(item: Item) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let dead = false;
    let video: HTMLVideoElement | null = null;

    if (item.reel.clip) {
      video = document.createElement("video");
      video.src = item.reel.clip;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      const vt = new THREE.VideoTexture(video);
      vt.colorSpace = THREE.SRGBColorSpace;
      void video.play().catch(() => {});
      setTex(vt);
    } else if (item.reel.still) {
      new THREE.TextureLoader().load(item.reel.still, (t) => {
        if (dead) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      });
    } else {
      setTex(leaderTexture(item.title));
    }
    return () => {
      dead = true;
      video?.pause();
    };
  }, [item]);
  return tex;
}

/* ----------------------------- the projection ----------------------------- */

function Projection({ item }: { item: Item }) {
  const tex = useReel(item);
  const frame = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const change = useRef(1);

  useEffect(() => {
    change.current = 1; // a reel change punches the gate
  }, [item]);

  useFrame((state, dt) => {
    change.current += (0 - change.current) * (1 - Math.exp(-dt * 4.5));
    const t = state.clock.elapsedTime;

    /* Gate weave and lamp flicker. A projected frame is never perfectly still
       nor perfectly steady, and faking both is most of what separates "a video
       on a plane" from "something being projected". Deliberately tiny: it
       should be felt, not seen. */
    if (frame.current) {
      const weave = 0.004 + change.current * 0.02;
      frame.current.position.x = Math.sin(t * 7.3) * weave;
      frame.current.position.y = SCREEN_Y + Math.cos(t * 5.1) * weave;
    }
    const flicker = 0.94 + Math.sin(t * 31) * 0.02 + Math.sin(t * 12.7) * 0.03;
    const settle = 1 - change.current;
    if (mat.current) mat.current.opacity = flicker * settle;
    if (glow.current) glow.current.opacity = 0.16 * flicker * settle;
  });

  return (
    <group ref={frame} position={[0, SCREEN_Y, 0]}>
      {/* spill: light this bright does not stop at its own edge */}
      <mesh position={[0, 0, -0.02]} scale={1.14}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial
          ref={glow}
          color="#9fc0ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {tex && (
        <mesh>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** The throw, opening out of the camera rather than in from the side - so the
 *  viewer is sitting behind the projector and there is no machine to model. */
function Throw() {
  const dust = useRef<THREE.Points>(null);
  const DEPTH = 7.4;

  const motes = useMemo(() => {
    const N = 300;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = Math.random();
      const spread = 0.25 + t * (SCREEN_W * 0.52);
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = SCREEN_Y + Math.sin(a) * r * 0.56;
      pos[i * 3 + 2] = DEPTH * (1 - t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state) => {
    // barely moving: dust in a beam drifts, it does not swirl
    if (dust.current) dust.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.06;
  });

  return (
    <points ref={dust} geometry={motes} renderOrder={4}>
      <pointsMaterial
        size={0.028}
        color="#dbe6ff"
        transparent
        opacity={0.38}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

/* -------------------------------- the titles ------------------------------ */

function Title({
  text,
  x,
  active,
  onPick,
  onMeasure,
}: {
  text: string;
  x: number;
  active: boolean;
  onPick: () => void;
  onMeasure: (w: number) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);

  /* Report the real width up so the row can be packed by it. Equal columns
     put "CarStatus" and "Wild West Party Game" in the same slot, which is
     how they ended up touching. */
  useEffect(() => {
    const mesh = g.current?.children[0] as THREE.Mesh | undefined;
    if (!mesh?.geometry) return;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox;
    if (!b) return;
    mesh.position.x = -(b.min.x + b.max.x) / 2;
    onMeasure(b.max.x - b.min.x);
  }, [text, onMeasure]);

  useFrame((_, dt) => {
    if (!g.current) return;
    const k = 1 - Math.exp(-dt * 9);
    g.current.position.z += ((active ? 0.34 : 0) - g.current.position.z) * k;
  });

  return (
    <group ref={g} position={[x, TITLE_Y, 0]}>
      <Text3D
        font={FONT}
        size={0.135}
        height={0.05}
        bevelEnabled
        bevelSize={0.004}
        bevelThickness={0.006}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHot(true);
        }}
        onPointerOut={() => setHot(false)}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
      >
        {text}
        <meshMatcapMaterial
          matcap={studioMatcap()}
          color={active ? "#ffffff" : hot ? "#c9cdd6" : "#6c707a"}
        />
      </Text3D>
    </group>
  );
}

/* --------------------------------- scene ---------------------------------- */

function Stage({ onSelect }: { onSelect: (i: Item) => void }) {
  const items = useMemo(() => [flagship, ...projects] as unknown as Item[], []);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => onSelect(items[loaded]), [loaded, items, onSelect]);

  const [widths, setWidths] = useState<number[]>(() => items.map(() => 1.4));
  const measure = useMemo(
    () =>
      items.map((_, i) => (w: number) =>
        setWidths((prev) => {
          if (Math.abs(prev[i] - w) < 0.001) return prev;
          const next = [...prev];
          next[i] = w;
          return next;
        })
      ),
    [items]
  );

  const GAP = 0.62;
  const total = widths.reduce((a, b) => a + b, 0) + GAP * (items.length - 1);
  let cursor = -total / 2;
  const xs = widths.map((w) => {
    const x = cursor + w / 2;
    cursor += w + GAP;
    return x;
  });

  return (
    <>
      <Projection item={items[loaded]} />
      <Throw />
      {items.map((it, i) => (
        <Title
          key={it.title}
          text={it.title}
          x={xs[i]}
          active={i === loaded}
          onMeasure={measure[i]}
          onPick={() => {
            if (i === loaded) return;
            setLoaded(i);
            playStageLight();
          }}
        />
      ))}
    </>
  );
}

export default function WorkScene({ onSelect }: { onSelect: (i: Item) => void }) {
  return (
    <div className="workscene">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7.6], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <Stage onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
