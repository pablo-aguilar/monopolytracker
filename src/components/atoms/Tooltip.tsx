import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  offsetPx?: number;
}

export default function Tooltip({ content, children, className, offsetPx = 8 }: TooltipProps): JSX.Element {
  const [open, setOpen] = React.useState<boolean>(false);
  const show = (): void => setOpen(true);
  const hide = (): void => setOpen(false);

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2"
            style={{ bottom: `calc(100% + ${offsetPx}px)` }}
          >
            <div className="rounded-md bg-neutral-900 text-white text-[11px] px-2 py-1 shadow-lg whitespace-pre" role="tooltip">
              {content}
            </div>
            <div className="mx-auto h-2 w-2 rotate-45 bg-neutral-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}


