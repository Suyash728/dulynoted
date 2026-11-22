import Link from 'next/link';
import type { ReactNode } from 'react';
import { BellRing } from 'lucide-react';
import type { SystemStatus } from '@/lib/dashboard';
import { cn } from '@/lib/utils';
import { HowItWorks } from './HowItWorks';
import { StatusChips } from './StatusChips';

interface Props {
  status: SystemStatus;
  current: 'home' | 'history';
  title: string;
  subtitle: string;
  /** Rendered inside the hero band (KPI tiles). */
  children?: ReactNode;
}

const NAV = [
  { href: '/', label: 'Dashboard', key: 'home' },
  { href: '/history', label: 'History', key: 'history' },
] as const;

/** Dark hero band: brand, navigation, live status and the page's headline numbers. */
export function SiteHeader({ status, current, title, subtitle, children }: Props) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-[1400px] px-4 pb-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="DulyNoted home">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <BellRing className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">DulyNoted</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={current === n.key ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white',
                  current === n.key && 'bg-white text-indigo-900 shadow-sm hover:bg-white hover:text-indigo-900',
                )}
              >
                {n.label}
              </Link>
            ))}
            <HowItWorks />
          </nav>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-indigo-100">{subtitle}</p>
          </div>
          <StatusChips status={status} />
        </div>

        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}
