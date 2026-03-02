// #index
// - //#component: AnimatedNumber – smoothly animates a numeric value (e.g., money) using Framer Motion

// //#component
import React from 'react';
import { animate, useMotionValue, useTransform } from 'framer-motion';

export type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  className?: string;
  durationMs?: number;
};

export default function AnimatedNumber({ value, prefix = '', className, durationMs = 600 }: AnimatedNumberProps): JSX.Element {
  const motionValue = useMotionValue<number>(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString());
  const [display, setDisplay] = React.useState<string>(Math.round(value).toLocaleString());

  React.useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  React.useEffect(() => {
    const controls = animate(motionValue, value, { duration: durationMs / 1000, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, durationMs, motionValue]);

  return <span data-cmp="a/AnimatedNumber" className={className}>{prefix}{display}</span>;
}


