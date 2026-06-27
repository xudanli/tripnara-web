import { describe, expect, it } from 'vitest';
import {
  formatPlanningWorkbenchErrorForDisplay,
  mapPlanningWorkbenchUserMessage,
  parsePlanningWorkbenchError,
  planningWorkbenchErrorToUserMessage,
} from '@/lib/planning-workbench-error-map';

describe('planning-workbench-error-map', () => {
  it('maps semantic error codes', () => {
    expect(mapPlanningWorkbenchUserMessage('MISSING_PACE_FEEDBACK')).toMatch(/节奏反馈/);
    expect(mapPlanningWorkbenchUserMessage('MISSING_SKELETON_OPTIONS')).toMatch(/骨架方案/);
  });

  it('parses nested 400 message.errorCode', () => {
    const parsed = parsePlanningWorkbenchError({
      response: {
        status: 400,
        data: {
          message: {
            errorCode: 'MISSING_SELECTED_OPTION',
            message: 'commit requires selectedOptionId',
          },
        },
      },
    });
    expect(parsed.code).toBe('MISSING_SELECTED_OPTION');
    expect(parsed.message).toMatch(/选择.*方案/);
    expect(planningWorkbenchErrorToUserMessage({
      response: {
        status: 400,
        data: {
          message: {
            errorCode: 'MISSING_SELECTED_OPTION',
            message: 'commit requires selectedOptionId',
          },
        },
      },
    })).toBe('提交前请先选择一个方案。（MISSING_SELECTED_OPTION）');
  });

  it('parses top-level errorCode and string message as code', () => {
    const parsed = parsePlanningWorkbenchError({
      response: {
        status: 400,
        data: {
          errorCode: 'MISSING_PACE_FEEDBACK',
          message: 'adjust requires paceFeedback',
        },
      },
    });
    expect(parsed.code).toBe('MISSING_PACE_FEEDBACK');
    expect(formatPlanningWorkbenchErrorForDisplay(parsed)).toContain('MISSING_PACE_FEEDBACK');
  });

  it('does not map semantic 400 to service unavailable', () => {
    const msg = planningWorkbenchErrorToUserMessage({
      response: {
        status: 400,
        data: {
          message: {
            errorCode: 'SELECTED_OPTION_NOT_FOUND',
            message: 'option not in skeleton set',
          },
        },
      },
    });
    expect(msg).not.toMatch(/规划服务.*不可用/);
    expect(msg).toContain('SELECTED_OPTION_NOT_FOUND');
  });
});
