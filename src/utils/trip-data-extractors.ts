/**
 * 行程数据提取和计算工具函数
 * 用于从决策日志、人格提醒等数据中提取和计算视图所需的数据
 */

import type {
  DecisionLogEntry,
  PersonaAlert,
  TripDetail,
  TripMetricsResponse,
} from '@/types/trip';
import type { Suggestion, SuggestionStats } from '@/types/suggestion';

// ==================== 类型定义 ====================

/**
 * Abu 视图数据
 */
export interface AbuViewData {
  gatingStatus: 'BLOCKED' | 'WARN' | 'PASSED' | 'UNKNOWN';
  violations: Array<{
    id: string;
    timestamp: string;
    explanation: string;
    reasonCodes: string[];
    affectedDays: string[];
    evidenceRefs?: string[];
  }>;
  riskMap: Record<string, {
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    evidenceRefs?: string[];
  }>;
  logs: DecisionLogEntry[];
  alerts: PersonaAlert[];
}

/**
 * Dr.Dre 视图数据
 */
export interface DrDreViewData {
  metrics: {
    totalFatigue: number;
    avgBuffer: number;
    totalWalk: number;
    totalDrive: number;
    maxDailyFatigue?: number;
  };
  metricsByItem: Record<string, {
    fatigue?: number;
    buffer?: number;
    walk?: number;
    drive?: number;
  }>;
  adjustments: Array<{
    id: string;
    timestamp: string;
    explanation: string;
    reasonCodes: string[];
    adjustment?: string;
  }>;
  logs: DecisionLogEntry[];
}

/**
 * Neptune 视图数据
 */
export interface NeptuneViewData {
  repairs: Array<{
    id: string;
    timestamp: string;
    explanation: string;
    reasonCodes: string[];
    target?: string;
    replacement?: string;
    originalPlan?: string;
  }>;
  alternatives: Record<string, Array<{
    id: string;
    title: string;
    description: string;
    actions: any[];
  }>>;
  logs: DecisionLogEntry[];
}

/**
 * 综合指标
 */
export interface OverallMetrics {
  safetyScore: number; // 0-100
  rhythmScore: number; // 0-100
  readinessScore: number; // 0-100
  criticalIssues: number;
  warnings: number;
  suggestions: number;
}

// ==================== 数据提取函数 ====================

/**
 * 从决策日志中提取受影响的日期
 */
function extractAffectedDaysFromLog(log: DecisionLogEntry): string[] {
  if (log.metadata?.affectedDays) {
    return Array.isArray(log.metadata.affectedDays) 
      ? log.metadata.affectedDays 
      : [log.metadata.affectedDays];
  }
  if (log.metadata?.dayId) {
    return [log.metadata.dayId];
  }
  if (log.metadata?.day) {
    return [String(log.metadata.day)];
  }
  return [];
}

/**
 * 从决策日志构建风险地图
 */
function buildRiskMapFromLogs(logs: DecisionLogEntry[]): Record<string, {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  evidenceRefs?: string[];
}> {
  const riskMap: Record<string, any> = {};
  
  for (const log of logs) {
    if (log.action === 'REJECT' || log.action === 'RISK_WARNING') {
      const itemId = log.metadata?.itemId || log.metadata?.target;
      if (itemId) {
        const severity = log.metadata?.riskLevel === 'HIGH' ? 'HIGH' :
                        log.metadata?.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW';
        
        riskMap[itemId] = {
          type: log.action === 'REJECT' ? '硬约束违反' : '风险警告',
          severity,
          description: log.description,
          evidenceRefs: log.metadata?.evidenceRefs || [],
        };
      }
    }
  }
  
  return riskMap;
}

/**
 * 从决策日志中提取 Abu 相关数据
 */
export function extractAbuData(
  decisionLogs: DecisionLogEntry[],
  personaAlerts: PersonaAlert[]
): AbuViewData {
  const abuLogs = decisionLogs.filter(log => log.persona === 'ABU');
  const abuAlerts = personaAlerts.filter(alert => alert.persona === 'ABU');
  
  // 计算 gatingStatus
  const hasReject = abuLogs.some(log => log.action === 'REJECT' || log.action === 'BLOCK');
  const hasAllow = abuLogs.some(log => log.action === 'ALLOW' || log.action === 'PASS');
  const gatingStatus = hasReject ? 'BLOCKED' : 
                      hasAllow ? 'PASSED' : 
                      abuAlerts.length > 0 ? 'WARN' : 'UNKNOWN';
  
  // 提取 violations
  const violations = abuLogs
    .filter(log => log.action === 'REJECT' || log.action === 'BLOCK')
    .map(log => ({
      id: log.id,
      timestamp: log.date,
      explanation: log.description,
      reasonCodes: log.metadata?.reasonCodes || [],
      affectedDays: extractAffectedDaysFromLog(log),
      evidenceRefs: log.metadata?.evidenceRefs || [],
    }));
  
  // 构建风险地图
  const riskMap = buildRiskMapFromLogs(abuLogs);
  
  return {
    gatingStatus,
    violations,
    riskMap,
    logs: abuLogs,
    alerts: abuAlerts,
  };
}

/**
 * 从决策日志和指标中提取 Dr.Dre 相关数据
 */
