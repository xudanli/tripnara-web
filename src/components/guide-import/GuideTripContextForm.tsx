import type { ReactNode } from 'react';
import { parseISO } from 'date-fns';
import type { GuideTripContext } from '@/types/guide-import';
import type { PendingConfirmation, PendingConfirmationField } from '@/types/guide-to-plan-api';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Car, Lock, MapPin, Sparkles, Users } from 'lucide-react';
import { cn, toDateOnly } from '@/lib/utils';
import { travelersFromProfile } from '@/lib/guide-to-plan-mapper';
import { GuideDatePicker } from '@/components/guide-import/GuideDatePicker';
import {
  GuideImportCard,
  GuideImportSidebarPanel,
  guideImportUi,
} from '@/components/guide-import/guide-import-ui';

interface GuideTripContextFormProps {
  value: GuideTripContext;
  onChange: (next: GuideTripContext) => void;
  onPatch?: (partial: Partial<GuideTripContext>) => void;
  variant?: 'card' | 'sidebar';
  pendingConfirmations?: PendingConfirmation[];
  compact?: boolean;
  className?: string;
}

const TRAVELER_OPTIONS: Array<{ value: GuideTripContext['travelerProfile']; label: string }> = [
  { value: 'solo', label: '独自出行' },
  { value: 'couple', label: '两人 / 情侣' },
  { value: 'friends', label: '朋友结伴' },
  { value: 'family_with_kids', label: '带娃家庭' },
  { value: 'family_with_elderly', label: '有老人同行' },
];

const TRANSPORT_OPTIONS: Array<{ value: GuideTripContext['transportMode']; label: string }> = [
  { value: 'self_drive', label: '自驾' },
  { value: 'bus', label: '巴士 / 公交' },
  { value: 'public_transit', label: '公共交通' },
  { value: 'tour', label: '跟团 / 当地团' },
  { value: 'mixed', label: '混合' },
  { value: 'unknown', label: '尚未确定' },
];

const VEHICLE_OPTIONS: Array<{ value: NonNullable<GuideTripContext['vehicleType']>; label: string }> = [
  { value: '2wd', label: '两驱 (2WD)' },
  { value: '4x4', label: '四驱 (4x4)' },
  { value: 'suv', label: 'SUV' },
  { value: 'campervan', label: '露营车' },
];

function shouldShowField(
  field: PendingConfirmationField,
  pendingFields: Set<string>,
  always?: boolean,
): boolean {
  if (always) return true;
  if (pendingFields.size === 0) return false;
  return pendingFields.has(field);
}

