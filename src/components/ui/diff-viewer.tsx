/**
 * DiffViewer - 版本差异视图组件
 * 
 * TripNARA 核心组件：用于显示计划变更的差异
 * 
 * 设计原则：
 * - 像 Git 的可视化，但对普通用户仍然易懂
 * - 显示：版本号、diff（删/换/挪）、决策理由、用户确认记录
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Minus, 
  ArrowRight, 
  Move, 
  Clock,
  User,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * 变更类型
 */
export type DiffChangeType = 'add' | 'remove' | 'replace' | 'move' | 'modify';

/**
 * 变更项
 */
export interface DiffChange {
  /**
   * 变更 ID
   */
  id: string;
  /**
   * 变更类型
   */
  type: DiffChangeType;
  /**
   * 变更目标（如行程项 ID、日期 ID 等）
   */
  targetId?: string;
  /**
   * 变更目标名称（如地点名称、日期等）
   */
  targetName?: string;
  /**
   * 变更前的内容（用于 replace/move/modify）
   */
  before?: {
    name?: string;
    time?: string;
    date?: string;
    location?: string;
    [key: string]: any;
  };
  /**
   * 变更后的内容（用于 add/replace/move/modify）
   */
  after?: {
    name?: string;
    time?: string;
    date?: string;
    location?: string;
    [key: string]: any;
  };
  /**
   * 决策理由
   */
  reason?: string;
  /**
   * 变更时间
   */
  timestamp?: string;
  /**
   * 执行人（用户或系统）
   */
  author?: string;
  /**
   * 是否已确认
   */
  confirmed?: boolean;
  /**
   * 确认时间
   */
  confirmedAt?: string;
}

/**
 * 版本信息
 */
export interface VersionInfo {
  /**
   * 版本号
   */
  version: string | number;
  /**
   * 版本描述
   */
  description?: string;
  /**
   * 创建时间
   */
  createdAt: string;
  /**
   * 创建人
   */
  author?: string;
  /**
   * 决策理由（整体）
   */
  reason?: string;
}

export interface DiffViewerProps {
  /**
   * 当前版本信息
   */
  currentVersion: VersionInfo;
  /**
   * 上一个版本信息（可选，用于对比）
   */
  previousVersion?: VersionInfo;
  /**
   * 变更列表
   */
  changes: DiffChange[];
  /**
   * 是否紧凑模式
   */
  compact?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 是否显示确认状态
   */
  showConfirmation?: boolean;
}

/**
 * 获取变更类型配置
 */
function getChangeTypeConfig(type: DiffChangeType) {
  switch (type) {
    case 'add':
      return {
        icon: Plus,
        label: '添加',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        iconBg: 'bg-green-100',
      };
    case 'remove':
      return {
        icon: Minus,
        label: '删除',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
      };
    case 'replace':
      return {
        icon: ArrowRight,
        label: '替换',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
      };
    case 'move':
      return {
        icon: Move,
        label: '移动',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
      };
    case 'modify':
      return {
        icon: FileText,
        label: '修改',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
      };
    default:
      return {
        icon: FileText,
        label: type,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        iconBg: 'bg-gray-100',
      };
  }
}

/**
 * DiffViewer 组件
 * 
 * 用于显示计划变更的差异，像 Git 的可视化但对普通用户易懂
 */
export function DiffViewer({
  currentVersion,
  previousVersion,
  changes,
  compact = false,
  className,
  showConfirmation = true,
}: DiffViewerProps) {
  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className={cn('text-lg', compact && 'text-base')}>
              版本变更
            </CardTitle>
            <Badge variant="outline" className="font-mono">
              v{currentVersion.version}
            </Badge>
          </div>
          {currentVersion.description && (
            <CardDescription className={cn('text-sm', compact && 'text-xs')}>
              {currentVersion.description}
            </CardDescription>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(currentVersion.createdAt), 'yyyy/MM/dd HH:mm')}</span>
            </div>
            {currentVersion.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{currentVersion.author}</span>
              </div>
            )}
          </div>
          {previousVersion && (
            <div className="text-xs text-muted-foreground">
              对比版本: v{previousVersion.version} → v{currentVersion.version}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4', compact && 'space-y-3')}>
        {/* 整体决策理由 */}
        {currentVersion.reason && (
          <div className="bg-muted/30 rounded-md p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">决策理由</p>
            <p className={cn('text-sm text-foreground', compact && 'text-xs')}>
              {currentVersion.reason}
            </p>
          </div>
        )}

        <Separator />

        {/* 变更列表 */}
        <div className="space-y-2">
          <p className={cn('text-sm font-semibold', compact && 'text-xs')}>
            变更内容 ({changes.length} 项)
          </p>
          <div className="space-y-2">
            {changes.map((change) => {
              const config = getChangeTypeConfig(change.type);
              const ChangeIcon = config.icon;

              return (
                <div
                  key={change.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border transition-colors',
                    config.bg,
                    config.border
                  )}
                >
                  {/* 变更类型图标 */}
                  <div className={cn('p-1.5 rounded', config.iconBg)}>
                    <ChangeIcon className={cn('w-4 h-4', config.color)} />
                  </div>

                  {/* 变更内容 */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', config.color, config.border)}>
                        {config.label}
                      </Badge>
                      {change.targetName && (
                        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                          {change.targetName}
                        </span>
                      )}
                    </div>

                    {/* 变更详情 */}
                    {change.type === 'replace' && change.before && change.after && (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-600" />
                          <span className="text-muted-foreground line-through">
                            {change.before.name || change.before.time || '原内容'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Plus className="w-3 h-3 text-green-600" />
                          <span className="text-foreground font-medium">
                            {change.after.name || change.after.time || '新内容'}
                          </span>
                        </div>
                      </div>
                    )}

                    {change.type === 'move' && change.before && change.after && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {change.before.date || change.before.time || '原位置'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground font-medium">
                          {change.after.date || change.after.time || '新位置'}
                        </span>
                      </div>
                    )}

                    {change.type === 'modify' && change.before && change.after && (
                      <div className="space-y-1 text-xs">
                        {Object.entries(change.after).map(([key, value]) => {
                          const oldValue = change.before?.[key];
                          if (oldValue === value) return null;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-muted-foreground capitalize">{key}:</span>
                              {oldValue && (
                                <>
                                  <span className="text-muted-foreground line-through">{String(oldValue)}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              )}
                              <span className="text-foreground font-medium">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 决策理由 */}
                    {change.reason && (
                      <p className={cn('text-xs text-muted-foreground italic', compact && 'text-[11px]')}>
                        理由: {change.reason}
                      </p>
                    )}

                    {/* 确认状态 */}
                    {showConfirmation && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {change.confirmed ? (
                          <>
                            <span className="text-green-600">✓ 已确认</span>
                            {change.confirmedAt && (
                              <span>
                                {format(new Date(change.confirmedAt), 'MM/dd HH:mm')}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>待确认</span>
                        )}
                        {change.author && (
                          <>
                            <span>•</span>
                            <span>{change.author}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
