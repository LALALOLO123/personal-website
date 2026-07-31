import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

/* ---------------------------------------------------------------------------
   Micro-animation kit, React Bits-style

   Small, reusable pieces of liveliness: split-text reveals, a shine sweep,
   magnetic hover. Hand-rolled on Motion instead of importing the library so
   the bundle stays lean and everything respects prefers-reduced-motion.
   --------------------------------------------------------------------------- */

const ease = [0.16, 1, 0.3, 1] as const;

/** Words rise out of a mask with a blur that resolves as they land. */
export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.05,
  once = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className} style={{ display: "inline" }}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span
            style={{ display: "inline-block", paddingRight: "0.24em", willChange: "transform, filter" }}
            initial={{ y: "112%", opacity: 0, filter: "blur(7px)" }}
            whileInView={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            viewport={{ once, margin: "-12%" }}
            transition={{ duration: 0.85, ease, delay: delay + i * stagger }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** A light band sweeps across the text on loop; the Apple "learn more" shimmer. */
export function ShinyText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`shiny ${className ?? ""}`}>{children}</span>;
}

/** The wrapped element leans toward the pointer and springs home on leave. */
export function Magnetic({
  children,
  strength = 0.32,
}: {
  children: ReactNode;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 240, damping: 18, mass: 0.5 });
  const y = useSpring(0, { stiffness: 240, damping: 18, mass: 0.5 });

  if (reduce) return <span style={{ display: "inline-block" }}>{children}</span>;

  return (
    <motion.span
      ref={ref}
      style={{ display: "inline-block", x, y }}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
