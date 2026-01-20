/**
 * 体验设计组件测试页面
 * 
 * 展示所有根据体验设计文档 v1.0 实现的新组件
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RiskScoreDisplay, 
  RiskScoreBadge, 
  DataCard, 
  DecisionFunnel,
  type DecisionOption,
  type DecisionStage,
  type RiskDimension,
} from '@/components/ui';
import { riskLevelToScore } from '@/utils/approval';

export default function UiTestExperienceDesign() {
  const [decisionStage, setDecisionStage] = useState<DecisionStage>('browse');
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();

  // 示例风险维度数据
  const riskDimensions: RiskDimension[] = [
    {
      name: '安全风险',
      score: 40,
      description: '基于地形和天气数据评估',
      source: 'DEM地形数据 + 天气预报',
      confidence: 95,
    },
    {
      name: '体力风险',
      score: 60,
      description: '需要较强体力，建议提前锻炼',
      source: '用户反馈 + 历史数据',
      confidence: 85,
    },
    {
      name: '时间风险',
      score: 30,
      description: '时间充足，风险较低',
      source: '行程调度算法',
      confidence: 90,
    },
    {
      name: '体验风险',
      score: 35,
      description: '景观优秀，体验风险低',
      source: '用户评价',
      confidence: 80,
    },
    {
      name: '成本风险',
      score: 20,
      description: '成本可控',
      source: '价格数据',
      confidence: 95,
    },
  ];

  // 示例决策选项
  const decisionOptions: DecisionOption[] = [
    {
      id: 'route-a',
      name: '挑战自我',
      description: '景观最优但难度最高',
      metrics: [
        { label: '难度等级', value: '困难(4/5)', highlight: true },
        { label: '景观评分', value: '5/5' },
        { label: '距离', value: 15, unit: 'km' },
        { label: '爬升', value: 1200, unit: 'm' },
        { label: '预计用时', value: '5-7小时' },
      ],
      riskScore: 65,
      matchScore: 75,
      recommended: false,
      details: {
        whyNotPerfect: [
          '你需要6h能完成的路，会花7-8h',
          'Day 2可能会感到疲劳',
          '风险评分65%（中-高）',
        ],
        whyConsider: [
          '景观最优（5/5）',
          '你说喜欢挑战',
          '我们准备了应急方案',
        ],
        suggestions: '如果你最近有锻炼，可以尝试。但要做好以下准备：充足的休息、备选路线、应急物资。',
      },
    },
    {
      id: 'route-b',
      name: '平衡选择',
      description: '最平衡的选择（推荐）',
      metrics: [
        { label: '难度等级', value: '中等(3/5)', highlight: true },
        { label: '景观评分', value: '4/5' },
        { label: '距离', value: 10, unit: 'km' },
        { label: '爬升', value: 600, unit: 'm' },
        { label: '预计用时', value: '3.5-5小时' },
      ],
      riskScore: 45,
      matchScore: 95,
      recommended: true,
      details: {
        whyConsider: [
          '体力匹配度最高',
          '景观仍然优秀（4/5）',
          '风险评分45%（中等）',
          '留有体力调整的空间',
        ],
        whyNotPerfect: [
          '无法看到最高峰的景观',
          '比A路线"少"看一些景点',
        ],
        suggestions: '这是最平衡的选择，既保证了体验质量，又不会超出你的能力范围。',
      },
    },
    {
      id: 'route-c',
      name: '轻松游览',
      description: '轻松游览，留体力探索',
      metrics: [
        { label: '难度等级', value: '温和(2/5)', highlight: true },
        { label: '景观评分', value: '3/5' },
        { label: '距离', value: 8, unit: 'km' },
        { label: '爬升', value: 300, unit: 'm' },
        { label: '预计用时', value: '2.5-4小时' },
      ],
      riskScore: 35,
      matchScore: 120,
      recommended: false,
      details: {
        whyConsider: [
          '完全不会超出你的能力',
          '风险评分低（35%）',
          '可以悠闲享受',
        ],
        whyNotPerfect: [
          '景观较一般（3/5）',
          '你说喜欢挑战，这可能太简单',
          '可能无法充分利用你的能力',
        ],
        suggestions: '这是保险选择，适合想要轻松游览的用户。',
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">体验设计组件测试</h1>
        <p className="text-muted-foreground mt-2">
          展示根据体验设计文档 v1.0 实现的所有新组件
        </p>
      </div>

      <Tabs defaultValue="risk-score" className="w-full">
        <TabsList>
          <TabsTrigger value="risk-score">风险评分</TabsTrigger>
          <TabsTrigger value="data-card">数据卡片</TabsTrigger>
          <TabsTrigger value="decision-funnel">决策漏斗</TabsTrigger>
          <TabsTrigger value="examples">使用示例</TabsTrigger>
        </TabsList>

        {/* 风险评分组件 */}
        <TabsContent value="risk-score" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>风险评分展示组件</CardTitle>
              <CardDescription>
                三层展示：总结 → 分解 → 详细
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 完整展示 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">完整展示（带维度分解）</h3>
                <RiskScoreDisplay
                  overallScore={50}
                  dimensions={riskDimensions}
                  showDetails={false}
                />
              </div>

              {/* 简要显示 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">简要显示（Badge）</h3>
                <div className="flex flex-wrap gap-2">
                  <RiskScoreBadge score={25} showLabel={true} />
                  <RiskScoreBadge score={40} showLabel={true} />
                  <RiskScoreBadge score={55} showLabel={true} />
                  <RiskScoreBadge score={70} showLabel={true} />
                  <RiskScoreBadge score={85} showLabel={true} />
                  <RiskScoreBadge score={95} showLabel={true} />
                </div>
              </div>

              {/* 兼容性测试 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">兼容性测试（旧 RiskLevel）</h3>
                <div className="flex flex-wrap gap-2">
                  <RiskScoreBadge score={riskLevelToScore('low')} showLabel={true} />
                  <RiskScoreBadge score={riskLevelToScore('medium')} showLabel={true} />
                  <RiskScoreBadge score={riskLevelToScore('high')} showLabel={true} />
                  <RiskScoreBadge score={riskLevelToScore('critical')} showLabel={true} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据卡片组件 */}
        <TabsContent value="data-card" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>数据卡片组件</CardTitle>
              <CardDescription>
                标准化的数据展示格式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decisionOptions.map((option) => (
                  <DataCard
                    key={option.id}
                    title={option.name}
                    description={option.description}
                    metrics={option.metrics}
                    riskScore={option.riskScore}
                    matchScore={option.matchScore}
                    recommended={option.recommended}
                    actions={[
                      {
                        label: '选择',
                        onClick: () => console.log('Selected:', option.id),
                        variant: 'default',
                      },
                      {
                        label: '查看详情',
                        onClick: () => console.log('View details:', option.id),
                        variant: 'outline',
                      },
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 决策漏斗组件 */}
        <TabsContent value="decision-funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>三层决策漏斗</CardTitle>
              <CardDescription>
                浏览 → 理解 → 判断
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DecisionFunnel
                stage={decisionStage}
                options={decisionOptions}
                selectedOptionId={selectedOptionId}
                onStageChange={(stage) => {
                  setDecisionStage(stage);
                  console.log('Stage changed:', stage);
                }}
                onOptionSelect={(id) => {
                  setSelectedOptionId(id);
                  console.log('Option selected:', id);
                }}
                onConfirm={(id) => {
                  console.log('Confirmed:', id);
                  alert(`已确认选择：${decisionOptions.find(o => o.id === id)?.name}`);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 使用示例 */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>代码示例</CardTitle>
              <CardDescription>
                如何在项目中使用这些组件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. 导入组件</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { 
  RiskScoreDisplay, 
  RiskScoreBadge, 
  DataCard, 
  DecisionFunnel 
} from '@/components/ui';`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. 使用风险评分组件</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<RiskScoreDisplay
  overallScore={65}
  dimensions={[
    {
      name: '安全风险',
      score: 40,
      description: '基于地形和天气数据',
      source: 'DEM地形数据',
      confidence: 95,
    },
  ]}
/>`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. 使用数据卡片</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<DataCard
  title="路线名称"
  metrics={[
    { label: '难度', value: '中等' },
    { label: '距离', value: 10, unit: 'km' },
  ]}
  riskScore={45}
  matchScore={85}
/>`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4. 使用决策漏斗</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<DecisionFunnel
  stage="browse"
  options={options}
  onStageChange={(stage) => {}}
  onOptionSelect={(id) => {}}
  onConfirm={(id) => {}}
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
