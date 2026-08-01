import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import "./App.css";
import Cursor from "./components/Cursor";
import KeyboardSection from "./components/KeyboardSection";
import { SplitText, ShinyText, Magnetic } from "./components/Bits";
import { profile, skills, flagship } from "./data/content";

const ease = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------------------------------------------------
   Pinned sections

   The page is a sequence of locked scenes, Apple-style: each section is a
   tall scroll runway with a sticky viewport inside. While you scroll the
   runway, the scene holds still and its animation scrubs with your progress;
   when the animation completes, the section releases and the next one
   arrives. Nothing hijacks the wheel - the lock is geometry, not JS.
   --------------------------------------------------------------------------- */

function Pinned({
  vh,
  id,
  pinClass,
  children,
}: {
  vh: number;
  id?: string;
  pinClass?: string;
  children: (progress: MotionValue<number>) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  return (
    <div ref={ref} id={id} className="stage" style={{ height: `${vh}vh` }}>
      <div className={`stage__pin ${pinClass ?? ""}`}>{children(scrollYProgress)}</div>
    </div>
  );
}

/** Splits a string into words that rise out of a clipping mask on load. */
function AnimatedWords({ text, delay = 0.5 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span style={{ display: "inline" }}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span
            style={{ display: "inline-block", paddingRight: "0.22em" }}
            initial={reduce ? { y: 0 } : { y: "110%", filter: "blur(6px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease, delay: delay + i * 0.09 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------- sections -------------------------------- */

function Hero({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  // Hold while the words land, then hand the frame off with a lift and blur.
  const y = useTransform(progress, [0.55, 1], [0, -110]);
  const opacity = useTransform(progress, [0.55, 0.92], [1, 0]);
  const blur = useTransform(progress, [0.55, 0.95], ["blur(0px)", "blur(10px)"]);
  const cueOpacity = useTransform(progress, [0, 0.25], [1, 0]);

  return (
    <motion.header
      className="hero"
      style={reduce ? undefined : { y, opacity, filter: blur }}
    >
      <motion.p
        className="hero__eyebrow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        {profile.role}
      </motion.p>

      <h1 className="hero__title">
        <AnimatedWords text="Building things" delay={0.5} />
        <br />
        <em className="grad-ink">
          <AnimatedWords text="that hold up." delay={0.72} />
        </em>
      </h1>

      <motion.p
        className="hero__sub"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease, delay: 1.1 }}
      >
        {profile.tagline}
      </motion.p>

      <motion.div className="scrollcue" style={reduce ? undefined : { opacity: cueOpacity }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
        >
          Scroll
        </motion.span>
        <motion.span
          className="scrollcue__line"
          animate={{ scaleY: [1, 0.4, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>
    </motion.header>
  );
}

function KeyboardScene({ progress }: { progress: MotionValue<number> }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  // The spotlight cone and every line of copy are gated by this class:
  // nothing in the scene is visible until the lamp turns on, and it goes back
  // off when the section rewinds so the next visit starts dark again.
  const handleLight = (on: boolean) =>
    sceneRef.current?.closest(".stage__pin")?.classList.toggle("is-lit", on);

  return (
    <div className="section shell field-section" ref={sceneRef}>
      <p className="section__label">What I work in</p>
      <KeyboardSection skills={skills} progress={progress} onLight={handleLight} />
      <p className="field-note">
        Every key is something I&rsquo;ve shipped with.{" "}
        <span className="dim">Hover one.</span>
      </p>
    </div>
  );
}

function ArtifactScene({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const labelOpacity = useTransform(progress, [0, 0.1], [0, 1]);
  const labelY = useTransform(progress, [0, 0.1], [26, 0]);
  // The card stands up out of the page like a product tile.
  const cardOpacity = useTransform(progress, [0.03, 0.24], [0, 1]);
  const cardY = useTransform(progress, [0.03, 0.38], [120, 0]);
  const cardRotate = useTransform(progress, [0.03, 0.38], [14, 0]);
  const asideOpacity = useTransform(progress, [0.6, 0.78], [0, 1]);

  const setSpot = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div className="section shell artifact">
      <motion.p
        className="section__label"
        style={reduce ? undefined : { opacity: labelOpacity, y: labelY }}
      >
        Currently proudest of
      </motion.p>

      <motion.div
        style={
          reduce
            ? undefined
            : {
                opacity: cardOpacity,
                y: cardY,
                rotateX: cardRotate,
                transformPerspective: 1100,
                transformOrigin: "center 85%",
              }
        }
      >
        <a
          ref={cardRef}
          className="artifact__card spotlight"
          href={flagship.live}
          target="_blank"
          rel="noreferrer"
          data-cursor="hover"
          onPointerMove={setSpot}
        >
          <div className="artifact__head">
            <h2 className="artifact__title">{flagship.title}</h2>
            <span className="artifact__live">
              <ShinyText>Live</ShinyText>
            </span>
          </div>
          <p className="artifact__blurb">{flagship.blurb}</p>
          <div className="artifact__stack">
            {flagship.stack.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: 0.35 + i * 0.07 }}
              >
                {s}
              </motion.span>
            ))}
          </div>
          <span className="artifact__cta">
            <ShinyText>Open it &rarr;</ShinyText>
          </span>
        </a>
      </motion.div>

      <motion.p
        className="artifact__aside"
        style={reduce ? undefined : { opacity: asideOpacity }}
      >
        There&rsquo;s more on{" "}
        <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
          GitHub
        </a>{" "}
        &mdash; a compiler backend, a Unity game, some smaller things.{" "}
        <span className="dim">I&rsquo;d rather show you one that works.</span>
      </motion.p>
    </div>
  );
}

/* --------------------------------- app ----------------------------------- */

export default function App() {
  const { scrollYProgress: pageProgress } = useScroll();
  const rail = useSpring(pageProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });

  return (
    <>
      <div className="grain" />
      <Cursor />

      <motion.div className="progress-rail" style={{ scaleX: rail }} />

      <div className="app">
        <motion.nav
          className="nav"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.2 }}
        >
          <a className="nav__mark" href="#top" data-cursor="hover">
            <span className="nav__dot" />
            {profile.name}
          </a>
          <div className="nav__links">
            <Magnetic>
              <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
                GitHub
              </a>
            </Magnetic>
            <Magnetic>
              <a href={`mailto:${profile.email}`} data-cursor="hover">
                Email
              </a>
            </Magnetic>
          </div>
        </motion.nav>

        {/* Scene 1: the name. Holds until the words have said their piece. */}
        <Pinned vh={170} id="top">
          {(p) => <Hero progress={p} />}
        </Pinned>

        {/* Scene 2: the keyboard lifts into its product pose, then releases. */}
        <Pinned vh={260} id="craft" pinClass="stage__pin--void">
          {(p) => <KeyboardScene progress={p} />}
        </Pinned>

        {/* Scene 3: CarScout stands up. */}
        <Pinned vh={200} id="work">
          {(p) => <ArtifactScene progress={p} />}
        </Pinned>

        {/* Scene 4: contact - no lock, the page just ends calmly. */}
        <section className="contact" id="contact">
          <h2 className="contact__title">
            <SplitText text="Say hi." stagger={0.09} />
          </h2>
          <div className="contact__links">
            {(
              [
                [`mailto:${profile.email}`, "Email", false],
                [profile.github, "GitHub", true],
                [profile.linkedin, "LinkedIn", true],
              ] as const
            ).map(([href, label, ext]) => (
              <Magnetic key={label} strength={0.4}>
                <a
                  href={href}
                  {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
                  data-cursor="hover"
                >
                  {label}
                </a>
              </Magnetic>
            ))}
          </div>
        </section>

        <footer className="footer">
          <span>&copy; 2026 {profile.name}</span>
          <span>
            WebGL &middot; no template &middot; keycap mesh from{" "}
            <a
              href="https://github.com/Naresh-Khatri/3d-portfolio"
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
            >
              Naresh Khatri
            </a>
          </span>
        </footer>
      </div>
    </>
  );
}
