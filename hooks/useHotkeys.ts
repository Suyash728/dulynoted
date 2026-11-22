'use client';

import { useEffect, useRef } from 'react';

/**
 * Global shortcuts for live demos. Digit keys are ignored while typing in a field;
 * Ctrl/⌘+Enter works everywhere.
 */
export function useHotkeys(handlers: { digit?: (d: string) => void; submit?: () => void }) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ref.current.submit?.();
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = t?.closest('input, textarea, select, [contenteditable="true"]');
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) ref.current.digit?.(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
