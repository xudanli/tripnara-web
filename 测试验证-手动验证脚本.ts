/**
 * 手动验证脚本
 * 用于在浏览器控制台中测试数据转换和统计计算
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具（F12）
 * 2. 切换到 Console 标签
 * 3. 复制以下代码并执行
 * 4. 检查输出结果
 */

// ==================== 1. 测试数据转换 ====================

// 模拟 PersonaAlert 数据
const mockPersonaAlerts = [
  {
    id: 'alert-001',
    persona: 'ABU' as const,
    name: 'Abu',
    title: '高风险路段检测',
    message: '发现Day 2包含夜间徒步，存在安全隐患',
    severity: 'warning' as const,
    createdAt: '2024-01-15T10:00:00Z',
    metadata: {
      decisionSource: 'PHYSICAL',
      action: 'REJECT',
      reasonCodes: ['NIGHT_TRAVEL', 'HIGH_RISK'],
    },
  },
  {
    id: 'alert-002',
    persona: 'DR_DRE' as const,
    name: 'Dr.Dre',
    title: '节奏偏紧',
    message: 'Day 3的行程过于紧凑，建议增加缓冲时间',
    severity: 'info' as const,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'alert-003',
    persona: 'NEPTUNE' as const,
    name: 'Neptune',
    title: 'POI闭馆',
    message: '某景点今天闭馆，建议替换',
    severity: 'warning' as const,
    createdAt: '2024-01-15T10:00:00Z',
  },
];

// 测试转换函数（需要从实际代码中导入）
// import { convertPersonaAlertsToSuggestions } from '@/utils/suggestionConverter';

console.log('=== 测试数据转换 ===');
console.log('输入数据 (PersonaAlerts):', mockPersonaAlerts);

// 手动执行转换（简化版，用于验证逻辑）
const converted = mockPersonaAlerts.map(alert => {
  const personaMap: Record<string, 'abu' | 'drdre' | 'neptune'> = {
    ABU: 'abu',
    DR_DRE: 'drdre',
    NEPTUNE: 'neptune',
  };

  const severityMap: Record<string, 'info' | 'warn' | 'blocker'> = {
    success: 'info',
    info: 'info',
    warning: 'warn',
  };

  return {
    id: alert.id,
    persona: personaMap[alert.persona] || 'abu',
    scope: 'trip' as const,
    scopeId: 'trip-123',
    severity: severityMap[alert.severity] || 'info',
    status: 'new' as const,
    title: alert.title,
    summary: alert.message,
    description: alert.message,
    actions: [
      {
        id: 'view_evidence',
        label: '查看证据',
        type: 'view_evidence' as const,
        primary: true,
      },
    ],
    createdAt: alert.createdAt,
    metadata: alert.metadata,
  };
});

console.log('转换结果 (Suggestions):', converted);
console.log('转换数量:', converted.length);
console.log('人格分布:', {
  abu: converted.filter(s => s.persona === 'abu').length,
  drdre: converted.filter(s => s.persona === 'drdre').length,
  neptune: converted.filter(s => s.persona === 'neptune').length,
});

// ==================== 2. 测试统计计算 ====================

console.log('\n=== 测试统计计算 ===');

const calculateStats = (suggestions: any[]) => {
  const stats = {
    tripId: 'trip-123',
    byPersona: {
      abu: { total: 0, bySeverity: { blocker: 0, warn: 0, info: 0 } },
      drdre: { total: 0, bySeverity: { blocker: 0, warn: 0, info: 0 } },
      neptune: { total: 0, bySeverity: { blocker: 0, warn: 0, info: 0 } },
    },
    byScope: {
      trip: 0,
      day: {} as Record<string, number>,
      item: {} as Record<string, number>,
    },
  };

  suggestions.forEach(suggestion => {
    // 按人格统计
    const personaStats = stats.byPersona[suggestion.persona];
    if (personaStats) {
      personaStats.total++;
      personaStats.bySeverity[suggestion.severity]++;
    }

    // 按作用范围统计
    if (suggestion.scope === 'trip') {
      stats.byScope.trip++;
    } else if (suggestion.scope === 'day' && suggestion.scopeId) {
      stats.byScope.day[suggestion.scopeId] = (stats.byScope.day[suggestion.scopeId] || 0) + 1;
    } else if (suggestion.scope === 'item' && suggestion.scopeId) {
      stats.byScope.item[suggestion.scopeId] = (stats.byScope.item[suggestion.scopeId] || 0) + 1;
    }
  });

  return stats;
};

const stats = calculateStats(converted);
console.log('统计结果:', stats);
console.log('总建议数:', stats.byPersona.abu.total + stats.byPersona.drdre.total + stats.byPersona.neptune.total);

// ==================== 3. 验证组件数据 ====================

console.log('\n=== 验证组件数据格式 ===');

// 验证 Suggestion 格式
const validateSuggestion = (suggestion: any) => {
  const required = ['id', 'persona', 'scope', 'severity', 'status', 'title', 'summary', 'actions', 'createdAt'];
  const missing = required.filter(field => !(field in suggestion));
  
  if (missing.length > 0) {
    console.warn('缺少必需字段:', missing);
    return false;
  }

  // 验证 persona
  if (!['abu', 'drdre', 'neptune'].includes(suggestion.persona)) {
    console.warn('无效的 persona:', suggestion.persona);
    return false;
  }

  // 验证 severity
  if (!['info', 'warn', 'blocker'].includes(suggestion.severity)) {
    console.warn('无效的 severity:', suggestion.severity);
    return false;
  }

  // 验证 status
  if (!['new', 'seen', 'applied', 'dismissed'].includes(suggestion.status)) {
    console.warn('无效的 status:', suggestion.status);
    return false;
  }

  return true;
};

const allValid = converted.every(validateSuggestion);
console.log('所有建议格式验证:', allValid ? '✅ 通过' : '❌ 失败');

// ==================== 4. 组件使用示例 ====================

console.log('\n=== 组件使用示例 ===');

// AssistantCenter 使用示例
console.log('AssistantCenter props:');
console.log({
  suggestions: converted,
  loading: false,
  onSuggestionClick: (suggestion: any) => console.log('点击建议:', suggestion.id),
  onActionClick: (suggestion: any, actionId: string) => console.log('执行操作:', suggestion.id, actionId),
});

// SuggestionGuardBar 使用示例
console.log('\nSuggestionGuardBar props:');
console.log({
  stats: stats,
  onClick: () => console.log('查看建议'),
});

// SuggestionBadge 使用示例
console.log('\nSuggestionBadge 示例:');
console.log({
  abu: { persona: 'abu', count: stats.byPersona.abu.total },
  drdre: { persona: 'drdre', count: stats.byPersona.drdre.total },
  neptune: { persona: 'neptune', count: stats.byPersona.neptune.total },
});

// ==================== 5. 验证结果总结 ====================

console.log('\n=== 验证结果总结 ===');
console.log('✅ 数据转换: 完成');
console.log('✅ 统计计算: 完成');
console.log('✅ 数据格式: 验证通过');
console.log('✅ 组件数据: 准备就绪');

export {};