export function extractDrDreData(
  decisionLogs: DecisionLogEntry[],
  tripMetrics: TripMetricsResponse | null
): DrDreViewData {
  const drDreLogs = decisionLogs.filter(log => log.persona === 'DR_DRE');
  
  // 使用已获取的 tripMetrics
  const metrics = {
    totalFatigue: tripMetrics?.summary.totalFatigue || 0,
    avgBuffer: tripMetrics?.summary.avgBuffer || 0,
    totalWalk: tripMetrics?.summary.totalWalk || 0,
    totalDrive: tripMetrics?.summary.totalDrive || 0,
    maxDailyFatigue: tripMetrics?.summary.maxDailyFatigue,
  };
  
  // 从决策日志中提取调整操作
  const adjustments = drDreLogs
    .filter(log => log.action === 'ADJUST' || log.action === 'PACING_ADJUSTMENT')
    .map(log => ({
      id: log.id,
      timestamp: log.date,
      explanation: log.description,
      reasonCodes: log.metadata?.reasonCodes || [],
      adjustment: log.metadata?.adjustment || log.metadata?.suggestedDuration,
    }));
  
  // 计算每日指标（基于 tripMetrics.days）
  const metricsByItem: Record<string, any> = {};
  if (tripMetrics?.days) {
    for (const day of tripMetrics.days) {
      if (day.items) {
        for (const item of day.items) {
          if (item.itemId) {
            metricsByItem[item.itemId] = {
              fatigue: item.fatigue,
              buffer: item.buffer,
              walk: item.walk,
              drive: item.drive,
            };
          }
        }
      }
    }
  }
  
  return {
    metrics,
    metricsByItem,
    adjustments,
    logs: drDreLogs,
  };
}

/**
 * 从决策日志和建议中提取 Neptune 相关数据
 */
export function extractNeptuneData(
  decisionLogs: DecisionLogEntry[],
  suggestions: Suggestion[]
): NeptuneViewData {
  const neptuneLogs = decisionLogs.filter(log => log.persona === 'NEPTUNE');
  
  // 提取 repairs（REPLACE 的决策）
  const repairs = neptuneLogs
    .filter(log => log.action === 'REPLACE' || log.action === 'REPAIR')
    .map(log => ({
      id: log.id,
      timestamp: log.date,
      explanation: log.description,
      reasonCodes: log.metadata?.reasonCodes || [],
      target: log.metadata?.target || log.metadata?.itemId,
      replacement: log.metadata?.replacement || log.metadata?.newItemId,
      originalPlan: log.metadata?.originalPlan,
    }));
  
  // 从建议中提取替代方案
  const alternatives: Record<string, any[]> = {};
  const neptuneSuggestions = suggestions.filter(s => s.persona === 'neptune' && s.scope === 'item');
  
  for (const suggestion of neptuneSuggestions) {
    const itemId = suggestion.scopeId;
    if (itemId) {
      if (!alternatives[itemId]) {
        alternatives[itemId] = [];
      }
      alternatives[itemId].push({
        id: suggestion.id,
        title: suggestion.title,
        description: suggestion.description || suggestion.summary,
        actions: suggestion.actions || [],
      });
    }
  }
  
  return {
    repairs,
    alternatives,
    logs: neptuneLogs,
  };
}

// ==================== 计算函数 ====================

/**
 * 计算综合指标（用于 AutoView）
 */
export function calculateOverallMetrics(
  decisionLogs: DecisionLogEntry[],
  personaAlerts: PersonaAlert[],
  suggestionStats: SuggestionStats | null
): OverallMetrics {
  // 1. 按人格分组日志
  const abuLogs = decisionLogs.filter(log => log.persona === 'ABU');
  const drDreLogs = decisionLogs.filter(log => log.persona === 'DR_DRE');
  const neptuneLogs = decisionLogs.filter(log => log.persona === 'NEPTUNE');
  
  // 2. 计算安全评分（0-100）
  const abuRejects = abuLogs.filter(log => 
    log.action === 'REJECT' || log.action === 'BLOCK'
  ).length;
  const abuWarnings = personaAlerts.filter(
    alert => alert.persona === 'ABU' && alert.severity === 'warning'
  ).length;
  const safetyScore = Math.max(0, Math.min(100, 100 - (abuRejects * 20) - (abuWarnings * 10)));
  
  // 3. 计算节奏评分（0-100）
  const drDreAdjusts = drDreLogs.filter(log => 
    log.action === 'ADJUST' || log.action === 'PACING_ADJUSTMENT'
  ).length;
  const drDreInfos = personaAlerts.filter(
    alert => alert.persona === 'DR_DRE' && alert.severity === 'info'
  ).length;
  const rhythmScore = Math.max(0, Math.min(100, 100 - (drDreAdjusts * 15) - (drDreInfos * 5)));
  
  // 4. 计算修复评分（0-100）
  const neptuneReplaces = neptuneLogs.filter(log => 
    log.action === 'REPLACE' || log.action === 'REPAIR'
  ).length;
  const neptuneSuggestions = suggestionStats?.byPersona?.neptune?.total || 0;
  const readinessScore = Math.max(0, Math.min(100, 100 - (neptuneReplaces * 10) - (neptuneSuggestions * 3)));
  
  return {
    safetyScore: Math.round(safetyScore),
    rhythmScore: Math.round(rhythmScore),
    readinessScore: Math.round(readinessScore),
    criticalIssues: personaAlerts.filter(a => 
      a.severity === 'warning' && a.persona === 'ABU'
    ).length,
    warnings: personaAlerts.filter(a => a.severity === 'info').length,
    suggestions: suggestionStats?.total || 0,
  };
}

