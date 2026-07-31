import { useEffect, useRef, useState } from "react";

/**
 * Custom pointer: a small solid dot tracks 1:1 while a larger ring lags behind
 * with spring-like easing. The ring swells when hovering anything tagged
 * [data-cursor="hover"] (links, buttons). Disabled on touch / coarse pointers.
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Detect the pointer type first. This has to be its own effect: the elements
  // below are gated on `enabled`, so on the very first run the refs are still
  // null and the non-null assertions that used to be here silenced TypeScript
  // while the rAF loop threw on every frame.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let hovering = false;
    let down = false;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;

      const t = (e.target as HTMLElement)?.closest('[data-cursor="hover"]');
      hovering = !!t;
    };
    const onDown = () => {
      down = true;
    };
    const onUp = () => {
      down = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    let raf = 0;
    const loop = () => {
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      const scale = (hovering ? 1.9 : 1) * (down ? 0.7 : 1);
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      ring.style.borderColor = hovering
        ? "rgba(255, 156, 130, 0.95)"
        : "rgba(255, 255, 255, 0.55)";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.55)",
          /* The ring crosses both the light page and the dark keyboard;
             difference blending keeps it visible against either. */
          mixBlendMode: "difference",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "border-color 0.25s ease",
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--accent)",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
        }}
      />
    </>
  );
}
