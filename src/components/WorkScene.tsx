import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Text3D } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { brandLogo, type LogoPart } from "../data/legendGeometry";
import { projects, flagship } from "../data/content";
import { LEGENDS } from "../data/legends";

/* ---------------------------------------------------------------------------
   Work — three competing ideas, rough.

   Smoke tests, not finished work: enough of each to judge the FEEL. Pick one
   with ?work=gallery | explode | projector and the rest gets deleted.

   All three share the keyboard's studio - black floor, hard key light - both
   because it is cheaper and because it is the argument: the site should read
   as one place rather than a series of unrelated tricks.
   --------------------------------------------------------------------------- */

export type WorkVariant = "gallery" | "explode" | "projector";

const FONT = "/fonts/helvetiker_bold.typeface.json";

/** Framing per variant. Each composition is a different size and shape, so
 *  one camera cannot serve all three. */
const CAM: Record<WorkVariant, { pos: [number, number, number]; at: number }> = {
  gallery: { pos: [0, 2.6, 16], at: 1.3 },
  explode: { pos: [0, 4.6, 15.5], at: 2.6 },
  projector: { pos: [0, 2.4, 13], at: 1.8 },
};

/** Each project's face. Real logos we already ship, no new art. */
const FACE: Record<string, string> = {
  CarScout: "FastAPI",
  "Project Horizon": "Unity",
  "Wild West Party Game": "TypeScript",
  CarStatus: "JavaScript",
};

/** CarScout's actual stack, bottom to top, for the exploded view. */
const STACK = ["PostgreSQL", "DynamoDB", "Docker", "FastAPI", "React"];

function useLogo(label: string): LogoPart[] | null {
  const [, bump] = useState(0);
  return brandLogo(LEGENDS[label]?.logo, () => bump((n) => n + 1));
}

