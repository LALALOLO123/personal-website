import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useReducedMotion, type MotionValue } from "motion/react";
import SkillField from "./SkillField";

/* three + react-three-fiber are ~215KB gzipped, which is more than the rest of
   the site put together. Splitting them into their own chunk and only fetching
   it when the section is actually approaching keeps the hero instant for
   anyone who never scrolls this far. */
const Keyboard3D = lazy(() => import("./Keyboard3D"));

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function KeyboardSection({
  skills,
  progress,
  onLight,
}: {
  skills: string[];
  progress?: MotionValue<number>;
  onLight?: (on: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(webglAvailable()), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || reduce || !supported) return;

    // Two thresholds off one observer: a wide margin to start the download
    // early, and the plain intersection to park the render loop when the
    // board scrolls away.
    const preload = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLoad(true);
          preload.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    const inView = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.01,
    });

    preload.observe(host);
    inView.observe(host);
    return () => {
      preload.disconnect();
      inView.disconnect();
    };
  }, [reduce, supported]);

  // Anyone who prefers reduced motion, has no WebGL, or hits a chunk that
  // fails to load still gets the full list - just as the flat field.
  if (reduce || !supported || failed) return <SkillField skills={skills} />;

  return (
    <div className="kb-host" ref={hostRef}>
      {/* The board is decorative; this is the copy that actually gets read. */}
      <ul className="visually-hidden">
        {skills.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <div aria-hidden="true">
        {load ? (
          <ErrorBoundary onError={() => setFailed(true)}>
            <Suspense fallback={<KeyboardSkeleton />}>
              <Keyboard3D paused={!visible} progress={reduce ? undefined : progress} onLight={onLight} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <KeyboardSkeleton />
        )}
      </div>
    </div>
  );
}

function KeyboardSkeleton() {
  return <div className="kb kb--skeleton" />;
}

/* A WebGL context can still be refused after the check passes (blocklisted
   driver, too many live contexts). Falling back beats an empty section. */
class ErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(_err: Error, _info: ErrorInfo) {
    this.props.onError();
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}
