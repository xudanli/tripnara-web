/**
 * 体能评估埋点工具
 * 
 * @module utils/fitness-analytics
 */

import type { FitnessLevel, ConfidenceLevel, EffortRating, AdjustmentType } from '@/types/fitness';

// ==================== 埋点事件名称 ====================

export const FITNESS_ANALYTICS_EVENTS = {
  // 问卷相关
  QUESTIONNAIRE_STARTED: 'fitness_questionnaire_started',
  QUESTIONNAIRE_STEP_COMPLETED: 'fitness_questionnaire_step_completed',
  QUESTIONNAIRE_SUBMITTED: 'fitness_questionnaire_submitted',
  QUESTIONNAIRE_SKIPPED: 'fitness_questionnaire_skipped',
  QUESTIONNAIRE_ABANDONED: 'fitness_questionnaire_abandoned',
  QUESTIONNAIRE_RESUMED: 'fitness_questionnaire_resumed',
  
  // 体能画像
  PROFILE_VIEWED: 'fitness_profile_viewed',
  REASSESSMENT_TRIGGERED: 'fitness_reassessment_triggered',
  
  // 反馈相关
  FEEDBACK_DIALOG_SHOWN: 'fitness_feedback_dialog_shown',
  FEEDBACK_SUBMITTED: 'fitness_feedback_submitted',
  FEEDBACK_DISMISSED: 'fitness_feedback_dismissed',
  
  // 校准相关
  CALIBRATION_TRIGGERED: 'fitness_calibration_triggered',
  CALIBRATION_RESULT: 'fitness_calibration_result',
} as const;

// ==================== 通用埋点函数 ====================

/**
 * 发送埋点事件
 * 如果项目有统一的埋点服务，可以在这里集成
 */
function track(eventName: string, properties?: Record<string, any>): void {
  // 开发环境打印日志
  if (import.meta.env.DEV) {
    console.log('[FitnessAnalytics]', eventName, properties);
  }

  // TODO: 集成实际的埋点服务
  // 例如：
  // analytics.track(eventName, properties);
  // gtag('event', eventName, properties);
  // mixpanel.track(eventName, properties);
  
  // 临时使用 window.dataLayer（如果有 GTM）
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

// ==================== 问卷相关埋点 ====================

/**
 * 问卷开始
 */
export function trackQuestionnaireStarted(trigger: string): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_STARTED, {
    trigger,
    timestamp: Date.now(),
  });
}

/**
 * 问卷步骤完成
 */
export function trackStepCompleted(params: {
  step: number;
  questionId: string;
  answer: number;
  timeOnStep?: number;
}): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_STEP_COMPLETED, {
    step: params.step,
    question_id: params.questionId,
    answer: params.answer,
    time_on_step_ms: params.timeOnStep,
  });
}

/**
 * 问卷提交
 */
export function trackQuestionnaireSubmitted(params: {
  fitnessLevel: FitnessLevel;
  fitnessScore: number;
  confidence: ConfidenceLevel;
  timeSpentSeconds: number;
  stepsChanged?: number;
}): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_SUBMITTED, {
    fitness_level: params.fitnessLevel,
    fitness_score: params.fitnessScore,
    confidence: params.confidence,
    time_spent_seconds: params.timeSpentSeconds,
    steps_changed: params.stepsChanged ?? 0,
  });
}

/**
 * 问卷跳过
 */
export function trackQuestionnaireSkipped(atStep: number): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_SKIPPED, {
    at_step: atStep,
  });
}

/**
 * 问卷放弃（中途离开）
 */
export function trackQuestionnaireAbandoned(params: {
  atStep: number;
  timeSpentSeconds: number;
}): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_ABANDONED, {
    at_step: params.atStep,
    time_spent_seconds: params.timeSpentSeconds,
  });
}

/**
 * 问卷恢复（从之前保存的进度继续）
 */
export function trackQuestionnaireResumed(params: {
  resumedAtStep: number;
  savedHoursAgo: number;
}): void {
  track(FITNESS_ANALYTICS_EVENTS.QUESTIONNAIRE_RESUMED, {
    resumed_at_step: params.resumedAtStep,
    saved_hours_ago: params.savedHoursAgo,
  });
}

// ==================== 体能画像埋点 ====================

/**
 * 查看体能画像
 */
export function trackProfileViewed(source: string): void {
  track(FITNESS_ANALYTICS_EVENTS.PROFILE_VIEWED, {
    source,
  });
}

/**
 * 触发重新评估
 */
export function trackReassessmentTriggered(reason?: string): void {
  track(FITNESS_ANALYTICS_EVENTS.REASSESSMENT_TRIGGERED, {
    reason,
  });
}

// ==================== 反馈相关埋点 ====================

/**
 * 反馈弹窗展示
 */
export function trackFeedbackDialogShown(tripId: string): void {
  track(FITNESS_ANALYTICS_EVENTS.FEEDBACK_DIALOG_SHOWN, {
    trip_id: tripId,
  });
}

/**
 * 反馈提交
 */
export function trackFeedbackSubmitted(params: {
  tripId: string;
  effortRating: EffortRating;
  completedAsPlanned: boolean;
  adjustmentsMade: AdjustmentType[];
}): void {
  track(FITNESS_ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, {
    trip_id: params.tripId,
    effort_rating: params.effortRating,
    completed_as_planned: params.completedAsPlanned,
    adjustments_count: params.adjustmentsMade.length,
    adjustments: params.adjustmentsMade,
  });
}

/**
 * 反馈跳过
 */
export function trackFeedbackDismissed(tripId: string): void {
  track(FITNESS_ANALYTICS_EVENTS.FEEDBACK_DISMISSED, {
    trip_id: tripId,
  });
}

// ==================== 校准相关埋点 ====================

/**
 * 触发校准
 */
export function trackCalibrationTriggered(source: 'auto' | 'manual'): void {
  track(FITNESS_ANALYTICS_EVENTS.CALIBRATION_TRIGGERED, {
    source,
  });
}

/**
 * 校准结果
 */
export function trackCalibrationResult(params: {
  calibrated: boolean;
  calibrationFactor?: number;
  feedbackCount?: number;
  oldMaxAscent?: number;
  newMaxAscent?: number;
}): void {
  track(FITNESS_ANALYTICS_EVENTS.CALIBRATION_RESULT, {
    calibrated: params.calibrated,
    calibration_factor: params.calibrationFactor,
    feedback_count: params.feedbackCount,
    old_max_ascent: params.oldMaxAscent,
    new_max_ascent: params.newMaxAscent,
  });
}

// ==================== 导出对象形式（兼容旧代码） ====================

export const FitnessAnalytics = {
  trackQuestionnaireStarted,
  trackStepCompleted,
  trackQuestionnaireSubmitted,
  trackQuestionnaireSkipped,
  trackQuestionnaireAbandoned,
  trackQuestionnaireResumed,
  trackProfileViewed,
  trackReassessmentTriggered,
  trackFeedbackDialogShown,
  trackFeedbackSubmitted,
  trackFeedbackDismissed,
  trackCalibrationTriggered,
  trackCalibrationResult,
};
