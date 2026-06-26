/**
 * ReadinessDisclaimer 组件
 *
 * 显示准备度检查的免责声明和责任边界（次要信息，视觉降噪）
 */

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessDisclaimer } from '@/api/readiness';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ReadinessDisclaimerProps {
  disclaimer: ReadinessDisclaimer;
  className?: string;
}

export default function ReadinessDisclaimerComponent({
  disclaimer,
  className,
}: ReadinessDisclaimerProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  return (
    <div
      className={cn(
        'rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            {t('dashboard.readiness.page.disclaimer.title', '免责声明')}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">{disclaimer.message}</p>

          {disclaimer.userActionRequired && disclaimer.userActionRequired.length > 0 ? (
            <ul className="space-y-0.5 pt-0.5">
              {disclaimer.userActionRequired.map((item, index) => (
                <li key={index} className="text-[11px] text-slate-500 leading-snug">
                  · {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 border-t border-slate-100/80">
        {disclaimer.dataSources && disclaimer.dataSources.length > 0 ? (
          <p className="text-[11px] text-slate-400">
            {isZh ? '数据来源：' : 'Sources: '}
            {disclaimer.dataSources.map((source, index) => (
              <span key={index}>
                {index > 0 ? ' · ' : ''}
                <span className="text-slate-500">{source}</span>
              </span>
            ))}
          </p>
        ) : null}
        {disclaimer.lastUpdated ? (
          <p className="text-[10px] text-slate-400 tabular-nums ml-auto">
            {format(new Date(disclaimer.lastUpdated), isZh ? 'yyyy-MM-dd HH:mm' : 'MMM d, yyyy HH:mm')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
