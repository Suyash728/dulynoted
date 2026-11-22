import Link from 'next/link';
import { BellRing } from 'lucide-react';
import type { SystemStatus } from '@/lib/dashboard';
import { HowItWorks } from './HowItWorks';
import { StatusChips } from './StatusChips';

export function SiteHeader({ status, current }: { status: SystemStatus; current: 'home' | 'history' }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 rounded" aria-label="DulyNoted home">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <BellRing className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">DulyNoted</span>
          </Link>
          <p className="hidden max-w-md text-xs leading-snug text-muted-foreground md:block">
            College circulars → deadlines, checklists and calendar reminders for every affected class.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <StatusChips status={status} />
          <nav aria-label="Main">
            <ul className="flex items-center gap-4 text-sm font-medium">
              <li>
                <HowItWorks />
              </li>
              <li>
                <Link href="/" aria-current={current === 'home' ? 'page' : undefined} className="text-primary underline-offset-4 hover:underline aria-[current=page]:underline">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/history" aria-current={current === 'history' ? 'page' : undefined} className="text-primary underline-offset-4 hover:underline aria-[current=page]:underline">
                  History
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
