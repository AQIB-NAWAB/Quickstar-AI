"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "../../styles/how-it-works.css";

const steps = [
  { id: "knowledge", title: "Teach it your business", description: "Add your documents and website.", alt: "A white knowledge organizer holding a business handbook and a website source." },
  { id: "instructions", title: "Make it work your way", description: "Set its instructions and tools.", alt: "An instruction console with orange controls for tone and detail level." },
  { id: "test", title: "Try it first", description: "Check the answers before going live.", alt: "A test conversation answering a refund question, with an approval check." },
  { id: "publish", title: "Go live", description: "Publish to your website, calls, or app.", alt: "An agent on a website, connected to web, telephone, and app destinations." },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLOListElement>(null);
  const wireRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const progressRef = useRef(0);
  const [route, setRoute] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let visible = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setRunning(visible && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(section);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); motion.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const items = Array.from(grid.querySelectorAll<HTMLElement>(".hiw-journey-art"));
      const points = items.map(item => {
        const figure = item.closest("li")!;
        return { x: figure.offsetLeft + item.offsetLeft + item.offsetWidth / 2, y: figure.offsetTop + item.offsetTop + item.offsetHeight * .52 };
      });
      if (points.length !== 4) return;
      const singleColumn = window.innerWidth < 600;
      const twoColumns = window.innerWidth < 1000 && !singleColumn;
      if (singleColumn) {
        const lane = 4;
        setRoute(`M ${lane} ${points[0].y} L ${lane} ${points[3].y}`);
      } else if (twoColumns) {
        const firstRow = items[0].closest("li")!;
        const secondRow = items[2].closest("li")!;
        const rowGap = (firstRow.offsetTop + firstRow.offsetHeight + secondRow.offsetTop) / 2;
        setRoute(`M ${points[0].x} ${points[0].y} H ${grid.offsetWidth - 4} V ${rowGap} H 4 V ${points[2].y} H ${points[3].x}`);
      } else {
        setRoute(`M ${points[0].x} ${points[0].y} H ${points[3].x}`);
      }
    };
    const resize = new ResizeObserver(measure);
    resize.observe(grid);
    measure();
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const wire = wireRef.current;
    const dot = dotRef.current;
    if (!wire || !dot || !route) return;
    const length = wire.getTotalLength();
    const grid = gridRef.current!;
    const items = Array.from(grid.querySelectorAll<HTMLElement>(".hiw-journey-art"));
    // Resolve stage positions on the actual responsive route, including tablet turns.
    const stagePoints = items.map(item => {
      const figure = item.closest("li")!;
      return { x: figure.offsetLeft + item.offsetLeft + item.offsetWidth / 2, y: figure.offsetTop + item.offsetTop + item.offsetHeight * .52 };
    });
    const checkpoints = stagePoints.map(target => {
      let bestDistance = Infinity;
      let bestProgress = 0;
      for (let sample = 0; sample <= 400; sample++) {
        const point = wire.getPointAtLength(length * sample / 400);
        const distance = Math.hypot(point.x - target.x, point.y - target.y);
        if (distance < bestDistance) { bestDistance = distance; bestProgress = sample / 400; }
      }
      return bestProgress;
    });
    // A single linear journey at a constant speed, naturally occluded by the images.
    const cycleDuration = length / 110 * 1000;
    const draw = () => {
      const distance = progressRef.current * length;
      const routeProgress = progressRef.current;
      const point = wire.getPointAtLength(distance);
      dot.style.opacity = "1";
      dot.style.visibility = "visible";
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      let nearest = 0;
      checkpoints.forEach((checkpoint, index) => {
        if (Math.abs(routeProgress - checkpoint) < Math.abs(routeProgress - checkpoints[nearest])) nearest = index;
      });
      setActiveStep(previous => previous === nearest ? previous : nearest);
    };
    draw();
    if (!running) return;
    let frame = 0;
    let previousTime: number | null = null;
    const tick = (time: number) => {
      if (previousTime !== null) progressRef.current = (progressRef.current + Math.min(time - previousTime, 64) / cycleDuration) % 1;
      previousTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [route, running]);
  return (
    <section ref={sectionRef} id="how-it-works" className="hiw-section" aria-labelledby="how-it-works-heading" data-motion={running ? "running" : "paused"}>
      <div className="hiw-container">
        <header className="hiw-header-block">
          <p className="hiw-eyebrow">HOW IT WORKS</p>
          <h2 id="how-it-works-heading" className="hiw-heading">From what you know<br /><em>to what it can do.</em></h2>
          <p className="hiw-description">Give it your knowledge. Make it yours. Put it to work.</p>
        </header>
        <div className="hiw-journey-scene">
          <svg className="hiw-journey-route" aria-hidden="true" width="100%" height="100%"><path ref={wireRef} d={route} /><circle ref={dotRef} r="4" /></svg>
        <ol ref={gridRef} className="hiw-journey-grid" aria-label="Four steps to a working agent">
          {steps.map((step, index) => (
            <li key={step.id} className="hiw-journey-step" data-active={index === activeStep}>
              <figure>
                <div className="hiw-journey-art">
                  <Image src={`/marketing/how-it-works/${step.id}.webp`} width={1254} height={1254} quality={95} sizes="(max-width: 599px) 85vw, (max-width: 999px) 44vw, (min-width: 1240px) 280px, 24vw" alt={step.alt} />
                </div>
                <figcaption>
                  <span className="hiw-journey-number" aria-hidden="true">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
