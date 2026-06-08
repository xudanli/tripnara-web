import { GraduationCap, Shield, Briefcase } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard, VerifiedCredentials } from '@/types/match-square';
import { parseTrustAssetSegments } from '../lib/parse-trust-asset-line';
import { plazaReview } from '../lib/plaza-visual';
import {
  credentialsDisplayName,
  resolveCaptainCredentials,
  resolveTrustEndorsement,
} from '../lib/verified-credentials';

interface CaptainTrustProfileSheetProps {
  post?: RecruitmentPostCard;
  credentials?: VerifiedCredentials | null;
  subtitle?: string;
  reputationStars?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 详情页 / 审核页 — verifiedCredentials.dossier 信任档案抽屉 */
export function CaptainTrustProfileSheet({
  post,
  credentials: credentialsProp,
  subtitle,
  reputationStars: reputationStarsProp,
  open,
  onOpenChange,
}: CaptainTrustProfileSheetProps) {
  const credentials = credentialsProp ?? (post ? resolveCaptainCredentials(post) : null);
  const dossier = credentials?.dossier;
  if (!credentials) return null;

  const displayName = credentialsDisplayName(credentials);
  const initials = displayName.slice(0, 1).toUpperCase();
  const sheetSubtitle =
    subtitle ??
    (post ? `${post.captainCardTitle} · ${post.captainInteractionModeLabel}` : undefined);
  const endorsement = resolveTrustEndorsement(credentials, reputationStarsProp);
  const identityHeadline = credentials.headline?.identityHeadline;
  const trustAssetSegments = credentials.headline?.trustAssetLine
    ? parseTrustAssetSegments(credentials.headline.trustAssetLine)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-border">
              {dossier?.avatarUrl ? (
                <AvatarImage src={dossier.avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-muted text-base font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{displayName}</SheetTitle>
              {sheetSubtitle && <SheetDescription>{sheetSubtitle}</SheetDescription>}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5 pb-4">
          <p className="text-xs text-muted-foreground">
            以下信息经第三方脱敏授权生成，不含具体学校与公司全称，仅用于组队信任判断。
          </p>

          {identityHeadline && (
            <section className={plazaReview.card}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">身份背书</h3>
              <p className="text-sm text-foreground">{identityHeadline}</p>
              {trustAssetSegments.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {trustAssetSegments.join(' · ')}
                </p>
              )}
            </section>
          )}

          {dossier?.educationTags && dossier.educationTags.length > 0 && (
            <section className={plazaReview.card}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
                教育背景
              </h3>
              <div className="flex flex-wrap gap-2">
                {dossier.educationTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="rounded-full px-3 py-1">
                    🎓 {tag.label}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {dossier?.professionTags && dossier.professionTags.length > 0 && (
            <section className={plazaReview.card}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                行业 / 经历
              </h3>
              <div className="flex flex-wrap gap-2">
                {dossier.professionTags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="rounded-full px-3 py-1">
                    {tag.id === 'role' ? `👨‍💻 ${tag.label}` : tag.label}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {endorsement.hasContent && (
            <section className={plazaReview.card}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
                履约背书
              </h3>
              {endorsement.zhimaTierLabel && (
                <p className="text-base font-semibold text-foreground">{endorsement.zhimaTierLabel}</p>
              )}
              {endorsement.zhimaDisplayLine && (
                <p
                  className={cn(
                    'text-sm text-foreground',
                    endorsement.zhimaTierLabel && 'mt-1 text-xs text-muted-foreground'
                  )}
                >
                  {endorsement.zhimaDisplayLine.replace(/^🛡️\s*/u, '')}
                </p>
              )}
              {endorsement.reputationStars != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  历史互评星级 {endorsement.reputationStars.toFixed(1)} · 来自 Reputation OS
                </p>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
