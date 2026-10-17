/** One demand-driven frame loop per illustration; nothing runs in hidden scenes. */
export function createSceneLoop(
  stage: HTMLElement,
  paint: (dt: number, now: number, reduced: boolean) => boolean,
) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let frame = 0;
  let last = 0;
  let disposed = false;
  let painting = false;

  function tick(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    painting = true;
    const busy = paint(dt, now, media.matches);
    painting = false;
    if (busy && !media.matches && !frame) {
      frame = requestAnimationFrame(tick);
    }
  }
  function wake() {
    if (!disposed && visible && !document.hidden && !frame && !painting) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) wake();
    else stop();
  });
  observer.observe(stage);
  const visibility = () => document.hidden ? stop() : wake();
  const preference = () => { stop(); wake(); };
  document.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", preference);
  return {
    wake,
    canTour: () => visible && !document.hidden && !media.matches &&
      !stage.matches(":hover, :focus-within") &&
      !document.activeElement?.matches("input, textarea, select"),
    dispose() {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", preference);
    },
  };
}

export function follow(current: number, target: number, dt: number, reduced: boolean, tau = 0.09) {
  const next = reduced ? target : current + (target - current) * (1 - Math.exp(-dt / tau));
  return Math.abs(next - target) < 0.001 ? target : next;
}
