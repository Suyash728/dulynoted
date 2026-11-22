'use client';

import { FileCheck2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TimeSaved } from '@/lib/types';

export function TimeSavedPill({ value }: { value: TimeSaved }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">
            <FileCheck2 aria-hidden className="h-4 w-4" />≈ {value.manualMin} min of manual work → {value.autoSec} s
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Estimate: {value.formula}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
