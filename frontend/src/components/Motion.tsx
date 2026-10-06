import { useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

export function MotionSurface({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference)",
        (_context, contextSafe) => {
          const safe = <Args extends unknown[]>(fn: (...args: Args) => void) =>
            contextSafe!(fn) as (...args: Args) => void;
          let entered = false;
          const reveal = safe(() => {
            if (entered) return;
            const heading = root.current?.querySelector(
              ".page-heading, .feed-heading, .article-header, .login-copy",
            );
            if (!heading) return;
            entered = true;
            observer.disconnect();
            const timeline = gsap.timeline({
              defaults: { ease: "power3.out" },
            });
            timeline.from(heading, {
              y: 14,
              opacity: 0,
              duration: 0.45,
              clearProps: "transform,opacity",
            });
            const stories = root.current?.querySelectorAll(
              ".featured-section .news-story",
            );
            if (stories?.length)
              timeline.from(
                stories,
                {
                  y: 16,
                  opacity: 0,
                  duration: 0.45,
                  stagger: 0.07,
                  clearProps: "transform,opacity",
                },
                "<.1",
              );
          });
          const observer = new MutationObserver(reveal);
          if (root.current)
            observer.observe(root.current, { childList: true, subtree: true });
          reveal();
          let pressed: HTMLButtonElement | null = null;
          const down = safe((event: PointerEvent) => {
            const target = (event.target as Element).closest<HTMLButtonElement>(
              "button",
            );
            if (!target || target.disabled) return;
            pressed = target;
            gsap.to(target, {
              scale: 0.97,
              duration: 0.1,
              ease: "power2.out",
              overwrite: "auto",
            });
          });
          const up = safe(() => {
            if (!pressed) return;
            gsap.to(pressed, {
              scale: 1,
              duration: 0.22,
              ease: "power3.out",
              overwrite: "auto",
              clearProps: "transform",
            });
            pressed = null;
          });
          const enter = safe((event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const story = (event.target as Element).closest(".news-story");
            if (!story || story.contains(event.relatedTarget as Node)) return;
            const img = story.querySelector(".image-frame img");
            if (img)
              gsap.to(img, {
                scale: 1.025,
                duration: 0.65,
                ease: "power2.out",
                overwrite: "auto",
              });
          });
          const leave = safe((event: PointerEvent) => {
            const story = (event.target as Element).closest(".news-story");
            if (!story || story.contains(event.relatedTarget as Node)) return;
            const img = story.querySelector(".image-frame img");
            if (img)
              gsap.to(img, {
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto",
                clearProps: "transform",
              });
          });
          const node = root.current;
          if (!node) return;
          node.addEventListener("pointerdown", down);
          document.addEventListener("pointerup", up);
          document.addEventListener("pointercancel", up);
          node.addEventListener("pointerover", enter);
          node.addEventListener("pointerout", leave);
          const cleanup = () => {
            observer.disconnect();
            node.removeEventListener("pointerdown", down);
            document.removeEventListener("pointerup", up);
            document.removeEventListener("pointercancel", up);
            node.removeEventListener("pointerover", enter);
            node.removeEventListener("pointerout", leave);
          };
          return cleanup;
        },
      );
      return () => {
        media.revert();
      };
    },
    { scope: root, dependencies: [pathname], revertOnUpdate: true },
  );
  return (
    <div ref={root} className="motion-surface">
      {children}
    </div>
  );
}
