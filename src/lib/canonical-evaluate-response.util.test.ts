import { describe, expect, it } from 'vitest';
import {
  findEvaluateCandidate,
  normalizeCanonicalEvaluateResponse,
  summarizeExcludedEvaluateCandidates,
} from '@/lib/canonical-evaluate-response.util';

describe('canonical-evaluate-response.util', () => {
  it('normalizes evaluate envelope with options, candidates, and recommended id', () => {
    const raw = {
      ok: true,
      flow: 'CANONICAL_L2',
      route: { resolution: 'PRIMARY' },
      data: {
        record: {
          decisionId: 'dec_1',
          selectedCandidateId: 'cand_split_day',
          utilityEvaluation: [{ dimension: 'POI_COVERAGE', value: 0.82 }],
        },
        options: [
          {
            id: 'cand_split_day',
            label: '拆分超载日',
            tradeoffs: [
              {
                dimension: 'POI_COVERAGE',
                direction: 'IMPROVE',
                value: 0.82,
                explanation: '体验意图保留',
              },
            ],
          },
        ],
        candidates: [
          { candidateId: 'original', abuVerdict: 'BLOCK', blocked: true },
          {
            candidateId: 'cand_split_day',
            abuVerdict: 'WARNING',
            blocked: false,
            utility: 0.2125,
          },
        ],
        comparisonView: {
          schemaId: 'tripnara.candidate_comparison@v1',
          recommendedCandidateId: 'cand_split_day',
          rows: [
            {
              schemeLabel: 'B',
              candidateId: 'cand_split_day',
              title: '拆分超载日',
              recommended: true,
              experienceRetentionLabel: '82%',
            },
          ],
        },
        impactScopeView: {
          schemaId: 'tripnara.impact_scope@v1',
          narrative: {
            templateKey: 'impact.daily_load.affects_arrangements',
            params: {
              dayIndexes: [5],
              arrangementLabels: ['红沙滩'],
              arrangementCount: 1,
            },
          },
        },
        leadingPersona: 'DRDRE',
        generatedAt: '2026-06-30T12:00:00Z',
      },
    };

    const result = normalizeCanonicalEvaluateResponse(raw);
    expect(result.recommendedCandidateId).toBe('cand_split_day');
    expect(result.comparisonView?.rows[0].experienceRetentionLabel).toBe('82%');
    expect(result.impactScopeView?.narrative.templateKey).toBe(
      'impact.daily_load.affects_arrangements',
    );
    expect(result.impactScopeView?.narrative.params?.arrangementLabels).toEqual(['红沙滩']);
    expect(result.options).toHaveLength(1);
    expect(result.options[0].tradeoffs?.[0].explanation).toBe('体验意图保留');
    expect(result.candidates).toHaveLength(2);
    expect(result.leadingPersona).toBe('DRDRE');
  });

  it('marks blocked candidates as non-executable on options', () => {
    const result = normalizeCanonicalEvaluateResponse({
      options: [{ id: 'original', label: '原方案' }],
      candidates: [{ candidateId: 'original', blocked: true, abuVerdict: 'BLOCK' }],
    });
    expect(result.options).toHaveLength(1);
    expect(result.options[0].executable).toBe(false);
  });

  it('summarizes excluded evaluate candidates', () => {
    const lines = summarizeExcludedEvaluateCandidates(
      [
        { candidateId: 'original', label: '原方案', blocked: true, abuVerdict: 'BLOCK' },
        { candidateId: 'cand_split_day', label: '拆分', blocked: false },
      ],
      'cand_split_day',
    );
    expect(lines[0]).toContain('原方案');
    expect(lines[0]).toContain('Abu');
  });

  it('finds evaluate candidate by id', () => {
    const found = findEvaluateCandidate(
      [{ candidateId: 'cand_a', utility: 0.5 }],
      'cand_a',
    );
    expect(found?.utility).toBe(0.5);
  });
});
