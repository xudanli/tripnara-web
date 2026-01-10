// ==================== 审批状态枚举 ====================

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// ==================== 风险等级 ====================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ==================== 审批请求对象 ====================

export interface ApprovalRequest {
  id: string;                      // 审批请求 ID
  createdAt: string;               // ISO 8601 格式的创建时间
  updatedAt: string;               // ISO 8601 格式的更新时间
  threadId: string;                // 关联的会话/线程 ID
  agentRunId: string | null;       // Agent 运行 ID（可选）
  toolCallId: string | null;       // 工具调用 ID（可选）
  skillName: string;               // Skill 名称（如 'decision.requestApproval'）
  summary: string;                 // 一句话描述（如 '预订雷克雅未克酒店'）
  description: string | null;      // 详细描述（可选）
  riskLevel: RiskLevel;            // 风险等级
  payload: any;                    // 原始参数（JSON 对象）
  status: ApprovalStatus;          // 审批状态
  decisionNote: string | null;     // 用户审批备注（可选）
  handledAt: string | null;        // ISO 8601 格式的处理时间（可选）
  expiresAt: string | null;        // ISO 8601 格式的过期时间（可选）
  metadata: any;                   // 额外的元数据（可选）
}

// ==================== 处理审批请求 ====================

export interface HandleDecisionRequest {
  approved: boolean;               // 是否批准（必需）
  decisionNote?: string;           // 审批备注（可选）
  userId?: string;                 // 用户 ID（可选）
  resumeAgent?: boolean;           // 是否立即恢复 Agent（默认 true）
}

// ==================== 处理审批响应 ====================

export interface HandleDecisionResponse {
  success: boolean;
  approval: ApprovalRequest;
  agentResumed: boolean;           // 是否已恢复 Agent
}

// ==================== Agent API 响应中的挂起信息 ====================

export interface SuspensionInfo {
  approvalId: string;
  skillName: string;
  summary: string;
  payload: any;
}

// ==================== 取消审批请求 ====================

export interface CancelApprovalRequest {
  reason?: string;                 // 取消原因（可选）
}

export interface CancelApprovalResponse {
  success: boolean;
  approval: ApprovalRequest;
}

// ==================== 恢复 Agent 响应 ====================

export interface ResumeAgentResponse {
  success: boolean;
  message: string;
  snapshot: {
    threadId: string;
    messageCount: number;
  };
}
