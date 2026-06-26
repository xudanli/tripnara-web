import { Link } from 'react-router-dom';
import { ExternalLink, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { REPUTATION_FACT_LABELS } from '@/lib/reputation-facts-display';
import { useMyTrustProfile } from '@/hooks/useTrustProfile';
import { VerificationBadges } from './VerificationBadges';

interface TrustProfileSummarySectionProps {
  userId: string;
  className?: string;
}

/** 个人主页 · 信任档案摘要（无信用分） */
export function TrustProfileSummarySection({ userId, className }: TrustProfileSummarySectionProps) {
  const { data: profile, isLoading } = useMyTrustProfile();

  const topFacts = profile?.reputationFacts
    ? REPUTATION_FACT_LABELS.slice(0, 4).map(({ key, label }) => ({
        label,
        value: profile.reputationFacts[key],
      }))
    : [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            信任档案
          </CardTitle>
          <CardDescription>验证、资质与声誉事实 · 不展示综合信用分</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/dashboard/trust/users/${userId}`}>
            公开档案
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <LogoLoading size={28} />
          </div>
        )}

        {profile && (
          <>
            <VerificationBadges verification={profile.verification} />

            {profile.professional?.isVerifiedProfessional && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                <Badge className="mb-1">Professional 已认证</Badge>
                {profile.professional.bio && (
                  <p className="text-muted-foreground">{profile.professional.bio}</p>
                )}
              </div>
            )}

            {topFacts.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {topFacts.map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border px-3 py-2 text-center"
                  >
                    <p className="text-lg font-semibold tabular-nums">{String(value ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              完整声誉事实与背书见
              <Link to={`/dashboard/trust/users/${userId}`} className="mx-1 underline">
                公开信任档案
              </Link>
              ；发布公开项目请前往
              <Link to="/dashboard/settings?tab=governance" className="mx-1 underline">
                身份与权限
              </Link>
              。
            </p>
          </>
        )}

        {!isLoading && !profile && (
          <p className="text-sm text-muted-foreground">
            信任档案加载失败。
            <Link to={`/dashboard/trust/users/${userId}`} className="ml-1 underline">
              查看公开页
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
