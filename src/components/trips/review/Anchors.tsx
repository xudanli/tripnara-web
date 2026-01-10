import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  Activity,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  Trash2,
  Power,
  Globe,
  MapPin,
  Route,
} from 'lucide-react';
import type { AnchorRule, AnchorType } from '@/types/trip-review';
import { cn } from '@/lib/utils';

interface AnchorsProps {
  anchorsSuggested: AnchorRule[];
  anchorsSaved?: AnchorRule[];
  onSave?: (anchor: AnchorRule) => Promise<void>;
  onUpdate?: (anchorId: string, updates: Partial<AnchorRule>) => Promise<void>;
  onDelete?: (anchorId: string) => Promise<void>;
  onDisable?: (anchorId: string) => Promise<void>;
}

export default function Anchors({
  anchorsSuggested,
  anchorsSaved = [],
  onSave,
  onUpdate,
  onDelete,
  onDisable,
}: AnchorsProps) {
  const anchorTypeConfig: Record<AnchorType, { label: string; icon: any; color: string }> = {
    preference: { label: '偏好锚点', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    risk_policy: { label: '风险策略', icon: Shield, color: 'text-red-600 bg-red-50' },
    route_pattern: { label: '路线模式', icon: Route, color: 'text-purple-600 bg-purple-50' },
    pacing: { label: '节奏规则', icon: Activity, color: 'text-orange-600 bg-orange-50' },
  };

  // 按类型分组建议的锚点
  const suggestedByType = anchorsSuggested.reduce(
    (acc, anchor) => {
      if (!acc[anchor.type]) {
        acc[anchor.type] = [];
      }
      acc[anchor.type].push(anchor);
      return acc;
    },
    {} as Record<AnchorType, AnchorRule[]>
  );

  // 按类型分组已保存的锚点
  const savedByType = anchorsSaved.reduce(
    (acc, anchor) => {
      if (!acc[anchor.type]) {
        acc[anchor.type] = [];
      }
      acc[anchor.type].push(anchor);
      return acc;
    },
    {} as Record<AnchorType, AnchorRule[]>
  );

  const types: AnchorType[] = ['preference', 'risk_policy', 'pacing', 'route_pattern'];

  return (
    <div className="space-y-6">
      {/* 建议的锚点 */}
      {anchorsSuggested.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">建议的锚点规则</h3>
          <div className="space-y-4">
            {types.map((type) => {
              const anchors = suggestedByType[type] || [];
              if (anchors.length === 0) return null;
              const config = anchorTypeConfig[type];
              return (
                <AnchorSection
                  key={type}
                  type={type}
                  config={config}
                  anchors={anchors}
                  onSave={onSave}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onDisable={onDisable}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 已保存的锚点 */}
      {anchorsSaved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">已保存的锚点规则</h3>
          <div className="space-y-4">
            {types.map((type) => {
              const anchors = savedByType[type] || [];
              if (anchors.length === 0) return null;
              const config = anchorTypeConfig[type];
              return (
                <AnchorSection
                  key={type}
                  type={type}
                  config={config}
                  anchors={anchors}
                  onSave={onSave}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onDisable={onDisable}
                  isSaved
                />
              );
            })}
          </div>
        </div>
      )}

      {anchorsSuggested.length === 0 && anchorsSaved.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            暂无锚点规则
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AnchorSectionProps {
  type: AnchorType;
  config: { label: string; icon: any; color: string };
  anchors: AnchorRule[];
  isSaved?: boolean;
  onSave?: (anchor: AnchorRule) => Promise<void>;
  onUpdate?: (anchorId: string, updates: Partial<AnchorRule>) => Promise<void>;
  onDelete?: (anchorId: string) => Promise<void>;
  onDisable?: (anchorId: string) => Promise<void>;
}

function AnchorSection({
  type: _type,
  config,
  anchors,
  isSaved = false,
  onSave,
  onUpdate,
  onDelete,
  onDisable,
}: AnchorSectionProps) {
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', config.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <CardTitle className="text-base">{config.label}</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {anchors.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {anchors.map((anchor) => (
          <AnchorCard
            key={anchor.anchorId}
            anchor={anchor}
            isSaved={isSaved}
            onSave={onSave}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onDisable={onDisable}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface AnchorCardProps {
  anchor: AnchorRule;
  isSaved?: boolean;
  onSave?: (anchor: AnchorRule) => Promise<void>;
  onUpdate?: (anchorId: string, updates: Partial<AnchorRule>) => Promise<void>;
  onDelete?: (anchorId: string) => Promise<void>;
  onDisable?: (anchorId: string) => Promise<void>;
}

function AnchorCard({
  anchor,
  isSaved = false,
  onSave,
  onUpdate,
  onDelete,
  onDisable,
}: AnchorCardProps) {
  const [editing, setEditing] = useState(false);
  const [ruleText, setRuleText] = useState(anchor.ruleText);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scopeLabels = {
    global: '全局',
    country: '国家',
    trip_type: '行程类型',
  };

  const scopeIcons = {
    global: Globe,
    country: MapPin,
    trip_type: Route,
  };

  const ScopeIcon = scopeIcons[anchor.scope];

  const handleSave = async () => {
    if (isSaved) {
      // 更新已保存的锚点
      if (onUpdate) {
        setSubmitting(true);
        try {
          await onUpdate(anchor.anchorId, { ruleText });
          setEditing(false);
        } catch (err) {
          console.error('Failed to update anchor:', err);
        } finally {
          setSubmitting(false);
        }
      }
    } else {
      // 保存建议的锚点
      if (onSave) {
        setSubmitting(true);
        try {
          await onSave(anchor);
          setEditing(false);
        } catch (err) {
          console.error('Failed to save anchor:', err);
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  const handleDisable = async () => {
    if (onDisable) {
      setSubmitting(true);
      try {
        await onDisable(anchor.anchorId);
      } catch (err) {
        console.error('Failed to disable anchor:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('确定要删除此锚点规则吗？')) {
      setSubmitting(true);
      try {
        await onDelete(anchor.anchorId);
      } catch (err) {
        console.error('Failed to delete anchor:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* 规则文本 */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            className="min-h-[60px]"
            placeholder="输入规则描述..."
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setRuleText(anchor.ruleText);
              }}
            >
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <p className="text-sm flex-1">{anchor.ruleText}</p>
          <div className="flex items-center gap-2 ml-4">
            {!isSaved && onSave && (
              <Button size="sm" variant="outline" onClick={handleSave} disabled={submitting}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                保存到我的规则
              </Button>
            )}
            {isSaved && onUpdate && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 元信息 */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <ScopeIcon className="w-3 h-3" />
          <span>{scopeLabels[anchor.scope]}</span>
        </div>
        <div>
          强度: {anchor.strength}/5
        </div>
        <div>
          来自 {anchor.evidenceTripIds.length} 次行程
        </div>
      </div>

      {/* 高级参数（可折叠） */}
      {Object.keys(anchor.parameters || {}).length > 0 && (
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs">高级参数</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="bg-gray-50 rounded p-3 space-y-2 text-xs">
              {Object.entries(anchor.parameters || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 操作按钮（已保存的锚点） */}
      {isSaved && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {anchor.status === 'saved' && onDisable && (
            <Button size="sm" variant="ghost" onClick={handleDisable} disabled={submitting}>
              <Power className="w-4 h-4 mr-1" />
              禁用
            </Button>
          )}
          {anchor.status === 'disabled' && onUpdate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate(anchor.anchorId, { status: 'saved' })}
              disabled={submitting}
            >
              <Power className="w-4 h-4 mr-1" />
              启用
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={submitting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

