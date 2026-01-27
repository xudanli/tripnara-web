/**
 * 能力包三人格洞察组件
 * 
 * 将能力包评估结果转换为三人格视角的洞察：
 * - Abu（安全守护）：评估 blocker/must 规则，生成安全警告
 * - Dr.Dre（节奏设计）：评估对行程节奏的影响
 * - Neptune（结构修复）：提供替代方案和优化建议
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Route,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { 
  CapabilityPackEvaluateResultItem,
  CapabilityPackRule,
  CapabilityPackHazard,
  CapabilityPack,
} from '@/api/readiness';

interface CapabilityPackPersonaInsightsProps {
  evaluatedPacks: CapabilityPackEvaluateResultItem[];
  capabilityPacks: CapabilityPack[];
  className?: string;
}

// 将能力包结果转换为三人格洞察
function convertToPersonaInsights(
  evaluatedPacks: CapabilityPackEvaluateResultItem[],
  capabilityPacks: CapabilityPack[]
) {
  const triggeredPacks = evaluatedPacks.filter(p => p.triggered);
  
  // Abu 的洞察：安全相关的 blocker/must 规则和高危 hazards
  const abuInsights: {
    rules: Array<CapabilityPackRule & { packType: string; packName: string; triggerReason?: string }>;
    hazards: Array<CapabilityPackHazard & { packType: string; packName: string }>;
    verdict: 'PASS' | 'WARN' | 'BLOCK';
  } = {
    rules: [],
    hazards: [],
    verdict: 'PASS',
  };

  // Dr.Dre 的洞察：节奏相关的 should 规则
  const dreInsights: {
    rules: Array<CapabilityPackRule & { packType: string; packName: string; triggerReason?: string }>;
    adjustments: Array<{ message: string; impact: string }>;
    verdict: 'PASS' | 'WARN' | 'BLOCK';
  } = {
    rules: [],
    adjustments: [],
    verdict: 'PASS',
  };

  // Neptune 的洞察：替代方案和 optional 规则
  const neptuneInsights: {
    rules: Array<CapabilityPackRule & { packType: string; packName: string; triggerReason?: string }>;
    alternatives: Array<{ message: string; type: string }>;
    verdict: 'PASS' | 'WARN' | 'BLOCK';
  } = {
    rules: [],
    alternatives: [],
    verdict: 'PASS',
  };

  triggeredPacks.forEach(pack => {
    const packInfo = capabilityPacks.find(p => p.type === pack.packType);
    const packName = packInfo?.displayName || pack.packType;
    const triggerReason = pack.triggerReason;

    // 分类规则
    pack.rules?.filter(r => r.triggered).forEach(rule => {
      const enrichedRule = { ...rule, packType: pack.packType, packName, triggerReason };
      
      if (rule.level === 'blocker' || rule.level === 'must') {
        abuInsights.rules.push(enrichedRule);
        if (rule.level === 'blocker') {
          abuInsights.verdict = 'BLOCK';
        } else if (abuInsights.verdict !== 'BLOCK') {
          abuInsights.verdict = 'WARN';
        }
      } else if (rule.level === 'should') {
        dreInsights.rules.push(enrichedRule);
        if (dreInsights.verdict === 'PASS') {
          dreInsights.verdict = 'WARN';
        }
      } else if (rule.level === 'optional') {
        neptuneInsights.rules.push(enrichedRule);
      }
    });

    // 分类 hazards
    pack.hazards?.forEach(hazard => {
      const enrichedHazard = { ...hazard, packType: pack.packType, packName };
      
      if (hazard.severity === 'high') {
        abuInsights.hazards.push(enrichedHazard);
        if (abuInsights.verdict !== 'BLOCK') {
          abuInsights.verdict = 'WARN';
        }
      } else if (hazard.severity === 'medium') {
        dreInsights.adjustments.push({
          message: hazard.summary,
          impact: `${hazard.type} - 需要调整行程节奏`,
        });
        if (dreInsights.verdict === 'PASS') {
          dreInsights.verdict = 'WARN';
        }
      } else {
        neptuneInsights.alternatives.push({
          message: hazard.summary,
          type: hazard.type,
        });
      }
    });
  });

  return { abuInsights, dreInsights, neptuneInsights };
}

export default function CapabilityPackPersonaInsights({
  evaluatedPacks,
  capabilityPacks,
  className,
}: CapabilityPackPersonaInsightsProps) {
  const { t } = useTranslation();
  
  const triggeredPacks = evaluatedPacks.filter(p => p.triggered);
  
  if (triggeredPacks.length === 0) {
    return null;
  }

  const { abuInsights, dreInsights, neptuneInsights } = convertToPersonaInsights(
    evaluatedPacks,
    capabilityPacks
  );

  const hasAbuContent = abuInsights.rules.length > 0 || abuInsights.hazards.length > 0;
  const hasDreContent = dreInsights.rules.length > 0 || dreInsights.adjustments.length > 0;
  const hasNeptuneContent = neptuneInsights.rules.length > 0 || neptuneInsights.alternatives.length > 0;

  if (!hasAbuContent && !hasDreContent && !hasNeptuneContent) {
    return null;
  }

  const getVerdictBadge = (verdict: 'PASS' | 'WARN' | 'BLOCK') => {
    switch (verdict) {
      case 'BLOCK':
        return <Badge variant="destructive" className="text-xs">需要处理</Badge>;
      case 'WARN':
        return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">需要注意</Badge>;
      case 'PASS':
        return <Badge variant="outline" className="text-xs border-green-500 text-green-700">通过</Badge>;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        {t('dashboard.readiness.page.personaAnalysis', { defaultValue: '三人格分析' })}
        <Badge variant="secondary" className="text-xs">
          {t('dashboard.readiness.page.basedOnCapabilityPacks', { defaultValue: '基于能力包' })}
        </Badge>
      </h4>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Abu 卡片 */}
        <Card className={cn(
          'border-2',
          abuInsights.verdict === 'BLOCK' ? 'border-red-300 bg-red-50/30' :
          abuInsights.verdict === 'WARN' ? 'border-yellow-300 bg-yellow-50/30' :
          'border-gray-200'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-sm font-semibold">Abu</CardTitle>
              </div>
              {hasAbuContent && getVerdictBadge(abuInsights.verdict)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.readiness.page.abuRole', { defaultValue: '安全与边界守护' })}
            </p>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {hasAbuContent ? (
              <>
                {abuInsights.rules.length > 0 && (
                  <div className="space-y-1">
                    {abuInsights.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className={cn(
                          'w-3 h-3 mt-0.5 shrink-0',
                          rule.level === 'blocker' ? 'text-red-600' : 'text-orange-600'
                        )} />
                        <div>
                          <span className="font-medium">{rule.message}</span>
                          <span className="text-muted-foreground ml-1">({rule.packName})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {abuInsights.hazards.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('dashboard.readiness.page.highRiskWarnings', { defaultValue: '高危风险' })}
                    </p>
                    {abuInsights.hazards.map((hazard, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 mt-0.5 text-red-600 shrink-0" />
                        <span>{hazard.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t('dashboard.readiness.page.noSafetyIssues', { defaultValue: '无安全问题' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dr.Dre 卡片 */}
        <Card className={cn(
          'border-2',
          dreInsights.verdict === 'WARN' ? 'border-yellow-300 bg-yellow-50/30' :
          'border-gray-200'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-sm font-semibold">Dr.Dre</CardTitle>
              </div>
              {hasDreContent && getVerdictBadge(dreInsights.verdict)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.readiness.page.dreRole', { defaultValue: '节奏与能量设计' })}
            </p>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {hasDreContent ? (
              <>
                {dreInsights.rules.length > 0 && (
                  <div className="space-y-1">
                    {dreInsights.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Clock className="w-3 h-3 mt-0.5 text-purple-600 shrink-0" />
                        <div>
                          <span className="font-medium">{rule.message}</span>
                          <span className="text-muted-foreground ml-1">({rule.packName})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dreInsights.adjustments.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('dashboard.readiness.page.rhythmAdjustments', { defaultValue: '节奏调整' })}
                    </p>
                    {dreInsights.adjustments.map((adj, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-purple-600 shrink-0" />
                        <span>{adj.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t('dashboard.readiness.page.noRhythmIssues', { defaultValue: '节奏正常' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Neptune 卡片 */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-sm font-semibold">Neptune</CardTitle>
              </div>
              {hasNeptuneContent && (
                <Badge variant="outline" className="text-xs border-teal-500 text-teal-700">
                  {t('dashboard.readiness.page.hasSuggestions', { defaultValue: '有建议' })}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.readiness.page.neptuneRole', { defaultValue: '空间结构修复' })}
            </p>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {hasNeptuneContent ? (
              <>
                {neptuneInsights.rules.length > 0 && (
                  <div className="space-y-1">
                    {neptuneInsights.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Route className="w-3 h-3 mt-0.5 text-teal-600 shrink-0" />
                        <div>
                          <span className="font-medium">{rule.message}</span>
                          <span className="text-muted-foreground ml-1">({rule.packName})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {neptuneInsights.alternatives.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('dashboard.readiness.page.alternatives', { defaultValue: '替代方案' })}
                    </p>
                    {neptuneInsights.alternatives.map((alt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-teal-600 shrink-0" />
                        <span>{alt.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t('dashboard.readiness.page.noAlternatives', { defaultValue: '无替代建议' })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
