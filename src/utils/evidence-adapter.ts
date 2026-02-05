/**
 * 证据类型适配器
 * 
 * 将不同来源的证据数据转换为统一的格式
 */

import type { EvidenceItem as TripEvidenceItem } from '@/types/trip';
import type { EvidenceItem as ReadinessEvidenceItem } from '@/types/readiness';

/**
 * 将 TripEvidenceItem 转换为 ReadinessEvidenceItem
 * 
 * 用于在 ReadinessPage 中使用 EvidenceListItem 组件
 */
export function adaptTripEvidenceToReadiness(
  tripEvidence: TripEvidenceItem
): ReadinessEvidenceItem {
  // 映射 type 到 category
  const typeToCategory: Record<string, 'road' | 'weather' | 'poi' | 'ticket' | 'lodging'> = {
    'opening_hours': 'poi',
    'road_closure': 'road',
    'weather': 'weather',
    'booking': 'ticket',
    'other': 'poi',
  };

  // 映射 severity 到 confidence
  const severityToConfidence: Record<string, 'high' | 'medium' | 'low'> = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
  };

  // 构建 scope（适用范围）
  const scope = tripEvidence.day 
    ? `Day ${tripEvidence.day}`
    : tripEvidence.poiId 
    ? `POI ${tripEvidence.poiId}`
    : '全局';

  // 🆕 处理 confidence 字段：优先使用新的对象格式，如果没有则使用简单的字符串格式
  const confidenceValue = tripEvidence.confidence 
    ? {
        score: tripEvidence.confidence.score,
        level: tripEvidence.confidence.level,
        factors: tripEvidence.confidence.factors,
      }
    : (severityToConfidence[tripEvidence.severity || 'medium'] || 'medium');

  return {
    id: tripEvidence.id,
    category: typeToCategory[tripEvidence.type] || 'poi',
    source: tripEvidence.source || '未知来源',
    timestamp: tripEvidence.timestamp,
    scope,
    confidence: confidenceValue,
    // 🆕 保留原始证据的标题和描述（用于区分不同的证据项）
    title: tripEvidence.title,
    description: tripEvidence.description,
    link: tripEvidence.link,
    poiId: tripEvidence.poiId,
    day: tripEvidence.day,
    // 🆕 P0修复：证据增强字段（v1.2.0）
    freshness: tripEvidence.freshness,
    qualityScore: tripEvidence.qualityScore,
    // 注意：TripEvidenceItem 可能没有这些字段，需要从 API 响应中获取
    // 如果 API 返回了这些字段，应该直接使用
    status: (tripEvidence as any).status,
    userNote: (tripEvidence as any).userNote,
    updatedAt: (tripEvidence as any).updatedAt,
  };
}

/**
 * 批量转换
 */
export function adaptTripEvidenceListToReadiness(
  tripEvidenceList: TripEvidenceItem[]
): ReadinessEvidenceItem[] {
  return tripEvidenceList.map(adaptTripEvidenceToReadiness);
}
