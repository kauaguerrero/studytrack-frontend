'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  slideKey: number;
  direction: 'next' | 'prev';
}

export function SlideViewer({ children, slideKey, direction }: Props) {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const updateScale = useCallback(() => {
    if (!wrapperRef.current) return;
    // clientWidth is reliable even when the height is set via padding-bottom
    const w = wrapperRef.current.clientWidth;
    if (w > 0) setScale(w / 1920);
  }, []);

  useEffect(() => {
    // measure immediately after mount
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [updateScale]);

  return (
    /*
     * Outer wrapper: aspect-ratio 16:9 container.
     * Using padding-bottom trick so it works in all browsers including older FF.
     * overflow:hidden clips everything beyond the scaled canvas.
     */
    <div
      ref={wrapperRef}
      className="relative w-full rounded-2xl shadow-xl border border-slate-200"
      style={{
        height: 0,
        paddingBottom: `${(1080 / 1920) * 100}%`,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/*
       * AnimatePresence wraps a plain absolute-fill div so framer-motion
       * ONLY animates opacity — it never touches the `transform` property.
       * The scale lives on a separate, plain <div> so there is no conflict.
       */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slideKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/*
           * Scale layer: plain div, no framer-motion.
           * transform: scale(n) + transformOrigin top-left shrinks the
           * 1920×1080 canvas to exactly fit the container width.
           */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1920,
              height: 1080,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