export function GuideTripContextForm({
  value,
  onChange,
  onPatch,
  variant = 'card',
  pendingConfirmations = [],
  compact = false,
  className,
}: GuideTripContextFormProps) {
  const patch = (partial: Partial<GuideTripContext>) => {
    onChange({ ...value, ...partial });
    onPatch?.(partial);
  };

  const pendingFields = new Set(pendingConfirmations.map((p) => p.field));
  const fieldHighlight = (field: PendingConfirmationField) => {
    const item = pendingConfirmations.find((p) => p.field === field);
    if (!item?.required) return '';
    return 'ring-1 ring-amber-300/80 border-amber-200';
  };
  const fieldGap = compact ? 'space-y-1.5' : 'space-y-2';
  const controlHeight = compact ? 'h-8' : 'h-9';
  const controlSurface = variant === 'sidebar' ? 'shadow-none' : '';
  const startDateObj = value.startDate ? parseISO(toDateOnly(value.startDate)) : undefined;

  const Wrapper =
    variant === 'sidebar'
      ? ({ children }: { children: ReactNode }) => (
          <GuideImportSidebarPanel variant="accent" compact={compact} className={className}>
            {children}
          </GuideImportSidebarPanel>
        )
      : ({ children }: { children: ReactNode }) => (
          <GuideImportCard className={className}>{children}</GuideImportCard>
        );

  return (
    <Wrapper>
      <div>
        <h3 className={guideImportUi.sectionTitle}>为了调整成适合你的版本，还需要确认</h3>
        {variant === 'sidebar' && (
          <p className={cn(guideImportUi.sectionDesc, compact ? 'mt-0.5' : 'mt-1')}>
            按接口返回项动态展示，只问影响方案的关键项
          </p>
        )}
      </div>

      {shouldShowField('startDate', pendingFields, true) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            出行日期
          </Label>
          <div className={cn(variant === 'sidebar' ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2')}>
            <GuideDatePicker
              value={value.startDate}
              onChange={(startDate) => patch({ startDate })}
              placeholder="出发日期"
              className={cn(controlHeight, controlSurface, fieldHighlight('startDate'))}
            />
            <GuideDatePicker
              value={value.endDate}
              onChange={(endDate) => patch({ endDate })}
              placeholder="返回日期"
              className={cn(controlHeight, controlSurface, fieldHighlight('endDate'))}
              disabled={(date) => (startDateObj ? date < startDateObj : false)}
            />
          </div>
        </div>
      )}

      {shouldShowField('travelerProfile', pendingFields, true) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            同行成员
          </Label>
          <Select
            value={value.travelerProfile ?? ''}
            onValueChange={(v) => {
              const profile = (v || undefined) as GuideTripContext['travelerProfile'];
              patch({
                travelerProfile: profile,
                travelers: profile ? travelersFromProfile(profile) : undefined,
              });
            }}
          >
            <SelectTrigger className={cn(controlHeight, 'text-xs', controlSurface, fieldHighlight('travelerProfile'))}>
              <SelectValue placeholder="选择同行情况" />
            </SelectTrigger>
            <SelectContent>
              {TRAVELER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value!}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {shouldShowField('transportMode', pendingFields, true) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-muted-foreground" />
            交通方式
          </Label>
          <Select
            value={value.transportMode ?? ''}
            onValueChange={(v) =>
              patch({ transportMode: (v || undefined) as GuideTripContext['transportMode'] })
            }
          >
            <SelectTrigger className={cn(controlHeight, 'text-xs', controlSurface, fieldHighlight('transportMode'))}>
              <SelectValue placeholder="选择交通方式" />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value!}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {shouldShowField(
        'vehicleType',
        pendingFields,
        value.transportMode === 'self_drive' || pendingFields.has('vehicleType'),
      ) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-muted-foreground" />
            自驾车型
          </Label>
          <Select
            value={value.vehicleType ?? ''}
            onValueChange={(v) =>
              patch({ vehicleType: (v || undefined) as GuideTripContext['vehicleType'] })
            }
          >
            <SelectTrigger className={cn(controlHeight, 'text-xs', controlSurface, fieldHighlight('vehicleType'))}>
              <SelectValue placeholder="如冰岛 F-road 建议 4x4" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {shouldShowField('countryCode', pendingFields, pendingFields.has('countryCode')) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            国家 / 地区代码
          </Label>
          <Input
            placeholder="如 IS（冰岛）"
            value={value.countryCode ?? ''}
            onChange={(e) => patch({ countryCode: e.target.value || undefined })}
            className={cn('text-xs', controlHeight, controlSurface, fieldHighlight('countryCode'))}
          />
        </div>
      )}

      {shouldShowField('destination', pendingFields) && (
        <div className={fieldGap}>
          <Label className="text-xs">
            目的地
            {pendingConfirmations.find((p) => p.field === 'destination' && !p.required) && (
              <span className="text-muted-foreground font-normal">（选填）</span>
            )}
          </Label>
          <Input
            placeholder="如：冰岛南岸"
            value={value.destination ?? ''}
            onChange={(e) => patch({ destination: e.target.value || undefined })}
            className={cn('text-xs', controlHeight, controlSurface, fieldHighlight('destination'))}
          />
        </div>
      )}

      {shouldShowField('mustKeepExperiences', pendingFields, true) && (
        <div className={fieldGap}>
          <Label className="text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            最想保留的体验
            {!pendingConfirmations.find((p) => p.field === 'mustKeepExperiences' && p.required) && (
              <span className="text-muted-foreground font-normal">（选填）</span>
            )}
          </Label>
          <Textarea
            placeholder="冰河湖、黑沙滩、追极光…"
            value={value.mustKeepExperiences?.join('、') ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              patch({
                mustKeepExperiences: raw
                  ? raw.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
                  : undefined,
              });
            }}
            className={cn(
              compact ? 'min-h-[52px] py-1.5' : 'min-h-[72px]',
              'text-xs',
              controlSurface,
              fieldHighlight('mustKeepExperiences'),
            )}
          />
        </div>
      )}

      {variant === 'sidebar' && (
        <p className={cn(guideImportUi.footnote, 'flex items-center gap-1', compact ? 'pt-0' : 'pt-1')}>
          <Lock className="w-3 h-3 flex-shrink-0" />
          你的信息仅用于生成本次个性化行程
        </p>
      )}
    </Wrapper>
  );
}
