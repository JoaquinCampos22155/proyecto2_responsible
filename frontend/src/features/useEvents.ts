import { useEffect, useRef } from "react";
import { useEventTracker } from "./EventProvider";
export function useImpression(id: string, enabled = true) {
  const ref = useRef<HTMLElement | null>(null);
  const tracker = useEventTracker();
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void tracker.once("impression", id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled, id, tracker]);
  return ref;
}
export function useReading(id: string | undefined, enabled = true) {
  const tracker = useEventTracker();
  useEffect(() => {
    if (!id || !enabled) return;
    void tracker.once("article_open", id);
    let started = document.hidden ? 0 : performance.now();
    let total = 0;
    let sent = false;
    const accumulate = () => {
      if (started) {
        total += performance.now() - started;
        started = 0;
      }
    };
    const visibility = () => {
      accumulate();
      if (!document.hidden) started = performance.now();
    };
    const finish = () => {
      if (sent) return;
      sent = true;
      accumulate();
      void tracker.reading(id, total);
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", finish);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", finish);
      finish();
    };
  }, [enabled, id, tracker]);
}
