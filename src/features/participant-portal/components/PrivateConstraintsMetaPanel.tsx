import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useParticipantPrivateConstraintsMeta } from '@/hooks/useParticipantPortal';
import { VisibilityBadge } from './VisibilityBadge';

interface PrivateConstraintsMetaPanelProps {
  token: string;
}

export function PrivateConstraintsMetaPanel({ token }: PrivateConstraintsMetaPanelProps) {
  const { data: meta, isLoading } = useParticipantPrivateConstraintsMeta(token);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!meta?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">已提交的私密约束</CardTitle>
        <CardDescription>仅显示元数据，不包含原文内容</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {meta.map((item) => (
          <div
            key={item.fieldKey}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span className="font-medium">{item.fieldKey}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.authorizationLevel ? (
                <VisibilityBadge
                  visibility={
                    item.authorizationLevel === 'ANALYST_ONLY'
                      ? 'PRIVACY_ANALYST_ONLY'
                      : 'ADVISOR_DEIDENTIFIED'
                  }
                />
              ) : null}
              {item.status ? <span>{item.status}</span> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
