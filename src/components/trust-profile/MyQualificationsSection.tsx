import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  qualificationStatusLabel,
  qualificationTypeLabel,
} from '@/lib/qualification-display';
import { useMyQualifications } from '@/hooks/useQualifications';
import { QualificationSubmitDialog } from './QualificationSubmitDialog';

interface MyQualificationsSectionProps {
  userId: string;
  className?: string;
}

export function MyQualificationsSection({ userId, className }: MyQualificationsSectionProps) {
  const { data: qualifications, isLoading } = useMyQualifications();

  return (
    <Card id="qualifications" className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-muted-foreground" />
            专业资质
          </CardTitle>
          <CardDescription>急救、向导、教练等可验证证书</CardDescription>
        </div>
        <QualificationSubmitDialog userId={userId} />
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-6">
            <LogoLoading size={28} />
          </div>
        )}

        {!isLoading && (qualifications ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            尚未提交资质。验证通过后将展示在
            <Link to={`/dashboard/trust/users/${userId}`} className="mx-1 underline">
              公开信任档案
            </Link>
            。
          </p>
        )}

        <ul className="space-y-2">
          {(qualifications ?? []).map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{qualificationTypeLabel(q.qualificationType)}</p>
                <p className="text-xs text-muted-foreground">{q.issuer}</p>
              </div>
              <Badge variant={q.status === 'VERIFIED' ? 'default' : 'outline'}>
                {qualificationStatusLabel(q.status)}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
