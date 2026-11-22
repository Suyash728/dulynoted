import type { Audience, Recipient } from '../types';

/** ROUTE_AUDIENCE — deterministic match of the extracted audience against the class table. */

export interface ClassRow {
  label: string;
  year: string;
  branch: string;
  division: string;
  size: number;
  telegram_chat_id: string | null;
}

const BRANCH_ALIASES: Record<string, string> = {
  aids: 'AI&DS',
  aiandds: 'AI&DS',
  aid: 'AI&DS',
  artificialintelligencedatascience: 'AI&DS',
  artificialintelligenceanddatascience: 'AI&DS',
  comp: 'COMP',
  ce: 'COMP',
  cs: 'COMP',
  cse: 'COMP',
  computer: 'COMP',
  computers: 'COMP',
  computerengineering: 'COMP',
  computerscience: 'COMP',
  it: 'IT',
  informationtechnology: 'IT',
};

/** "AI & DS", "aids", "Artificial Intelligence & Data Science" → "AI&DS". Unknown names pass through upper-cased. */
export function canonicalBranch(name: string): string {
  const key = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
  return BRANCH_ALIASES[key] ?? BRANCH_ALIASES[key.replace(/and/g, '')] ?? name.trim().toUpperCase();
}

function canonicalDivision(name: string): string {
  return name.replace(/^div(ision)?\.?\s*/i, '').trim().toUpperCase();
}

export interface RouteResult {
  recipients: Recipient[];
  /** true when nothing matched and we defaulted to every class */
  fallback: boolean;
}

export function matchAudiences(audience: Audience, rows: ClassRow[]): RouteResult {
  const toRecipient = (r: ClassRow): Recipient => ({ audienceLabel: r.label, size: r.size, chatId: r.telegram_chat_id });

  if (audience.all) return { recipients: rows.map(toRecipient), fallback: false };

  const years = new Set<string>(audience.years);
  const branches = new Set(audience.branches.map(canonicalBranch));
  const divisions = new Set(audience.divisions.map(canonicalDivision));

  const matched = rows.filter(
    (r) =>
      (years.size === 0 || years.has(r.year)) &&
      (branches.size === 0 || branches.has(canonicalBranch(r.branch))) &&
      (divisions.size === 0 || divisions.has(canonicalDivision(r.division))),
  );

  const nothingSpecified = years.size === 0 && branches.size === 0 && divisions.size === 0;
  if (matched.length === 0 || nothingSpecified) return { recipients: rows.map(toRecipient), fallback: true };
  return { recipients: matched.map(toRecipient), fallback: false };
}
