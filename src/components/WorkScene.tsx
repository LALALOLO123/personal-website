import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D, useGLTF } from "@react-three/drei";
import * as THREE from "three";
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

const SCREEN_W = 16;
const SCREEN_H = 9;

/* Depth is the whole composition here. Everything used to sit far too near
   the lens - the projector filled the frame and the rack fell off the bottom
   entirely. Screen upstage, projector mid, rack downstage, and the camera far
   enough back that all three are in one shot. */
const SCREEN_Z = -3.0;
/** The screen prop, floor to top of the tripod. */
const SCREEN_TALL = 8.2;
/** The projector, along its longest axis. */
const PROJ_LONG = 3.4;
/** The image on the fabric. Slightly inside it, the way a real throw is. */
const REEL_W = 4.4;

/** Lens to fabric. */
const BEAM_FROM = new THREE.Vector3(2.55, -0.28, 2.7);
const BEAM_TO = new THREE.Vector3(0, 3.4, SCREEN_Z + 0.1);
const PROJ_Z = 3.2;
/** Off to one side, so it is not a silhouette against its own screen. */
const PROJ_X = 2.9;
const RACK_Y = -0.92;
const RACK_Z = 5.6;

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
  const [w, setW] = useState(REEL_W);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(0);

  useEffect(() => {
    fade.current = 0;
  }, [item]);
  useFrame((_, dt) => {
    fade.current += (1 - fade.current) * (1 - Math.exp(-dt * 6));
    if (mat.current) mat.current.opacity = fade.current;
  });

  return (
    <ScreenProp onSurface={(s) => setW(s.x * 0.88)}>
      {tex && (
        <mesh>
          <planeGeometry args={[w, w / (16 / 9)]} />
          <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
        </mesh>
      )}
    </ScreenProp>
  );
}

/* ----------------------------- the props -------------------------------- */
/* Scanned models from Poly Haven (CC0), not primitives. The projector even
   has its spools as separate nodes, so they can actually turn, and the reels
   in the rack are clones of its own feed spool - the machine and its film
   are literally the same object. */

const PROJECTOR_URL = "/models/filmstrip_projector_8mm/filmstrip_projector_8mm.gltf";
const SCREEN_URL = "/models/projector_screen/projector_screen.gltf";
useGLTF.preload(PROJECTOR_URL);
useGLTF.preload(SCREEN_URL);

/** Which local axis a disc spins about: the one it is thinnest on. Derived
 *  rather than hardcoded, because a guessed axis makes a reel wobble like a
 *  dropped coin, which is exactly what it was doing. */
function discAxis(o: THREE.Object3D): "x" | "y" | "z" {
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(o).getSize(size);
  if (size.x <= size.y && size.x <= size.z) return "x";
  if (size.y <= size.x && size.y <= size.z) return "y";
  return "z";
}

/** Fit a loaded model to a target size on its longest axis, sitting on y=0. */
function fitToGround(obj: THREE.Object3D, target: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const mid = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(mid);
  const s = target / Math.max(size.x, size.y, size.z);
  obj.scale.setScalar(s);
  obj.position.set(-mid.x * s, -box.min.y * s, -mid.z * s);
  return { size: size.multiplyScalar(s) };
}

function ScreenProp({
  children,
  onSurface,
}: {
  children?: React.ReactNode;
  onSurface?: (size: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(SCREEN_URL);
  const model = useMemo(() => {
    const c = scene.clone(true);
    fitToGround(c, SCREEN_TALL);
    // Box3.setFromObject reads WORLD matrices; straight after a clone and
    // rescale those are stale, so the surface gets measured in the model's
    // original space and the reel lands somewhere near the tripod.
    c.updateMatrixWorld(true);
    return c;
  }, [scene]);

  /* Where the reel goes: measured off the mesh that carries the screen
     material, rather than guessed, so it lands on the fabric and not on the
     frame or the tripod. */
  const surface = useMemo(() => {
    let box: THREE.Box3 | null = null;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.Material | undefined;
      if (m.isMesh && mat && /screen/i.test(mat.name) && !/frame/i.test(mat.name)) {
        const b = new THREE.Box3().setFromObject(m);
        box = box ? box.union(b) : b;
      }
    });
    if (!box) return null;
    const size = new THREE.Vector3();
    const mid = new THREE.Vector3();
    (box as THREE.Box3).getSize(size);
    (box as THREE.Box3).getCenter(mid);
    return { size, mid };
  }, [model]);

  useEffect(() => {
    if (surface) onSurface?.(surface.size);
  }, [surface, onSurface]);

  return (
    <group position={[0, -1.5, SCREEN_Z]}>
      <primitive object={model} />
      {surface && (
        <group position={[surface.mid.x, surface.mid.y, surface.mid.z + 0.02]}>
          {children}
        </group>
      )}
    </group>
  );
}

