import { useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Scale, Shield, Star, MessageSquare } from 'lucide-react'; // 🎯 添加更多图标用于区分 constraintType
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next'; // 🆕 添加 i18n 支持
import type { ReadinessFindingItem } from '@/api/readiness';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { jumpFromTripScope } from '@/lib/plan-studio-readiness-jump';
import { isCoverageGapFindingId } from '@/lib/readiness-coverage-gap';
import { splitMustTripInvolvesMessage } from '@/lib/readiness-message-split';
import UserDecisionDialog from './UserDecisionDialog';

interface ChecklistSectionProps {
  title: string;
  items: ReadinessFindingItem[];
  level: 'blocker' | 'must' | 'should' | 'optional'; // 🎨 新增 blocker 级别，用于区分阻塞项
  className?: string;
  tripStartDate?: string | Date; // 用于计算任务截止日期
  trip?: { TripDay?: Array<{ date: string; ItineraryItem?: Array<{ id: string; Place?: { name?: string } | null }> }> } | null; // 行程数据，用于关联活动
  tripId?: string; // 🆕 行程ID，用于用户决策对话框
  onFindingUpdated?: (findingId: string, updatedFinding: any) => void; // 🆕 当用户回答问题后更新finding的回调
  /** GET .../blockers/:blockerId/solutions 须传列表项 item.id（含 coverage-gap:*），勿用本地占位 id */
  onViewBlockerSolution?: (blockerId: string) => void;
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
  className,
  tripStartDate,
  trip,
  tripId,
  onFindingUpdated,
  onViewBlockerSolution,
}: ChecklistSectionProps) {
  const { t, i18n } = useTranslation(); // 🆕 添加 i18n hook
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh');
  const planStudio = useContext(PlanStudioContext);
  const [selectedDecisionItem, setSelectedDecisionItem] = useState<ReadinessFindingItem | null>(null);
  
  if (!items || items.length === 0) {
    return null;
  }

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
              .map(itineraryItem => itineraryItem.Place?.name)
              .filter((name): name is string => Boolean(name))
              .slice(0, 3); // 最多显示3个地点
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
          iconClassName: 'text-red-700',
          badgeLabel: t('dashboard.readiness.page.constraintType.legal_blocker', { defaultValue: '法律要求' }),
        };
      } else if (item.constraintType === 'safety_blocker') {
        return {
          icon: Shield, // 安全图标
          iconClassName: 'text-red-600',
          badgeLabel: t('dashboard.readiness.page.constraintType.safety_blocker', { defaultValue: '安全要求' }),
        };
      }
      // 默认使用 AlertCircle
      return {
        icon: AlertCircle,
        iconClassName: 'text-red-600',
        badgeLabel: t('dashboard.readiness.page.constraintType.blocker', { defaultValue: '阻塞项' }),
      };
    }
    
    // 如果是 must 级别，根据 constraintType 选择图标
    if (level === 'must') {
      if (item.constraintType === 'strong_recommendation') {
        return {
          icon: Star, // 推荐图标
          iconClassName: 'text-amber-700',
          badgeLabel: t('dashboard.readiness.page.constraintType.strong_recommendation', { defaultValue: '强烈建议' }),
        };
      }
      // 默认使用 AlertTriangle
      return {
        icon: AlertTriangle,
        iconClassName: 'text-amber-600',
        badgeLabel: t('dashboard.readiness.page.constraintType.must', { defaultValue: '必须项' }),
      };
    }
    
    return null;
  };

  const levelConfig = {
    blocker: {
      icon: AlertCircle, // 默认图标，会被 getConstraintTypeConfig 覆盖
      iconClassName: 'text-red-600',
      iconSize: 'h-6 w-6', // 🎯 阻塞项：更大的图标
      badgeClassName: 'bg-red-50 text-red-700 border-red-300 border-2', // 🎯 阻塞项：更粗的边框
      badgeLabel: '阻塞项',
      cardBorder: 'border-l-4 border-red-600', // 🎯 阻塞项：左侧红色粗边框
      cardBg: 'bg-red-50/50', // 🎯 阻塞项：更明显的背景
    },
    must: {
      icon: AlertTriangle, // 默认图标，会被 getConstraintTypeConfig 覆盖
      iconClassName: 'text-amber-600',
      iconSize: 'h-5 w-5', // 🎯 必须项：标准图标大小
      badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200', // 🎯 必须项：标准边框
      badgeLabel: '必须项',
      cardBorder: 'border-l-2 border-amber-300', // 🎯 必须项：左侧 amber 细边框
      cardBg: 'bg-white', // 🎯 必须项：白色背景
    },
    should: {
      icon: CheckCircle2,
      iconClassName: 'text-amber-600',
      iconSize: 'h-5 w-5',
      badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeLabel: 'Should',
      cardBorder: '',
      cardBg: 'bg-white',
    },
    optional: {
      icon: Info,
      iconClassName: 'text-blue-600',
      iconSize: 'h-5 w-5',
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeLabel: 'Optional',
      cardBorder: '',
      cardBg: 'bg-white',
    },
  };

  const config = levelConfig[level];
  // 🆕 默认图标，但会在每个 item 中根据 constraintType 动态选择
  const Icon = config.icon;

  // 🎨 统一卡片样式：抽屉中的卡片无阴影，保持轻量
  // 🎯 阻塞项 vs 必须项：通过左侧边框和背景来区分
  return (
    <Card className={cn(
      'border border-gray-200',
      config.cardBg, // 🎯 使用不同背景
      config.cardBorder, // 🎯 使用左侧边框区分
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          'text-base flex items-center gap-2',
          level === 'blocker' && 'font-bold' // 🎯 阻塞项：加粗标题
        )}>
          <Icon className={cn(config.iconSize, config.iconClassName)} />
          {title}
          <Badge variant="outline" className={cn('text-xs', config.badgeClassName)}>
            {config.badgeLabel}
          </Badge>
          <span className={cn(
            'text-sm font-normal',
            level === 'blocker' ? 'text-red-700 font-semibold' : 'text-muted-foreground' // 🎯 阻塞项：红色数字
          )}>
            ({items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const associatedActivities = getAssociatedActivities(item as ReadinessFindingItem & { affectedDays?: number[] });
            const tripScope = item.tripScope;
            const withExtras = item as ReadinessFindingItem & { missingEvidenceTypes?: string[] };
            const showMissingEvidenceBadges =
              !tripScope &&
              !isCoverageGapFindingId(item.id) &&
              !!withExtras.missingEvidenceTypes?.length;
            const weakenEvidence = !!(tripScope || isCoverageGapFindingId(item.id));
            const mustSplit =
              level === 'must' ? splitMustTripInvolvesMessage(item.message) : null;
            const canJumpSchedule =
              !!(tripScope?.day && planStudio && trip?.TripDay?.length && (level === 'must' || level === 'blocker'));
            return (
              /* 🎨 统一卡片样式：只有边框，无阴影（符合抽屉轻量原则） */
              /* 🎯 阻塞项 vs 必须项：通过左侧边框和背景来区分 */
              <div
                key={index}
                className={cn(
                'space-y-2 p-3 border rounded-lg',
                level === 'blocker' 
                  ? 'border-l-4 border-red-600 bg-red-50/30 border-r border-t border-b border-gray-200' // 🎯 阻塞项：左侧红色粗边框 + 浅红背景
                  : level === 'must'
                  ? 'border-l-2 border-amber-300 bg-white border-r border-t border-b border-gray-200' // 🎯 必须项：左侧 amber 细边框 + 白色背景
                  : 'border border-gray-200 bg-white' // 🎯 其他：标准样式
              )}
                data-trip-scope={tripScope ? tripScope.kind : undefined}
                data-trip-day={tripScope?.day}
                data-segment-id={tripScope?.segmentId}
                data-coverage-gap-id={tripScope?.gapId ?? tripScope?.id}
              >
                {/* 🆕 根据 constraintType 显示不同的图标和标签 */}
                {(() => {
                  const constraintConfig = getConstraintTypeConfig(item);
                  if (constraintConfig && (level === 'blocker' || level === 'must')) {
                    const ConstraintIcon = constraintConfig.icon;
                    return (
                      <div className="flex items-center gap-2 mb-2">
                        <ConstraintIcon className={cn('h-4 w-4', constraintConfig.iconClassName)} />
                        <Badge variant="outline" className={cn('text-[10px]', level === 'blocker' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                          {constraintConfig.badgeLabel}
                        </Badge>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex flex-col gap-2">
                  {level === 'must' && mustSplit?.involves ? (
                    <>
                      <p className="text-sm">{mustSplit.lead}</p>
                      <p className="text-xs text-muted-foreground border-l-2 border-muted-foreground/25 pl-2 py-0.5">
                        <span className="font-medium text-muted-foreground/90">
                          {isZh ? '行程涉及' : 'Trip context'}
                        </span>
                        ：{mustSplit.involves}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">{mustSplit?.lead ?? item.message}</p>
                  )}
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
                        onClick={() => jumpFromTripScope(trip!, planStudio!, item.tripScope!)}
                      >
                        {isZh ? '查看行程' : 'View on schedule'}
                      </Button>
                    ) : null}
                  </div>
                </div>
                
                {/* 有 tripScope 时主文案已由后端带上下文，不再堆 missing 类型 Badge，避免重复 */}
                {showMissingEvidenceBadges && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {withExtras.missingEvidenceTypes!.map((evidenceType: string, idx: number) => {
                      // 证据类型中文映射
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
                          className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                        >
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* 关联的活动信息（tripScope 已有天时可选省略；仍保留 affectedDays 兜底） */}
                {!tripScope && associatedActivities.length > 0 && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-muted-foreground flex-shrink-0">关联活动:</span>
                    <div className="flex flex-wrap gap-1">
                      {/* 🎨 统一标签样式：信息性内容（日期、活动）使用蓝色 */}
                      {associatedActivities.map((activity, actIndex) => (
                        <Badge key={actIndex} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks */}
                {item.tasks && item.tasks.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">任务:</h5>
                    <ul className="space-y-1">
                      {/* 根据后端文档，tasks 是字符串数组 */}
                      {(Array.isArray(item.tasks) ? item.tasks : []).map((task, taskIndex) => {
                        // 兼容处理：如果是字符串，直接显示；如果是对象，显示 title 和 deadline
                        if (typeof task === 'string') {
                          return (
                            <li key={taskIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-muted-foreground/50 mt-1">•</span>
                              <span className="flex-1">{task}</span>
                            </li>
                          );
                        } else {
                          // 兼容旧格式（对象）
                          const taskObj = task as any;
                          const taskText = taskObj.title || String(task);
                          const deadline = tripStartDate && taskObj.dueOffsetDays !== undefined 
                            ? calculateDeadline(taskObj.dueOffsetDays, tripStartDate)
                            : null;
                          return (
                            <li key={taskIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-muted-foreground/50 mt-1">•</span>
                              <span className="flex-1">
                                {taskText}
                                {deadline && (
                                  <span className="text-muted-foreground/70 ml-2">
                                    (截止: {deadline})
                                  </span>
                                )}
                                {taskObj.tags && taskObj.tags.length > 0 && (
                                  <span className="ml-2">
                                    {taskObj.tags.map((tag: string, tagIdx: number) => (
                                      <Badge key={tagIdx} variant="outline" className="text-xs mr-1">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        }
                      })}
                    </ul>
                  </div>
                )}
                
                {/* Evidence：与 coverage-gap 对齐且有 tripScope 时主文案已够用，引用折叠以免与 message 重复 */}
                {item.evidence &&
                  (() => {
                    const evidenceBody =
                      typeof item.evidence === 'string' ? (
                        <span>{item.evidence}</span>
                      ) : Array.isArray(item.evidence) ? (
                        (item.evidence as unknown as Array<{ sourceId?: string; sectionId?: string; quote?: string }>).map(
                          (ev, evIndex: number) => (
                            <div key={evIndex}>
                              {ev.sourceId}
                              {ev.sectionId && ` > ${ev.sectionId}`}
                              {ev.quote && (
                                <span className="text-muted-foreground/70 italic">: "{ev.quote}"</span>
                              )}
                            </div>
                          )
                        )
                      ) : (
                        String(item.evidence)
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
                
                {/* Ask User - 需要询问用户的问题 */}
                {item.askUser && item.askUser.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isZh ? '需要确认' : 'Requires Confirmation'}:</span>
                      </h5>
                      {tripId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedDecisionItem(item)}
                        >
                          {isZh ? '回答' : 'Answer'}
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {item.askUser.map((question, qIndex) => (
                        <li key={qIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-muted-foreground/50 mt-1">?</span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      
      {/* 🆕 用户决策对话框 */}
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
