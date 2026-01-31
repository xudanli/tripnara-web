/**
 * 决策画布组件
 * 用于可视化决策节点、证据节点、影响节点
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDecisionDraft } from '@/hooks/useDecisionDraft';
import type { DecisionStep, UserMode, GateStatus, DecisionDraft } from '@/types/decision-draft';
import DecisionNode from './DecisionNode';
import EvidenceNode from './EvidenceNode';
import ImpactNode from './ImpactNode';
import DecisionCanvasToolbar, { type LayoutType } from './DecisionCanvasToolbar';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateLayout } from '@/utils/layout-algorithms';
import { normalizeGateStatus } from '@/lib/gate-status';

export interface DecisionCanvasProps {
  draftId: string;
  userMode: UserMode;
  onNodeClick?: (nodeId: string) => void;
  onNodeEdit?: (nodeId: string) => void;
  className?: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export default function DecisionCanvas({
  draftId,
  userMode,
  onNodeClick,
  onNodeEdit,
  className,
}: DecisionCanvasProps) {
  // 使用统一的 Hook 管理状态
  const { draft, loading, error, selectedNodeId, selectNode, refresh } = useDecisionDraft({
    draftId,
    userMode,
    autoLoad: true,
  });

  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GateStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const [layoutType, setLayoutType] = useState<LayoutType>('grid');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, nodeId: '' });

  // 过滤决策步骤
  const filteredSteps = useMemo(() => {
    if (!draft) return [];
    
    return draft.decision_steps.filter((step) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = step.title.toLowerCase().includes(query);
        const matchesDescription = step.description?.toLowerCase().includes(query);
        const matchesType = step.type.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesType) {
          return false;
        }
      }
      
      // 状态过滤
      if (statusFilter !== 'all') {
        const stepStatus = normalizeGateStatus(step.status);
        if (stepStatus !== statusFilter) {
          return false;
        }
      }
      
      // 类型过滤
      if (typeFilter !== 'all') {
        if (step.type !== typeFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [draft, searchQuery, statusFilter, typeFilter]);

  // 计算节点位置（使用布局算法）
  useEffect(() => {
    if (draft && filteredSteps.length > 0) {
      const positions = calculateLayout(filteredSteps, layoutType, {
        nodeWidth: 240,
        nodeHeight: 180,
        spacing: 50,
      });
      setNodePositions(positions);
    }
  }, [draft, filteredSteps, layoutType]);

  // 处理节点点击
  const handleNodeClick = useCallback((nodeId: string) => {
    selectNode(nodeId);
    onNodeClick?.(nodeId);
  }, [selectNode, onNodeClick]);

  // 处理节点编辑
  const handleNodeEdit = useCallback((nodeId: string) => {
    onNodeEdit?.(nodeId);
  }, [onNodeEdit]);

  // 缩放控制
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // 只处理左键
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
      nodeId,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const nodePos = nodePositions.get(dragStart.current.nodeId);
    if (nodePos) {
      const newX = dragStart.current.x + (e.clientX - dragStart.current.x) / zoom;
      const newY = dragStart.current.y + (e.clientY - dragStart.current.y) / zoom;
      
      setNodePositions((prev) => {
        const newMap = new Map(prev);
        newMap.set(dragStart.current.nodeId, {
          id: dragStart.current.nodeId,
          x: newX,
          y: newY,
        });
        return newMap;
      });
    }
  }, [zoom, nodePositions]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  // 画布平移（拖拽空白区域）
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
        nodeId: '',
      };
    }
  };

  // 更新高亮节点（用于影响预览）
  // 可以通过 ref 暴露此方法供外部调用
  // const updateHighlightedNodes = useCallback((nodeIds: string[]) => {
  //   setHighlightedNodeIds(new Set(nodeIds));
  // }, []);

  if (loading) {
    return (
      <Card className={cn('flex items-center justify-center h-96', className)}>
        <Spinner className="w-8 h-8" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refresh}>重试</Button>
        </div>
      </Card>
    );
  }

  if (!draft) {
    return null;
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="p-4 border-b">
        {/* 搜索和过滤工具栏 */}
        <DecisionCanvasToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          layoutType={layoutType}
          onLayoutChange={setLayoutType}
          filteredCount={filteredSteps.length}
          totalCount={draft.decision_steps.length}
        />
      </div>

      {/* 缩放控制 */}
      <div className="absolute top-20 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetZoom}
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* 画布 */}
      <div
        ref={canvasRef}
        className="relative w-full h-[600px] overflow-auto bg-muted/30"
        onMouseDown={handleCanvasMouseDown}
        style={{
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* 网格背景 */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* 连线（证据节点到决策节点） */}
          {filteredSteps.map((step) => {
            const stepPos = nodePositions.get(step.id);
            if (!stepPos) return null;

            return step.evidence.map((evidence) => {
              // 简化：证据节点位置在决策节点左侧
              const evidenceX = stepPos.x - 150;
              const evidenceY = stepPos.y;
              
              return (
                <line
                  key={`${step.id}-${evidence.evidence_id}`}
                  x1={evidenceX}
                  y1={evidenceY + 75}
                  x2={stepPos.x}
                  y2={stepPos.y + 75}
                  stroke="#gray"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
              );
            });
          })}
        </svg>

        {/* 节点容器 */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* 证据节点 */}
          {filteredSteps.map((step) => {
            const stepPos = nodePositions.get(step.id);
            if (!stepPos || userMode === 'toc') return null; // ToC模式默认折叠证据节点

            return step.evidence.map((evidence, index) => {
              const evidenceX = stepPos.x - 150;
              const evidenceY = stepPos.y + index * 80;
              
              return (
                <div
                  key={evidence.evidence_id}
                  style={{
                    position: 'absolute',
                    left: `${evidenceX}px`,
                    top: `${evidenceY}px`,
                  }}
                >
                  <EvidenceNode
                    evidence={evidence}
                    selected={selectedNodeId === evidence.evidence_id}
                    onClick={() => handleNodeClick(evidence.evidence_id)}
                  />
                </div>
              );
            });
          })}

          {/* 决策节点 */}
          {filteredSteps.map((step) => {
            const pos = nodePositions.get(step.id);
            if (!pos) return null;

            return (
              <div
                key={step.id}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
                onMouseDown={(e) => handleMouseDown(e, step.id)}
              >
                <DecisionNode
                  step={step}
                  userMode={userMode}
                  selected={selectedNodeId === step.id}
                  highlighted={highlightedNodeIds.has(step.id)}
                  onClick={() => handleNodeClick(step.id)}
                  onEdit={() => handleNodeEdit(step.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
