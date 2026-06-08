import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface TrustVerifyStepProps {
  onVerify: (provider: 'zhima_credit', authToken?: string) => Promise<void>;
  isLoading?: boolean;
}

export function TrustVerifyStep({ onVerify, isLoading }: TrustVerifyStepProps) {
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setError(null);
    try {
      // 生产环境对接芝麻信用 OAuth；当前占位 token
      await onVerify('zhima_credit', 'placeholder_auth_token');
    } catch {
      setError('授权失败，请重试');
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>安全授权</CardTitle>
          <CardDescription>
            完成实名 / 芝麻信用验证后，方可进入旅伴匹配。你的隐私信息仅用于安全核验。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleVerify} disabled={isLoading}>
            {isLoading ? '验证中…' : '芝麻信用快速验证'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            开发环境可使用占位授权；生产对接网关回调。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
