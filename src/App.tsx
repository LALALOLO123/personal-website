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
import ShaderBackground from "./components/ShaderBackground";
import Cursor from "./components/Cursor";
import { profile, projects, stack, facts } from "./data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
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

/**
 * One project row. Each tracks its own scroll progress rather than firing a
 * single whileInView tween, so the row keeps easing as you scroll instead of
 * snapping once and stopping. The spring smooths the raw scroll value, which is
 * what stops it feeling mechanically tied to the wheel.
 */
function ProjectRow({ p }: { p: (typeof projects)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.55"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  const y = useTransform(smooth, [0, 1], [56, 0]);
  const opacity = useTransform(smooth, [0, 1], [0, 1]);
  const blur = useTransform(smooth, [0, 1], ["blur(6px)", "blur(0px)"]);

  const href = p.live || p.href;

  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { y, opacity, filter: blur }}
      className="proj-wrap"
    >
      <a
        className="proj"
        href={href || `mailto:${profile.email}`}
        target={href ? "_blank" : undefined}
        rel={href ? "noreferrer" : undefined}
        data-cursor="hover"
      >
        <span className="proj__index">{p.index}</span>
        <div className="proj__body">
          <h3 className="proj__title">
            {p.title}
            {p.live && <span className="proj__live">Live</span>}
          </h3>
          <p className="proj__blurb">{p.blurb}</p>
          <div className="proj__stack">
            {p.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
        <span className="proj__year">{p.year}</span>
      </a>
    </motion.div>
  );
}

export default function App() {
  const reduce = useReducedMotion();

  // Hero drifts and fades as you scroll past it, so the shader is revealed
  // rather than the whole page sliding as one slab.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);

  // Thin progress rail along the top of the viewport.
  const { scrollYProgress: pageProgress } = useScroll();
  const rail = useSpring(pageProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });

  return (
    <>
      <ShaderBackground />
      <div className="grain" />
      <div className="vignette" />
      <Cursor />

      <motion.div className="progress-rail" style={{ scaleX: rail }} />

      <div className="app">
        {/* ---------------- nav ---------------- */}
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
            <a href="#about" data-cursor="hover">
              About
            </a>
            <a href="#work" data-cursor="hover">
              Work
            </a>
            <a href="#contact" data-cursor="hover">
              Contact
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
            className="hero__meta"
            variants={stagger}
            initial="hidden"
            animate="show"
            transition={{ delayChildren: 1.4 }}
          >
            {facts.map((f) => (
              <motion.span key={f.label} variants={reveal}>
                {f.label} <b>{f.value}</b>
              </motion.span>
            ))}
          </motion.div>

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

        {/* ---------------- about ---------------- */}
        <motion.section
          className="section shell"
          id="about"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <p className="section__label">About</p>
          <p className="about__text">
            I&rsquo;m a CS student who likes the parts of software that push back.{" "}
            <span className="dim">
              A compiler backend where the abstraction bottoms out in silicon. A
              production platform where an authorization bug is worth 11,000 leaked
              records. The common thread is that you can prove whether it worked.
            </span>
          </p>

          <motion.div
            className="about__grid"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
          >
            {stack.map((s) => (
              <motion.span key={s} className="chip" variants={reveal} data-cursor="hover">
                {s}
              </motion.span>
            ))}
          </motion.div>
        </motion.section>

        {/* ---------------- work ---------------- */}
        <section className="section shell" id="work">
          <motion.p
            className="section__label"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            Selected Work
          </motion.p>

          <div className="work__list">
            {projects.map((p) => (
              <ProjectRow key={p.index} p={p} />
            ))}
          </div>
        </section>

        {/* ---------------- contact ---------------- */}
        <motion.section
          className="contact"
          id="contact"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <p className="section__label" style={{ justifyContent: "center" }}>
            Contact
          </p>
          <h2 className="contact__big">
            Looking for a{" "}
            <a href={`mailto:${profile.email}`} data-cursor="hover">
              Summer 2027 internship
            </a>
            .
          </h2>
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

        {/* ---------------- footer ---------------- */}
        <footer className="footer">
          <span>&copy; 2026 {profile.name}</span>
          <span>Built with React &middot; WebGL &middot; Motion</span>
        </footer>
      </div>
    </>
  );
}
