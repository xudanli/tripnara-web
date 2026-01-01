import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Brain, Wrench, CheckCircle2, XCircle, AlertTriangle, BarChart3, TrendingUp, FileText } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface PlanStudioSidebarProps {
  personaMode: PersonaMode;
}

export default function PlanStudioSidebar({ personaMode }: PlanStudioSidebarProps) {
  // 模拟数据 - 实际应该从后端API获取
  const abuGatingStatus: 'ALLOW' | 'WARN' | 'BLOCK' = 'WARN';
  const abuViolations = {
    hard: 3,
    soft: 2,
  };

  const dreMetrics = {
    timeTotal: 1440,
    bufferTotal: 180,
    fatigueScore: 65,
    ascent: 1200,
    costEstimate: 5000,
    weights: {
      comfort: 40,
      experience: 30,
      cost: 30,
    },
  };

  const neptuneFixes = {
    total: 5,
    applied: 2,
    minimalChanges: {
      replacePoints: 1,
      moveTimeSlots: 2,
    },
  };

  const getStatusIcon = (status: 'ALLOW' | 'WARN' | 'BLOCK') => {
    switch (status) {
      case 'ALLOW':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCK':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'ALLOW' | 'WARN' | 'BLOCK') => {
    switch (status) {
      case 'ALLOW':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'WARN':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'BLOCK':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  // 策略预览卡片（顶部）
  const renderStrategyPreview = () => {
    if (personaMode === 'abu') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-red-600" />
              门控状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-3 border rounded-lg ${getStatusColor(abuGatingStatus)}`}>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(abuGatingStatus)}
                <span className="font-semibold">
                  {abuGatingStatus === 'ALLOW' ? '通过' : abuGatingStatus === 'WARN' ? '警告' : '拒绝'}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div>红线：{abuViolations.hard} 条</div>
                <div>警告：{abuViolations.soft} 条</div>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              查看证据
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (personaMode === 'dre') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              指标总览
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 border rounded">
                <div className="text-xs text-muted-foreground">总耗时</div>
                <div className="font-semibold">{Math.floor(dreMetrics.timeTotal / 60)}h</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-muted-foreground">总缓冲</div>
                <div className="font-semibold">{Math.floor(dreMetrics.bufferTotal / 60)}h</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-muted-foreground">疲劳指数</div>
                <div className="font-semibold">{dreMetrics.fatigueScore}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-xs text-muted-foreground">预计花费</div>
                <div className="font-semibold">¥{dreMetrics.costEstimate}</div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-2">当前权重</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>舒适</span>
                  <span className="font-medium">{dreMetrics.weights.comfort}%</span>
                </div>
                <div className="flex justify-between">
                  <span>体验</span>
                  <span className="font-medium">{dreMetrics.weights.experience}%</span>
                </div>
                <div className="flex justify-between">
                  <span>成本</span>
                  <span className="font-medium">{dreMetrics.weights.cost}%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              调整权重
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (personaMode === 'neptune') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="w-5 h-5 text-green-600" />
              修复进度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border rounded-lg bg-gray-50">
              <div className="text-sm space-y-1">
                <div>
                  发现问题 <span className="font-semibold">{neptuneFixes.total}</span> 个
                </div>
                <div>
                  已修复 <span className="font-semibold text-green-600">{neptuneFixes.applied}</span> 个
                </div>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div className="text-xs text-muted-foreground">最小改动成本</div>
              <div className="space-y-1">
                <div>• 替换 {neptuneFixes.minimalChanges.replacePoints} 个点</div>
                <div>• 移动 {neptuneFixes.minimalChanges.moveTimeSlots} 个时段</div>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              查看补丁
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  // 提示卡（中部）
  const renderAlertsCard = () => {
    if (personaMode === 'abu') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">风险提示</CardTitle>
            <CardDescription>缺失必填项和红线警告</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <div className="font-medium text-red-800">缺失必选点</div>
              <div className="text-xs text-red-600 mt-1">必须点列表中缺少 2 个地点</div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="font-medium text-yellow-800">缓冲时间不足</div>
              <div className="text-xs text-yellow-600 mt-1">Day 2 的缓冲时间少于建议值</div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div className="font-medium text-yellow-800">日照窗口风险</div>
              <div className="text-xs text-yellow-600 mt-1">第 3 天结束时间可能超出日照窗口</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (personaMode === 'dre') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">指标异常</CardTitle>
            <CardDescription>超出阈值或需要优化的指标</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <div className="font-medium text-orange-800">疲劳峰值过高</div>
              <div className="text-xs text-orange-600 mt-1">
                第 3 天游走 18km（&gt; 你的上限 10km）
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-medium text-blue-800">缓冲不足</div>
              <div className="text-xs text-blue-600 mt-1">
                缓冲仅 12min → 迟到风险
              </div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <div className="font-medium text-orange-800">成本超出预算</div>
              <div className="text-xs text-orange-600 mt-1">
                预计花费 ¥5000，超出预算 20%
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (personaMode === 'neptune') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">修复建议</CardTitle>
            <CardDescription>最小代价的修复方案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-800">替换建议</div>
              <div className="text-xs text-green-600 mt-1">
                把 A 点换成 B 点（更近/同类型/开放）
              </div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <div className="font-medium text-gray-800">时间调整</div>
              <div className="text-xs text-gray-600 mt-1">
                把午餐提前 30min，插入休息点
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-800">替代路线</div>
              <div className="text-xs text-green-600 mt-1">
                Day 2 路线不可达，建议使用备选路线 C
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  // 底部按钮
  const renderActionButton = () => {
    if (personaMode === 'abu') {
      return (
        <Button variant="outline" className="w-full">
          <Shield className="w-4 h-4 mr-2" />
          Ask Agent to refine constraints
        </Button>
      );
    }

    if (personaMode === 'dre') {
      return (
        <Button variant="outline" className="w-full">
          <Brain className="w-4 h-4 mr-2" />
          Ask Agent to optimize with weights
        </Button>
      );
    }

    if (personaMode === 'neptune') {
      return (
        <Button variant="outline" className="w-full">
          <Wrench className="w-4 h-4 mr-2" />
          Ask Agent to apply minimal fixes
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* 策略预览 */}
      {renderStrategyPreview()}

      {/* 提示卡 */}
      {renderAlertsCard()}

      {/* 底部按钮 */}
      {renderActionButton()}
    </div>
  );
}

