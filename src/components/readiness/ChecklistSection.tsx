import { useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Scale, Shield, Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next'; // 🆕 添加 i18n 支持
import type { ReadinessFindingItem } from '@/api/readiness';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { jumpFromTripScope } from '@/lib/plan-studio-readiness-jump';
import { isCoverageGapFindingId } from '@/lib/readiness-coverage-gap';
import { splitMustTripInvolvesMessage, truncateTripInvolvesList, dedupeChecklistTasks, resolveChecklistTaskText } from '@/lib/readiness-message-split';
import {
  buildTripInvolvesLines,
  placeDisplayName,
  taskCheckKey,
} from '@/lib/readiness-place-display.util';
import { isMustItemComplete } from '@/lib/readiness-pack-must-progress';
import type { TripDetail } from '@/types/trip';
import UserDecisionDialog from '@/components/readiness/UserDecisionDialog';

function formatAskUserQuestion(
  question: string | { text?: string | { zh?: string; en?: string }; en?: string; zh?: string },
  isZh: boolean,
): string {
  if (typeof question === 'string') return question;
  if (question.text) {
    if (typeof question.text === 'string') return question.text;
    return (isZh ? question.text.zh : question.text.en) || question.text.zh || question.text.en || '';
  }
  return (isZh ? question.zh : question.en) || question.zh || question.en || '';
}

interface ChecklistSectionProps {
  title: string;
  items: ReadinessFindingItem[];
  level: 'blocker' | 'must' | 'should' | 'optional'; // 🎨 新增 blocker 级别，用于区分阻塞项
  /** Pack 安全/打包类 must 项：标题与 badge 用「安全准备」语义 */
  titleVariant?: 'default' | 'safety';
  className?: string;
  tripStartDate?: string | Date; // 用于计算任务截止日期
  trip?: TripDetail | null; // 行程数据，用于关联活动
  tripId?: string; // 🆕 行程ID，用于用户决策对话框
  onFindingUpdated?: (findingId: string, updatedFinding: any) => void; // 🆕 当用户回答问题后更新finding的回调
  /** GET .../blockers/:blockerId/solutions 须传列表项 item.id（含 coverage-gap:*），勿用本地占位 id */
  onViewBlockerSolution?: (blockerId: string) => void;
  /** 安全准备类可勾选完成 */
  checkable?: boolean;
  checkedItemIds?: Set<string>;
  onToggleChecked?: (itemId: string) => void;
  /** 多项时默认折叠详情，只露摘要行 */
  collapseWhenMany?: boolean;
  /** 外层已有分类标题时隐藏 Card 标题行 */
  hideSectionHeader?: boolean;
}

function itemCheckKey(item: ReadinessFindingItem, index: number, level: string): string {
  return item.id || `${level}-${index}`;
}

// 计算截止日期
function calculateDeadline(offsetDays: number, tripStartDate: string | Date): string {
  const startDate = typeof tripStartDate === 'string' ? new Date(tripStartDate) : tripStartDate;
  const deadline = new Date(startDate);
  deadline.setDate(deadline.getDate() + offsetDays);
  return deadline.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChecklistSection({
  title,
  items,
  level,
  titleVariant = 'default',
  className,
  tripStartDate,
  trip,
  tripId,
  onFindingUpdated,
  onViewBlockerSolution,
  checkable = false,
  checkedItemIds,
  onToggleChecked,
  collapseWhenMany = false,
  hideSectionHeader = false,
}: ChecklistSectionProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh');
  const planStudio = useContext(PlanStudioContext);
  const [selectedDecisionItem, setSelectedDecisionItem] = useState<ReadinessFindingItem | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  
  if (!items || items.length === 0) {
    return null;
  }

  const indexedItems = items.map((item, index) => ({ item, index }));
  const isItemChecked = (item: ReadinessFindingItem, index: number) => {
    if (!checkedItemIds) return false;
    if (checkable && level === 'must') {
      return isMustItemComplete(item, index, checkedItemIds);
    }
    const key = itemCheckKey(item, index, level);
    return checkedItemIds.has(key) || (item.id != null && checkedItemIds.has(item.id));
  };
  const pendingItems = checkable
    ? indexedItems.filter(({ item, index }) => !isItemChecked(item, index))
    : indexedItems;
  const completedItems = checkable
    ? indexedItems.filter(({ item, index }) => isItemChecked(item, index))
    : [];
  const useCompactCards = checkable && collapseWhenMany && items.length > 1;

  // 根据 affectedDays 获取关联的活动信息
  const getAssociatedActivities = (item: ReadinessFindingItem & { affectedDays?: number[] }): string[] => {
    const activities: string[] = [];
    if (item.affectedDays && item.affectedDays.length > 0 && trip?.TripDay) {
      item.affectedDays.forEach(dayNum => {
        // dayNum 是从1开始的，需要找到对应的 TripDay（按索引匹配）
        const tripDay = trip?.TripDay?.[dayNum - 1];
        
        if (tripDay) {
          const dateStr = tripDay.date 
            ? new Date(tripDay.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) 
            : `第${dayNum}天`;
          
          if (tripDay.ItineraryItem && tripDay.ItineraryItem.length > 0) {
            const placeNames = tripDay.ItineraryItem
              .map((itineraryItem) => placeDisplayName(itineraryItem.Place as any, isZh))
              .filter((name): name is string => Boolean(name))
              .slice(0, 3);
            if (placeNames.length > 0) {
              activities.push(`${dateStr}: ${placeNames.join('、')}`);
            } else {
              activities.push(dateStr);
            }
          } else {
            activities.push(dateStr);
          }
        } else {
          // 如果找不到对应的日期，至少显示天数
          activities.push(`第${dayNum}天`);
        }
      });
    }
    return activities;
  };

  // 🎨 统一颜色 Token（符合 TripNARA 克制原则）
  // 🎯 阻塞项 vs 必须项：通过左侧边框、背景深度、图标大小来区分
  // 🆕 根据 constraintType 进一步区分显示（支持国际化）
  const getConstraintTypeConfig = (item: ReadinessFindingItem) => {
    // 如果是 blocker 级别，根据 constraintType 选择图标
    if (level === 'blocker') {
      if (item.constraintType === 'legal_blocker') {
        return {
          icon: Scale, // 法律图标
          iconClassName: 'text-error',
          badgeLabel: t('dashboard.readiness.page.constraintType.legal_blocker', { defaultValue: '法律要求' }),
        };
      } else if (item.constraintType === 'safety_blocker') {
        return {
          icon: Shield, // 安全图标
          iconClassName: 'text-error',
          badgeLabel: t('dashboard.readiness.page.constraintType.safety_blocker', { defaultValue: '安全要求' }),
        };
      }
      // 默认使用 AlertCircle
      return {
        icon: AlertCircle,
        iconClassName: 'text-error',
        badgeLabel: t('dashboard.readiness.page.constraintType.blocker', { defaultValue: '阻塞项' }),
      };
    }
    
    // 如果是 must 级别，根据 constraintType 选择图标
    if (level === 'must') {
      if (item.constraintType === 'strong_recommendation') {
        return {
          icon: Star, // 推荐图标
          iconClassName: 'text-warning',
          badgeLabel: t('dashboard.readiness.page.constraintType.strong_recommendation', { defaultValue: '强烈建议' }),
        };
      }
      // 默认使用 AlertTriangle
      return {
        icon: AlertTriangle,
        iconClassName: 'text-warning',
        badgeLabel: t('dashboard.readiness.page.constraintType.must', { defaultValue: '必须项' }),
      };
    }
    
    return null;
  };

  const levelConfig = {
    blocker: {
      icon: AlertCircle, // 默认图标，会被 getConstraintTypeConfig 覆盖
      iconClassName: 'text-error',
      iconSize: 'h-6 w-6', // 🎯 阻塞项：更大的图标
      badgeClassName: 'bg-muted text-error border-border border-2', // 🎯 阻塞项：更粗的边框
      badgeLabel: '阻塞项',
      cardBorder: 'border-l-4 border-border', // 🎯 阻塞项：左侧红色粗边框
      cardBg: 'bg-muted/50', // 🎯 阻塞项：更明显的背景
    },
    must: {
      icon: AlertTriangle,
      iconClassName: 'text-warning',
      iconSize: 'h-5 w-5',
      badgeClassName: 'bg-muted-foreground text-white border-border font-medium',
      badgeLabel: isZh ? '必须' : 'Required',
      cardBorder: '',
      cardBg: 'bg-white',
    },
    should: {
      icon: CheckCircle2,
      iconClassName: 'text-warning',
      iconSize: 'h-5 w-5',
      badgeClassName: 'bg-muted text-warning border-border',
      badgeLabel: 'Should',
      cardBorder: '',
      cardBg: 'bg-white',
    },
    optional: {
      icon: Info,
      iconClassName: 'text-muted-foreground',
      iconSize: 'h-5 w-5',
      badgeClassName: 'bg-muted text-muted-foreground border-border',
      badgeLabel: 'Optional',
      cardBorder: '',
      cardBg: 'bg-white',
    },
  };

  const config = levelConfig[level];
  const sectionBadgeLabel =
    level === 'must' && titleVariant === 'safety'
      ? isZh
        ? '安全准备'
        : 'Safety prep'
      : level === 'must'
        ? isZh
          ? '必须'
          : 'Required'
        : config.badgeLabel;
  const Icon = config.icon;

  function renderFindingCard(item: ReadinessFindingItem, index: number, completed: boolean) {
    const associatedActivities = getAssociatedActivities(
      item as ReadinessFindingItem & { affectedDays?: number[] },
    );
    const tripScope = item.tripScope;
    const withExtras = item as ReadinessFindingItem & { missingEvidenceTypes?: string[] };
    const showMissingEvidenceBadges =
      !tripScope &&
      !isCoverageGapFindingId(item.id) &&
      !!withExtras.missingEvidenceTypes?.length;
    const weakenEvidence = !!(tripScope || isCoverageGapFindingId(item.id));
    const mustSplit = level === 'must' ? splitMustTripInvolvesMessage(item.message) : null;
    const involvesPreview =
      mustSplit?.involves != null
        ? truncateTripInvolvesList(
            isZh && trip?.TripDay?.length
              ? buildTripInvolvesLines(trip, isZh).join('；') || mustSplit.involves
              : mustSplit.involves,
            3,
            isZh,
          )
        : null;
    const canJumpSchedule = !!(
      tripScope?.day &&
      planStudio &&
      trip?.TripDay?.length &&
      (level === 'must' || level === 'blocker')
    );
    const checkKey = itemCheckKey(item, index, level);
    const lead = (mustSplit?.lead?.trim() || item.message || '').trim();
    const rawTasks = Array.isArray(item.tasks) ? item.tasks : [];
    const visibleTasksRaw = dedupeChecklistTasks(lead, rawTasks, isZh);
    const hasActionableTasks = visibleTasksRaw.length > 0;
    /** 可勾选且有条目化子任务时：只展示子任务勾选，不重复父级说明 */
    const taskOnlyMode = checkable && hasActionableTasks;
    const showLeadParagraph = !taskOnlyMode;
    /** 已完成项始终展示摘要，避免折叠模式下只剩「必须」badge */
    const showLeadInExpandedBody = showLeadParagraph && (completed || !useCompactCards);
    const visibleTasks = visibleTasksRaw;
    const firstVisibleTaskText = (tasks: typeof rawTasks) => {
      for (const task of tasks) {
        const text = resolveChecklistTaskText(task, isZh);
        if (text) return text;
      }
      return '';
    };
    const summarySource =
      checkable && hasActionableTasks
        ? firstVisibleTaskText(visibleTasks) ||
          firstVisibleTaskText(visibleTasksRaw) ||
          firstVisibleTaskText(rawTasks) ||
          lead
        : lead;
    const summaryLine =
      summarySource.length > 96 ? `${summarySource.slice(0, 96).trim()}…` : summarySource;
    const completedSummaryRaw = taskOnlyMode
      ? firstVisibleTaskText(visibleTasks) ||
        firstVisibleTaskText(visibleTasksRaw) ||
        firstVisibleTaskText(rawTasks) ||
        lead
      : summarySource || lead || item.message?.trim() || '';
    const completedSummary =
      completedSummaryRaw.length > 96
        ? `${completedSummaryRaw.slice(0, 96).trim()}…`
        : completedSummaryRaw;

    const cardBody = (
      <>
        {level === 'must' && hideSectionHeader && !completed ? (
          <div className="flex items-center gap-2 mb-0.5">
            <Badge className="text-[10px] px-1.5 py-0 bg-muted-foreground text-white border-0">
              {isZh ? '必须' : 'Required'}
            </Badge>
            {!taskOnlyMode && titleVariant === 'safety' ? (
              <span className="text-[11px] text-slate-500">{isZh ? '安全准备' : 'Safety prep'}</span>
            ) : null}
          </div>
        ) : null}
        {level === 'blocker' &&
          (() => {
            const constraintConfig = getConstraintTypeConfig(item);
            if (!constraintConfig) return null;
            const ConstraintIcon = constraintConfig.icon;
            return (
              <div className="flex items-center gap-2 mb-2">
                <ConstraintIcon className={cn('h-4 w-4', constraintConfig.iconClassName)} />
                <Badge variant="outline" className="text-[10px] bg-muted text-error border-border">
                  {constraintConfig.badgeLabel}
                </Badge>
              </div>
            );
          })()}
        <div className="flex flex-col gap-2">
          {completed ? (
            <div className="flex items-start gap-2.5">
              {checkable && onToggleChecked ? (
                <Checkbox
                  id={`readiness-check-${checkKey}-done`}
                  checked
                  onCheckedChange={() => onToggleChecked(checkKey)}
                  className="mt-0.5"
                />
              ) : null}
              <p className="text-sm leading-relaxed text-slate-500 line-through flex-1 min-w-0">
                {completedSummary}
              </p>
            </div>
          ) : (
            <>
              {level === 'must' && mustSplit?.involves && !taskOnlyMode ? (
                <>
                  {showLeadInExpandedBody && lead ? (
                    <p className="text-sm leading-relaxed text-foreground">{lead}</p>
                  ) : null}
                  <details className="group rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-2.5 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 list-none [&::-webkit-details-marker]:hidden">
                      <span className="underline-offset-2 group-open:underline">
                        {isZh ? '查看相关行程点' : 'Related itinerary stops'}
                        {involvesPreview?.hasMore
                          ? isZh
                            ? `（${involvesPreview.full.split('；').length} 处）`
                            : ` (${involvesPreview.full.split(';').length})`
                          : ''}
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 pl-0.5">
                      {involvesPreview?.full ?? mustSplit.involves}
                    </p>
                  </details>
                </>
              ) : showLeadInExpandedBody && lead ? (
                <p className="text-sm leading-relaxed text-foreground">{lead}</p>
              ) : null}
            </>
          )}
          {!completed ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {level === 'blocker' && item.id && onViewBlockerSolution ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onViewBlockerSolution(item.id)}
                >
                  {isZh ? '解决方案' : 'Solutions'}
                </Button>
              ) : null}
              {canJumpSchedule ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => jumpFromTripScope(trip as TripDetail, planStudio!, item.tripScope!)}
                >
                  {isZh ? '查看行程' : 'View on schedule'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!completed && showMissingEvidenceBadges && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {withExtras.missingEvidenceTypes!.map((evidenceType: string, idx: number) => {
              const evidenceTypeLabels: Record<string, string> = {
                opening_hours: '开放时间',
                address: '地址信息',
                phone: '联系电话',
                website: '官方网站',
                rating: '评分信息',
                reviews: '评价信息',
                price: '价格信息',
                weather: '天气数据',
                road_closure: '道路封闭信息',
                booking_confirmation: '预订确认',
                permit: '许可证',
                other: '其他',
              };
              const label = evidenceTypeLabels[evidenceType] || evidenceType;
              return (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs bg-muted text-warning border-border"
                >
                  {label}
                </Badge>
              );
            })}
          </div>
        )}

        {!completed && !tripScope && associatedActivities.length > 0 && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {isZh ? '关联活动' : 'Related'}:
            </span>
            <div className="flex flex-wrap gap-1">
              {associatedActivities.map((activity, actIndex) => (
                <Badge
                  key={actIndex}
                  variant="outline"
                  className="text-xs bg-muted text-muted-foreground border-border"
                >
                  {activity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!completed && visibleTasks.length > 0 && (
          <ul
            className={cn(
              'space-y-2',
              level === 'must' && hideSectionHeader && !taskOnlyMode && 'pt-1',
            )}
          >
            {visibleTasks.map((task, taskIndex) => {
                const tk = taskCheckKey(checkKey, taskIndex);
                const taskDone = checkedItemIds?.has(tk) ?? false;
                if (typeof task === 'string') {
                  return (
                    <li
                      key={taskIndex}
                      className="text-sm text-slate-800 flex items-start gap-2.5 rounded-lg bg-slate-50/60 px-2.5 py-2"
                    >
                      {checkable && onToggleChecked ? (
                        <Checkbox
                          id={`readiness-task-${tk}`}
                          checked={taskDone}
                          onCheckedChange={() => onToggleChecked(tk)}
                          className="mt-0.5"
                        />
                      ) : (
                        <span className="text-warning mt-0.5">•</span>
                      )}
                      <span
                        className={cn(
                          'flex-1 leading-snug',
                          taskDone && 'text-slate-500 line-through',
                        )}
                      >
                        {task}
                      </span>
                    </li>
                  );
                }
                const taskObj = task as {
                  title?: string;
                  dueOffsetDays?: number;
                  tags?: string[];
                };
                const taskText = resolveChecklistTaskText(task, isZh) || String(task);
                const deadline =
                  tripStartDate && taskObj.dueOffsetDays !== undefined
                    ? calculateDeadline(taskObj.dueOffsetDays, tripStartDate)
                    : null;
                return (
                  <li
                    key={taskIndex}
                    className="text-sm text-slate-800 flex items-start gap-2.5 rounded-lg bg-slate-50/60 px-2.5 py-2"
                  >
                    {checkable && onToggleChecked ? (
                      <Checkbox
                        id={`readiness-task-${tk}`}
                        checked={taskDone}
                        onCheckedChange={() => onToggleChecked(tk)}
                        className="mt-0.5"
                      />
                    ) : (
                      <span className="text-warning mt-0.5">•</span>
                    )}
                    <span
                      className={cn(
                        'flex-1 leading-snug',
                        taskDone && 'text-slate-500 line-through',
                      )}
                    >
                      {taskText}
                      {deadline && (
                        <span className="block text-slate-500 mt-0.5 text-xs">
                          {isZh ? '建议完成' : 'By'}: {deadline}
                        </span>
                      )}
                      {taskObj.tags && taskObj.tags.length > 0 && !taskOnlyMode ? (
                        <span className="ml-2 inline-flex flex-wrap gap-1">
                          {taskObj.tags.map((tag: string, tagIdx: number) => (
                            <Badge key={tagIdx} variant="outline" className="text-[10px] text-slate-600">
                              {tag === 'gear' ? (isZh ? '装备' : 'gear') : tag}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}

        {!completed &&
          item.evidence &&
          (() => {
            const evidenceValue = item.evidence as
              | ReadinessFindingItem['evidence']
              | string
              | undefined;
            const hasEvidenceContent =
              typeof evidenceValue === 'string'
                ? evidenceValue.trim().length > 0
                : Array.isArray(evidenceValue)
                  ? evidenceValue.length > 0
                  : Boolean(evidenceValue);
            if (!hasEvidenceContent) return null;

            const evidenceBody =
              typeof evidenceValue === 'string' ? (
                <span>{evidenceValue}</span>
              ) : Array.isArray(evidenceValue) ? (
                evidenceValue.map((ev, evIndex) => (
                  <div key={evIndex}>
                    {ev.sourceId}
                    {ev.sectionId && ` > ${ev.sectionId}`}
                    {ev.quote && (
                      <span className="text-muted-foreground/70 italic">: "{ev.quote}"</span>
                    )}
                  </div>
                ))
              ) : (
                String(evidenceValue)
              );
            if (weakenEvidence) {
              return (
                <details className="group mt-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/20 px-2 py-1.5">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground list-none [&::-webkit-details-marker]:hidden">
                    <span className="underline-offset-2 hover:underline">
                      {isZh ? '引用来源（可选展开）' : 'Sources (optional)'}
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground pl-1">{evidenceBody}</div>
                </details>
              );
            }
            return (
              <div className="space-y-1">
                <h5 className="text-xs font-medium text-muted-foreground">{isZh ? '证据' : 'Evidence'}:</h5>
                <div className="text-xs text-muted-foreground">{evidenceBody}</div>
              </div>
            );
          })()}

        {!completed && item.askUser && item.askUser.length > 0 && (
          <details className="group rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2 mt-1">
            <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-800 list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isZh
                    ? `需要确认（${item.askUser.length}）`
                    : `Confirm (${item.askUser.length})`}
                </span>
              </span>
            </summary>
            <div className="mt-2 space-y-2">
              <ul className="space-y-1">
                {item.askUser.map((question, qIndex) => (
                  <li key={qIndex} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-400 mt-0.5">·</span>
                    <span>{formatAskUserQuestion(question as any, isZh)}</span>
                  </li>
                ))}
              </ul>
              {tripId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedDecisionItem(item)}
                >
                  {isZh ? '回答' : 'Answer'}
                </Button>
              ) : null}
            </div>
          </details>
        )}
      </>
    );

    const cardShell = (
      <div
        key={checkKey}
        className={cn(
          'space-y-2 p-4 border rounded-xl shadow-sm',
          completed && 'opacity-80 bg-slate-50/80',
          level === 'blocker'
            ? 'border-l-4 border-border bg-muted/30 border-r border-t border-b border-slate-200'
            : level === 'must'
              ? 'border border-slate-200 bg-white'
              : 'border border-slate-200 bg-white',
        )}
        data-trip-scope={tripScope ? tripScope.kind : undefined}
        data-trip-day={tripScope?.day}
        data-segment-id={tripScope?.segmentId}
        data-coverage-gap-id={tripScope?.gapId ?? tripScope?.id}
      >
        {checkable && onToggleChecked && !taskOnlyMode ? (
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={`readiness-check-${checkKey}`}
              checked={completed}
              onCheckedChange={() => onToggleChecked(checkKey)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">{cardBody}</div>
          </div>
        ) : (
          cardBody
        )}
      </div>
    );

    if (useCompactCards && !completed && !taskOnlyMode) {
      return (
        <details
          key={checkKey}
          className="rounded-lg border border-l-2 border-l-warning border-gray-200 bg-white overflow-hidden group"
          open={index === (pendingItems[0]?.index ?? -1)}
        >
          <summary className="flex items-start gap-2.5 p-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-50/80">
            {checkable && onToggleChecked ? (
              <Checkbox
                id={`readiness-check-summary-${checkKey}`}
                checked={false}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => onToggleChecked(checkKey)}
                className="mt-0.5"
              />
            ) : null}
            <span className="text-sm leading-snug text-slate-800 flex-1">{summaryLine}</span>
          </summary>
          <div className="px-3 pb-3 pt-0 border-t border-slate-100">{cardBody}</div>
        </details>
      );
    }

    return cardShell;
  }

  if (hideSectionHeader) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="space-y-3">
          {pendingItems.map(({ item, index }) => renderFindingCard(item, index, false))}
          {completedItems.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-slate-600 hover:text-slate-900 py-1"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  {isZh ? `已完成 (${completedItems.length})` : `Completed (${completedItems.length})`}
                </span>
                <span>{showCompleted ? (isZh ? '收起' : 'Hide') : isZh ? '展开' : 'Show'}</span>
              </button>
              {showCompleted
                ? completedItems.map(({ item, index }) => renderFindingCard(item, index, true))
                : null}
            </div>
          )}
        </div>
        {tripId && selectedDecisionItem ? (
          <UserDecisionDialog
            open={!!selectedDecisionItem}
            onClose={() => setSelectedDecisionItem(null)}
            tripId={tripId}
            findingItem={selectedDecisionItem}
            onAnswered={(updatedFinding) => {
              if (onFindingUpdated && selectedDecisionItem.id) {
                onFindingUpdated(selectedDecisionItem.id, updatedFinding);
              }
              setSelectedDecisionItem(null);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Card className={cn(
      'border border-slate-200 shadow-sm',
      config.cardBg,
      config.cardBorder,
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          'text-base flex items-center gap-2 flex-wrap',
          level === 'blocker' && 'font-bold'
        )}>
          <Icon className={cn(config.iconSize, config.iconClassName)} />
          {title}
          {level === 'must' ? (
            <Badge className={cn('text-[10px] px-1.5 py-0', config.badgeClassName)}>
              {isZh ? '必须' : 'Required'}
            </Badge>
          ) : (
            <Badge variant="outline" className={cn('text-xs', config.badgeClassName)}>
              {sectionBadgeLabel}
            </Badge>
          )}
          {level === 'must' && titleVariant === 'safety' ? (
            <span className="text-xs font-normal text-slate-500">{sectionBadgeLabel}</span>
          ) : null}
          <span className={cn(
            'text-sm font-normal',
            level === 'blocker' ? 'text-error font-semibold' : 'text-muted-foreground'
          )}>
            {checkable && items.length > 0
              ? isZh
                ? `(${pendingItems.length}/${items.length} 待完成)`
                : `(${pendingItems.length}/${items.length} pending)`
              : `(${items.length})`}
          </span>
          {checkable && completedItems.length > 0 ? (
            <span className="text-xs text-success font-normal">
              {isZh ? `${completedItems.length} 已完成` : `${completedItems.length} done`}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingItems.map(({ item, index }) => {
            return renderFindingCard(item, index, false);
          })}

          {completedItems.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-slate-600 hover:text-slate-900 py-1"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  {isZh ? `已完成 (${completedItems.length})` : `Completed (${completedItems.length})`}
                </span>
                <span>{showCompleted ? (isZh ? '收起' : 'Hide') : isZh ? '展开' : 'Show'}</span>
              </button>
              {showCompleted
                ? completedItems.map(({ item, index }) => renderFindingCard(item, index, true))
                : null}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* 用户决策对话框 */}
      {tripId && selectedDecisionItem && (
        <UserDecisionDialog
          open={!!selectedDecisionItem}
          onClose={() => setSelectedDecisionItem(null)}
          tripId={tripId}
          findingItem={selectedDecisionItem}
          onAnswered={(updatedFinding) => {
            if (onFindingUpdated && selectedDecisionItem.id) {
              onFindingUpdated(selectedDecisionItem.id, updatedFinding);
            }
            setSelectedDecisionItem(null);
          }}
        />
      )}
    </Card>
  );
}
