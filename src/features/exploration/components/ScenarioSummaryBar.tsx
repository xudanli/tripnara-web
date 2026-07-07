import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Pencil, Users, Wallet } from 'lucide-react';
import { fetchScenarioDetail, isExplorationUnavailable } from '../api/client';
import { useExplorationTravelContext } from '../context/ExplorationTravelContext';
import { explorationViewToScenarioDetail } from '../travel-context/exploration-view.adapter';
import {
  DEFAULT_CONDITIONS_FORM,
  destinationLabelFromCode,
  durationDaysFromForm,
  scenarioDetailToForm,
} from '../conditions-form.util';
import { exploreBasePath } from '../constants';
import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';

interface ScenarioSummaryBarProps {
  scenarioId?: string;
  className?: string;
  /** 是否显示「编辑条件」链接，默认有 scenarioId 时为 true */
  showEditLink?: boolean;
}

export function ScenarioSummaryBar({
  scenarioId,
  className,
  showEditLink = true,
}: ScenarioSummaryBarProps) {
  const [items, setItems] = useState<Array<{ icon: typeof MapPin; label: string }>>([]);
  const travelContext = useExplorationTravelContext();

  useEffect(() => {
    if (!scenarioId) return;

    if (travelContext.enabled && travelContext.explorationView) {
      const detail = explorationViewToScenarioDetail(
        travelContext.contextId,
        travelContext.explorationView,
      );
      const form = scenarioDetailToForm(detail);
      const days = durationDaysFromForm(form);
      setItems([
        { icon: MapPin, label: destinationLabelFromCode(form.destinationCode) },
        { icon: Calendar, label: `${form.startDate} → ${form.endDate} · ${days} 天` },
        { icon: Users, label: `${form.adultCount} 位成人` },
        {
          icon: Wallet,
          label: `${form.currency} ${form.budgetMin.toLocaleString()}–${form.budgetMax.toLocaleString()}`,
        },
      ]);
      return;
    }

    let cancelled = false;

    void fetchScenarioDetail(scenarioId)
      .then((detail) => {
        if (cancelled) return;
        const form = scenarioDetailToForm(detail);
        const days = durationDaysFromForm(form);
        setItems([
          { icon: MapPin, label: destinationLabelFromCode(form.destinationCode) },
          { icon: Calendar, label: `${form.startDate} → ${form.endDate} · ${days} 天` },
          { icon: Users, label: `${form.adultCount} 位成人` },
          {
            icon: Wallet,
            label: `${form.currency} ${form.budgetMin.toLocaleString()}–${form.budgetMax.toLocaleString()}`,
          },
        ]);
      })
      .catch((err) => {
        if (cancelled || isExplorationUnavailable(err)) return;
        const form = DEFAULT_CONDITIONS_FORM;
        const days = durationDaysFromForm(form);
        setItems([
          { icon: MapPin, label: destinationLabelFromCode(form.destinationCode) },
          { icon: Calendar, label: `${days} 天` },
          { icon: Users, label: `${form.adultCount} 位成人` },
          { icon: Wallet, label: `${form.currency} ${form.budgetMin}–${form.budgetMax}` },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioId, travelContext.enabled, travelContext.explorationView, travelContext.contextId]);

  if (!items.length) return null;

  const editHref = scenarioId ? `${exploreBasePath(scenarioId)}/conditions` : undefined;

  return (
    <div
      className={cn(
        exploreUi.infoBanner,
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
        <span className="font-medium text-foreground">旅行条件</span>
        {items.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {label}
          </span>
        ))}
      </div>
      {showEditLink && editHref ? (
        <Link
          to={editHref}
          className="inline-flex items-center gap-1.5 min-h-11 px-2 -mr-2 text-foreground font-medium hover:underline underline-offset-4 flex-shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          编辑条件
        </Link>
      ) : null}
    </div>
  );
}
