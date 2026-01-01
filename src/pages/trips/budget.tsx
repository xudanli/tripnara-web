import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { BudgetSummary, BudgetOptimizationSuggestion } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function TripBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [optimizations, setOptimizations] = useState<BudgetOptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBudget();
      loadOptimizations();
    }
  }, [id]);

  const loadBudget = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getBudgetSummary(id);
      setBudget(data);
    } catch (err: any) {
      setError(err.message || '加载预算信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOptimizations = async () => {
    if (!id) return;
    try {
      const data = await tripsApi.getBudgetOptimization(id);
      setOptimizations(data);
    } catch (err) {
      console.error('Failed to load optimizations:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || '预算信息不存在'}</p>
        </div>
      </div>
    );
  }

  const usagePercent = (budget.totalSpent / budget.totalBudget) * 100;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">预算管理</h1>
        <p className="text-muted-foreground mt-1">查看和管理您的行程预算</p>
      </div>

      {budget.warnings.length > 0 && (
        <div className="space-y-2">
          {budget.warnings.map((warning, i) => (
            <Alert
              key={i}
              variant={warning.severity === 'error' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>预算警告</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">总预算</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{((budget.totalBudget ?? 0) as number).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">已使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{((budget.totalSpent ?? 0) as number).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {usagePercent.toFixed(1)}% 已使用
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">剩余</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{((budget.remaining ?? 0) as number).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>预算使用情况</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>预算使用率</span>
              <span>{usagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>类别消费</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(budget.categoryBreakdown).map(([category, amount]) => {
              const percent = (amount / budget.totalBudget) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{category}</span>
                    <span>¥{((amount ?? 0) as number).toLocaleString()}</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>优化建议</CardTitle>
            <CardDescription>以下建议可以帮助您节省预算</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizations.map((opt, i) => (
                <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{opt.message}</div>
                    {opt.itemName && (
                      <div className="text-sm text-muted-foreground mt-1">
                        相关项目: {opt.itemName}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-4">
                    节省 ¥{((opt.estimatedSavings ?? 0) as number).toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


