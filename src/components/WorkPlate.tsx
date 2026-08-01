import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cornerPin, type Quad } from "../lib/cornerPin";
import { projects, flagship } from "../data/content";
import { playStageLight } from "../data/keySound";

/* ---------------------------------------------------------------------------
   Work — plate + composite  (PROTOTYPE)

   The room is a picture. The screen inside it is ours.

   Building a convincing room in 3D turned out to be the wrong job to take on;
   a generated plate does that part far better than I can, and everything hard
   about it - light, materials, art direction - stops being our problem. What
   stays our problem is the bit code is good at: warping live content onto the
   screen in the picture, and keeping it clickable.

   The plate MUST be locked off. Any camera drift and the overlay would have
   to be motion-tracked frame by frame, which we cannot do; with a static
   camera the mapping is solved once and holds forever. The projection is
   still alive - flicker and weave run on the overlay, which is how it works
   in reality anyway: the room is not moving, the light is.

   Run with ?work=plate. Add &calib=1 to drag the corners onto a new plate;
   it prints the quad to paste back in here.
   --------------------------------------------------------------------------- */

const PLATE = "/shots/plate-plane.jpg";
const PLATE_AR = 16 / 9;

/* Where the floating panel hangs, as fractions of the plate.
 *
 * The panel is OURS, not the generator's - and that is the important
 * decision. Ask a video model for a "floating screen" and it will drift, bob
 * and shimmer, which is exactly the one thing an overlay cannot survive:
 * there is no fixing lost registration without frame-by-frame tracking.
 * Rendering it here means it can float as much as it likes, because the
 * content floats WITH it and can never come unstuck.
 *
 * The plate supplies only what a model is genuinely better at than us - the
 * plane, the sky, the trees, the machine. */
const SCREEN_QUAD: Quad = [
  { x: 0.272, y: 0.082 },
  { x: 0.719, y: 0.066 },
  { x: 0.726, y: 0.678 },
  { x: 0.279, y: 0.694 },
];

/** The overlay's own pixel width, before it gets warped. Its HEIGHT is
 *  derived from the quad below, never fixed: if the two aspects disagree the
 *  homography silently stretches everything inside, which is what was
 *  squashing the caption up into the reel. */
const CONTENT_W = 1280;

type Item = {
  title: string;
  years?: string;
  blurb: string;
  stack: string[];
  reel: { still?: string; clip?: string };
};

export default function WorkPlate({ onSelect }: { onSelect: (i: Item) => void }) {
  const items = useMemo(() => [flagship, ...projects] as unknown as Item[], []);
  const [loaded, setLoaded] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [quad, setQuad] = useState<Quad>(SCREEN_QUAD);
  const hostRef = useRef<HTMLDivElement>(null);

  const calib = new URLSearchParams(location.search).get("calib") === "1";

  useEffect(() => onSelect(items[loaded]), [loaded, items, onSelect]);

  // the mapping lives in the PLATE's space, so it has to follow its size
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* The plate is full bleed and object-fit: cover, so what is on screen is a
     CROP of it - the visible region is not the container. The quad is stored
     in the image's own space, so it has to be mapped through the same crop or
     the panel drifts off the composition at every aspect ratio but one. */
  const view = useMemo(() => {
    if (!box.w || !box.h) return null;
    const scale = Math.max(box.w / PLATE_AR, box.h);
    const w = PLATE_AR * scale;
    const h = scale;
    return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
  }, [box]);

  /* Match the pre-warp box to the quad's own proportions, averaging opposite
     edges so a slightly trapezoidal screen still gets a sane ratio. */
  const contentH = useMemo(() => {
    const w = (((quad[1].x - quad[0].x) + (quad[2].x - quad[3].x)) / 2) * PLATE_AR;
    const h = ((quad[3].y - quad[0].y) + (quad[2].y - quad[1].y)) / 2;
    return Math.max(360, Math.round(CONTENT_W / (w / h)));
  }, [quad]);

  const transform = useMemo(() => {
    if (!view) return undefined;
    const px = quad.map((p) => ({
      x: view.x + p.x * view.w,
      y: view.y + p.y * view.h,
    })) as Quad;
    return cornerPin(CONTENT_W, contentH, px) ?? undefined;
  }, [view, quad, contentH]);

  const item = items[loaded];
  const reel = item.reel.clip ?? item.reel.still;

  /* Calibration: drag a corner onto the new plate's screen. Beats guessing
     coordinates out of an image editor, and the numbers print ready to paste. */
  const drag = useCallback(
    (i: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      const host = hostRef.current;
      if (!host) return;
      const move = (ev: PointerEvent) => {
        const r = host.getBoundingClientRect();
        setQuad((q) => {
          const next = [...q] as Quad;
          next[i] = {
            x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)),
            y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)),
          };
          return next;
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setQuad((q) => {
          // eslint-disable-next-line no-console
          console.log(
            "SCREEN_QUAD =",
            JSON.stringify(q.map((p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })))
          );
          return q;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    []
  );

  return (
    <div className="plate plate--plane">
      <div className="plate__inner" ref={hostRef} style={{ aspectRatio: String(PLATE_AR) }}>
        <img className="plate__img" src={PLATE} alt="" draggable={false} />

        {/* the composite: a real DOM layer, warped onto the screen in the
            picture. Blended rather than pasted, so it reads as light falling
            on a surface instead of a sticker. */}
        <div
          className="plate__screen"
          style={{ width: CONTENT_W, height: contentH, transform }}
        >
          <div className="plate__halo" aria-hidden="true" />

          {/* One window, holding everything. The names, the reel and the
              caption all live inside the thing floating in the scene - a
              strip of copy stuck to the side of the page would be the
              website talking over its own environment. */}
          <div className="plate__win">
            <div className="plate__tabs">
              {items.map((it, i) => (
                <button
                  key={it.title}
                  className={i === loaded ? "is-on" : ""}
                  onClick={() => {
                    if (i === loaded) return;
                    setLoaded(i);
                    playStageLight();
                  }}
                >
                  {it.title}
                </button>
              ))}
            </div>

            <div className="plate__reel" key={item.title}>
              {reel ? (
                item.reel.clip ? (
                  <video src={item.reel.clip} autoPlay muted loop playsInline />
                ) : (
                  <img src={reel} alt="" />
                )
              ) : (
                <div className="plate__leader">
                  <span>{item.title}</span>
                  <small>REEL NOT LOADED</small>
                </div>
              )}
            </div>

            <div className="plate__caption">
              <p>{item.blurb}</p>
              <span>
                {item.years ? item.years + "   ·   " : ""}
                {item.stack.join("  ·  ")}
              </span>
            </div>
          </div>
        </div>

        {calib && (
          <>
            <svg className="plate__guide" viewBox="0 0 1 1" preserveAspectRatio="none">
              <polygon
                points={quad.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ff0055"
                strokeWidth="0.003"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {quad.map((p, i) => (
              <button
                key={i}
                className="plate__handle"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                onPointerDown={drag(i)}
                aria-label={`corner ${i + 1}`}
              />
            ))}
          </>
        )}
      </div>

    </div>
  );
}
