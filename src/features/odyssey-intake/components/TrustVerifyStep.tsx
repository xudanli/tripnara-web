import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface TrustVerifyStepProps {
  onContinue: () => Promise<void>;
  isLoading?: boolean;
}

/** R0：芝麻信用已下线，仅确认联系方式验证后继续 */
export function TrustVerifyStep({ onContinue, isLoading }: TrustVerifyStepProps) {
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    try {
      await onContinue();
    } catch {
      setError('操作失败，请重试');
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>联系方式确认</CardTitle>
          <CardDescription>
            继续前请确认账号联系方式已验证。平台不再使用芝麻信用或综合信用分判断旅行适合度。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleContinue} disabled={isLoading}>
            {isLoading ? '处理中…' : '继续'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
