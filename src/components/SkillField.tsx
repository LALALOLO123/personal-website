import { useEffect, useRef } from "react";

/**
 * The skills, rendered as a field that responds to the pointer rather than a
 * list of chips. Each word measures its distance to the cursor and eases toward
 * a brightness/weight/scale based on that distance, so a soft focus travels with
 * you and the rest of the field stays quiet.
 *
 * Written against the DOM directly instead of React state: this runs on every
 * frame across ~30 nodes, and re-rendering the tree at 60fps to move some text
 * would be the wrong tool. Each node keeps its own eased value so words settle
 * at their own pace instead of snapping together, which is what makes it feel
 * like a material rather than a hover effect.
 */

type Props = { skills: string[] };

const RADIUS = 260; // px of influence around the pointer

export default function SkillField({ skills }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLSpanElement[]>([]);
  const pointer = useRef({ x: -9999, y: -9999, active: false });
  const eased = useRef<number[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) {
      // No pointer to track, or the user asked for stillness: present the field
      // at a flat readable weight and skip the loop entirely.
      itemsRef.current.forEach((el) => {
        if (el) el.style.setProperty("--f", "0.35");
      });
      return;
    }

    eased.current = skills.map(() => 0);

    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.active = true;
    };
    const onLeave = () => {
      pointer.current.active = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const tick = () => {
      const { x, y, active } = pointer.current;
      for (let i = 0; i < itemsRef.current.length; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;

        let target = 0;
        if (active) {
          const r = el.getBoundingClientRect();
          const dx = x - (r.left + r.width / 2);
          const dy = y - (r.top + r.height / 2);
          const dist = Math.hypot(dx, dy);
          // smoothstep falloff so the edge of the influence is soft
          const t = Math.max(0, Math.min(1, 1 - dist / RADIUS));
          target = t * t * (3 - 2 * t);
        }

        // per-node easing; the lag is what makes the field feel physical
        eased.current[i] += (target - eased.current[i]) * 0.12;
        const v = eased.current[i];
        if (v > 0.001 || target > 0) {
          el.style.setProperty("--f", v.toFixed(3));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [skills]);

  return (
    <div className="skillfield" ref={wrapRef} aria-label="Technologies I work in">
      {skills.map((s, i) => (
        <span
          key={s}
          className="skillfield__item"
          ref={(el) => {
            if (el) itemsRef.current[i] = el;
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}
