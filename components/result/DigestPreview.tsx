'use client';

import { CheckCheck, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Digest } from '@/lib/types';
import { describeClasses } from '@/lib/class-names';

/** Preview styled like the Telegram class-group post students will receive. */
export function DigestPreview({ digests, title }: { digests: Digest[]; title: string }) {
  if (digests.length === 0) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy — select the text instead');
    }
  };

  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Class message preview (Telegram)</h3>
      <ul className="space-y-2 rounded-2xl bg-[#dfe9f2] p-3 ring-1 ring-[#c9d9e8]">
        {digests.map((d) => (
          <li key={d.audienceLabels.join('|')} className="max-w-prose rounded-2xl rounded-tl-sm bg-white p-3 text-sm shadow-sm">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#2b6cb0]">
              <Send aria-hidden className="h-3.5 w-3.5" />
              DulyNoted bot · {describeClasses(d.audienceLabels)}
            </p>
            <p className="font-semibold">📌 {title}</p>
            <p className="mt-1 whitespace-pre-line">{d.text}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <button type="button" onClick={() => void copy(d.text)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted">
                <Copy aria-hidden className="h-3 w-3" />
                Copy
                <span className="sr-only"> message for {d.audienceLabels.join(', ')}</span>
              </button>
              <span className="inline-flex items-center gap-1">
                + Google Calendar links
                <CheckCheck aria-hidden className="h-3.5 w-3.5 text-[#2b6cb0]" />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
