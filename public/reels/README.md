# Hero clips

Drop the generated files here and they light up automatically - `HeroFilm`
falls back to the keyframe still plus a timed blackout when either is missing,
which is how the sequence was built and tested before anything existed.

| file             | what it is                                              |
|------------------|---------------------------------------------------------|
| `hero-intro.mp4` | empty street, cars, the van wipe that leaves BRIAN FU    |
| `hero-exit.mp4`  | from that same frame: robot walks up, pulls to black     |

Both must **begin and end on the keyframe** (`/shots/hero-keyframe.jpg`):
the intro ends on it, the exit starts from it. That is what makes the joins
invisible - see `docs/hero-video-plan.md`.

`hero-exit.mp4` must **end on full black**. The keyboard section opens on its
own 2.4s blackout, so a black final frame cuts into it with nothing to match.
