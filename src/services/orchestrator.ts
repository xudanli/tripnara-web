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
    approvalId?: string;           // 如果需要审批，包含审批 ID
    needsApproval?: boolean;       // 是否需要审批
  };
  error?: string;
  needsApproval?: boolean;         // 是否需要审批（用于快速判断）
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

      // 构建用户友好的操作描述，包含关键信息
      let message: string;
      
      switch (action) {
        case 'add_place':
          // 添加地点：构建详细的结构化消息，便于后端理解
          const placeDetails = {
            action: 'add_place',
            placeId: params.placeId,
            dayId: params.dayId,
            placeName: params.placeName || `地点ID: ${params.placeId}`,
            startTime: params.startTime,
            endTime: params.endTime,
          };
          // 构建自然语言描述和结构化信息
          message = `用户添加地点到行程。地点名称: ${placeDetails.placeName}，地点ID: ${placeDetails.placeId}，日期ID: ${placeDetails.dayId}${placeDetails.startTime ? `，开始时间: ${placeDetails.startTime}` : ''}${placeDetails.endTime ? `，结束时间: ${placeDetails.endTime}` : ''}。请检查这个地点是否符合安全要求、节奏要求和行程合理性。`;
          break;
          
        case 'remove_place':
          // 移除地点：包含行程项ID和地点信息
          const removeInfo = [
            `行程项ID: ${params.itemId}`,
            params.placeName ? `地点名称: ${params.placeName}` : null,
          ].filter(Boolean);
          message = `从行程中移除地点。${removeInfo.join('; ')}`;
          break;
          
        case 'modify_schedule':
          // 修改日程：包含变更详情
          const changeInfo = params.changes ? 
            `变更详情: ${JSON.stringify(params.changes)}` : 
            '修改了行程日程';
          message = `修改行程日程。${changeInfo}`;
          break;
          
        case 'optimize_route':
          // 优化路线：包含优化配置
          const optInfo = params.optimizationConfig ? 
            `优化配置: ${JSON.stringify(params.optimizationConfig)}` : 
            '优化行程路线';
          message = `优化行程路线。${optInfo}`;
          break;
          
        default:
          message = `执行操作: ${action}`;
      }

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
      
      // 检查是否需要审批（NEED_CONFIRMATION 不是失败，而是需要用户审批）
      const needsApproval = 
        response.result.status === 'NEED_CONFIRMATION' && 
        response.result.payload?.suspensionInfo;
      
      // 判断执行是否成功
      // SUCCESS 表示成功，NEED_CONFIRMATION 表示需要审批（不是失败），其他状态视为失败
      const isSuccess = response.result.status === 'SUCCESS';
      const statusMessage = response.result.answer_text || '未知状态';
      const decisionLog = response.explain?.decision_log || [];

      // 尝试从决策日志中提取更详细的错误信息
      let detailedError: string | undefined;
      if (!isSuccess && decisionLog.length > 0) {
        // 查找最后一个失败的决策步骤
        const lastFailedStep = decisionLog
          .filter(step => step.reason_code && (
            step.reason_code.includes('FAILED') || 
            step.reason_code.includes('ERROR') ||
            step.reason_code.includes('CONSTRAINT')
          ))
          .pop();
        
        if (lastFailedStep?.facts) {
          // 尝试从 facts 中提取错误详情
          const errorDetails = Object.entries(lastFailedStep.facts)
            .filter(([key]) => key.toLowerCase().includes('error') || key.toLowerCase().includes('reason'))
            .map(([, value]) => String(value))
            .join('; ');
          
          if (errorDetails) {
            detailedError = errorDetails;
          }
        }
      }

      // 构建友好的错误消息
      let userFriendlyError: string | undefined;
      if (!isSuccess && !needsApproval) {
        // 如果需要审批，不作为错误处理，而是在结果中标记
        switch (response.result.status) {
          case 'FAILED':
            userFriendlyError = detailedError || statusMessage || '规划失败，请检查约束条件';
            break;
          case 'NEED_MORE_INFO':
            userFriendlyError = statusMessage || '需要更多信息才能完成操作';
            break;
          case 'NEED_CONSENT':
            userFriendlyError = statusMessage || '需要您的确认才能继续';
            break;
          case 'NEED_CONFIRMATION':
            // 需要审批，不作为错误，而是特殊标记
            userFriendlyError = undefined;
            break;
          case 'TIMEOUT':
            userFriendlyError = '操作超时，请稍后重试';
            break;
          default:
            userFriendlyError = statusMessage || '操作未成功完成';
        }
      }

      // 提取结果数据
      const result: OrchestrationResult = {
        success: isSuccess || needsApproval, // 如果需要审批，也视为"成功"（等待审批）
        message: statusMessage,
        needsApproval: needsApproval, // 标记是否需要审批
        data: {
          // 从 payload 中提取数据
          trip: response.result.payload?.trip,
          personaAlerts: response.result.payload?.personaAlerts || [],
          decisionLog: decisionLog,
          explanation: statusMessage,
          autoAdjustments: response.result.payload?.adjustments || [],
          // 如果需要审批，包含审批信息
          ...(needsApproval && {
            approvalId: response.result.payload?.suspensionInfo?.approvalId,
            needsApproval: true,
          }),
        },
        // 设置友好的错误信息（如果需要审批，不设置错误）
        error: needsApproval ? undefined : userFriendlyError,
      };

      // 根据执行结果输出不同的日志
      if (isSuccess) {
        console.log('[Orchestrator] 执行成功:', {
          action,
          tripId,
          success: result.success,
          hasAlerts: result.data?.personaAlerts?.length > 0,
          hasAdjustments: result.data?.autoAdjustments?.length > 0,
        });
      } else {
        console.warn('[Orchestrator] 执行未成功:', {
          action,
          tripId,
          success: result.success,
          status: response.result.status,
          message: statusMessage,
          hasAlerts: result.data?.personaAlerts?.length > 0,
          hasAdjustments: result.data?.autoAdjustments?.length > 0,
        });
      }

      return result;
    } catch (error: any) {
      // 在 catch 块中从 params 获取，因为 try 块中的解构可能未执行
      const tripIdFromParams = params?.tripId;
      const userIdFromParams = params?.userId;
      
      console.error('[Orchestrator] 执行失败:', {
        action,
        tripId: tripIdFromParams,
        userId: userIdFromParams,
        error,
        message: error.message,
        stack: error.stack,
      });
      
      return {
        success: false,
        error: error.message || '执行失败',
        message: `操作失败: ${error.message || '未知错误'}`,
      };
    }
  }

  /**
   * 添加地点到行程
   */
  async addPlace(
    userId: string, 
    tripId: string, 
    placeId: number, 
    dayId: string, 
    placeName?: string,
    startTime?: string,
    endTime?: string
  ): Promise<OrchestrationResult> {
    return this.executeUserAction('add_place', {
      userId,
      tripId,
      placeId,
      dayId,
      placeName,
      startTime,
      endTime,
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

