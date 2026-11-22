'use client';

import { Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TimeSaved } from '@/lib/types';
import { roiPercent } from '@/lib/stats';

/** ROI badge: share of manual time removed, with the estimate formula one hover away. */
export function TimeSavedPill({ value }: { value: TimeSaved }) {
  const pct = roiPercent(value.manualMin, value.autoSec);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-950 shadow-sm">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <Zap aria-hidden className="h-4 w-4" />
            <span>
              <strong>{pct}% time saved</strong> · ≈ {value.manualMin} min manual → {value.autoSec} s
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Estimate: {value.formula}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
