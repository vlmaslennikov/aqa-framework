import { useEffect, useRef } from "react";

/**
 * Fires `onIntersect` whenever the returned ref's element enters the
 * viewport, as long as `enabled`. The callback is read from a ref so the
 * observer isn't torn down and recreated on every render. `rearmKey` is
 * included so a short page in a tall viewport re-checks intersection after
 * new rows are appended - IntersectionObserver only fires on boundary
 * crossings, so a sentinel that never actually left the viewport would
 * otherwise never trigger a second load.
 */
export function useIntersectionObserver<T extends Element>(
  onIntersect: () => void,
  enabled: boolean,
  rearmKey?: unknown
) {
  const targetRef = useRef<T | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  });

  useEffect(() => {
    const node = targetRef.current;
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rearmKey]);

  return targetRef;
}
