/**
 * 决策草案标签页
 * 集成到规划工作台，显示当前方案的决策过程
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DecisionCanvas, ExplanationPanel, ImpactPreview, ReplayController, VersionViewer, EditStepDialog } from '@/components/decision-draft';
import { useDecisionDraft } from '@/hooks/useDecisionDraft';
import type { UserMode } from '@/types/decision-draft';
import { ExternalLink, FileText } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface DecisionDraftTabProps {
  draftId?: string;
  planId?: string;
  tripId?: string;
}

export default function DecisionDraftTab({
  draftId,
  planId: _planId,
  tripId: _tripId,
}: DecisionDraftTabProps) {
  const navigate = useNavigate();
  const [userMode, setUserMode] = useState<UserMode>('toc');
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [impactPreviewOpen, setImpactPreviewOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const { draft, loading, error, selectNode, updateStep, previewImpact, refresh } = useDecisionDraft({
    draftId: draftId || '',
    userMode,
    autoLoad: !!draftId,
  });

  if (!draftId) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            当前方案暂无决策草案
          </p>
          <p className="text-sm text-muted-foreground">
            决策草案将在方案生成后自动创建
          </p>
        </div>
      </Card>
    );
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    selectNode(nodeId);
    setExplanationOpen(true);
  };

  const handleNodeEdit = (nodeId: string) => {
    setEditingStepId(nodeId);
    setEditDialogOpen(true);
  };

  const handleSaveStep = async (stepId: string, updates: import('@/types/decision-draft').UpdateDecisionStepRequest) => {
    await updateStep(stepId, updates);
    await refresh();
  };

  const handlePreviewImpact = async (stepId: string, newValue: any) => {
    const impact = await previewImpact(stepId, newValue);
    if (impact) {
      setPreviewStepId(stepId);
      setImpactPreviewOpen(true);
    }
  };

  // 获取正在编辑的步骤
  const editingStep = editingStepId && draft
    ? draft.decision_steps.find((step) => step.id === editingStepId)
    : null;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">决策过程可视化</h2>
          <p className="text-muted-foreground mt-1">
            查看方案生成过程中的所有决策步骤和证据链，理解"为什么这样决策"
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={userMode} onValueChange={(value) => setUserMode(value as UserMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toc">ToC Lite模式</SelectItem>
              <SelectItem value="expert">Expert模式</SelectItem>
              <SelectItem value="studio">Studio模式</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate(`/decision-draft?draftId=${draftId}`)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            独立页面查看
          </Button>
        </div>
      </div>

      {/* 功能说明卡片 */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                与"规划工作台"标签页的区别
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>"规划工作台"</strong>标签页展示<strong>决策结果</strong>（三人格评估、综合决策），
                <strong>"决策过程"</strong>标签页展示<strong>决策过程</strong>（节点、证据链、详细解释）。
                两者互补，帮助您全面理解方案的生成过程。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Tabs defaultValue="canvas" className="w-full">
        <TabsList>
          <TabsTrigger value="canvas">决策画布</TabsTrigger>
          <TabsTrigger value="summary">决策摘要</TabsTrigger>
          <TabsTrigger value="replay">决策回放</TabsTrigger>
          <TabsTrigger value="versions">版本管理</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="space-y-4">
          <DecisionCanvas
            draftId={draftId}
            userMode={userMode}
            onNodeClick={handleNodeClick}
            onNodeEdit={handleNodeEdit}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>决策摘要</CardTitle>
              <CardDescription>
                当前方案共包含 {draft?.decision_steps.length || 0} 个决策步骤
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {draft?.decision_steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleNodeClick(step.id)}
                  >
                    <div className="font-medium">{step.title}</div>
                    {step.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replay" className="space-y-4">
          <ReplayController
            draftId={draftId}
            onStepChange={(step) => {
              // 可以在这里高亮对应的节点
              console.log('Replay step changed:', step);
            }}
          />
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <VersionViewer
            draftId={draftId}
            onVersionSelect={(versionId) => {
              console.log('Version selected:', versionId);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* 解释面板 */}
      {selectedNodeId && (
        <ExplanationPanel
          draftId={draftId}
          stepId={selectedNodeId}
          userMode={userMode}
          open={explanationOpen}
          onClose={() => {
            setExplanationOpen(false);
            setSelectedNodeId(null);
          }}
        />
      )}

      {/* 编辑对话框 */}
      {editingStep && (
        <EditStepDialog
          step={editingStep}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingStepId(null);
          }}
          onSave={handleSaveStep}
          onPreviewImpact={handlePreviewImpact}
          userMode={userMode}
        />
      )}

      {/* 影响预览 */}
      {previewStepId && (
        <ImpactPreview
          draftId={draftId}
          stepId={previewStepId}
          newValue={null}
          open={impactPreviewOpen}
          onClose={() => {
            setImpactPreviewOpen(false);
            setPreviewStepId(null);
          }}
          onApply={() => {
            console.log('Applying changes...');
          }}
          onCancel={() => {
            console.log('Canceling changes...');
          }}
        />
      )}
    </div>
  );
}
