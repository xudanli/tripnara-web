import type { DraftDayTableRow } from '@/lib/guide-to-plan-mapper';
import { BedDouble, Car, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuideImportCard, guideImportUi } from '@/components/guide-import/guide-import-ui';

interface GuideDraftDayOverviewProps {
  title: string;
  rows: DraftDayTableRow[];
  className?: string;
}

export function GuideDraftDayOverview({ title, rows, className }: GuideDraftDayOverviewProps) {
  return (
    <GuideImportCard padding={false} className={cn('overflow-hidden', className)}>
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className={guideImportUi.sectionTitle}>{title}</h3>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={`${row.day}-${row.date ?? ''}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-start gap-2.5 min-w-0 sm:w-[168px] flex-shrink-0">
              <span className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-shrink-0">
                {row.day}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug">
                  Day {row.day} {row.theme !== '—' ? row.theme : ''}
                </p>
                {row.date && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{row.date}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex-1 min-w-0 leading-relaxed">{row.route}</p>
            <div className="flex items-center gap-x-3 text-[10px] text-muted-foreground sm:w-[200px] sm:justify-end flex-shrink-0">
              <span className="inline-flex items-center gap-1 min-w-[52px] justify-end">
                <Car className="w-3 h-3 flex-shrink-0" />
                {row.driveKm ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1 min-w-[28px] justify-end">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {row.driveHours ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1 min-w-0 max-w-[88px] justify-end">
                <BedDouble className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{row.stay && row.stay !== '—' ? row.stay : '—'}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </GuideImportCard>
  );
}
