"use client";

import { useEffect, useRef } from "react";
import { WORKSTATION_SVG } from "./workstation-svg";
import { createSceneLoop, follow } from "./scene-loop";

const LETTERS = "QWERTYUIASDFGHJKLZXCVBNM  ";

export function WorkstationIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = containerRef.current;
    if (!stage) return;
    const keys = [...stage.querySelectorAll<SVGGElement>("[data-work-key]")];
    const mouse = stage.querySelector<SVGGElement>("[data-work-mouse]");
    const screenText = stage.querySelector<SVGTextElement>("[data-work-text]");
    const cursor = stage.querySelector<SVGElement>("[data-work-cursor]");
    const rules = [...stage.querySelectorAll<SVGElement>(".rule-fill")];
    const status = stage.querySelector<HTMLElement>("[data-scene-status]");
    // Keep the last screen row clear for text produced by the illustration keyboard.
    rules.at(-1)?.setAttribute("opacity", "0");
    const positions = keys.map(() => 0);
    const heldUntil = keys.map(() => 0);
    let mouseAt = 0;
    let mouseUntil = 0;
    let view = false;
    let typed = "";
    let tourAt = -1;
    let tourStep = 0;
    let lastInput = -10000;

    function writeScreen() {
      if (screenText) screenText.textContent = typed;
      cursor?.setAttribute("x", String(Math.min(101, 39 + typed.length * 3.4)));
    }
    function press(index: number, letter: string, now = performance.now()) {
      heldUntil[index] = now + 140;
      typed = (typed + letter).slice(-15);
      writeScreen();
      loop.wake();
    }
    function clickMouse(now = performance.now()) {
      mouseUntil = now + 160;
      view = !view;
      rules.slice(0, 2).forEach((rule, i) => {
        rule.setAttribute("width", String(view ? [62, 46][i] : [50, 61][i]));
      });
      typed = view ? "Agents online" : "Workspace ready";
      writeScreen();
      if (status) status.textContent = view ? "Monitor shows agents online." : "Monitor shows workspace ready.";
      loop.wake();
    }

    const loop = createSceneLoop(stage, (dt, now, reduced) => {
      let moving = false;
      if (tourAt >= 0 && !reduced) {
        const step = Math.floor((now - tourAt) / 220);
        if (step > tourStep && step <= 3) {
          tourStep = step;
          if (step < 3) {
            const letter = ["H", "i"][step - 1];
            press(LETTERS.indexOf(letter.toUpperCase()), letter, now);
          }
          else clickMouse(now);
        }
        if (step > 4 || stage.matches(":hover, :focus-within")) tourAt = -1;
        else moving = true;
      }
      keys.forEach((key, i) => {
        const target = !reduced && now < heldUntil[i] ? 1 : 0;
        positions[i] = follow(positions[i], target, dt, reduced, 0.045);
        key.setAttribute("transform", "translate(0 " + (positions[i] * 1.8).toFixed(3) + ")");
        key.dataset.pressed = String(positions[i] > 0.1);
        if (positions[i] !== target || target > 0) moving = true;
      });
      const mouseTarget = !reduced && now < mouseUntil ? 1 : 0;
      mouseAt = follow(mouseAt, mouseTarget, dt, reduced, 0.055);
      mouse?.setAttribute("transform", "translate(0 " + mouseAt.toFixed(3) + ")");
      return moving || mouseAt !== mouseTarget || mouseTarget > 0;
    });

    function onClick(event: MouseEvent) {
      const target = event.target as Element;
      lastInput = performance.now();
      tourAt = -1;
      const key = target.closest("[data-work-key]");
      if (key) {
        const index = Number(key.getAttribute("data-work-key"));
        press(index, LETTERS[index] || " ");
        stage?.focus({ preventScroll: true });
      } else if (target.closest("[data-work-mouse]")) clickMouse();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      lastInput = performance.now();
      tourAt = -1;
      const onMouse = (event.target as Element).closest("[data-work-mouse]");
      if (onMouse && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        clickMouse();
      } else if (!onMouse && event.key.length === 1) {
        event.preventDefault();
        const found = LETTERS.indexOf(event.key.toUpperCase());
        press(found < 0 ? event.key.charCodeAt(0) % keys.length : found, event.key);
      } else if (["Backspace", "Escape", "Enter"].includes(event.key)) {
        event.preventDefault();
        typed = event.key === "Backspace" ? typed.slice(0, -1) : "";
        writeScreen();
        press(24, "");
      }
    }
    function tour() {
      if (loop.canTour() && performance.now() - lastInput > 6000) {
        tourAt = performance.now();
        tourStep = 0;
        typed = "";
        writeScreen();
        loop.wake();
      }
    }
    stage.addEventListener("click", onClick);
    stage.addEventListener("keydown", onKeyDown);
    const first = window.setTimeout(tour, 2200);
    const idle = window.setInterval(tour, 9000);
    return () => {
      loop.dispose();
      clearTimeout(first);
      clearInterval(idle);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="auth-art-wrap iso auth-workstation-art"
      data-theme="light"
      tabIndex={0}
      role="group"
      aria-label="Interactive workspace. Click the keyboard keys, or focus here and type to write on the monitor. Click the mouse to change the screen."
    >
      <div className="auth-scene-svg" dangerouslySetInnerHTML={{ __html: WORKSTATION_SVG }} />
      <span className="auth-sr-only" data-scene-status aria-live="polite" />
    </div>
  );
}
