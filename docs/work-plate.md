# Work section — generated plate + live panel

`?work=plate` · `src/components/WorkPlate.tsx` · `src/lib/cornerPin.ts`

## The split

**The model does what it is better at than us.** Sky, plane, trees, the
projector, ambient motion.

**Code does everything that has to stay registered.** The floating panel, its
glow, the beam, the flicker, the tabs, the hit targets.

That line is the whole design. It exists because three attempts at building
the environment in 3D failed the same way: photoreal props on an empty plane
read as a test level, and making them not do that means building a convincing
room, which is a much larger job than it looks.

## What to generate

**One clip. Locked-off camera. No screen anywhere.**

> Locked-off static camera. Vast dark reflective plain under a deep violet to
> magenta sky burning to amber at the horizon, stars above, silhouetted acacia
> trees along the skyline. An old 8mm film projector standing on the plain,
> lower right, lamp off, no beam, its reels slowly turning. Trees swaying
> gently. Cinematic, ethereal, ancestral. No screen, no display, no text.
> Centre of frame empty sky.

Hard requirements, in order:

1. **Camera absolutely locked.** No push-in, no drift, no handheld. Any camera
   movement and the panel would need frame-by-frame motion tracking, which we
   cannot do. This is the one thing that cannot be fixed afterwards.
2. **No screen, no bright rectangle, nothing in the centre.** We put the panel
   there. If the model draws one we get two.
3. **Projector lamp OFF.** We draw the beam, because it has to land on a panel
   only we know the position of.
4. Ambient motion confined to trees, reels, stars, haze.
5. 16:9, a few seconds, ideally under ~2MB — it autoplays.

Seamless looping is unlikely from any of these models. If the ends do not
match, crossfade in code; on ambient motion that is invisible.

## Fitting it

1. Drop the file in `public/shots/` and point `PLATE` at it.
2. Open `?work=plate&calib=1`.
3. Drag the **four pink handles** onto where the panel should hang.
4. Drag the **cyan handle** onto the projector's lens.
5. Both print their coordinates to the console. Paste them back into
   `SCREEN_QUAD` and `LENS`.

Everything is stored normalised to the plate, so a fit survives any viewport.

## Things that bit, so they do not bite again

- **Full bleed means `object-fit: cover`, which means the visible plate is a
  CROP.** The quad lives in the image's space and must be mapped through that
  crop, or the panel walks off the composition at every aspect but the tested
  one.
- **The pre-warp box must match the quad's proportions.** Otherwise the
  homography silently stretches the contents. `contentH` is derived from the
  quad for exactly this reason - do not pin it to a constant.
- **Only the reel blends.** Running the whole window in `screen` blend looked
  properly holographic and was completely unreadable.
- **If the screen ever comes from the plate instead**, it must be DARK.
  Screen-blending onto a white surface returns white whatever we put there.
- `[hidden]` loses to any `display` rule. Do not use it to hide the section
  label; do not render it.

## Still open

Two of the four reels have no footage and show a film leader. Horizon is a
Unity build and CarStatus is a CLI against a real car - neither can be
captured from this machine. Drop mp4s in `public/reels/` and set `clip` in
`src/data/content.ts` to light them up.
