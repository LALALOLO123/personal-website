import { useEffect, useRef } from "react";

/**
 * Full-screen generative background.
 *
 * A single fragment shader renders layered fractal-noise "aurora" bands whose
 * flow bends toward the pointer. Everything runs on one full-viewport triangle,
 * so it stays cheap even at high resolutions. Falls back to a static CSS gradient
 * when WebGL is unavailable or the user prefers reduced motion.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;   // 0..1, smoothed
uniform float u_active;  // 0..1 pointer influence

// --- hash / value noise -------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += amp * noise(p);
    p = rot * p * 2.0 + 0.03;
    amp *= 0.5;
  }
  return v;
}

// Warm ember palette (Inigo Quilez cosine palette).
// The amplitude (b) is deliberately small and the phase offsets (d) are close
// together: a wide phase spread sends the three channels out of step and gives
// you a full-spectrum rainbow, which fought the foreground type. Keeping them
// tight holds the whole field in one amber-to-ash family around the --accent
// hue, so it reads as atmosphere rather than as the subject.
vec3 palette(float t) {
  vec3 a = vec3(0.085, 0.070, 0.062);
  vec3 b = vec3(0.105, 0.078, 0.048);
  vec3 c = vec3(1.00, 1.00, 1.00);
  vec3 d = vec3(0.04, 0.09, 0.15);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.032;

  // pointer creates a soft gravitational warp in the flow field
  vec2 m = u_mouse;
  m.x *= u_res.x / u_res.y;
  float d = distance(p, m);
  float pull = u_active * 0.35 / (d * d + 0.12);

  // domain-warped fbm: noise of noise gives organic, marbled motion
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t + pull),
    fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.12 * t)
  );
  float f = fbm(p + 2.4 * r + pull);

  vec3 col = palette(f + 0.15 * length(r) + t * 0.4);

  // Deepen hard toward near-black. This is a portfolio, not a screensaver: the
  // text has to win every contrast comparison, so the field only brightens in
  // the densest parts of the flow and stays near the page background elsewhere.
  col *= 0.30 + 0.42 * f;
  col = mix(vec3(0.019, 0.019, 0.021), col, smoothstep(0.05, 1.05, f + 0.10));

  // subtle pointer halo
  col += vec3(0.85, 0.70, 0.42) * pull * 0.055;

  // gentle horizontal banding for an atmospheric, scanned feel
  col *= 1.0 - 0.04 * sin(uv.y * 800.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false }) as
        | WebGLRenderingContext
        | null) ||
      (canvas.getContext(
        "experimental-webgl"
      ) as WebGLRenderingContext | null);

    // Graceful fallback: paint a static gradient and bail.
    if (!gl) {
      canvas.style.background =
        "radial-gradient(120% 120% at 30% 20%, #1a2740, #0a0d1a 55%, #050505)";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.style.background =
        "radial-gradient(120% 120% at 30% 20%, #1a2740, #0a0d1a 55%, #050505)";
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // one big triangle covering the viewport
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uActive = gl.getUniformLocation(prog, "u_active");

    // narrowed, non-null aliases for use inside the closures below
    const cv = canvas;
    const ctx = gl;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    function resize() {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      ctx.viewport(0, 0, w, h);
      ctx.uniform2f(uRes, w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    // smoothed pointer state
    const target = { x: 0.5, y: 0.5, a: 0 };
    const cur = { x: 0.5, y: 0.5, a: 0 };
    function onMove(e: PointerEvent) {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
      target.a = 1;
    }
    function onLeave() {
      target.a = 0;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const start = performance.now();
    function frame(now: number) {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      cur.a += (target.a - cur.a) * 0.04;

      // when reduced motion is requested, freeze time but keep the still image
      const time = reduce ? 12.0 : (now - start) / 1000;
      ctx.uniform1f(uTime, time);
      ctx.uniform2f(uMouse, cur.x, cur.y);
      ctx.uniform1f(uActive, cur.a);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);

      if (!reduce) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (reduce) {
      // render a single frame and stop
      cancelAnimationFrame(raf);
      frame(performance.now());
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerleave", onLeave);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
