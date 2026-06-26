import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { ReputationFactsCard } from './ReputationFactsCard';
import { VerificationBadges } from './VerificationBadges';
import type { OrganizationTrustProfile } from '@/types/identity-governance';

interface OrganizationTrustProfilePublicViewProps {
  profile: OrganizationTrustProfile | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function OrganizationTrustProfilePublicView({
  profile,
  isLoading,
  isError,
}: OrganizationTrustProfilePublicViewProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LogoLoading size={40} />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          无法加载机构信任档案，请稍后重试。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{profile.displayName ?? '机构'}</CardTitle>
          <CardDescription>机构信任档案 · 无综合信用分</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.verification && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                机构验证
              </p>
              <VerificationBadges verification={profile.verification} />
            </div>
          )}
        </CardContent>
      </Card>

      {profile.qualifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">已验证资质</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.qualifications.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>{q.qualificationType}</span>
                <span className="text-xs text-muted-foreground">{q.issuer}</span>
                <Badge variant={q.status === 'VERIFIED' ? 'default' : 'outline'}>{q.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {profile.endorsements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">平台背书</CardTitle>
            <CardDescription>基于可验证项目事实的陈述</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.endorsements.map((e) => (
              <blockquote
                key={e.id}
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
              >
                {e.factStatement}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      )}

      <ReputationFactsCard facts={profile.reputationFacts} />

      <p className="text-center text-xs text-muted-foreground">
        机构信任档案由验证、资质、背书与声誉事实组成，不代表社交信用评分。
        <Link to="/dashboard/settings?tab=governance" className="ml-1 underline">
          了解账号治理
        </Link>
      </p>
    </div>
  );
}
