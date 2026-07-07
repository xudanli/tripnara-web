import { Skeleton } from '@/components/ui/skeleton';
import {
  tripAutomationHeaderCard,
  tripAutomationPageShell,
  tripAutomationSectionCard,
  tripAutomationSidebarCard,
} from './trip-automation-ui';

const CATALOG_GROUP_PLACEHOLDERS = 6;

export default function AutomationAuthorizationPageSkeleton() {
  return (
    <div className={tripAutomationPageShell} aria-busy="true" aria-label="加载授权中心">
      <Skeleton className="mb-4 h-8 w-24" />

      <header className={tripAutomationHeaderCard}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-7 w-56 sm:h-8 sm:w-72" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-5/6 max-w-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-36 rounded-lg" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <div className="space-y-4">
          <section className={tripAutomationSectionCard}>
            <div className="border-b border-border/50 px-4 py-3 sm:px-5">
              <Skeleton className="h-4 w-32" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-[72px] rounded-xl" />
                ))}
              </div>
            </div>
          </section>

          <section className={tripAutomationSectionCard}>
            <div className="border-b border-border/50 px-4 py-3 sm:px-5">
              <Skeleton className="h-4 w-40" />
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-28 rounded-full" />
                ))}
              </div>
            </div>
            <ul className="divide-y divide-border/50">
              {Array.from({ length: CATALOG_GROUP_PLACEHOLDERS }).map((_, index) => (
                <li key={index} className="flex items-start gap-3 p-3.5 sm:p-4">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={tripAutomationSidebarCard}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <Skeleton className="mt-4 h-16 w-full rounded-xl" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
