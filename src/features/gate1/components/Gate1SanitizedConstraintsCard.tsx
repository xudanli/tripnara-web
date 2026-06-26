import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Gate1SanitizedConstraint } from '@/types/gate1';

interface Gate1SanitizedConstraintsCardProps {
  constraints: Gate1SanitizedConstraint[];
}

export function Gate1SanitizedConstraintsCard({ constraints }: Gate1SanitizedConstraintsCardProps) {
  if (constraints.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">脱敏约束</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {constraints.map((s) => (
          <div key={s.id} className="rounded-lg border p-3 text-sm">
            <p>{s.explanation}</p>
            {s.impactSummary && (
              <p className="mt-1 text-muted-foreground">影响：{s.impactSummary}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
