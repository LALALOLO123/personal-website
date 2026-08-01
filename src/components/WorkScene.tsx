import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { brandLogo } from "../data/legendGeometry";
import { projects, flagship } from "../data/content";
import { LEGENDS } from "../data/legends";
import { playStageLight } from "../data/keySound";

/* ---------------------------------------------------------------------------
   Work — the projector

   Every project is a cartridge sitting in a rack. Click one and it is carried
   into the projector, the lamp catches, and its reel plays on the screen.

   Same studio as the keyboard: black floor, hard key light, a machine you
   operate. The point is that the work is something you LOAD, not a grid you
   scroll past.

   Where there is no footage yet the screen shows a film leader rather than a
   black rectangle - honest about the gap and on-theme.
   --------------------------------------------------------------------------- */

const FONT = "/fonts/helvetiker_bold.typeface.json";

type Reel = { still?: string; clip?: string };
type Item = {
  title: string;
  years: string;
  blurb: string;
  stack: string[];
  repo: string;
  reel: Reel;
  face: string;
};

/** The rack, in the order they were made. Face is a logo we already ship. */
const FACE: Record<string, string> = {
  CarScout: "FastAPI",
  "Project Horizon": "Unity",
  "Wild West Party Game": "TypeScript",
  CarStatus: "JavaScript",
};

const SCREEN_W = 9.4;
const SCREEN_H = 5.29; // 16:9

/* Depth is the whole composition here. Everything used to sit far too near
   the lens - the projector filled the frame and the rack fell off the bottom
   entirely. Screen upstage, projector mid, rack downstage, and the camera far
   enough back that all three are in one shot. */
const SCREEN_Z = -2.4;
const PROJ_Z = 1.9;
const RACK_Y = -1.2;
const RACK_Z = 4.6;

/* ------------------------------- the screen ------------------------------- */

/** A film leader, drawn rather than fetched: countdown ring, crosshair, and
 *  the project name. Stands in for footage that does not exist yet. */
