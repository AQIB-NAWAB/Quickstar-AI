/**
 * Hairline Kernel (MIT License)
 * Repository-local engine runtime adapted from @lucasmarkes/hairline.
 * Provides camera projection, rounded solid hulls, motion scheduler, and pointer mapping.
 */

export interface Camera {
  az: number;
  k: number;
  S: number;
  ox: number;
  oy: number;
}

export interface RingSample {
  u: number;
  v: number;
  nu: number;
  nv: number;
}

export interface SolidPaths {
  sil: string;
  crease: string;
}

export interface SolidElement {
  g: SVGElement;
  sil: SVGElement;
  cr: SVGElement;
}

export interface Spring {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
  m: number;
  eps: number;
}

export interface Tween {
  from: number;
  to: number;
  t0: number;
  dur: number;
}

export interface Disposer {
  add: (fn: () => void) => void;
  on: (target: EventTarget, type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => void;
  dispose: () => void;
}

export interface PointerHandlers {
  move: (pt: [number, number], e: PointerEvent) => void;
  down?: (pt: [number, number], e: PointerEvent) => void;
  leave: (e: PointerEvent) => void;
}
export const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
export const r2 = (n: number) => Math.round(n * 100) / 100;

export function proj(C: Camera): (x: number, y: number, z: number) => [number, number] {
  const c = Math.cos(C.az),
    s = Math.sin(C.az),
    zf = Math.sqrt(1 - C.k * C.k);
  return (x: number, y: number, z: number): [number, number] => {
    const X = x * c - y * s,
      Y = x * s + y * c;
    return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
  };
}

export function fit(C: Camera, pts: [number, number, number][], cx: number, cy: number): void {
  C.ox = 0;
  C.oy = 0;
  const P = proj(C);
  let a = 1e9,
    b = -1e9,
    c = 1e9,
    d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]);
    b = Math.max(b, q[0]);
    c = Math.min(c, q[1]);
    d = Math.max(d, q[1]);
  }
  C.ox = cx - (a + b) / 2;
  C.oy = cy - (c + d) / 2;
}

export const facing = (C: Camera) => {
  const s = Math.sin(C.az),
    c = Math.cos(C.az);
  return (q: RingSample) => q.nu * s + q.nv * c >= -1e-6;
};

export function run(ring: RingSample[], keep: (q: RingSample) => boolean): RingSample[] {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++) {
    if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
      s = i;
      break;
    }
  }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out: RingSample[] = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
  return out;
}

export const open = (pts: [number, number][]): string => (pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L"));

export const seg = (a: [number, number], b: [number, number]): string => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;

// Motion & Springs
let reduced = false;
export const setReducedMotion = (on: boolean) => {
  reduced = on;
};
export const reducedMotion = () => reduced;

export function spring(x: number, o: Partial<{ k: number; c: number; m: number; eps: number }> = {}): Spring {
  return { x, v: 0, t: x, k: o.k ?? 100, c: o.c ?? 18, m: o.m ?? 1, eps: o.eps ?? 0.01 };
}

export function stepS(sp: Spring, dt: number): boolean {
  if (reduced) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  const n = Math.max(1, Math.ceil(dt * 240)),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
    sp.v += a * h;
    sp.x += sp.v * h;
  }
  if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  return true;
}

export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const X = (u: number) => ((ax * u + bx) * u + cx) * u;
  const Y = (u: number) => ((ay * u + by) * u + cy) * u;
  const dX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    return Y(u);
  };
}

export const EASE_LIFT = bezier(0.32, 0.72, 0, 1);
export const tween = (v: number, dur = 700): Tween => ({ from: v, to: v, t0: -1e9, dur });
export const tval = (tw: Tween, now: number): number => {
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE_LIFT(p));
};
export const tset = (tw: Tween, to: number, now: number, delay: number): void => {
  if (tw.to === to) return;
  tw.from = tval(tw, now);
  tw.to = to;
  tw.t0 = now + delay;
};
export const tdone = (tw: Tween, now: number): boolean => reduced || now >= tw.t0 + tw.dur;

