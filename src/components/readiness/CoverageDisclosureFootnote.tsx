import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CoverageDisclosure } from '@/types/coverage-disclosure';
import { hasCoverageDisclosureContent } from '@/lib/coverage-disclosure.util';
import { useTranslation } from 'react-i18next';

export interface CoverageDisclosureFootnoteProps {
  disclosure: CoverageDisclosure;
  className?: string;
}

export default function CoverageDisclosureFootnote({
  disclosure,
  className,
}: CoverageDisclosureFootnoteProps) {
  const { t } = useTranslation();

  if (!hasCoverageDisclosureContent(disclosure)) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400',
        className
      )}
      role="note"
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {t('dashboard.readiness.coverageDisclosure.title', {
              defaultValue: '数据边界',
            })}
          </p>
          {disclosure.message ? (
            <p className="leading-relaxed">{disclosure.message}</p>
          ) : null}
          {disclosure.checkedSources && disclosure.checkedSources.length > 0 ? (
            <p>
              {t('dashboard.readiness.coverageDisclosure.checked', {
                defaultValue: '已检查：{{sources}}',
                sources: disclosure.checkedSources.join('、'),
              })}
            </p>
          ) : null}
          {disclosure.uncheckedDimensions && disclosure.uncheckedDimensions.length > 0 ? (
            <p>
              {t('dashboard.readiness.coverageDisclosure.unchecked', {
                defaultValue: '未检查：{{dims}}',
                dims: disclosure.uncheckedDimensions.join('、'),
              })}
            </p>
          ) : null}
          {disclosure.dataFreshnessNote ? (
            <p className="text-slate-500 dark:text-slate-500">{disclosure.dataFreshnessNote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
