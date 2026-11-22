/**
 * Human-readable class names for messages: "TE AI&DS A", "TE AI&DS B", "BE AI&DS A"
 * → "Third-year (TE) AI&DS — Div A & B · Final-year (BE) AI&DS — Div A". Pure; safe on client and server.
 */

const YEAR_NAME: Record<string, string> = { FE: 'First-year', SE: 'Second-year', TE: 'Third-year', BE: 'Final-year' };
const YEAR_ORDER = ['FE', 'SE', 'TE', 'BE'];

interface Parsed {
  year: string;
  branch: string;
  division: string;
}

/** "TE AI&DS A" → { year: TE, branch: AI&DS, division: A }; null for labels in another format. */
export function parseClassLabel(label: string): Parsed | null {
  const parts = label.trim().split(/\s+/);
  if (parts.length < 3 || !YEAR_NAME[parts[0]]) return null;
  return { year: parts[0], branch: parts.slice(1, -1).join(' '), division: parts[parts.length - 1] };
}

const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`);

export function describeClasses(labels: string[]): string {
  const groups = new Map<string, { year: string; branch: string; divisions: string[] }>();
  const other: string[] = [];
  for (const label of labels) {
    const p = parseClassLabel(label);
    if (!p) {
      other.push(label);
      continue;
    }
    const key = `${p.year}|${p.branch}`;
    const g = groups.get(key) ?? { year: p.year, branch: p.branch, divisions: [] };
    if (!g.divisions.includes(p.division)) g.divisions.push(p.division);
    groups.set(key, g);
  }
  const parts = Array.from(groups.values())
    .sort((a, b) => YEAR_ORDER.indexOf(a.year) - YEAR_ORDER.indexOf(b.year) || a.branch.localeCompare(b.branch))
    .map((g) => `${YEAR_NAME[g.year]} (${g.year}) ${g.branch} — Div ${joinAnd(g.divisions.sort())}`);
  return [...parts, ...other].join(' · ');
}
