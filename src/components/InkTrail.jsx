import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";

const INK = "255,255,255";
const MAX_DROPS = 80;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function introBlocking() {
  const root = document.documentElement;
  return (
    root.classList.contains("yo-intro-active") ||
    root.classList.contains("yo-intro-pending") ||
    root.classList.contains("yo-intro-locked")
  );
}

function makeDrop(x, y, vx, vy, speed, kind, scale) {
  const n = kind === "dot" ? 5 : 7;
  const points = [];
  for (let i = 0; i < n; i += 1) {
    points.push({
      a: (i / n) * Math.PI * 2,
      w: kind === "dot" ? 0.76 + Math.random() * 0.32 : 0.62 + Math.random() * 0.52,
    });
  }

  const heading = Math.atan2(vy, vx);

  return {
    x,
    y,
    vx: vx * lerp(0.18, 0.42, Math.random()),
    vy: vy * lerp(0.18, 0.42, Math.random()),
    r:
      kind === "dot"
        ? lerp(2.4, 5.6, Math.random()) * scale
        : lerp(8.8, 21.2, Math.random()) *
          scale *
          lerp(0.92, 1.22, clamp(speed / 2.4, 0, 1)),
    rot: heading,
    stretch: 1.04 + Math.min(0.38, speed * 0.02),
    points,
    born: performance.now(),
    life: kind === "dot" ? lerp(380, 720, Math.random()) : lerp(780, 1380, Math.random()),
    alpha: kind === "dot" ? lerp(0.5, 0.86, Math.random()) : lerp(0.82, 1, Math.random()),
    lobe: kind === "blob" ? 0.22 + Math.random() * 0.38 : 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

function dropRadius(drop, life) {
  return drop.r * (0.22 + 0.78 * life ** 0.55);
}

function dropAlpha(drop, life) {
  return drop.alpha * life ** 1.15;
}

function blobCoords(drop, r, now) {
  const wave = Math.sin(now * 0.007 + drop.wobble) * 0.08;
  const stretch = 1 + (drop.stretch - 1) * clamp(r / Math.max(0.001, drop.r), 0, 1);
  return drop.points.map((p) => ({
    x: drop.x + Math.cos(p.a + drop.rot) * r * (p.w + wave) * stretch,
    y: drop.y + Math.sin(p.a + drop.rot) * r * (p.w - wave * 0.6),
  }));
}

function traceBlob(ctx, coords) {
  const n = coords.length;
  if (n < 3) return;
  const first = coords[0];
  const last = coords[n - 1];
  ctx.moveTo((first.x + last.x) * 0.5, (first.y + last.y) * 0.5);
  for (let i = 0; i < n; i += 1) {
    const curr = coords[i];
    const next = coords[(i + 1) % n];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
  }
  ctx.closePath();
}

function drawNeck(ctx, a, ra, aa, b, rb, ab) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const limit = (ra + rb) * 2.05;
  if (dist < 0.8 || dist > limit) return;

  const px = -dy / dist;
  const py = dx / dist;
  const closeness = 1 - dist / limit;
  const ha = ra * (0.62 + 0.38 * closeness);
  const hb = rb * (0.62 + 0.38 * closeness);
  const pinch = Math.min(ra, rb) * (0.22 + 0.78 * closeness);
  const mx = a.x + dx * 0.5;
  const my = a.y + dy * 0.5;

  ctx.beginPath();
  ctx.moveTo(a.x + px * ha, a.y + py * ha);
  ctx.bezierCurveTo(
    mx + px * pinch,
    my + py * pinch,
    mx + px * pinch,
    my + py * pinch,
    b.x + px * hb,
    b.y + py * hb,
  );
  ctx.lineTo(b.x - px * hb, b.y - py * hb);
  ctx.bezierCurveTo(
    mx - px * pinch,
    my - py * pinch,
    mx - px * pinch,
    my - py * pinch,
    a.x - px * ha,
    a.y - py * ha,
  );
  ctx.closePath();
  ctx.fillStyle = `rgba(${INK},${Math.min(aa, ab) * (0.62 + 0.38 * closeness)})`;
  ctx.fill();
}

export default function InkTrail() {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (reducedMotion || !mounted) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const drops = [];
    let raf = 0;
    let running = false;
    let disposed = false;
    let pageVisible = document.visibilityState !== "hidden";
    let dpr = 1;
    let viewW = 1;
    let viewH = 1;
    let pointerX = 0;
    let pointerY = 0;
    let waterX = 0;
    let waterY = 0;
    let waterVX = 0;
    let waterVY = 0;
    let lastEmitX = 0;
    let lastEmitY = 0;
    let untilNext = 0;
    let pointerInside = false;
    let waterReady = false;
    let lastFrame = 0;
    let scale = 1;

    function resizeCanvas() {
      const vv = window.visualViewport;
      viewW = Math.max(1, Math.round(vv?.width || window.innerWidth));
      viewH = Math.max(1, Math.round(vv?.height || window.innerHeight));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = clamp(Math.min(viewW, viewH) / 900, 0.58, 1);
      const w = Math.max(1, Math.round(viewW * dpr));
      const h = Math.max(1, Math.round(viewH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x, y, vx, vy, speed, kind) {
      if (x < -40 || y < -40 || x > viewW + 40 || y > viewH + 40) return;
      if (drops.length >= MAX_DROPS) drops.shift();
      drops.push(makeDrop(x, y, vx, vy, speed, kind, scale));
    }

    function emitAlong(x0, y0, x1, y1, speed) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.4) return;

      const spacing = lerp(16, 8, clamp((speed - 0.08) / 2.1, 0, 1)) * scale;
      const ux = dx / dist;
      const uy = dy / dist;
      let pos = untilNext;

      while (pos <= dist) {
        const x = x0 + ux * pos;
        const y = y0 + uy * pos;
        const drift = (0.6 + speed * 0.9) * scale;
        spawn(x, y, ux * drift, uy * drift, speed, Math.random() < 0.12 ? "dot" : "blob");

        if (speed > 0.85 && Math.random() < 0.34) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const splash = lerp(0.7, 2.1, Math.random()) * scale;
          spawn(
            x - uy * side * lerp(6, 18, Math.random()) * scale,
            y + ux * side * lerp(6, 18, Math.random()) * scale,
            -uy * side * splash,
            ux * side * splash,
            speed * 0.8,
            Math.random() < 0.55 ? "dot" : "blob",
          );
        }

        pos += spacing;
      }

      untilNext = pos - dist;
    }

    function stepWater(dt, now) {
      if (!waterReady) return;

      if (pointerInside) {
        const follow = 1 - Math.exp(-dt * 7.5);
        const nx = waterX + (pointerX - waterX) * follow;
        const ny = waterY + (pointerY - waterY) * follow;
        waterVX = (nx - waterX) / Math.max(dt, 0.008);
        waterVY = (ny - waterY) / Math.max(dt, 0.008);
        waterX = nx;
        waterY = ny;
      } else {
        waterVX *= 0.86;
        waterVY *= 0.86;
        waterX += waterVX * dt * 0.016;
        waterY += waterVY * dt * 0.016;
      }

      const speed = Math.hypot(waterVX, waterVY) * 0.001;
      if (Math.hypot(waterX - lastEmitX, waterY - lastEmitY) > 0.85) {
        emitAlong(lastEmitX, lastEmitY, waterX, waterY, speed);
        lastEmitX = waterX;
        lastEmitY = waterY;
      }

      const drag = Math.exp(-dt * 3.4);
      for (let i = 0; i < drops.length; i += 1) {
        const drop = drops[i];
        drop.x += drop.vx;
        drop.y += drop.vy;
        drop.vx *= drag;
        drop.vy *= drag;
        drop.vy += Math.sin(now * 0.006 + drop.wobble) * 0.012 * scale;
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, viewW, viewH);

      const live = [];
      for (let i = 0; i < drops.length; i += 1) {
        const drop = drops[i];
        const t = (now - drop.born) / drop.life;
        if (t >= 1) continue;
        const life = 1 - t;
        live.push({
          drop,
          r: dropRadius(drop, life),
          a: dropAlpha(drop, life),
        });
      }

      if (live.length !== drops.length) {
        drops.length = 0;
        for (let i = 0; i < live.length; i += 1) drops.push(live[i].drop);
      }

      if (live.length === 0) return;

      for (let i = 0; i < live.length; i += 1) {
        const curr = live[i];
        for (let j = i + 1; j < Math.min(live.length, i + 8); j += 1) {
          drawNeck(ctx, curr.drop, curr.r, curr.a, live[j].drop, live[j].r, live[j].a);
        }
      }

      for (let i = 0; i < live.length; i += 1) {
        const { drop, r, a } = live[i];
        ctx.beginPath();
        traceBlob(ctx, blobCoords(drop, r, now));
        ctx.fillStyle = `rgba(${INK},${a})`;
        ctx.fill();

        if (drop.lobe > 0.05) {
          const lobeR = r * (0.46 + drop.lobe * 0.32);
          const ox = Math.cos(drop.rot + 0.55) * r * drop.lobe;
          const oy = Math.sin(drop.rot + 0.55) * r * drop.lobe * 0.65;
          ctx.beginPath();
          traceBlob(
            ctx,
            blobCoords({ ...drop, x: drop.x + ox, y: drop.y + oy, stretch: 1.12 }, lobeR, now),
          );
          ctx.fillStyle = `rgba(${INK},${a * 0.9})`;
          ctx.fill();
        }
      }
    }

    function tick(now) {
      raf = 0;
      if (disposed) return;
      if (!pageVisible) {
        running = false;
        return;
      }

      const dt = Math.min(0.033, Math.max(0.008, (now - lastFrame) / 1000 || 0.016));
      lastFrame = now;
      stepWater(dt, now);
      draw(now);

      if (drops.length === 0 && !pointerInside) {
        running = false;
        waterReady = false;
        return;
      }

      raf = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (disposed || running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function onPointerMove(event) {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") {
        pointerInside = false;
        return;
      }
      if (introBlocking()) {
        pointerInside = false;
        return;
      }

      const x = event.clientX;
      const y = event.clientY;
      if (x < 0 || y < 0 || x > viewW || y > viewH) {
        pointerInside = false;
        return;
      }

      pointerX = x;
      pointerY = y;
      pointerInside = true;

      if (!waterReady) {
        waterReady = true;
        waterX = x;
        waterY = y;
        lastEmitX = x;
        lastEmitY = y;
        untilNext = 0;
        waterVX = 0;
        waterVY = 0;
      }

      startLoop();
    }

    function onPointerLeave() {
      pointerInside = false;
    }

    function onVisibility() {
      pageVisible = document.visibilityState !== "hidden";
      if (pageVisible) startLoop();
    }

    resizeCanvas();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", resizeCanvas);
      window.visualViewport?.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted, reducedMotion]);

  if (reducedMotion || !mounted) return null;

  return createPortal(
    <canvas ref={canvasRef} className="yo-ink-trail" aria-hidden="true" />,
    document.body,
  );
}
