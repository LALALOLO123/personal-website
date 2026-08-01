import { useCallback, useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
   Section navigation

   Scroll is a trigger, not a scrubber: one wheel gesture, swipe, or arrow key
   moves exactly one section, and the page glides there. Nothing scrolls
   "within" a section - each is a single viewport and its animation runs on its
   own clock once it becomes active.

   Native scrolling is suppressed while this is on; that is the whole point,
   but it means the escape hatches have to be deliberate:
     - prefers-reduced-motion turns the whole thing off (native scroll returns)
     - the jump is animated with a real easing curve, not scroll-behavior:smooth,
       so the duration is known and the lock can be released exactly on arrival
     - anchor links and focus still work through goTo()
   --------------------------------------------------------------------------- */

const DURATION = 850; // ms per section jump
const WHEEL_MIN = 6; // ignore trackpad jitter
const COOLDOWN = 90; // extra ms after arrival before another gesture counts

/** Ease-in-out cubic: leaves rest gently, arrives gently. */
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Where a section actually starts.
 *
 *  Measured off the element rather than computed as index * innerHeight.
 *  Going fullscreen fires `resize` BEFORE the 100svh panels have reflowed, so
 *  the computed offset is a viewport stale at exactly the moment it is used -
 *  the page lands part way between two panels and you get one section filling
 *  most of the screen with a band of the next below it. Reading offsetTop is
 *  always right, whatever the layout is doing. */
function sectionTop(i: number) {
  const el = document.querySelectorAll<HTMLElement>(".panel")[i];
  return el ? el.offsetTop : i * window.innerHeight;
}

/** Runs before a move and can hold it up. Return a promise to make the nav
 *  wait - the hero uses it to play the robot beat before handing over. */
export type Gate = (from: number, to: number) => Promise<void> | null | undefined;

export function useSectionNav(count: number, enabled: boolean, gate?: Gate) {
  const [index, setIndex] = useState(0);
  const busy = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;

  const gateRef = useRef<Gate | undefined>(gate);
  gateRef.current = gate;

  const goTo = useCallback(
    (target: number, animate = true) => {
      const i = Math.max(0, Math.min(count - 1, target));
      const from = window.scrollY;
      const to = sectionTop(i);
      if (i === indexRef.current && Math.abs(from - to) < 2) return;

      /* A gate can hold the move open - the hero plays its exit to black
         before the keyboard arrives. Stay busy for the whole wait so a second
         gesture cannot queue another jump behind it, and land INSTANTLY when
         it resolves: the screen is already black by then, and animating a
         scroll nobody can see just delays the next section. */
      const held = gateRef.current?.(indexRef.current, i);
      if (held) {
        busy.current = true;
        held.then(() => {
          setIndex(i);
          window.scrollTo(0, sectionTop(i));
          window.setTimeout(() => (busy.current = false), COOLDOWN);
        });
        return;
      }

      setIndex(i);
      if (!animate) {
        window.scrollTo(0, to);
        return;
      }

      busy.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / DURATION);
        window.scrollTo(0, from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(step);
        else window.setTimeout(() => (busy.current = false), COOLDOWN);
      };
      requestAnimationFrame(step);
    },
    [count]
  );

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (e: WheelEvent) => {
      // Let anything genuinely scrollable (a long card, a code block) keep its
      // own scroll; only hijack when the page itself would move.
      if ((e.target as HTMLElement)?.closest?.("[data-scrollable]")) return;
      e.preventDefault();
      if (busy.current || Math.abs(e.deltaY) < WHEEL_MIN) return;
      goTo(indexRef.current + (e.deltaY > 0 ? 1 : -1));
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const next = { ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (next) {
        e.preventDefault();
        if (!busy.current) goTo(indexRef.current + next);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(count - 1);
      }
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-scrollable]")) return;
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (busy.current || Math.abs(dy) < 40) return;
      goTo(indexRef.current + (dy > 0 ? 1 : -1));
    };

    /* Keep the index honest if anything else moves the page (anchor, refresh,
       going fullscreen). Deferred two frames rather than run on the event:
       resize fires before the panels have been laid out at the new height, so
       realigning immediately just snaps to the OLD geometry. */
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => goTo(indexRef.current, false))
      );
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", onResize);
    // Fullscreen does not always emit a plain resize; these do.
    document.addEventListener("fullscreenchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [enabled, goTo, count]);

  return { index, goTo };
}
