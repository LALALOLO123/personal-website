import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
   Hero — the van and the robot

   Three assets, per docs/hero-video-plan.md:

     intro    empty street, cars, then the van wipes past and BRIAN FU is
              standing on the asphalt in its wake
     keyframe the SAME frame the intro ends on, as a crisp still - this is the
              resting state, not a paused video
     exit     from that frame: the robot comes out from behind the letters,
              walks to the lens, and pulls the view into black

   Holding on a still rather than a paused <video> is deliberate: a paused
   frame is a compressed frame, and the hold is what people look at longest.
   It also means continuity is guaranteed by construction - the intro's last
   frame, the still, and the exit's first frame are the same image, so the
   two joins cannot mismatch.

   Every asset is optional. With none of them this still runs the full
   sequence on the placeholder, because the interesting part - gating the
   scroll on the exit finishing - has to be built and tested before there is
   anything to play.
   --------------------------------------------------------------------------- */

const KEYFRAME = "/shots/hero-keyframe.jpg";
const INTRO = "/reels/hero-intro.mp4";
const EXIT = "/reels/hero-exit.mp4";

/** How long the blackout takes with no exit clip. Comfortably longer than the
 *  CSS fade, so the frame is FULLY black before the cut rather than merely
 *  dark - measured 140/255 at the handoff when these two were level. */
const FALLBACK_EXIT_MS = 1500;

export type HeroHandle = {
  /** Play the robot beat. Resolves when the frame is black and it is safe to
   *  cut to the next section. */
  runExit: () => Promise<void>;
};

type Phase = "intro" | "hold" | "exit" | "black";

const HeroFilm = forwardRef<HeroHandle, { active: boolean }>(function HeroFilm({ active }, ref) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [hasIntro, setHasIntro] = useState(true);
  const [hasExit, setHasExit] = useState(true);
  const exitVideo = useRef<HTMLVideoElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      runExit: () =>
        new Promise<void>((resolve) => {
          setPhase("exit");
          /* The nav, dots and cursor live outside this panel, so without this
             they stay lit while the robot drags everything else to black -
             and are then still fading when the keyboard arrives. */
          document.documentElement.classList.add("stage-dark");
          const v = exitVideo.current;

          /* Resolve slightly BEFORE the clip truly ends. The last frames are
             already black, and waiting for `ended` leaves a beat of dead air
             between the pull and the next section arriving. */
          if (v && hasExit) {
            const done = () => {
              v.removeEventListener("ended", done);
              setPhase("black");
              resolve();
            };
            v.addEventListener("ended", done);
            v.currentTime = 0;
            void v.play().catch(() => {
              // autoplay refused: fall through to the timed blackout
              v.removeEventListener("ended", done);
              window.setTimeout(done, FALLBACK_EXIT_MS);
            });
            return;
          }

          window.setTimeout(() => {
            setPhase("black");
            resolve();
          }, FALLBACK_EXIT_MS);
        }),
    }),
    [hasExit]
  );

  const introEnded = useCallback(() => setPhase("hold"), []);

  /* Scrolling back up returns to the resting frame, not the blackout it was
     left in. The intro is not replayed - it is a reveal, and a reveal that
     happens twice is a loop. */
  useEffect(() => {
    if (active) setPhase((ph) => (ph === "exit" || ph === "black" ? "hold" : ph));
  }, [active]);

  return (
    <div className={`film film--${phase}`} data-active={active}>
      {/* the hold: a still, deliberately, not a stopped video */}
      <img className="film__still" src={KEYFRAME} alt="" draggable={false} />

      {hasIntro && (
        <video
          className="film__clip film__clip--intro"
          src={INTRO}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={introEnded}
          onError={() => {
            setHasIntro(false);
            setPhase("hold");
          }}
        />
      )}

      {hasExit && (
        <video
          ref={exitVideo}
          className="film__clip film__clip--exit"
          src={EXIT}
          muted
          playsInline
          preload="auto"
          onError={() => setHasExit(false)}
        />
      )}

      {/* Covers the join in both directions: it masks the swap from clip to
          still, and it is the whole blackout when there is no exit clip. */}
      <div className="film__black" />

      <div className="film__cue" aria-hidden={phase !== "hold"}>
        <span>Scroll</span>
        <i />
      </div>
    </div>
  );
});

export default HeroFilm;
