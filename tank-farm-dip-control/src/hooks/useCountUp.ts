import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `target` with an ease-out curve.
 * Re-runs whenever the target changes (e.g. dashboard stats refresh).
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const progress = Math.min((now - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(targetRef.current * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration]);

  return value;
}
