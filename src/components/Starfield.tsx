"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; r: number; tw: number; hue: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

// Three depth layers drift at different speeds and shift with the pointer, which
// gives the sky parallax. A meteor crosses every so often. Static when the user
// prefers reduced motion; paused while the tab is hidden.
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let nextMeteor = 2500 + Math.random() * 4000;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 2600);
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.25 + z * z * 1.4,
          tw: Math.random() * Math.PI * 2,
          // Mostly white-blue, a few warm stars.
          hue: Math.random() < 0.25 ? 18 : 30,
        };
      });
    }

    function draw(t: number) {
      const dt = Math.min(t - last, 50);
      last = t;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        if (!reduce) {
          s.x -= dt * 0.004 * (0.2 + s.z);
          if (s.x < -2) s.x = w + 2;
          s.tw += dt * 0.0015 * (0.5 + s.z);
        }
        const px = s.x + pointer.x * s.z * 18;
        const py = s.y + pointer.y * s.z * 12;
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw)) * (0.4 + s.z * 0.6);
        ctx.fillStyle = `hsla(${s.hue}, 90%, ${s.hue === 38 ? 80 : 92}%, ${a})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.3) {
          // Soft halo on the brightest stars.
          ctx.fillStyle = `hsla(${s.hue}, 90%, 85%, ${a * 0.12})`;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduce) {
        nextMeteor -= dt;
        if (nextMeteor <= 0) {
          nextMeteor = 5000 + Math.random() * 9000;
          const speed = 0.9 + Math.random() * 0.6;
          meteors.push({ x: w * (0.3 + Math.random() * 0.7), y: -20, vx: -speed, vy: speed * 0.55, life: 1 });
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.life -= dt * 0.0007;
          if (m.life <= 0 || m.y > h + 40 || m.x < -200) {
            meteors.splice(i, 1);
            continue;
          }
          const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 140, m.y - m.vy * 140);
          tail.addColorStop(0, `rgba(255, 236, 228, ${m.life})`);
          tail.addColorStop(1, "rgba(255, 236, 228, 0)");
          ctx.strokeStyle = tail;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * 140, m.y - m.vy * 140);
          ctx.stroke();
        }
        raf = requestAnimationFrame(draw);
      }
    }

    function onMove(e: PointerEvent) {
      pointer.tx = (e.clientX / w - 0.5) * 2;
      pointer.ty = (e.clientY / h - 0.5) * 2;
    }
    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    }
    function onResize() {
      resize();
      if (reduce) draw(performance.now());
    }

    resize();
    draw(performance.now());
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="sky" aria-hidden>
      <div className="nebula" />
      <canvas ref={ref} />
    </div>
  );
}
