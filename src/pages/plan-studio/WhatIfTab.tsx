import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface WhatIfTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function WhatIfTab({ tripId, personaMode = 'abu' }: WhatIfTabProps) {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<any[]>([]);

  const handleCompare = async () => {
    try {
      setLoading(true);
      // TODO: 调用What-If API
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setScenarios([
        {
          id: 1,
          name: '稳健方案',
          robustness: 9,
          experience: 7,
          cost: 5000,
          risk: 2,
        },
        {
          id: 2,
          name: '体验优先',
          robustness: 6,
          experience: 9,
          cost: 6000,
          risk: 4,
        },
        {
          id: 3,
          name: '极限挑战',
          robustness: 4,
          experience: 10,
          cost: 7000,
          risk: 7,
        },
      ]);
    } catch (err) {
      console.error('Failed to compare scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What-If 多方案对比</CardTitle>
          <CardDescription>生成多个方案并对比，选择最适合的</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCompare} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                正在生成方案...
              </>
            ) : (
              '生成对比方案 (600 samples)'
            )}
          </Button>

          {scenarios.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="cursor-pointer hover:border-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        稳健度
                      </span>
                      <Badge>{scenario.robustness}/10</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        体验密度
                      </span>
                      <Badge>{scenario.experience}/10</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        成本
                      </span>
                      <span className="font-semibold">¥{scenario.cost}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        风险
                      </span>
                      <Badge variant={scenario.risk > 5 ? 'destructive' : 'outline'}>
                        {scenario.risk}/10
                      </Badge>
                    </div>
                    <Button className="w-full mt-4">应用此方案</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

