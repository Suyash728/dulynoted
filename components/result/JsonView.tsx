import { tokenizeJson, type JsonTokenKind } from '@/lib/json-highlight';

const COLOR: Record<JsonTokenKind, string> = {
  key: 'text-indigo-800',
  string: 'text-emerald-800',
  number: 'text-amber-800',
  literal: 'text-fuchsia-800',
  punct: 'text-muted-foreground',
  space: '',
};

/** Syntax-coloured JSON; tokens render as React text, so model output can never inject markup. */
export function JsonView({ value, label }: { value: unknown; label: string }) {
  return (
    <pre
      tabIndex={0}
      aria-label={label}
      className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-2 text-[11px] leading-relaxed"
    >
      {tokenizeJson(value).map((t, i) => (
        <span key={i} className={COLOR[t.kind]}>
          {t.text}
        </span>
      ))}
    </pre>
  );
}
