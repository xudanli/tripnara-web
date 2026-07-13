import { CalendarIcon, MapPin, Users, Wallet, UserCircle2, ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GuideDatePicker } from '@/components/guide-import/GuideDatePicker';
import { GuideImportCard, guideImportUi } from '@/components/guide-import/guide-import-ui';
import { computeTripDayCount, formatContactSummary } from '@/lib/advisor-trip-create.util';
import type {
  AdvisorTripContactForm,
  AdvisorTripCreateFormState,
  OrganizationStaffOption,
} from '@/types/advisor-trip-create';
import { cn } from '@/lib/utils';

interface StepProps {
  form: AdvisorTripCreateFormState;
  onChange: (next: AdvisorTripCreateFormState) => void;
}

interface RolesStepProps extends StepProps {
  advisorOptions: OrganizationStaffOption[];
  leaderOptions: OrganizationStaffOption[];
}

function ContactFields({
  label,
  value,
  onChange,
  idPrefix,
  fields,
}: {
  label: string;
  value: AdvisorTripContactForm;
  onChange: (next: AdvisorTripContactForm) => void;
  idPrefix: string;
  fields: Array<'email' | 'phone'>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-name`} className={guideImportUi.label}>
            姓名 *
          </Label>
          <Input
            id={`${idPrefix}-name`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="张三"
          />
        </div>
        {fields.includes('email') ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-email`} className={guideImportUi.label}>
              邮箱
            </Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={value.email ?? ''}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              placeholder="zhang@example.com"
            />
          </div>
        ) : null}
        {fields.includes('phone') ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-phone`} className={guideImportUi.label}>
              手机
            </Label>
            <Input
              id={`${idPrefix}-phone`}
              value={value.phone ?? ''}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="13800000000"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StaffSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: AdvisorTripContactForm;
  options: OrganizationStaffOption[];
  onChange: (next: AdvisorTripContactForm) => void;
  placeholder: string;
  hint?: string;
}) {
  const selectValue = value.userId ?? (value.name ? `manual:${value.name}` : '');

  return (
    <div className="space-y-1.5">
      <Label className={guideImportUi.label}>{label} *</Label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {options.length > 0 ? (
        <Select
          value={selectValue || undefined}
          onValueChange={(v) => {
            if (v.startsWith('manual:')) {
              onChange({ name: v.slice('manual:'.length) });
              return;
            }
            const picked = options.find((o) => o.userId === v);
            if (picked) {
              onChange({ userId: picked.userId, name: picked.displayName });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.userId} value={option.userId}>
                {option.displayName}
                {option.roles.length > 0 ? ` · ${option.roles.join('/')}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value, userId: undefined })}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export function AdvisorTripCreateBasicStep({ form, onChange }: StepProps) {
  const patch = (partial: Partial<AdvisorTripCreateFormState>) => {
    const next = { ...form, ...partial };
    if (partial.startDate !== undefined || partial.endDate !== undefined) {
      next.dayCount = computeTripDayCount(next.startDate, next.endDate);
    }
    onChange(next);
  };

  return (
    <GuideImportCard className="space-y-5">
      <div>
        <h3 className={guideImportUi.sectionTitle}>行程基本信息</h3>
        <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
          填写目的地、日期与预计人数，系统将自动计算天数并生成对应 TripDay。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="advisor-trip-name" className={guideImportUi.label}>
          行程名称（可选）
        </Label>
        <Input
          id="advisor-trip-name"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="冰岛南岸团"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="advisor-trip-dest" className={guideImportUi.label}>
          <MapPin className="mr-1 inline h-3.5 w-3.5" />
          目的地 *
        </Label>
        <Input
          id="advisor-trip-dest"
          value={form.destination}
          onChange={(e) => patch({ destination: e.target.value })}
          placeholder="IS"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={guideImportUi.label}>
            <CalendarIcon className="mr-1 inline h-3.5 w-3.5" />
            出发日期 *
          </Label>
          <GuideDatePicker
            value={form.startDate}
            onChange={(startDate) => patch({ startDate: startDate ?? '' })}
            placeholder="出发日期"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={guideImportUi.label}>返回日期 *</Label>
          <GuideDatePicker
            value={form.endDate}
            onChange={(endDate) => patch({ endDate: endDate ?? '' })}
            placeholder="返回日期"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={guideImportUi.label}>天数</Label>
          <Input
            readOnly
            value={form.dayCount > 0 ? `${form.dayCount} 天` : '—'}
            className="bg-muted/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="advisor-trip-headcount" className={guideImportUi.label}>
            <Users className="mr-1 inline h-3.5 w-3.5" />
            预计人数 *
          </Label>
          <Input
            id="advisor-trip-headcount"
            type="number"
            min={1}
            max={99}
            value={form.estimatedHeadcount}
            onChange={(e) => patch({ estimatedHeadcount: Number(e.target.value) || 1 })}
          />
        </div>
      </div>
    </GuideImportCard>
  );
}

