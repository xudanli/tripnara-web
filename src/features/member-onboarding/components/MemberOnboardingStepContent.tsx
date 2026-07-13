import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GuideImportCard, guideImportUi } from '@/components/guide-import/guide-import-ui';
import { formatTripMemberRef, tripResponsibilityOwnerEntries } from '@/lib/trip-responsibility.util';
import type { TripResponsibilityOwners } from '@/types/trip-responsibility';
import { TRIP_RESPONSIBILITY_ROLE_LABELS } from '@/types/trip-responsibility';
import type { MemberOnboardingDraft, MemberOnboardingStepId, MemberTripRole } from '@/types/member-onboarding';
import {
  AVOID_EXPERIENCE_OPTIONS,
  CORE_WISH_OPTIONS,
  DIET_OPTIONS,
  GUARDIAN_FOR_OPTIONS,
  HEALTH_OPTIONS,
  LODGING_OPTIONS,
  MUST_EXPERIENCE_OPTIONS,
  PACE_LABELS,
  PRIVATE_CONCERN_OPTIONS,
  SPENDING_LABELS,
  SPLIT_LABELS,
  WALK_LIMIT_OPTIONS,
  joinCoreWishes,
  joinOnboardingSelections,
  joinPrivateConcerns,
  splitCoreWishes,
  splitOnboardingSelections,
  splitPrivateConcerns,
} from '@/lib/member-onboarding-options';
import {
  MemberOnboardingOptionChips,
  MemberOnboardingOptionalNote,
} from './MemberOnboardingOptionChips';

interface StepContentProps {
  stepId: MemberOnboardingStepId;
  draft: MemberOnboardingDraft;
  onChange: (patch: Partial<MemberOnboardingDraft>) => void;
}

const ROLE_OPTIONS: Array<{ value: MemberTripRole; label: string }> = [
  { value: 'MEMBER', label: '普通成员' },
  { value: 'PAYER', label: '付款人' },
  { value: 'FINAL_CONFIRMER', label: '最终确认人' },
  { value: 'PRIMARY_CONTACT', label: '主联系人' },
  { value: 'GUARDIAN', label: '代理人（代填/代确认）' },
];

function SectionHint({ children }: { children: string }) {
  return <p className={guideImportUi.footnote}>{children}</p>;
}

