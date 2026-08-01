import { useRef } from "react";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";

/* ---------------------------------------------------------------------------
   Naresh Khatri's keyboard, loaded straight from his scene file.

   Source: github.com/Naresh-Khatri/3d-portfolio (MIT, "free to use, credit
   appreciated"). The scene ships as a .spline asset his own site loads the
   same way, so no Spline account is needed to render it - only to edit which
   keycaps it contains.

   PROOF OF CONCEPT ONLY: the keycaps baked into this scene are HIS stack
   (vue, wordpress, mongodb, firebase, gcp, prettier...), not Brian's. It
   cannot ship in this state.
   --------------------------------------------------------------------------- */

export default function SplineKeyboard() {
  const app = useRef<Application | null>(null);

  return (
    <div className="kb">
      <Spline
        className="kb__canvas"
        scene="/assets/skills-keyboard.spline"
        onLoad={(a: Application) => {
          app.current = a;
          (window as unknown as { __spline: Application }).__spline = a;
          // Log what the scene actually contains so we can see the real
          // keycap inventory rather than guessing from his source.
          const names: string[] = [];
          try {
            const objs = (a as unknown as { getAllObjects?: () => { name: string }[] }).getAllObjects?.() ?? [];
            for (const o of objs) if (o.name) names.push(o.name);
          } catch {
            /* internal API shape varies by runtime version */
          }
          console.log("[spline] objects:", names.join(", "));
        }}
      />
    </div>
  );
}