/** A logo, extruded, fitted into `size` and standing upright. */
function Mark({ label, size = 1, y = 0 }: { label: string; size?: number; y?: number }) {
  const parts = useLogo(label);
  if (!parts) return null;
  return (
    <group position={[0, y, 0]} scale={size}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} castShadow>
          <meshStandardMaterial color={p.color} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Caption({ text, y, size = 0.3 }: { text: string; y: number; size?: number }) {
  const ref = useRef<THREE.Group>(null);
  return (
    <group ref={ref} position={[0, y, 0.4]}>
      <Text3D font={FONT} size={size} height={size * 0.28} bevelEnabled bevelSize={size * 0.02} bevelThickness={size * 0.03}>
        {text}
        <meshStandardMaterial color="#f2f1ee" roughness={0.4} metalness={0.15} />
      </Text3D>
    </group>
  );
}

/* ------------------------------- A. gallery ------------------------------- */

function Gallery() {
  const all = useMemo(() => [{ title: flagship.title }, ...projects], []);
  const [hot, setHot] = useState<number | null>(null);
  const plinth = useMemo(() => new RoundedBoxGeometry(1.5, 2.2, 1.5, 4, 0.06), []);

  return (
    <group position={[0, -1.4, 0]}>
      {all.map((p, i) => {
        const x = (i - (all.length - 1) / 2) * 2.9;
        const lit = hot === i;
        return (
          <group key={p.title} position={[x, 0, 0]}>
            <mesh
              geometry={plinth}
              position={[0, 1.1, 0]}
              castShadow
              receiveShadow
              onPointerOver={() => setHot(i)}
              onPointerOut={() => setHot((h) => (h === i ? null : h))}
            >
              <meshStandardMaterial color={lit ? "#2a2a31" : "#1a1a1f"} roughness={0.75} />
            </mesh>
            <Mark label={FACE[p.title] ?? "React"} size={1.05} y={lit ? 3.15 : 3} />
            <group position={[-0.95, 2.35, 0.78]}>
              <Text3D font={FONT} size={0.19} height={0.05}>
                {p.title}
                <meshStandardMaterial color={lit ? "#ffffff" : "#8d8f96"} roughness={0.5} />
              </Text3D>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------- B. explode ------------------------------- */

function Explode() {
  const [open, setOpen] = useState(true);
  const slab = useMemo(() => new RoundedBoxGeometry(3.4, 0.16, 2.2, 4, 0.05), []);
  const gap = useRef(0);

  useFrame((_, dt) => {
    gap.current += ((open ? 1 : 0) - gap.current) * (1 - Math.exp(-dt * 4));
  });

  return (
    <group position={[0, -1.2, 0]} rotation={[0, -0.42, 0]} onClick={() => setOpen((o) => !o)}>
      {STACK.map((label, i) => (
        <Layer key={label} label={label} index={i} slab={slab} gap={gap} />
      ))}
      <group position={[-2.6, 5.1, 0]}>
        <Text3D font={FONT} size={0.42} height={0.12} bevelEnabled bevelSize={0.008} bevelThickness={0.012}>
          CarScout
          <meshStandardMaterial color="#f2f1ee" roughness={0.4} metalness={0.15} />
        </Text3D>
      </group>
    </group>
  );
}

function Layer({
  label,
  index,
  slab,
  gap,
}: {
  label: string;
  index: number;
  slab: THREE.BufferGeometry;
  gap: React.MutableRefObject<number>;
}) {
  const g = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);
  useFrame(() => {
    // stacked flat when closed, pulled apart when open
    if (g.current) g.current.position.y = index * (0.2 + gap.current * 1.1);
  });
  return (
    <group ref={g}>
      <mesh
        geometry={slab}
        castShadow
        receiveShadow
        onPointerOver={() => setHot(true)}
        onPointerOut={() => setHot(false)}
      >
        <meshStandardMaterial
          color={hot ? "#33333d" : "#1d1d23"}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>
      <group position={[-1.15, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Mark label={label} size={0.62} />
      </group>
      <group position={[-0.2, 0.1, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text3D font={FONT} size={0.24} height={0.03}>
          {label}
          <meshStandardMaterial color={hot ? "#ffffff" : "#9a9ca4"} roughness={0.5} />
        </Text3D>
      </group>
    </group>
  );
}

/* ------------------------------ C. projector ------------------------------ */

function Projector() {
  const tex = useLoader(THREE.TextureLoader, "/shots/carscout.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  const body = useMemo(() => new RoundedBoxGeometry(1.5, 0.8, 2.1, 4, 0.1), []);

  return (
    <group position={[0, -0.6, 0]}>
      {/* the screen */}
      <group position={[0, 2.4, -3]}>
        <mesh position={[0, 0, -0.06]}>
          <planeGeometry args={[8.6, 5.0]} />
          <meshStandardMaterial color="#0c0c0f" roughness={1} />
        </mesh>
        <mesh>
          <planeGeometry args={[8.2, 4.7]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
      <Caption text="CarScout" y={-0.9} size={0.42} />

      {/* the projector itself, throwing the beam */}
      <group position={[0, -1.1, 4.2]}>
        <mesh geometry={body} castShadow>
          <meshStandardMaterial color="#26262c" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, -1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.34, 0.5, 24]} />
          <meshStandardMaterial color="#15151a" roughness={0.35} metalness={0.6} />
        </mesh>
        <spotLight
          position={[0, 0, -1.3]}
          target-position={[0, 3.5, -7]}
          angle={0.5}
          penumbra={0.6}
          intensity={40}
          distance={16}
          color="#eaf0ff"
        />
      </group>
    </group>
  );
}

/* --------------------------------- scene ---------------------------------- */

export default function WorkScene({ variant }: { variant: WorkVariant }) {
  return (
    <div className="workscene">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: CAM[variant].pos, fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          camera.lookAt(0, CAM[variant].at, 0);
        }}
      >
        <ambientLight intensity={0.5} color="#c9d2e2" />
        <spotLight
          position={[3, 12, 8]}
          angle={0.7}
          penumbra={0.9}
          intensity={520}
          decay={1.6}
          color="#f4f2ee"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 4, 6]} intensity={0.5} color="#aebacc" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#121214" roughness={0.95} />
        </mesh>

        <Suspense fallback={null}>
          {variant === "gallery" && <Gallery />}
          {variant === "explode" && <Explode />}
          {variant === "projector" && <Projector />}
        </Suspense>
      </Canvas>
    </div>
  );
}
