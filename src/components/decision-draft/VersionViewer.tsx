/**
 * 版本查看器组件
 * 显示版本列表、版本详情、版本对比
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { decisionDraftApi } from '@/api/decision-draft';
import type { DecisionDraftVersion, VersionDiff } from '@/types/decision-draft';
import { History, GitCompare, RotateCcw, Copy } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface VersionViewerProps {
  draftId: string;
  onVersionSelect?: (versionId: string) => void;
}

export default function VersionViewer({
  draftId,
  onVersionSelect,
}: VersionViewerProps) {
  const [versions, setVersions] = useState<DecisionDraftVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionId1, setCompareVersionId1] = useState<string | null>(null);
  const [compareVersionId2, setCompareVersionId2] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<DecisionDraftVersion | null>(null);
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [draftId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getVersions(draftId);
      setVersions(data);
    } catch (err: any) {
      setError(err.message || '加载版本列表失败');
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionDetail = async (versionId: string) => {
    try {
      const detail = await decisionDraftApi.getVersionDetail(draftId, versionId);
      setVersionDetail(detail);
      setDetailDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load version detail:', err);
    }
  };

  const loadVersionCompare = async (versionId1: string, versionId2: string) => {
    try {
      const compare = await decisionDraftApi.compareVersions(draftId, versionId1, versionId2);
      setVersionDiff(compare.diff);
      setCompareDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to load version compare:', err);
    }
  };

  const handleCompare = () => {
    if (compareVersionId1 && compareVersionId2) {
      loadVersionCompare(compareVersionId1, compareVersionId2);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-5 h-5" />
            版本历史
          </CardTitle>
          <CardDescription>
            查看决策草案的版本历史和变更记录
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 版本列表 */}
          {versions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无版本记录
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.version_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">版本 {version.version_number}</span>
                      {version.description && (
                        <span className="text-sm text-muted-foreground">
                          {version.description}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(version.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      {version.created_by && ` · ${version.created_by}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {version.decision_steps.length} 个决策步骤
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompareVersionId1(version.version_id);
                        if (compareVersionId2) {
                          loadVersionCompare(version.version_id, compareVersionId2);
                        }
                      }}
                    >
                      <GitCompare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadVersionDetail(version.version_id)}
                    >
                      详情
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 版本对比选择 */}
          {versions.length >= 2 && (
            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-medium">版本对比</div>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={compareVersionId1 || ''}
                  onChange={(e) => setCompareVersionId1(e.target.value)}
                >
                  <option value="">选择版本1</option>
                  {versions.map((v) => (
                    <option key={v.version_id} value={v.version_id}>
                      版本 {v.version_number}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">vs</span>
                <select
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={compareVersionId2 || ''}
                  onChange={(e) => setCompareVersionId2(e.target.value)}
                >
                  <option value="">选择版本2</option>
                  {versions.map((v) => (
                    <option key={v.version_id} value={v.version_id}>
                      版本 {v.version_number}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleCompare}
                  disabled={!compareVersionId1 || !compareVersionId2}
                >
                  对比
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 版本详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>版本详情</DialogTitle>
            <DialogDescription>
              {versionDetail && `版本 ${versionDetail.version_number}`}
            </DialogDescription>
          </DialogHeader>
          {versionDetail && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">版本号</div>
                  <div className="font-medium">{versionDetail.version_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">创建时间</div>
                  <div className="font-medium">
                    {format(new Date(versionDetail.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>
                {versionDetail.description && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">描述</div>
                    <div className="font-medium">{versionDetail.description}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">决策步骤 ({versionDetail.decision_steps.length})</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {versionDetail.decision_steps.map((step) => (
                    <div key={step.id} className="p-2 border rounded text-sm">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {step.type} · {step.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 版本对比对话框 */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>版本对比</DialogTitle>
            <DialogDescription>
              查看两个版本之间的差异
            </DialogDescription>
          </DialogHeader>
          {versionDiff && (
            <div className="space-y-4 mt-4">
              <Tabs defaultValue="added" className="w-full">
                <TabsList>
                  <TabsTrigger value="added">
                    新增 ({versionDiff.decision_steps_added.length})
                  </TabsTrigger>
                  <TabsTrigger value="removed">
                    删除 ({versionDiff.decision_steps_removed.length})
                  </TabsTrigger>
                  <TabsTrigger value="modified">
                    修改 ({versionDiff.decision_steps_modified.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="added" className="space-y-2">
                  {versionDiff.decision_steps_added.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      无新增步骤
                    </div>
                  ) : (
                    versionDiff.decision_steps_added.map((step) => (
                      <div key={step.id} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                        <div className="font-medium text-green-900 dark:text-green-100">
                          + {step.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="removed" className="space-y-2">
                  {versionDiff.decision_steps_removed.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      无删除步骤
                    </div>
                  ) : (
                    versionDiff.decision_steps_removed.map((step) => (
                      <div key={step.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                        <div className="font-medium text-red-900 dark:text-red-100">
                          - {step.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="modified" className="space-y-2">
                  {versionDiff.decision_steps_modified.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      无修改步骤
                    </div>
                  ) : (
                    versionDiff.decision_steps_modified.map((step) => (
                      <div key={step.id} className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="font-medium text-yellow-900 dark:text-yellow-100">
                          ~ {step.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
