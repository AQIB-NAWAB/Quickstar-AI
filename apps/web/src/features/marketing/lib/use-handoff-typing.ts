"use client";
import { useEffect, useState } from "react";

/** Reveal the example message without changing the space reserved by its full text. */
export function useHandoffTyping(text: string, typing: boolean, complete: boolean, delay: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!typing) return;
    const started = performance.now();
    const timer = setInterval(() => {
      const next = Math.min(text.length, Math.floor((performance.now() - started) / delay));
      setCount(next);
      if (next === text.length) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [text, typing, delay]);
  return complete ? text : typing ? text.slice(0, count) : "";
}