// SVG Stage & Nodes
const NS = "http://www.w3.org/2000/svg";

export function mk(tag: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

export function solid(parent: Element): SolidElement {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "sil" }, g), cr: mk("path", { class: "nf lo" }, g) };
}

export const put = (el: SolidElement, s: SolidPaths): void => {
  el.sil.setAttribute("d", s.sil);
  el.cr.setAttribute("d", s.crease);
};

export const place = (el: Element, q: [number, number]): void => {
  el.setAttribute("cx", String(r2(q[0])));
  el.setAttribute("cy", String(r2(q[1])));
};

// Scheduler & Loop
interface Board {
  stage: HTMLElement;
  tick: (dt: number, now: number) => boolean;
  vis: boolean;
  awake: boolean;
}

let boards: Board[] = [];
const byStage = new Map<HTMLElement, Set<Board>>();
let raf = 0;
let last = 0;
let io: IntersectionObserver | null = null;
let rm: MediaQueryList | null = null;

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1e3));
  last = now;
  let any = false;
  for (const b of boards.slice()) {
    if (b.vis && b.awake) {
      try {
        b.awake = !!b.tick(dt, now);
      } catch (err) {
        b.awake = false;
        setTimeout(() => {
          throw err;
        });
      }
      any = any || b.awake;
    }
  }
  raf = any ? requestAnimationFrame(frame) : 0;
}

function wake(b: Board) {
  b.awake = true;
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

const onMotion = () => {
  setReducedMotion(!!rm?.matches);
  boards.forEach(wake);
};

function startLoop() {
  if (typeof window === "undefined") return;
  if (!io && typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const set = byStage.get(e.target as HTMLElement);
          if (!set) continue;
          for (const b of set) {
            b.vis = e.isIntersecting;
            if (b.vis) wake(b);
          }
        }
      },
      { rootMargin: "80px" }
    );
  }
  if (!rm && typeof window.matchMedia === "function") {
    rm = matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(rm.matches);
    rm.addEventListener("change", onMotion);
  }
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  io?.disconnect();
  io = null;
  rm?.removeEventListener("change", onMotion);
  rm = null;
}

export function register(
  stage: HTMLElement,
  tick: (dt: number, now: number) => boolean
): { wake: () => void; unregister: () => void } {
  startLoop();
  const b: Board = { stage, tick, vis: true, awake: true };
  boards.push(b);
  const peers = byStage.get(stage);
  if (peers) {
    for (const p of peers) b.vis = p.vis;
    peers.add(b);
    if (b.vis) wake(b);
  } else {
    byStage.set(stage, new Set([b]));
    io?.observe(stage);
  }
  tick(0, performance.now());
  let gone = false;
  return {
    wake: () => {
      if (!gone) wake(b);
    },
    unregister: () => {
      if (gone) return;
      gone = true;
      boards = boards.filter((x) => x !== b);
      const set = byStage.get(stage);
      if (set) {
        set.delete(b);
        if (!set.size) {
          byStage.delete(stage);
          io?.unobserve(stage);
        }
      }
      if (!boards.length) stopLoop();
    },
  };
}

export function pointer(
  stage: HTMLElement,
  on: PointerHandlers,
  viewBox: { width: number; height: number } = { width: 400, height: 320 }
): () => void {
  let tm = 0;
  const pt = (e: PointerEvent): [number, number] => {
    const r = stage.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * viewBox.width, ((e.clientY - r.top) / r.height) * viewBox.height];
  };
  const move = (e: Event) => {
    clearTimeout(tm);
    const pe = e as PointerEvent;
    on.move(pt(pe), pe);
  };
  const down = (e: Event) => {
    clearTimeout(tm);
    const pe = e as PointerEvent;
    if (pe.pointerType !== "mouse") (stage as any).releasePointerCapture?.(pe.pointerId);
    if (on.down) on.down(pt(pe), pe);
    else on.move(pt(pe), pe);
  };
  const leave = (e: Event) => {
    clearTimeout(tm);
    const pe = e as PointerEvent;
    tm = window.setTimeout(
      () => {
        on.leave(pe);
      },
      pe.pointerType === "mouse" ? 0 : 1400
    );
  };
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointerleave", leave);
  return () => {
    clearTimeout(tm);
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointerleave", leave);
  };
}

