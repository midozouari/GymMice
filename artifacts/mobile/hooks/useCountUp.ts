import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Animates a numeric value from 0 up to `target` over `durationMs`, easing
// out. Used to make dashboard stats (calories, water, steps, ring progress)
// count up on mount/change instead of appearing instantly, per the
// "nothing should instantly appear" animation requirement.
export function useCountUp(target: number, durationMs: number = 900, deps: React.DependencyList = []): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const to = target;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / durationMs, 1);
      setValue(from + (to - from) * easeOutCubic(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, ...deps]);

  return value;
}