export function AdvisorTripCreateRolesStep({
  form,
  onChange,
  advisorOptions,
  leaderOptions,
}: RolesStepProps) {
  const patch = (partial: Partial<AdvisorTripCreateFormState>) => onChange({ ...form, ...partial });

  return (
    <div className="space-y-4">
      <GuideImportCard className="space-y-4">
        <div>
          <h3 className={guideImportUi.sectionTitle}>
            <UserCircle2 className="mr-1.5 inline h-4 w-4" />
            客户侧角色
          </h3>
          <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
            未绑定账号的干系人将各获得一条邀请码（14 天有效）。
          </p>
        </div>

        <ContactFields
          label="主联系人"
          idPrefix="primary"
          value={form.primaryContact}
          onChange={(primaryContact) => patch({ primaryContact })}
          fields={['email']}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="payer-same"
              checked={form.payerSameAsPrimary}
              onCheckedChange={(checked) =>
                patch({ payerSameAsPrimary: checked === true })
              }
            />
            <Label htmlFor="payer-same" className="text-sm font-normal">
              付款人与主联系人相同
            </Label>
          </div>
          {!form.payerSameAsPrimary ? (
            <ContactFields
              label="付款人"
              idPrefix="payer"
              value={form.payer}
              onChange={(payer) => patch({ payer })}
              fields={['email', 'phone']}
            />
          ) : null}
        </div>

        <ContactFields
          label="最终确认人"
          idPrefix="final"
          value={form.finalConfirmer}
          onChange={(finalConfirmer) => patch({ finalConfirmer })}
          fields={['phone']}
        />
      </GuideImportCard>

      <GuideImportCard className="space-y-4">
        <div>
          <h3 className={guideImportUi.sectionTitle}>
            <ShieldCheck className="mr-1.5 inline h-4 w-4" />
            机构侧角色
          </h3>
          <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
            已选机构成员（有 userId）直接写入协作关系，不生成邀请码。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StaffSelect
            label="顾问"
            value={form.advisor}
            options={advisorOptions}
            onChange={(advisor) => patch({ advisor })}
            placeholder="选择顾问"
            hint="未指定 userId 时默认绑定当前登录用户为 OWNER"
          />
          <StaffSelect
            label="领队"
            value={form.leader}
            options={leaderOptions}
            onChange={(leader) => patch({ leader })}
            placeholder="选择领队"
          />
        </div>
      </GuideImportCard>
    </div>
  );
}

export function AdvisorTripCreateBudgetStep({ form, onChange }: StepProps) {
  const patch = (partial: Partial<AdvisorTripCreateFormState>) => onChange({ ...form, ...partial });

  return (
    <GuideImportCard className="space-y-5">
      <div>
        <h3 className={guideImportUi.sectionTitle}>
          <Wallet className="mr-1.5 inline h-4 w-4" />
          预算与已知要求
        </h3>
        <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
          录入客户初步预算与当前已知约束，成员加入后可继续补充。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="advisor-trip-budget" className={guideImportUi.label}>
          初步预算（元）*
        </Label>
        <Input
          id="advisor-trip-budget"
          type="number"
          min={0}
          step={100}
          value={form.totalBudget || ''}
          onChange={(e) => patch({ totalBudget: Number(e.target.value) || 0 })}
          placeholder="50000"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="advisor-trip-requirements" className={guideImportUi.label}>
          已知要求
        </Label>
        <Textarea
          id="advisor-trip-requirements"
          value={form.knownRequirements}
          onChange={(e) => patch({ knownRequirements: e.target.value })}
          placeholder="需要无障碍通道"
          rows={6}
        />
      </div>
    </GuideImportCard>
  );
}

export function AdvisorTripCreateReviewStep({ form }: { form: AdvisorTripCreateFormState }) {
  const payer = form.payerSameAsPrimary ? form.primaryContact : form.payer;
  const rows = [
    ['目的地', form.destination],
    ['日期', `${form.startDate} → ${form.endDate}（${form.dayCount} 天）`],
    ['预计人数', String(form.estimatedHeadcount)],
    ['初步预算', form.totalBudget > 0 ? `¥${form.totalBudget.toLocaleString()}` : '—'],
    ['主联系人', formatContactSummary(form.primaryContact)],
    ['付款人', formatContactSummary(payer)],
    ['最终确认人', formatContactSummary(form.finalConfirmer)],
    ['顾问', formatContactSummary(form.advisor)],
    ['领队', formatContactSummary(form.leader)],
  ];

  const inviteRoleCount = [
    form.primaryContact,
    form.payerSameAsPrimary ? form.primaryContact : form.payer,
    form.finalConfirmer,
    form.advisor,
    form.leader,
  ].filter((c) => !c.userId?.trim()).length;

  return (
    <GuideImportCard className="space-y-4">
      <div>
        <h3 className={guideImportUi.sectionTitle}>确认并创建</h3>
        <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
          提交后将创建 PLANNING 行程，并为约 {inviteRoleCount} 个未绑定账号的角色生成邀请码。
        </p>
      </div>

      <dl className="divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr]">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
        {form.knownRequirements.trim() ? (
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr]">
            <dt className="text-xs text-muted-foreground">已知要求</dt>
            <dd className="whitespace-pre-wrap text-sm text-foreground">{form.knownRequirements}</dd>
          </div>
        ) : null}
      </dl>
    </GuideImportCard>
  );
}
