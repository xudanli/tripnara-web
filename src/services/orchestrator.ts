/**
 * LangGraph Orchestrator 服务层
 * 
 * 这个服务层封装了对 LangGraph Orchestrator 的调用，
 * 用于替代直接调用决策接口（validate-safety、adjust-pacing、replace-nodes）。
 * 
 * 根据三人格定位文档，所有用户操作都应该通过 LangGraph Orchestrator 执行，
 * 系统会自动调用三人格进行检查和调整。
 */

import { agentApi, type RouteAndRunRequest, type RouteAndRunResponse } from '@/api/agent';

// 注意：useAuth 是 React Hook，不能在类中使用
// 需要在调用时传入 userId

/**
 * 用户操作类型
 */
export type UserAction = 
  | 'add_place'           // 添加地点
  | 'remove_place'        // 移除地点
  | 'modify_schedule'      // 修改日程
  | 'optimize_route'       // 优化路线
  | 'validate_safety'      // 验证安全（保留，但通过 Orchestrator 调用）
  | 'adjust_pacing'        // 调整节奏（保留，但通过 Orchestrator 调用）
  | 'apply_repairs';       // 应用修复（保留，但通过 Orchestrator 调用）

/**
 * Orchestrator 执行结果
 */
export interface OrchestrationResult {
  success: boolean;
  message?: string;
  data?: {
    trip?: any;                    // 更新后的行程数据
    personaAlerts?: any[];         // 三人格的提醒
    decisionLog?: any[];           // 决策日志
    explanation?: string;          // 用户友好的解释
    autoAdjustments?: any[];       // 自动执行的调整
  };
  error?: string;
}

/**
 * LangGraph Orchestrator 服务类
 */
class PlanStudioOrchestrator {
  /**
   * 执行用户操作
   * 
   * @param action 操作类型
   * @param params 操作参数（必须包含 userId 和 tripId）
   * @returns OrchestrationResult
   */
  async executeUserAction(
    action: UserAction,
    params: Record<string, any> & { userId: string; tripId: string }
  ): Promise<OrchestrationResult> {
    try {
      const { userId, tripId } = params;
      if (!userId) {
        throw new Error('用户ID不能为空');
      }
      if (!tripId) {
        throw new Error('行程ID不能为空');
      }

      // 构建用户友好的操作描述
      const actionMessages: Record<UserAction, string> = {
        add_place: `添加地点 ${params.placeName || params.placeId} 到行程`,
        remove_place: `从行程中移除地点 ${params.placeName || params.placeId}`,
        modify_schedule: `修改行程日程`,
        optimize_route: `优化行程路线`,
        validate_safety: `验证行程安全性`,
        adjust_pacing: `调整行程节奏`,
        apply_repairs: `应用修复建议`,
      };

      const message = actionMessages[action] || `执行操作: ${action}`;

      // 构建请求
      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        trip_id: tripId,
        message,
        conversation_context: {
          recent_messages: [],
        },
        options: {
          // 可以在这里添加选项
          // 对于优化和修复操作，可能需要更多步骤
          max_steps: action === 'optimize_route' || action === 'apply_repairs' ? 50 : 20,
        },
      };

      // 调用 LangGraph Orchestrator
      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);

      // 解析响应
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';

      // 提取结果数据
      const result: OrchestrationResult = {
        success: response.result.status === 'SUCCESS',
        message: response.result.answer_text,
        data: {
          // 从 payload 中提取数据
          trip: response.result.payload?.trip,
          personaAlerts: response.result.payload?.personaAlerts || [],
          decisionLog: response.explain?.decision_log || [],
          explanation: response.result.answer_text,
          autoAdjustments: response.result.payload?.adjustments || [],
        },
      };

      return result;
    } catch (error: any) {
      console.error('Orchestrator execution failed:', error);
      return {
        success: false,
        error: error.message || '执行失败',
      };
    }
  }

  /**
   * 添加地点到行程
   */
  async addPlace(userId: string, tripId: string, placeId: number, dayId: string, placeName?: string): Promise<OrchestrationResult> {
    return this.executeUserAction('add_place', {
      userId,
      tripId,
      placeId,
      dayId,
      placeName,
    });
  }

  /**
   * 从行程中移除地点
   */
  async removePlace(userId: string, tripId: string, itemId: string, placeName?: string): Promise<OrchestrationResult> {
    return this.executeUserAction('remove_place', {
      userId,
      tripId,
      itemId,
      placeName,
    });
  }

  /**
   * 修改日程
   */
  async modifySchedule(userId: string, tripId: string, changes: any[]): Promise<OrchestrationResult> {
    return this.executeUserAction('modify_schedule', {
      userId,
      tripId,
      changes,
    });
  }

  /**
   * 优化路线
   */
  async optimizeRoute(userId: string, tripId: string, optimizationConfig?: any): Promise<OrchestrationResult> {
    return this.executeUserAction('optimize_route', {
      userId,
      tripId,
      optimizationConfig,
    });
  }
}

// 导出单例
export const orchestrator = new PlanStudioOrchestrator();

