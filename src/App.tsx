import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import "./App.css";
import Cursor from "./components/Cursor";
import KeyboardSection from "./components/KeyboardSection";
import { SplitText, ShinyText, Magnetic } from "./components/Bits";
import { useSectionNav } from "./hooks/useSectionNav";
import { soundEnabled, toggleSound } from "./data/keySound";
import { profile, skills, flagship, projects } from "./data/content";

const ease = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------------------------------------------------
   Section-per-viewport

   Every section is exactly one screen and scroll is a trigger: one gesture
   moves to the next or previous section, and that section's animation plays
   on its own clock once it becomes active. Nothing scrubs, and there is no
   scrolling "inside" a section.
   --------------------------------------------------------------------------- */

function Panel({
  id,
  active,
  className,
  children,
}: {
  id: string;
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`panel ${className ?? ""} ${active ? "is-active" : ""}`}>
      {children}
    </section>
  );
}

/* Entrances share one vocabulary: rise out of a mask, resolve a blur. */
const rise: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, ease, delay: 0.1 + i * 0.09 },
  }),
};

/* ------------------------------- sections -------------------------------- */

function Hero({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const state = active || reduce ? "show" : "hidden";
  return (
    <div className="hero">
      <motion.p className="hero__eyebrow" variants={rise} initial="hidden" animate={state} custom={0}>
        {profile.role}
      </motion.p>

      <h1 className="hero__title">
        <motion.span
          style={{ display: "block" }}
          variants={rise}
          initial="hidden"
          animate={state}
          custom={1}
        >
          Building things
        </motion.span>
        <motion.em
          className="grad-ink"
          style={{ display: "block" }}
          variants={rise}
          initial="hidden"
          animate={state}
          custom={2}
        >
          that hold up.
        </motion.em>
      </h1>

      <motion.p className="hero__sub" variants={rise} initial="hidden" animate={state} custom={3}>
        {profile.tagline}
      </motion.p>

      <motion.div
        className="scrollcue"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.8, delay: active ? 1.2 : 0 }}
      >
        <span>Scroll</span>
        <motion.span
          className="scrollcue__line"
          animate={{ scaleY: [1, 0.4, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>
    </div>
  );
}

function KeyboardScene({ active }: { active: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // The spotlight cone and every line of copy are gated by this class:
  // nothing is visible until the lamp comes on, and it goes back off when the
  // section deactivates so the next visit starts dark again.
  //
  // `stage-dark` goes further and blacks out the whole page - nav, progress
  // dots, custom cursor. Those live outside the panel, so during the blackout
  // they were the only things on screen, which rather spoils a blackout.
  const handleLight = (on: boolean) => {
    sceneRef.current?.closest(".panel")?.classList.toggle("is-lit", on);
    document.documentElement.classList.toggle("stage-dark", !on && activeRef.current);
  };

  /* Blackout goes on when the section is ENTERED, not when the lamp reports
     itself off: on a first visit the lamp never reports off, it has simply
     never been on, so keying off that left the nav dot glowing in the corner
     of an otherwise empty frame. Leaving must clear it, or the rest of the
     site stays blacked out. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("stage-dark", active);
    return () => root.classList.remove("stage-dark");
  }, [active]);

  return (
    <div className="section shell field-section" ref={sceneRef}>
      <p className="section__label">What I work in</p>
      <KeyboardSection skills={skills} active={active} onLight={handleLight} />
      <p className="field-note">
        Every key is something I&rsquo;ve shipped with.{" "}
        <span className="dim">Hover one.</span>
      </p>
    </div>
  );
}

function ArtifactScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const state = active || reduce ? "show" : "hidden";
  const cardRef = useRef<HTMLAnchorElement>(null);

  const setSpot = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div className="section shell artifact">
      <motion.p className="section__label" variants={rise} initial="hidden" animate={state} custom={0}>
        Selected work
      </motion.p>

      <div className="work">

      <motion.div className="work__lead" variants={rise} initial="hidden" animate={state} custom={1}>
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
                initial={{ opacity: 0, y: 12 }}
                animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.45, ease, delay: 0.45 + i * 0.07 }}
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

        {/* The rest, as a list. The featured card carries the detail; these
            carry the range - a game, a hackathon build, a hardware CLI. */}
        <ol className="work__list">
          {projects.map((p, i) => (
            <motion.li
              key={p.title}
              className="proj"
              initial={{ opacity: 0, y: 16 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.55, ease, delay: 0.3 + i * 0.09 }}
            >
              <a href={p.repo} target="_blank" rel="noreferrer" data-cursor="hover">
                <span className="proj__year">{p.years}</span>
                <span className="proj__body">
                  <span className="proj__title">{p.title}</span>
                  <span className="proj__blurb">{p.blurb}</span>
                  <span className="proj__stack">
                    {p.stack.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </span>
                </span>
              </a>
            </motion.li>
          ))}
        </ol>
      </div>

      <motion.p className="artifact__aside" variants={rise} initial="hidden" animate={state} custom={3}>
        All of it is on{" "}
        <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
          GitHub
        </a>
        . <span className="dim">I&rsquo;d rather show you one that works.</span>
      </motion.p>
    </div>
  );
}

function Contact({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const state = active || reduce ? "show" : "hidden";
  return (
    <div className="contact">
      <h2 className="contact__title">
        <SplitText text="Say hi." stagger={0.09} play={active || !!reduce} />
      </h2>
      <motion.div
        className="contact__links"
        variants={rise}
        initial="hidden"
        animate={state}
        custom={2}
      >
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
      </motion.div>
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
  );
}

/* --------------------------------- app ----------------------------------- */

const SECTIONS = ["top", "craft", "work", "contact"] as const;

export default function App() {
  const reduce = useReducedMotion();
  // Reduced motion keeps native scrolling; hijacking it would be hostile.
  const { index, goTo } = useSectionNav(SECTIONS.length, !reduce);
  const [sound, setSound] = useState(soundEnabled());

  return (
    <>
      <div className="grain" />
      <Cursor />

      <div className="app">
        <motion.nav
          className="nav"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.2 }}
        >
          <a
            className="nav__mark"
            href="#top"
            data-cursor="hover"
            onClick={(e) => {
              e.preventDefault();
              goTo(0);
            }}
          >
            <span className="nav__dot" />
            {profile.name}
          </a>
          <div className="nav__links">
            {/* Site-wide, because the keycap clicks and the stage lamp both
                use it. On by default; browsers stay silent until the first
                interaction regardless, which keySound primes for. */}
            <button
              type="button"
              className="nav__sound"
              data-cursor="hover"
              aria-pressed={sound}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              onClick={() => setSound(toggleSound())}
            >
              Sound {sound ? "on" : "off"}
            </button>
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

        <Panel id="top" active={index === 0}>
          <Hero active={index === 0} />
        </Panel>

        <Panel id="craft" active={index === 1} className="panel--void">
          <KeyboardScene active={index === 1} />
        </Panel>

        <Panel id="work" active={index === 2}>
          <ArtifactScene active={index === 2} />
        </Panel>

        <Panel id="contact" active={index === 3}>
          <Contact active={index === 3} />
        </Panel>

        {/* Where you are, and a way to jump. */}
        <nav className="dots" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              className={`dots__dot ${i === index ? "is-on" : ""}`}
              aria-label={s}
              aria-current={i === index}
              data-cursor="hover"
              onClick={() => goTo(i)}
            />
          ))}
        </nav>
      </div>
    </>
  );
}
