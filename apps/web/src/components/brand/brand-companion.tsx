"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { suggestionFor } from "@/lib/marketing/avatar/guide";
import { backgroundAt, footprintSurface, guideSurfaceColor } from "@/lib/marketing/avatar/surface";
import { placeGuide, type GuideSide } from "@/lib/marketing/avatar/placement";
import type { LogoMood } from "@/lib/marketing/avatar/definition";

interface Reaction { mood: LogoMood; message: string; hint: boolean }
interface Point { x: number; y: number }
const INTRO: Reaction = { mood: "curious", message: "I'm here to explore with you. Follow the spark as you scroll.", hint: false };

/** A corner companion with measured hover spacing and random screen-edge entrances. */
export function BrandCompanion({ restOnLeft = false }: { restOnLeft?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const connector = useRef<SVGPathElement>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const lineParts = useRef<(SVGPathElement | null)[]>([]);
  const endpoint = useRef<SVGCircleElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const greetingTimer = useRef<ReturnType<typeof setTimeout>>();
  const taps = useRef({ count: 0, last: 0 });
  const state = useRef({ greeting: false });
  const [hidden, setHidden] = useState(false);
  const [reaction, setReaction] = useState<Reaction>(INTRO);
  const [greetingCount, setGreetingCount] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (hidden) return;
    const mountedHost = host.current;
    if (!mountedHost) return;
    const element = mountedHost;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const selector = "main button, main a[href], main [role='tab'], footer a[href]";
    let frame = 0, entered = false, disposed = false;
    let current: Point = { x: 0, y: 0 }, goal: Point = { x: 0, y: 0 };
    const velocity: Point = { x: 0, y: 0 };
    let lastTime = performance.now();
    let target: HTMLElement | null = null, keyboardTarget = false;
    let keyboardInput = false;
    let preferredSide: GuideSide | undefined;
    let originalDescription: string | null = null;
    let leaveTimer: ReturnType<typeof setTimeout>;
    const route = (): Point => {
      element.dataset.section = "rest";
      const halfWidth = element.offsetWidth * .95 / 2;
      const halfHeight = element.offsetHeight * .95 / 2;
      return { x: restOnLeft ? halfWidth + 24 : innerWidth - halfWidth - 24, y: innerHeight - halfHeight - 24 };
    };
    const react = (next: Reaction) => {
      if (state.current.greeting) return;
      setReaction(previous => previous.message === next.message && previous.mood === next.mood && previous.hint === next.hint ? previous : next);
    };
    const clearTarget = () => {
      if (target) {
        target.removeAttribute("data-spark-suggested");
        if (originalDescription === null) target.removeAttribute("aria-describedby");
        else target.setAttribute("aria-describedby", originalDescription);
      }
      target = null;
      preferredSide = undefined;
      keyboardTarget = false;
      if (entered && !state.current.greeting) goal = route();
      connector.current?.setAttribute("d", "");
      lineParts.current.forEach(part => part?.setAttribute("d", ""));
      endpoint.current?.setAttribute("r", "0");
    };
    function schedule() {
      if (!disposed && !frame) frame = requestAnimationFrame(tick);
    }
    const enter = () => {
      if (entered) return;
      entered = true;
      goal = route();
      const edge = Math.floor(Math.random() * 4);
      element.dataset.entrance = ["left", "right", "top", "bottom"][edge];
      // Pick a fresh entry point along any screen edge, rather than a fixed corner.
      current = preference.matches ? { ...goal } : [
        { x: -90, y: 130 + Math.random() * Math.max(1, innerHeight - 220) },
        { x: innerWidth + 90, y: 130 + Math.random() * Math.max(1, innerHeight - 220) },
        { x: 42 + Math.random() * Math.max(1, innerWidth - 84), y: -100 },
        { x: 42 + Math.random() * Math.max(1, innerWidth - 84), y: innerHeight + 100 },
      ][edge];
      lastTime = performance.now();
      schedule();
    };
    function tick(now: number) {
      frame = 0;
      if (!entered || document.hidden || disposed) return;
      if (!target && !state.current.greeting) goal = route();
      let end: Point | null = null;
      if (target) {
        const bounds = target.getBoundingClientRect();
        if (!target.isConnected || target.closest("[inert]") || !target.getClientRects().length || bounds.bottom < 80 || bounds.top > innerHeight) clearTarget();
        else {
          end = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
          if (!state.current.greeting) {
            const obstacles = Array.from(document.querySelectorAll<HTMLElement>(selector))
              .filter(control => control !== target && !control.contains(target) && !target!.contains(control) && control.getClientRects().length)
              .map(control => control.getBoundingClientRect())
              .filter(rect => rect.bottom > 100 && rect.top < innerHeight);
            const placement = placeGuide(bounds, element.offsetWidth * .95, element.offsetHeight * .95,
              { width: innerWidth, height: innerHeight }, obstacles, preferredSide);
            preferredSide = placement.side;
            goal = placement;
            element.dataset.approach = placement.side;
          }
          react({ ...suggestionFor(target), hint: true });
        }
      }
      if (!target) react(INTRO);
      const dt = Math.min(.032, Math.max(.001, (now - lastTime) / 1000));
      lastTime = now;
      if (state.current.greeting) {
        goal = { ...current };
        velocity.x = velocity.y = 0;
      } else if (preference.matches) {
        current = { ...goal };
        velocity.x = velocity.y = 0;
      } else {
        // Critically damped spring: continuous velocity even when the destination changes.
        for (const axis of ["x", "y"] as const) {
          velocity[axis] += ((goal[axis] - current[axis]) * 140 - velocity[axis] * 24) * dt;
          current[axis] += velocity[axis] * dt;
        }
      }
      element.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      element.style.visibility = "visible";
      element.dataset.surface = footprintSurface(current.x, current.y, element.offsetWidth * .3);
      element.dataset.side = current.x < innerWidth / 2 ? "left" : "right";
      const inView = current.y > 100 && current.y < innerHeight - 25;
      element.dataset.visible = String(inView);
      element.style.opacity = inView ? "1" : "0";
      element.style.pointerEvents = inView ? "" : "none";
      const arrived = Math.hypot(goal.x - current.x, goal.y - current.y) < 8;
      element.dataset.arrived = String(arrived);
      element.dataset.placement = current.y < 240 ? "side" : "above";
      element.style.setProperty("--guide-lean", `${preference.matches ? 0 : Math.max(-12, Math.min(12, velocity.x * .025))}deg`);
      if (end && target && arrived && inView) {
        const bounds = target.getBoundingClientRect();
        if (current.x < bounds.left - 20) end.x = bounds.left - 7;
        else if (current.x > bounds.right + 20) end.x = bounds.right + 7;
        else end.y = current.y < end.y ? bounds.top - 7 : bounds.bottom + 7;
        const fromX = current.x + (end.x > current.x ? 26 : -26);
        connector.current?.setAttribute("d", `M ${fromX} ${current.y} Q ${(fromX + end.x) / 2} ${current.y - 42} ${end.x} ${end.y}`);
        // Color each short segment by the surface beneath it, including panel boundaries.
        const controlX = (fromX + end.x) / 2, controlY = current.y - 42;
        const pointAt = (t: number) => ({
          x: (1 - t) ** 2 * fromX + 2 * (1 - t) * t * controlX + t * t * end!.x,
          y: (1 - t) ** 2 * current.y + 2 * (1 - t) * t * controlY + t * t * end!.y,
        });
        let dashDistance = 0;
        lineParts.current.forEach((part, index) => {
          const t0 = index / 12, t1 = (index + 1) / 12;
          const first = pointAt(t0), last = pointAt(t1), middle = pointAt((t0 + t1) / 2);
          const cx = 2 * middle.x - (first.x + last.x) / 2;
          const cy = 2 * middle.y - (first.y + last.y) / 2;
          part?.setAttribute("d", `M ${first.x} ${first.y} Q ${cx} ${cy} ${last.x} ${last.y}`);
          part?.style.setProperty("stroke", guideSurfaceColor(backgroundAt(middle.x, middle.y)));
          part?.style.setProperty("stroke-dashoffset", `${-dashDistance}px`);
          dashDistance += part?.getTotalLength() ?? 0;
        });
        endpoint.current?.style.setProperty("stroke", guideSurfaceColor(backgroundAt(end.x, end.y)));
        endpoint.current?.setAttribute("cx", String(end.x));
        endpoint.current?.setAttribute("cy", String(end.y));
        endpoint.current?.setAttribute("r", "4");
      } else {
        connector.current?.setAttribute("d", "");
        lineParts.current.forEach(part => part?.setAttribute("d", ""));
        endpoint.current?.setAttribute("r", "0");
      }
      const hintHeight = bubble.current?.offsetHeight ?? 100;
      const hostTop = current.y - element.offsetHeight / 2;
      let hintTop = element.dataset.approach === "below" && target
        ? hostTop + 6
        : hostTop - hintHeight - 12;
      if (hintTop < 100) hintTop = current.y + element.offsetHeight / 2 + 12;
      if (hintTop + hintHeight > innerHeight - 12)
        hintTop = target ? target.getBoundingClientRect().top - hintHeight - 12 : innerHeight - hintHeight - 12;
      if (bubble.current) {
        bubble.current.style.top = `${hintTop - hostTop}px`;
        bubble.current.style.bottom = "auto";
      }
      const width = bubble.current?.offsetWidth ?? 224;
      const origin = current.x - element.offsetWidth / 2;
      const left = current.x < innerWidth / 2 ? element.offsetWidth + 10 : -width - 10;
      bubble.current?.style.setProperty("--hint-left", `${Math.max(12 - origin, Math.min(innerWidth - origin - width - 12, left))}px`);
      if (Math.abs(goal.x - current.x) > .1 || Math.abs(goal.y - current.y) > .1 || Math.abs(velocity.x) + Math.abs(velocity.y) > .3) schedule();
    }
    const acquire = (control: HTMLElement, keyboard: boolean) => {
      if (element.closest("[inert]") || control.matches(":disabled, [aria-disabled='true']")) return;
      clearTimeout(leaveTimer);
      if (state.current.greeting) {
        clearTimeout(greetingTimer.current);
        state.current.greeting = false;
        element.dataset.greeting = "false";
        taps.current.count = 0;
      }
      enter();
      if (target !== control) {
        clearTarget();
        target = control;
        originalDescription = control.getAttribute("aria-describedby");
        control.setAttribute("data-spark-suggested", "true");
        control.setAttribute("aria-describedby", [originalDescription, "spark-guide-hint"].filter(Boolean).join(" "));
      }
      keyboardTarget = keyboard;
      if (keyboard) setAnnouncement(suggestionFor(control).message);
      schedule();
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const control = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      // Pointer intent takes over from a previously focused control, including mouse-click focus.
      if (keyboardTarget) {
        keyboardTarget = false;
        keyboardInput = false;
        if (!control) { clearTarget(); schedule(); }
      }
      if (control && control !== target) acquire(control, false);
      if (event.target instanceof Element && !event.target.closest("header, .spark-guide, [inert]")) enter();
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const control = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      if (control) acquire(control, false);
    };
    const out = (event: PointerEvent) => {
      if (!target || keyboardTarget || !(event.target instanceof Node) ||
          (!target.contains(event.target) && !element.contains(event.target))) return;
      if (event.relatedTarget instanceof Node && (target.contains(event.relatedTarget) || element.contains(event.relatedTarget))) return;
      clearTimeout(leaveTimer);
      const leaving = target;
      leaveTimer = setTimeout(() => {
        if (target !== leaving || state.current.greeting) return;
        clearTarget(); schedule();
      }, 450);
    };
    const focus = (event: FocusEvent) => {
      const control = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      if (control) acquire(control, keyboardInput);
      else if (event.target instanceof Node && !element.contains(event.target)) { clearTarget(); schedule(); }
    };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      // A late blur from an old control must not discard a newly hovered one.
      if (event.target !== target) return;
      const control = event.relatedTarget instanceof Element ? event.relatedTarget.closest<HTMLElement>(selector) : null;
      if (control) acquire(control, keyboardInput);
      else { clearTarget(); schedule(); }
    };
    const key = (event: KeyboardEvent) => {
      if (["Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) keyboardInput = true;
    };
    const pointerDown = () => { keyboardInput = false; keyboardTarget = false; schedule(); };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest("header, .spark-guide, [inert]")) return;
      enter();
    };
    const scroll = () => schedule();
    const resize = () => schedule();
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", pointerDown, { passive: true });
    element.addEventListener("spark-greet", clearTarget);
    document.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("click", click);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", schedule);
    preference.addEventListener("change", resize);
    element.addEventListener("spark-state-change", schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(leaveTimer);
      clearTimeout(greetingTimer.current);
      clearTarget();
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", pointerDown);
      element.removeEventListener("spark-greet", clearTarget);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("click", click);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", schedule);
      preference.removeEventListener("change", resize);
      element.removeEventListener("spark-state-change", schedule);
    };
  }, [hidden, restOnLeft]);

  const greet = () => {
    const now = performance.now();
    taps.current.count = now - taps.current.last < 1200 ? taps.current.count + 1 : 1;
    taps.current.last = now;
    if (taps.current.count >= 3) { setHidden(true); return; }
    setGreetingCount(value => value + 1);
    clearTimeout(greetingTimer.current);
    state.current.greeting = true;
    host.current?.dispatchEvent(new Event("spark-greet"));
    if (host.current) host.current.dataset.greeting = "true";
    const message = taps.current.count === 2 ? "One more quick tap to hide me." : "Hello! Tap three times quickly to hide me.";
    setReaction({ mood: "excited", message, hint: false });
    host.current?.dispatchEvent(new Event("spark-state-change"));
    setAnnouncement(message);
    greetingTimer.current = setTimeout(() => {
      state.current.greeting = false;
      if (host.current) host.current.dataset.greeting = "false";
      host.current?.dispatchEvent(new Event("spark-state-change"));
    }, 2400);
  };
  if (hidden) return null;
  return <>
    <svg ref={overlay} className="spark-guide-connector" aria-hidden="true"><path ref={connector} className="spark-guide-line-reference" />
      {Array.from({ length: 12 }, (_, index) => <path key={index} ref={part => { lineParts.current[index] = part; }} className="spark-guide-line-part" />)}
      <circle ref={endpoint} r="0" /></svg>
    <div ref={host} className="spark-guide" data-mood={reaction.mood} data-hint={reaction.hint}>
      <div ref={bubble} id="spark-guide-hint" className="spark-guide-message">
        <span className="spark-guide-eyebrow">{reaction.hint ? "A little nudge" : "Your spark"}</span>
        {reaction.message}
        <span className="spark-guide-dismiss-hint">Tap three times quickly to hide.</span>
      </div>
      <div className="spark-guide-stage">
        <button type="button" className="spark-guide-character" onClick={greet}
          aria-label="Say hello to your QuickStart guide" aria-describedby="spark-guide-dismiss" title="Tap three times quickly to hide">
          <span key={greetingCount} className="spark-guide-pose"><BrandLogo size="100%" fillColor="var(--guide-color, #fa5d19)" animated mood={reaction.mood} aria-hidden="true" /></span>
        </button>
        <span className="spark-guide-shadow" aria-hidden="true" />
      </div>
      <span id="spark-guide-dismiss" className="sr-only">Tap three times within 1.2 seconds between taps to hide this guide.</span>
      <span className="sr-only" role="status">{announcement}</span>
    </div>
  </>;
}
