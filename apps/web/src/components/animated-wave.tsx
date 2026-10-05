"use client";

import { useEffect, useRef } from "react";

interface AnimatedWaveProps {
  className?: string;
}

export function AnimatedWave({ className = "w-full h-full" }: AnimatedWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "·∘○◯◌●◉";
    let time = 0;

    const resize = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 400;
      const h = rect.height || 200;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 200;

      ctx.clearRect(0, 0, width, height);

      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cols = Math.floor(width / 18);
      const rows = Math.floor(height / 18);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * (width / cols);
          const py = (y + 0.5) * (height / rows);

          // Multiple wave interference
          const wave1 = Math.sin(x * 0.2 + time * 2) * Math.cos(y * 0.15 + time);
          const wave2 = Math.sin((x + y) * 0.1 + time * 1.5);
          const wave3 = Math.cos(x * 0.1 - y * 0.1 + time * 0.8);

          const combined = (wave1 + wave2 + wave3) / 3;
          const normalized = (combined + 1) / 2;

          const charIndex = Math.min(
            chars.length - 1,
            Math.max(0, Math.floor(normalized * (chars.length - 1)))
          );
          const alpha = 0.15 + normalized * 0.65;

          if (normalized > 0.65) {
            // Front peaks in Heat Orange
            ctx.fillStyle = `rgba(250, 93, 25, ${Math.min(1, alpha * 1.3)})`;
          } else {
            // Charcoal base
            ctx.fillStyle = `rgba(38, 38, 38, ${Math.min(0.8, alpha)})`;
          }

          ctx.fillText(chars[charIndex], px, py);
        }
      }

      time += 0.03;
      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
    />
  );
}
