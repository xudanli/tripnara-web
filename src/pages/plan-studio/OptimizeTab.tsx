import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface OptimizeTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function OptimizeTab({ tripId, personaMode = 'abu' }: OptimizeTabProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleOptimize = async () => {
    try {
      setLoading(true);
      // TODO: 调用优化API
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setResult({
        executable: true,
        droppedItems: [],
        tightNodes: [],
        abuGate: { passed: true, reason: '通过' },
      });
    } catch (err) {
      console.error('Failed to optimize:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一键变可执行</CardTitle>
          <CardDescription>生成可执行计划，检查冲突和风险</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                正在优化...
              </>
            ) : (
              'Generate Executable Plan'
            )}
          </Button>

          {result && (
            <div className="space-y-4 mt-6">
              <Card className={result.executable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    {result.executable ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {result.executable ? '计划可执行' : '计划不可执行'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {result.droppedItems && result.droppedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dropped Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.droppedItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <span>{item.name}</span>
                          <Badge variant="outline">{item.reason}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.tightNodes && result.tightNodes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">最紧张的 3 个节点</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.tightNodes.map((node: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{node.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.abuGate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Abu Gate 结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {result.abuGate.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span>{result.abuGate.passed ? '通过' : '拒绝'}</span>
                      {result.abuGate.reason && (
                        <span className="text-sm text-muted-foreground">- {result.abuGate.reason}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

