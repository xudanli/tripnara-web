/**
 * 决策草案页面
 * 展示决策画布和相关功能
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DecisionCanvas,
  ExplanationPanel,
  ImpactPreview,
  ReplayController,
  VersionViewer,
} from '@/components/decision-draft';
import type { UserMode } from '@/types/decision-draft';
import { Settings, Play, History } from 'lucide-react';

export default function DecisionDraftPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftId = searchParams.get('draftId') || '';
  const [userMode, setUserMode] = useState<UserMode>('toc');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [impactPreviewOpen, setImpactPreviewOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(null);

  if (!draftId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请提供决策草案ID</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setExplanationOpen(true);
  };

  const handleNodeEdit = (nodeId: string) => {
    setEditingStepId(nodeId);
    // 这里可以打开编辑对话框
    // 编辑后可以预览影响
    setPreviewStepId(nodeId);
    setImpactPreviewOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">决策草案可视化</h1>
          <p className="text-muted-foreground mt-1">
            决策草案ID: {draftId}
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
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs defaultValue="canvas" className="w-full">
        <TabsList>
          <TabsTrigger value="canvas">决策画布</TabsTrigger>
          <TabsTrigger value="explanation">决策解释</TabsTrigger>
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

        <TabsContent value="explanation" className="space-y-4">
          <DraftExplanationView draftId={draftId} userMode={userMode} />
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

      {/* 影响预览 */}
      {previewStepId && (
        <ImpactPreview
          draftId={draftId}
          stepId={previewStepId}
          newValue={null} // 这里应该传入实际的新值
          open={impactPreviewOpen}
          onClose={() => {
            setImpactPreviewOpen(false);
            setPreviewStepId(null);
          }}
          onApply={() => {
            // 应用修改
            console.log('Applying changes...');
          }}
          onCancel={() => {
            // 取消修改
            console.log('Canceling changes...');
          }}
        />
      )}
    </div>
  );
}