function leaderTexture(title: string): THREE.CanvasTexture {
  const W = 1024;
  const H = Math.round((W * SCREEN_H) / SCREEN_W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.fillStyle = "#0e0e10";
  g.fillRect(0, 0, W, H);

  g.strokeStyle = "rgba(236,233,226,0.5)";
  g.lineWidth = 2;
  const cx = W / 2;
  const cy = H / 2;
  for (const r of [H * 0.34, H * 0.24]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(cx, cy - H * 0.44);
  g.lineTo(cx, cy + H * 0.44);
  g.moveTo(cx - W * 0.44, cy);
  g.lineTo(cx + W * 0.44, cy);
  g.stroke();

  g.fillStyle = "#ece9e2";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${H * 0.2}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillText(title, cx, cy - H * 0.02);
  g.font = `500 ${H * 0.055}px "JetBrains Mono", ui-monospace, monospace`;
  g.fillStyle = "rgba(236,233,226,0.55)";
  g.fillText("REEL NOT LOADED", cx, cy + H * 0.14);

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

function Screen({ item }: { item: Item }) {
  const tex = useReel(item);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(0);

  // the lamp catching after a reel change
  useEffect(() => {
    fade.current = 0;
  }, [item]);
  useFrame((_, dt) => {
    fade.current += (1 - fade.current) * (1 - Math.exp(-dt * 6));
    if (mat.current) mat.current.opacity = fade.current;
  });

  return (
    <group position={[0, 2.95, SCREEN_Z]}>
      {/* the surround, so the bright frame has an edge to sit in */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[SCREEN_W + 0.5, SCREEN_H + 0.5]} />
        <meshStandardMaterial color="#0a0a0c" roughness={1} />
      </mesh>
      {tex && (
        <mesh>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ----------------------------- the projector ------------------------------ */

function Projector({ on }: { on: boolean }) {
  const body = useMemo(() => new RoundedBoxGeometry(1.7, 0.95, 2.3, 4, 0.12), []);
  const spot = useRef<THREE.SpotLight>(null);
  const lamp = useRef(0);

  useFrame((_, dt) => {
    // a lamp does not fade, it catches - fast up, with a stutter
    lamp.current += ((on ? 1 : 0) - lamp.current) * (1 - Math.exp(-dt * 9));
    if (spot.current) spot.current.intensity = 55 * lamp.current;
  });

  return (
    <group position={[0, -0.62, PROJ_Z]}>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial color="#24242a" roughness={0.45} metalness={0.5} />
      </mesh>
      {/* lens */}
      <mesh position={[0, 0.02, -1.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.37, 0.55, 28]} />
        <meshStandardMaterial color="#131317" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* feed and take-up spools, because it should read as a projector */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.1, 24]} />
          <meshStandardMaterial color="#2e2e36" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <spotLight
        ref={spot}
        position={[0, 0.02, -1.4]}
        target-position={[0, 3.4, -7]}
        angle={0.42}
        penumbra={0.55}
        intensity={0}
        distance={20}
        color="#eaf0ff"
      />
    </group>
  );
}

/* ----------------------------- the cartridges ----------------------------- */

function Cartridge({
  item,
  slot,
  loaded,
  onPick,
}: {
  item: Item;
  slot: number;
  loaded: boolean;
  onPick: () => void;
}) {
  const g = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);
  const shell = useMemo(() => new RoundedBoxGeometry(1.9, 0.28, 1.25, 4, 0.07), []);
  const [, bump] = useState(0);
  const parts = brandLogo(LEGENDS[item.face]?.logo, () => bump((n) => n + 1));

  const home = useMemo<[number, number, number]>(
    () => [(slot - 1.5) * 2.35, RACK_Y, RACK_Z],
    [slot]
  );
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!g.current) return;
    // loaded rides on top of the projector; the rest wait in the rack, and
    // lift a little when pointed at
    target.set(...home);
    if (loaded) target.set(0, 0.02, PROJ_Z);
    else if (hot) target.y += 0.22;

    const k = 1 - Math.exp(-dt * 7);
    g.current.position.lerp(target, k);
    const tilt = loaded ? 0 : -0.28;
    g.current.rotation.x += (tilt - g.current.rotation.x) * k;
  });

  return (
    <group ref={g} position={home} rotation={[-0.28, 0, 0]}>
      <mesh
        geometry={shell}
        castShadow
        receiveShadow
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
        <meshStandardMaterial
          color={loaded ? "#3a3a44" : hot ? "#2f2f38" : "#1e1e24"}
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>

      {/* the label: the project's tech mark, lying on the cartridge face */}
      {parts && (
        <group position={[-0.62, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.42}>
          {parts.map((p, i) => (
            <mesh key={i} geometry={p.geo}>
              <meshStandardMaterial color={p.color} roughness={0.4} metalness={0.1} />
            </mesh>
          ))}
        </group>
      )}
      <group position={[-0.3, 0.15, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text3D font={FONT} size={0.145} height={0.02}>
          {item.title}
          <meshStandardMaterial color={hot || loaded ? "#ffffff" : "#8f9199"} roughness={0.5} />
        </Text3D>
      </group>
    </group>
  );
}

/* --------------------------------- scene ---------------------------------- */

function Stage({ onSelect }: { onSelect: (i: Item) => void }) {
  const items = useMemo<Item[]>(() => {
    const all = [flagship, ...projects] as unknown as Item[];
    return all.map((p) => ({ ...p, face: FACE[p.title] ?? "React" }));
  }, []);
  const [loaded, setLoaded] = useState(0);
  const [running, setRunning] = useState(false);

  // strike the lamp shortly after the section arrives
  useEffect(() => {
    const t = setTimeout(() => setRunning(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => onSelect(items[loaded]), [loaded, items, onSelect]);

  return (
    <>
      <Screen item={items[loaded]} />
      <Projector on={running} />
      {items.map((it, i) => (
        <Cartridge
          key={it.title}
          item={it}
          slot={i}
          loaded={i === loaded}
          onPick={() => {
            if (i === loaded) return;
            setLoaded(i);
            playStageLight(); // the same contactor clunk as the stage lamp
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
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 3.8, 15.2], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          camera.lookAt(0, 1.2, 0);
        }}
      >
        <ambientLight intensity={0.32} color="#c9d2e2" />
        <spotLight
          position={[4, 11, 9]}
          angle={0.75}
          penumbra={0.9}
          intensity={360}
          decay={1.6}
          color="#f4f2ee"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-6, 4, 7]} intensity={0.35} color="#aebacc" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#121214" roughness={0.95} />
        </mesh>

        <Suspense fallback={null}>
          <Stage onSelect={onSelect} />
        </Suspense>
      </Canvas>
    </div>
  );
}
