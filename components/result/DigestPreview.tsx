import type { Digest } from '@/lib/types';

export function DigestPreview({ digests }: { digests: Digest[] }) {
  if (digests.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground">Class message preview</h3>
      <ul className="mt-1.5 space-y-2">
        {digests.map((d, i) => (
          <li key={i} className="max-w-prose rounded-2xl rounded-tl-sm border bg-[#eef6ff] p-3 text-sm">
            <p className="mb-1 text-[11px] font-semibold text-primary">To: {d.audienceLabels.join(', ')}</p>
            <p className="whitespace-pre-line">{d.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
