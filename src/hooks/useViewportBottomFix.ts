"use client";

import { useEffect, type RefObject } from "react";

/** iOS Safari: compensate fixed bottom bar when visual viewport shrinks (toolbar). */
export function useViewportBottomFix(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    const fix = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      el.style.transform = offset > 0 ? `translateY(-${offset}px)` : "";
    };

    fix();
    vv.addEventListener("resize", fix);
    vv.addEventListener("scroll", fix);
    return () => {
      vv.removeEventListener("resize", fix);
      vv.removeEventListener("scroll", fix);
      el.style.transform = "";
    };
  }, [ref]);
}
