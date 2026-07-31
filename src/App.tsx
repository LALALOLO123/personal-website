import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "motion/react";
import "./App.css";
import Cursor from "./components/Cursor";
import KeyboardSection from "./components/KeyboardSection";
import { profile, skills, flagship } from "./data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

/** Splits a string into words that rise out of a clipping mask. */
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
            initial={reduce ? { y: 0 } : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease, delay: delay + i * 0.09 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const reduce = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);

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
            <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
              GitHub
            </a>
            <a href={`mailto:${profile.email}`} data-cursor="hover">
              Email
            </a>
          </div>
        </motion.nav>

        {/* ---------------- hero ---------------- */}
        <motion.header
          className="hero"
          id="top"
          ref={heroRef}
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
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
            <em>
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

          <motion.div
            className="scrollcue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.8 }}
          >
            <span>Scroll</span>
            <motion.span
              className="scrollcue__line"
              animate={{ scaleY: [1, 0.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "top" }}
            />
          </motion.div>
        </motion.header>

        {/* ---------------- the field ----------------
            The skills are the content of this section, not a footnote to a
            paragraph. Move the cursor through them. */}
        <motion.section
          className="section shell field-section"
          id="craft"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <p className="section__label">What I work in</p>
          <KeyboardSection skills={skills} />
          <p className="field-note">
            Every key is something I&rsquo;ve shipped with.{" "}
            <span className="dim">Hover one.</span>
          </p>
        </motion.section>

        {/* ---------------- one artifact ----------------
            One thing, deeply, with a URL you can click. The rest is on GitHub. */}
        <motion.section
          className="section shell artifact"
          id="work"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <p className="section__label">Currently proudest of</p>

          <a
            className="artifact__card"
            href={flagship.live}
            target="_blank"
            rel="noreferrer"
            data-cursor="hover"
          >
            <div className="artifact__head">
              <h2 className="artifact__title">{flagship.title}</h2>
              <span className="artifact__live">Live</span>
            </div>
            <p className="artifact__blurb">{flagship.blurb}</p>
            <div className="artifact__stack">
              {flagship.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <span className="artifact__cta">Open it &rarr;</span>
          </a>

          <p className="artifact__aside">
            There&rsquo;s more on{" "}
            <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
              GitHub
            </a>{" "}
            &mdash; a compiler backend, a Unity game, some smaller things.{" "}
            <span className="dim">I&rsquo;d rather show you one that works.</span>
          </p>
        </motion.section>

        {/* ---------------- contact ---------------- */}
        <motion.section
          className="contact"
          id="contact"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <div className="contact__links">
            <a href={`mailto:${profile.email}`} data-cursor="hover">
              Email
            </a>
            <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="hover">
              GitHub
            </a>
            <a href={profile.linkedin} target="_blank" rel="noreferrer" data-cursor="hover">
              LinkedIn
            </a>
          </div>
        </motion.section>

        <footer className="footer">
          <span>&copy; 2026 {profile.name}</span>
          <span>WebGL &middot; no template</span>
        </footer>
      </div>
    </>
  );
}
