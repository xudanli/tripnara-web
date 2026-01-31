/**
 * 布局算法工具函数
 * 用于决策画布的节点布局
 */

import type { DecisionStep } from '@/types/decision-draft';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export type LayoutType = 'grid' | 'hierarchical' | 'force';

/**
 * 网格布局（Grid Layout）
 * 简单的网格排列
 */
export function gridLayout(
  steps: DecisionStep[],
  nodeWidth: number = 240,
  nodeHeight: number = 180,
  spacing: number = 50
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const cols = Math.ceil(Math.sqrt(steps.length));
  
  steps.forEach((step, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    positions.set(step.id, {
      id: step.id,
      x: col * (nodeWidth + spacing) + spacing,
      y: row * (nodeHeight + spacing) + spacing,
    });
  });
  
  return positions;
}

/**
 * 层次布局（Hierarchical Layout / Dagre-like）
 * 基于决策依赖关系的层次排列
 */
export function hierarchicalLayout(
  steps: DecisionStep[],
  nodeWidth: number = 240,
  nodeHeight: number = 180,
  horizontalSpacing: number = 300,
  verticalSpacing: number = 200
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  
  // 构建依赖图
  const graph: Map<string, Set<string>> = new Map();
  const inDegree: Map<string, number> = new Map();
  
  // 初始化
  steps.forEach((step) => {
    graph.set(step.id, new Set());
    inDegree.set(step.id, 0);
  });
  
  // 构建边（基于 inputs 和 outputs 的依赖关系）
  steps.forEach((step) => {
    // 简化：如果有 inputs，假设它们来自其他步骤
    if (step.inputs && step.inputs.length > 0) {
      step.inputs.forEach((input) => {
        // 查找可能的来源步骤（简化实现）
        const sourceStep = steps.find((s) => 
          s.outputs?.some((out) => 
            (typeof out === 'object' ? out.name : String(out)) === 
            (typeof input === 'object' ? input.name : String(input))
          )
        );
        
        if (sourceStep && sourceStep.id !== step.id) {
          graph.get(sourceStep.id)?.add(step.id);
          inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1);
        }
      });
    }
  });
  
  // 拓扑排序，分层
  const layers: DecisionStep[][] = [];
  const remaining = new Set(steps.map((s) => s.id));
  
  while (remaining.size > 0) {
    const currentLayer: DecisionStep[] = [];
    
    // 找到所有入度为0的节点
    remaining.forEach((stepId) => {
      if ((inDegree.get(stepId) || 0) === 0) {
        const step = steps.find((s) => s.id === stepId);
        if (step) {
          currentLayer.push(step);
        }
      }
    });
    
    if (currentLayer.length === 0) {
      // 防止死循环：如果找不到入度为0的节点，将所有剩余节点放入一层
      remaining.forEach((stepId) => {
        const step = steps.find((s) => s.id === stepId);
        if (step) {
          currentLayer.push(step);
        }
      });
    }
    
    // 移除当前层的节点，更新入度
    currentLayer.forEach((step) => {
      remaining.delete(step.id);
      graph.get(step.id)?.forEach((targetId) => {
        inDegree.set(targetId, (inDegree.get(targetId) || 0) - 1);
      });
    });
    
    layers.push(currentLayer);
  }
  
  // 计算位置
  layers.forEach((layer, layerIndex) => {
    const layerY = layerIndex * verticalSpacing + 100; // 添加顶部边距
    const layerWidth = layer.length * horizontalSpacing;
    const startX = 100; // 添加左侧边距
    
    layer.forEach((step, stepIndex) => {
      positions.set(step.id, {
        id: step.id,
        x: startX + stepIndex * horizontalSpacing,
        y: layerY,
      });
    });
  });
  
  return positions;
}

/**
 * 力导向布局（Force-directed Layout）
 * 简化的力导向算法
 */
export function forceDirectedLayout(
  steps: DecisionStep[],
  nodeWidth: number = 240,
  nodeHeight: number = 180,
  iterations: number = 100
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  
  // 初始化随机位置
  steps.forEach((step, index) => {
    const angle = (index / steps.length) * 2 * Math.PI;
    const radius = 200 + Math.random() * 100;
    positions.set(step.id, {
      id: step.id,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    });
  });
  
  // 简化的力导向迭代（这里使用简单的排斥力）
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    steps.forEach((step) => {
      forces.set(step.id, { x: 0, y: 0 });
    });
    
    // 计算节点间的排斥力
    steps.forEach((step1, i) => {
      const pos1 = positions.get(step1.id)!;
      steps.slice(i + 1).forEach((step2) => {
        const pos2 = positions.get(step2.id)!;
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1000 / (distance * distance); // 排斥力
        
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const force1 = forces.get(step1.id)!;
        force1.x -= fx;
        force1.y -= fy;
        
        const force2 = forces.get(step2.id)!;
        force2.x += fx;
        force2.y += fy;
      });
    });
    
    // 应用力
    steps.forEach((step) => {
      const pos = positions.get(step.id)!;
      const force = forces.get(step.id)!;
      const damping = 0.1;
      
      pos.x += force.x * damping;
      pos.y += force.y * damping;
    });
  }
  
  return positions;
}

/**
 * 根据布局类型计算节点位置
 */
export function calculateLayout(
  steps: DecisionStep[],
  layoutType: LayoutType,
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    spacing?: number;
  }
): Map<string, NodePosition> {
  const { nodeWidth = 240, nodeHeight = 180, spacing = 50 } = options || {};
  
  switch (layoutType) {
    case 'grid':
      return gridLayout(steps, nodeWidth, nodeHeight, spacing);
    case 'hierarchical':
      return hierarchicalLayout(steps, nodeWidth, nodeHeight, 300, 200);
    case 'force':
      return forceDirectedLayout(steps, nodeWidth, nodeHeight);
    default:
      return gridLayout(steps, nodeWidth, nodeHeight, spacing);
  }
}