export function MemberOnboardingStepContent({ stepId, draft, onChange }: StepContentProps) {
  switch (stepId) {
    case 'role': {
      const guardianSplit = splitOnboardingSelections(
        draft.guardianFor ?? '',
        GUARDIAN_FOR_OPTIONS,
      );
      return (
        <GuideImportCard className="space-y-4">
          <div className="space-y-1.5">
            <Label className={guideImportUi.label}>姓名或昵称 *</Label>
            <Input
              value={draft.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="你的称呼"
            />
          </div>
          <div className="space-y-1.5">
            <Label className={guideImportUi.label}>本次角色 *</Label>
            <Select
              value={draft.tripRole}
              onValueChange={(v) => onChange({ tripRole: v as MemberTripRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {draft.tripRole === 'GUARDIAN' ? (
            <div className="space-y-2">
              <Label className={guideImportUi.label}>代理对象</Label>
              <MemberOnboardingOptionChips
                options={GUARDIAN_FOR_OPTIONS}
                selected={guardianSplit.selected}
                onChange={(selected) =>
                  onChange({
                    guardianFor: joinOnboardingSelections(selected, guardianSplit.other),
                  })
                }
                max={1}
              />
              <MemberOnboardingOptionalNote
                value={guardianSplit.other}
                onChange={(other) =>
                  onChange({
                    guardianFor: joinOnboardingSelections(guardianSplit.selected, other),
                  })
                }
                placeholder="或填写具体称呼"
              />
            </div>
          ) : null}
        </GuideImportCard>
      );
    }

    case 'core-wish': {
      const wishSplit = splitCoreWishes(draft.coreWishes);
      return (
        <GuideImportCard className="space-y-4">
          <SectionHint>点选 1～3 项即可，无需长篇描述</SectionHint>
          <MemberOnboardingOptionChips
            options={CORE_WISH_OPTIONS}
            selected={wishSplit.selected}
            onChange={(selected) =>
              onChange({ coreWishes: joinCoreWishes(selected, wishSplit.other) })
            }
            max={3}
          />
          <MemberOnboardingOptionalNote
            value={wishSplit.other}
            onChange={(other) =>
              onChange({ coreWishes: joinCoreWishes(wishSplit.selected, other) })
            }
            placeholder="其他愿望（可选）"
          />
        </GuideImportCard>
      );
    }

    case 'experience': {
      const mustSplit = splitOnboardingSelections(draft.mustExperience, MUST_EXPERIENCE_OPTIONS);
      const avoidSplit = splitOnboardingSelections(draft.avoidExperience, AVOID_EXPERIENCE_OPTIONS);
      return (
        <GuideImportCard className="space-y-5">
          <SectionHint>多选标签即可，帮助顾问理解你的偏好边界</SectionHint>
          <div className="space-y-2">
            <Label className={guideImportUi.label}>想体验的活动</Label>
            <MemberOnboardingOptionChips
              options={MUST_EXPERIENCE_OPTIONS}
              selected={mustSplit.selected}
              onChange={(selected) =>
                onChange({ mustExperience: joinOnboardingSelections(selected, mustSplit.other) })
              }
            />
            <MemberOnboardingOptionalNote
              value={mustSplit.other}
              onChange={(other) =>
                onChange({ mustExperience: joinOnboardingSelections(mustSplit.selected, other) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className={guideImportUi.label}>不想体验的活动</Label>
            <MemberOnboardingOptionChips
              options={AVOID_EXPERIENCE_OPTIONS}
              selected={avoidSplit.selected}
              onChange={(selected) =>
                onChange({ avoidExperience: joinOnboardingSelections(selected, avoidSplit.other) })
              }
            />
            <MemberOnboardingOptionalNote
              value={avoidSplit.other}
              onChange={(other) =>
                onChange({ avoidExperience: joinOnboardingSelections(avoidSplit.selected, other) })
              }
            />
          </div>
        </GuideImportCard>
      );
    }

    case 'pace':
      return (
        <GuideImportCard className="space-y-4">
          <div className="space-y-2">
            <Label className={guideImportUi.label}>整体节奏</Label>
            <MemberOnboardingOptionChips
              options={Object.values(PACE_LABELS)}
              selected={[PACE_LABELS[draft.pacePreference]]}
              onChange={(selected) => {
                const label = selected[selected.length - 1];
                const entry = Object.entries(PACE_LABELS).find(([, v]) => v === label);
                if (entry) {
                  onChange({ pacePreference: entry[0] as MemberOnboardingDraft['pacePreference'] });
                }
              }}
              max={1}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="early-riser"
              checked={draft.earlyRiser}
              onCheckedChange={(c) => onChange({ earlyRiser: c === true })}
            />
            <Label htmlFor="early-riser" className="text-sm font-normal">
              可以接受早起安排
            </Label>
          </div>
          <div className="space-y-2">
            <Label className={guideImportUi.label}>每日步行上限</Label>
            <MemberOnboardingOptionChips
              options={WALK_LIMIT_OPTIONS.map((o) => o.label)}
              selected={[
                WALK_LIMIT_OPTIONS.find((o) => o.value === draft.maxDailyWalkKm)?.label ?? '不限',
              ]}
              onChange={(selected) => {
                const label = selected[selected.length - 1] ?? '不限';
                const opt = WALK_LIMIT_OPTIONS.find((o) => o.label === label);
                onChange({ maxDailyWalkKm: opt?.value });
              }}
              max={1}
            />
          </div>
        </GuideImportCard>
      );

    case 'lodging': {
      const lodgingSplit = splitOnboardingSelections(draft.lodgingPreference, LODGING_OPTIONS);
      return (
        <GuideImportCard className="space-y-4">
          <SectionHint>选择符合你期望的住宿特点</SectionHint>
          <MemberOnboardingOptionChips
            options={LODGING_OPTIONS}
            selected={lodgingSplit.selected}
            onChange={(selected) =>
              onChange({ lodgingPreference: joinOnboardingSelections(selected, lodgingSplit.other) })
            }
          />
          <MemberOnboardingOptionalNote
            value={lodgingSplit.other}
            onChange={(other) =>
              onChange({ lodgingPreference: joinOnboardingSelections(lodgingSplit.selected, other) })
            }
          />
        </GuideImportCard>
      );
    }

    case 'diet-health': {
      const dietSplit = splitOnboardingSelections(draft.dietRestrictions, DIET_OPTIONS);
      const healthSplit = splitOnboardingSelections(draft.healthNotes, HEALTH_OPTIONS);
      return (
        <GuideImportCard className="space-y-5">
          <div className="space-y-2">
            <Label className={guideImportUi.label}>饮食限制</Label>
            <MemberOnboardingOptionChips
              options={DIET_OPTIONS}
              selected={dietSplit.selected}
              onChange={(selected) => {
                const filtered = selected.filter((s) => s !== '无特殊要求');
                onChange({
                  dietRestrictions: joinOnboardingSelections(
                    filtered.length ? filtered : selected.includes('无特殊要求') ? ['无特殊要求'] : [],
                    dietSplit.other,
                  ),
                });
              }}
            />
            <MemberOnboardingOptionalNote
              value={dietSplit.other}
              onChange={(other) =>
                onChange({
                  dietRestrictions: joinOnboardingSelections(dietSplit.selected, other),
                })
              }
              placeholder="其他忌口或过敏（可选）"
            />
          </div>
          <div className="space-y-2">
            <Label className={guideImportUi.label}>健康注意事项</Label>
            <MemberOnboardingOptionChips
              options={HEALTH_OPTIONS}
              selected={healthSplit.selected}
              onChange={(selected) => {
                const filtered = selected.filter((s) => s !== '无特殊状况');
                onChange({
                  healthNotes: joinOnboardingSelections(
                    filtered.length
                      ? filtered
                      : selected.includes('无特殊状况')
                        ? ['无特殊状况']
                        : [],
                    healthSplit.other,
                  ),
                });
              }}
            />
            <MemberOnboardingOptionalNote
              value={healthSplit.other}
              onChange={(other) =>
                onChange({ healthNotes: joinOnboardingSelections(healthSplit.selected, other) })
              }
              placeholder="其他健康情况（可选）"
            />
          </div>
        </GuideImportCard>
      );
    }

    case 'spending':
      return (
        <GuideImportCard className="space-y-4">
          <div className="space-y-2">
            <Label className={guideImportUi.label}>个人消费档位</Label>
            <MemberOnboardingOptionChips
              options={Object.values(SPENDING_LABELS)}
              selected={[SPENDING_LABELS[draft.personalSpendingLevel]]}
              onChange={(selected) => {
                const label = selected[selected.length - 1];
                const entry = Object.entries(SPENDING_LABELS).find(([, v]) => v === label);
                if (entry) {
                  onChange({
                    personalSpendingLevel: entry[0] as MemberOnboardingDraft['personalSpendingLevel'],
                  });
                }
              }}
              max={1}
            />
            <p className={guideImportUi.footnote}>
              此处不是行程总预算，总预算由付款人确认。
            </p>
          </div>
          <MemberOnboardingOptionalNote
            value={draft.personalSpendingNotes}
            onChange={(personalSpendingNotes) => onChange({ personalSpendingNotes })}
          />
        </GuideImportCard>
      );

    case 'grouping':
      return (
        <GuideImportCard className="space-y-4">
          <div className="space-y-2">
            <Label className={guideImportUi.label}>是否接受分组 / 分流</Label>
            <MemberOnboardingOptionChips
              options={Object.values(SPLIT_LABELS)}
              selected={[SPLIT_LABELS[draft.acceptSplitGroup]]}
              onChange={(selected) => {
                const label = selected[selected.length - 1];
                const entry = Object.entries(SPLIT_LABELS).find(([, v]) => v === label);
                if (entry) {
                  onChange({
                    acceptSplitGroup: entry[0] as MemberOnboardingDraft['acceptSplitGroup'],
                  });
                }
              }}
              max={1}
            />
          </div>
          <MemberOnboardingOptionalNote
            value={draft.splitGroupNotes}
            onChange={(splitGroupNotes) => onChange({ splitGroupNotes })}
          />
        </GuideImportCard>
      );

    case 'private-notes': {
      const privateSplit = splitPrivateConcerns(draft.privateNotes);
      const showOther = !privateSplit.selected.includes('暂无补充');
      return (
        <GuideImportCard className="space-y-4">
          <SectionHint>点选即可；选「暂无补充」可跳过文字输入</SectionHint>
          <div className="space-y-2">
            <Label className={guideImportUi.label}>私密想法</Label>
            <MemberOnboardingOptionChips
              options={PRIVATE_CONCERN_OPTIONS}
              selected={privateSplit.selected}
              onChange={(selected) => {
                const next = selected.includes('暂无补充')
                  ? ['暂无补充']
                  : selected.filter((s) => s !== '暂无补充');
                onChange({
                  privateNotes: joinPrivateConcerns(next, privateSplit.other),
                });
              }}
            />
          </div>
          {showOther ? (
            <MemberOnboardingOptionalNote
              value={privateSplit.other}
              onChange={(other) =>
                onChange({
                  privateNotes: joinPrivateConcerns(
                    privateSplit.selected.filter((s) => s !== '暂无补充'),
                    other,
                  ),
                })
              }
              placeholder="其他仅顾问可见的顾虑（可选）"
            />
          ) : null}
          <div className="space-y-1.5">
            <Label className={guideImportUi.label}>授权范围</Label>
            <Select
              value={draft.privateNotesAuth}
              onValueChange={(v) =>
                onChange({
                  privateNotesAuth: v as MemberOnboardingDraft['privateNotesAuth'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANITIZED_TO_ADVISOR">脱敏后给顾问</SelectItem>
                <SelectItem value="ANALYST_ONLY">仅分析师可见</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GuideImportCard>
      );
    }

    case 'review':
      return (
        <GuideImportCard className="space-y-3">
          <dl className="divide-y divide-border rounded-xl border border-border text-sm">
            {[
              ['称呼', draft.displayName],
              ['角色', ROLE_OPTIONS.find((r) => r.value === draft.tripRole)?.label ?? draft.tripRole],
              ['核心愿望', draft.coreWishes.filter(Boolean).join('、') || '—'],
              ['想体验', draft.mustExperience || '—'],
              ['不想体验', draft.avoidExperience || '—'],
              ['节奏', PACE_LABELS[draft.pacePreference]],
              [
                '步行上限',
                WALK_LIMIT_OPTIONS.find((o) => o.value === draft.maxDailyWalkKm)?.label ?? '不限',
              ],
              ['早起', draft.earlyRiser ? '可以接受' : '不偏好'],
              ['住宿', draft.lodgingPreference || '—'],
              ['饮食健康', [draft.dietRestrictions, draft.healthNotes].filter(Boolean).join('、') || '—'],
              ['消费档位', SPENDING_LABELS[draft.personalSpendingLevel]],
              ['分组意愿', SPLIT_LABELS[draft.acceptSplitGroup]],
              ['私密想法', draft.privateNotes || '暂无补充'],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[100px_1fr]">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </GuideImportCard>
      );

    default:
      return null;
  }
}

interface TripResponsibilityOwnersPanelProps {
  owners: TripResponsibilityOwners;
  compact?: boolean;
  className?: string;
}

export function TripResponsibilityOwnersPanel({
  owners,
  compact = false,
  className,
}: TripResponsibilityOwnersPanelProps) {
  return (
    <div className={className}>
      {!compact ? (
        <p className="mb-3 text-sm text-muted-foreground">
          异常推送与确认路由将依据以下责任分配。顾问主导规划，领队主导现场，付款人批准预算。
        </p>
      ) : null}
      <dl className="divide-y divide-border rounded-xl border border-border">
        {tripResponsibilityOwnerEntries(owners).map(({ key, ref }) => (
          <div
            key={key}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]"
          >
            <dt className="text-xs text-muted-foreground">{TRIP_RESPONSIBILITY_ROLE_LABELS[key]}</dt>
            <dd className="text-sm">{formatTripMemberRef(ref)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
