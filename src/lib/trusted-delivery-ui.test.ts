import { describe, expect, it } from 'vitest';
import {
  normalizeTrustedDelivery,
  pickTrustedDeliveryFromRouteRun,
  pickTrustedDeliveryFromStatusSnapshot,
  trustedDeliveryProgressLabel,
  trustedDeliveryProgressPercent,
} from '@/lib/trusted-delivery-ui';
import type { RouteAndRunResponse } from '@/api/agent';

describe('trusted-delivery-ui', () => {
  it('normalizes snake_case trusted_delivery_v1', () => {
    const td = normalizeTrustedDelivery({
      schemaId: 'tripnara.trusted_delivery@v1',
      version: 1,
      task_progress: {
        phase: 'researching',
        label_zh: '调研中',
        percent: 42,
        message: '正在拉取景点信息',
      },
      user_confirm: { required: false },
      degraded_explanation: {
        present: true,
        summary_zh: '部分传感器跳过',
        reasons_zh: ['实时路况不可用'],
      },
      flawed_disclosure: { present: true, headline_zh: '仍有未验证约束' },
      ai_operation_log: [
        { label_zh: '调研景点', summary: '完成', duration_ms: 1200 },
      ],
    });

    expect(td?.task_progress.label_zh).toBe('调研中');
    expect(td?.degraded_explanation.present).toBe(true);
    expect(td?.flawed_disclosure.headline_zh).toBe('仍有未验证约束');
    expect(td?.ai_operation_log).toHaveLength(1);
  });

  it('rejects wrong schema', () => {
    expect(
      normalizeTrustedDelivery({
        schemaId: 'tripnara.other@v1',
        task_progress: { phase: 'done', label_zh: '完成' },
      })
    ).toBeNull();
  });

  it('picks from route_and_run payload for any status', () => {
    const response = {
      result: {
        status: 'FAILED',
        answer_text: '失败',
        payload: {
          trusted_delivery_v1: {
            schemaId: 'tripnara.trusted_delivery@v1',
            task_progress: { phase: 'blocked', label_zh: '已中断' },
            degraded_explanation: { present: true, reasons_zh: ['超时'] },
            user_confirm: { required: false },
            flawed_disclosure: { present: false },
            ai_operation_log: [],
          },
        },
      },
    } as unknown as RouteAndRunResponse;

    const td = pickTrustedDeliveryFromRouteRun(response);
    expect(td?.task_progress.label_zh).toBe('已中断');
    expect(td?.degraded_explanation.reasons_zh).toEqual(['超时']);
  });

  it('reads trusted delivery from async status data', () => {
    const td = pickTrustedDeliveryFromStatusSnapshot({
      task_id: 't1',
      status: 'PROCESSING',
      message: 'SSE 补充',
      data: {
        result: {
          payload: {
            trusted_delivery_v1: {
              schemaId: 'tripnara.trusted_delivery@v1',
              task_progress: { phase: 'planning', label_zh: '规划中', percent: 70 },
              user_confirm: { required: false },
              degraded_explanation: { present: false },
              flawed_disclosure: { present: false },
              ai_operation_log: [],
            },
          },
        },
      },
    });

    expect(trustedDeliveryProgressPercent(td)).toBe(70);
    expect(trustedDeliveryProgressLabel(td, { sseMessage: 'SSE 补充' })).toContain('规划中');
    expect(trustedDeliveryProgressLabel(td, { sseMessage: 'SSE 补充' })).toContain('SSE 补充');
  });
});
