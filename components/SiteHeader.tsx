import Link from 'next/link';
import { HowItWorks } from './HowItWorks';

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            <Link href="/" className="hover:underline">
              DulyNoted
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Drop any college circular. Every affected class gets the deadline, the checklist and a calendar reminder, automatically.
          </p>
        </div>
        <nav aria-label="Main">
          <ul className="flex items-center gap-4 text-sm font-medium">
            <li>
              <HowItWorks />
            </li>
            <li>
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                New circular
              </Link>
            </li>
            <li>
              <Link href="/history" className="text-primary underline-offset-4 hover:underline">
                History
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
