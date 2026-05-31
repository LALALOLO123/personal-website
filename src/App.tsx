import { motion, type Variants } from "motion/react";
import "./App.css";
import ShaderBackground from "./components/ShaderBackground";
import Cursor from "./components/Cursor";
import { profile, projects, stack } from "./data/content";

const ease = [0.16, 1, 0.3, 1] as const;

// reusable scroll-reveal for section blocks
const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Splits a string into spring-revealing words for the hero headline. */
function AnimatedWords({ text }: { text: string }) {
  return (
    <span style={{ display: "inline" }}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span
            style={{ display: "inline-block", paddingRight: "0.22em" }}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease, delay: 0.5 + i * 0.09 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export default function App() {
  return (
    <>
      <ShaderBackground />
      <div className="grain" />
      <div className="vignette" />
      <Cursor />

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
        <header className="hero" id="top">
          <motion.p
            className="hero__eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {profile.role}
          </motion.p>

          <h1 className="hero__title">
            <AnimatedWords text="Building things" />
            <br />
            <em>
              <AnimatedWords text="that move." />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
          >
            <span>
              Based <b>{profile.location}</b>
            </span>
            <span>
              Focus <b>Frontend · Graphics · Tooling</b>
            </span>
            <span>
              Status <b>Open to build</b>
            </span>
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
        </header>

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
            I'm a developer who treats the browser like a canvas.{" "}
            <span className="dim">
              Equal parts engineering and craft — performance budgets, clean
              abstractions, and pixels that feel alive.
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

          <motion.div
            className="work__list"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-12%" }}
          >
            {projects.map((p) => (
              <motion.a
                key={p.index}
                className="proj"
                href={p.href || "#contact"}
                variants={reveal}
                data-cursor="hover"
              >
                <span className="proj__index">{p.index}</span>
                <div>
                  <h3 className="proj__title">{p.title}</h3>
                  <p className="proj__blurb">{p.blurb}</p>
                  <div className="proj__stack">
                    {p.stack.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </div>
                <span className="proj__year">{p.year}</span>
              </motion.a>
            ))}
          </motion.div>
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
            Let's make something{" "}
            <a href={`mailto:${profile.email}`} data-cursor="hover">
              unforgettable
            </a>
            .
          </h2>
          <div className="contact__links">
            <a href={`mailto:${profile.email}`} data-cursor="hover">
              Email
            </a>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              data-cursor="hover"
            >
              GitHub
            </a>
          </div>
        </motion.section>

        {/* ---------------- footer ---------------- */}
        <footer className="footer">
          <span>© 2026 {profile.name}</span>
          <span>Built with React · WebGL · Motion</span>
        </footer>
      </div>
    </>
  );
}
