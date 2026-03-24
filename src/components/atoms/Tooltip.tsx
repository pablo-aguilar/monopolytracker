import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  offsetPx?: number;
  tapToShowMs?: number;
}

export default function Tooltip({ content, children, className, offsetPx = 8, tapToShowMs = 2000 }: TooltipProps): JSX.Element {
  const [open, setOpen] = React.useState<boolean>(false);
  const show = (): void => setOpen(true);
  const hide = (): void => setOpen(false);
  const tapTimerRef = React.useRef<number | null>(null);

  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'top',
    middleware: [offset(offsetPx), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  React.useEffect(() => {
    return () => {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    };
  }, []);

  return (
    <span
      data-cmp="a/Tooltip"
      ref={refs.setReference}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onPointerDown={(e) => {
        // On touch devices, allow tap-to-show (since hover doesn't exist).
        if (e.pointerType === 'mouse') return;
        show();
        if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = window.setTimeout(() => {
          hide();
          tapTimerRef.current = null;
        }, tapToShowMs) as unknown as number;
      }}
    >
      {children}
      <AnimatePresence>
        {open && (
          <FloatingPortal>
            <div ref={refs.setFloating} style={floatingStyles} className="pointer-events-none z-[100]">
              <motion.div
                key="tooltip-bubble"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <div className="rounded-md bg-neutral-900 text-white text-[11px] px-2 py-1 shadow-lg whitespace-pre" role="tooltip">
                  {content}
                </div>
              </motion.div>
            </div>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </span>
  );
}