function Projector({ on }: { on: boolean }) {
  const { scene } = useGLTF(PROJECTOR_URL);
  const spools = useRef<{ o: THREE.Object3D; axis: "x" | "y" | "z" }[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const lamp = useRef(0);

  const model = useMemo(() => {
    const c = scene.clone(true);
    fitToGround(c, PROJ_LONG);
    const found: { o: THREE.Object3D; axis: "x" | "y" | "z" }[] = [];
    c.updateMatrixWorld(true);
    c.traverse((o) => {
      if (/spool_(feed|takeup)/i.test(o.name)) found.push({ o, axis: discAxis(o) });
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    spools.current = found;
    return c;
  }, [scene]);

  useFrame((_, dt) => {
    // a lamp catches rather than fades
    lamp.current += ((on ? 1 : 0) - lamp.current) * (1 - Math.exp(-dt * 9));
    if (spot.current) spot.current.intensity = 42 * lamp.current;
    // and the spools turn while it runs
    for (const s of spools.current) s.o.rotation[s.axis] -= dt * 5.5 * lamp.current;
  });

  return (
    <group position={[PROJ_X, -1.5, PROJ_Z]} rotation={[0, Math.PI - 0.34, 0]}>
      <primitive object={model} />
      <spotLight
        ref={spot}
        position={[0, 0.75, -0.6]}
        target-position={[0, 3.4, 9]}
        angle={0.4}
        penumbra={0.55}
        intensity={0}
        distance={22}
        color="#eaf0ff"
      />
    </group>
  );
}


/* ------------------------------- the beam --------------------------------- */

/** The throw itself.
 *
 *  This is what was missing. Without it the scene is a screen, a machine and
 *  some reels sharing a floor for no stated reason; with it they are one
 *  event. A cone of additive haze from lens to fabric, plus motes drifting in
 *  it so the light has something to catch on. */
function Beam({ from, to, on }: { from: THREE.Vector3; to: THREE.Vector3; on: boolean }) {
  const cone = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Points>(null);
  const lit = useRef(0);

  const { len, mid, quat } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    // a cone points +Y by default; aim it down the throw
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { len, mid, quat };
  }, [from, to]);

  const motes = useMemo(() => {
    const N = 420;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // uniform along the throw, random within the cone at that depth
      const t = Math.random();
      const r = Math.sqrt(Math.random()) * (0.12 + t * 2.05);
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (t - 0.5) * len;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [len]);

  useFrame((state, dt) => {
    lit.current += ((on ? 1 : 0) - lit.current) * (1 - Math.exp(-dt * 7));
    const m = cone.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.055 * lit.current;
    const dm = dust.current?.material as THREE.PointsMaterial | undefined;
    if (dm) dm.opacity = 0.5 * lit.current;
    // motes drift, so the beam is alive rather than a solid wedge
    if (dust.current) dust.current.rotation.y = state.clock.elapsedTime * 0.06;
  });

  return (
    <group position={mid} quaternion={quat}>
      <mesh ref={cone} renderOrder={3}>
        <coneGeometry args={[2.2, len, 40, 1, true]} />
        <meshBasicMaterial
          color="#cfe0ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <points ref={dust} geometry={motes} renderOrder={4}>
        <pointsMaterial
          size={0.035}
          color="#e8f0ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
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
  /* A reel, cloned from the projector's own feed spool - the machine and its
     film are literally the same asset, and it is real geometry rather than a
     cylinder pretending. */
  const { scene: projScene } = useGLTF(PROJECTOR_URL);
  const reel = useMemo(() => {
    let src: THREE.Object3D | null = null;
    projScene.traverse((o) => {
      if (!src && /spool_feed/i.test(o.name)) src = o;
    });
    if (!src) return null;
    const c = (src as THREE.Object3D).clone(true);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    c.scale.setScalar(1.15 / Math.max(size.x, size.y, size.z));
    // stand it up facing the camera, whichever way the source spool was built
    const axis = discAxis(c);
    if (axis === "x") c.rotation.y = Math.PI / 2;
    else if (axis === "y") c.rotation.x = Math.PI / 2;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [projScene]);
  const [, bump] = useState(0);
  const parts = brandLogo(LEGENDS[item.face]?.logo, () => bump((n) => n + 1));

  const home = useMemo<[number, number, number]>(
    () => [-4.9 + slot * 2.2, RACK_Y, RACK_Z],
    [slot]
  );
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!g.current) return;
    // loaded rides on top of the projector; the rest wait in the rack, and
    // lift a little when pointed at
    target.set(...home);
    if (loaded) target.set(PROJ_X - 0.35, -0.42, PROJ_Z - 0.1);
    else if (hot) target.y += 0.18;

    const k = 1 - Math.exp(-dt * 7);
    g.current.position.lerp(target, k);
    const tilt = 0;
    g.current.rotation.x += (tilt - g.current.rotation.x) * k;
  });

  return (
    <group ref={g} position={home}>
      {/* an invisible slab carries the pointer events: the spool geometry is
          fiddly to hit and a reel you cannot click is worse than an ugly one */}
      <mesh
        visible={false}
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
        <boxGeometry args={[1.7, 0.7, 1.7]} />
      </mesh>
      {reel && <primitive object={reel} />}

      {/* the project's mark, set into the reel hub */}
      {parts && (
        <group position={[0, 0.02, 0.28]} scale={0.34}>
          {parts.map((p, i) => (
            <mesh key={i} geometry={p.geo}>
              <meshStandardMaterial color={p.color} roughness={0.4} metalness={0.1} />
            </mesh>
          ))}
        </group>
      )}
      <group position={[-0.62, -0.92, 0.1]}>
        <Text3D font={FONT} size={0.16} height={0.03}>
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
      <Beam from={BEAM_FROM} to={BEAM_TO} on={running} />
      {/* the fabric is the brightest thing in the room, so it should be the
          thing lighting it - this is what puts the machine in the same space
          as the screen rather than beside it */}
      <pointLight position={[0, 3.4, SCREEN_Z + 1.2]} intensity={26} distance={16} color="#dce8ff" />
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
        camera={{ position: [-1.0, 3.5, 17.2], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          camera.lookAt(0.6, 2.1, -0.6);
        }}
      >
        <ambientLight intensity={0.16} color="#9fb0cc" />
        <spotLight
          position={[4, 11, 9]}
          angle={0.75}
          penumbra={0.9}
          intensity={150}
          decay={1.6}
          color="#f4f2ee"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-6, 4, 7]} intensity={0.18} color="#aebacc" />

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