export function disposer(): Disposer {
  let fns: (() => void)[] = [];
  return {
    add: (fn: () => void) => {
      fns.push(fn);
    },
    on: (target: EventTarget, type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts);
      fns.push(() => target.removeEventListener(type, fn, opts));
    },
    dispose: () => {
      const runFns = fns;
      fns = [];
      for (let i = runFns.length - 1; i >= 0; i--) runFns[i]();
    },
  };
}

// Hairline Theme & CSS
const LIGHT = { plate: "#ffffff", hi: "#232327", edge: "#a4a4ac", mid: "#c3c3c9", lo: "#e0e0e4" };
const DARK = { plate: "#08090a", hi: "#d0d6e0", edge: "#5b5d64", mid: "#3e3e44", lo: "#29292d" };
const KEYS = ["plate", "hi", "edge", "mid", "lo"] as const;
const vars = (p: typeof LIGHT) => KEYS.map((k) => `--hl-${k}:var(--hairline-${k},${p[k]});`).join("");
const EASE = "cubic-bezier(0.5,0,0.1,1)";
const SVG = ":where([data-hairline]>svg)";

export function css(lightDark = false): string {
  const both = Object.fromEntries(KEYS.map((k) => [k, `light-dark(${LIGHT[k]},${DARK[k]})`])) as typeof LIGHT;
  return [
    `:where([data-hairline]){display:block;position:relative;touch-action:pan-y;user-select:none;-webkit-user-select:none;--hl-sw:var(--hairline-stroke,0.9);${vars(LIGHT)}}`,
    lightDark ? `:where([data-hairline]){${vars(both)}}` : "",
    `:where(.dark,[data-theme="dark"]) :where([data-hairline]){${vars(DARK)}}`,
    `:where([data-hairline][data-hairline-theme="light"]){${vars(LIGHT)}}`,
    `:where([data-hairline][data-hairline-theme="dark"]){${vars(DARK)}}`,
    `:where([data-hairline]:focus-visible){outline:1.5px solid var(--hl-hi);outline-offset:2px}`,
    `${SVG}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
    `:where([data-hairline]>[data-hairline-live]){position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
    `${SVG} :where(path,polygon,ellipse,line){fill:var(--hl-plate);stroke:var(--hl-mid);stroke-width:var(--hl-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:stroke 260ms ${EASE}}`,
    `${SVG} :where(.nf){fill:none}`,
    `${SVG} :where(.fo){stroke:none}`,
    `${SVG} :where(.sil){stroke:var(--hl-edge)}`,
    `${SVG} :where(.hi){stroke:var(--hl-hi)}`,
    `${SVG} :where(.lo){stroke:var(--hl-lo)}`,
    `${SVG} :where(.dash){stroke-dasharray:1 3}`,
    `${SVG} :where(.dot){stroke:none;fill:var(--hl-hi);transition:fill 260ms ${EASE}}`,
    `${SVG} :where(.dot.m){fill:var(--hl-edge)}`,
    `${SVG} :where(.dot.off){fill:var(--hl-lo)}`,
  ].join("");
}

const injected = new WeakSet<Document | ShadowRoot>();

export function inject(root: Document | ShadowRoot): void {
  if (typeof document === "undefined" || injected.has(root)) return;
  injected.add(root);
  const doc = root.nodeType === 9 ? (root as Document) : (root as ShadowRoot).ownerDocument;
  const style = doc.createElement("style");
  style.setAttribute("data-hairline-style", "");
  style.textContent = css(false);
  (doc.head ?? doc.documentElement).appendChild(style);
}
