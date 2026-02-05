/**
 * 预算管理标签页
 * 提供预算评估、费用管理、决策日志等功能
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  CreditCard,
  Wallet,
  BarChart3,
  List,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { itineraryItemsApi } from '@/api/trips';
import { tripsApi } from '@/api/trips';
import type { TripDetail } from '@/types/trip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface BudgetTabProps {
  tripId: string;
}

type CostCategory = 'ACCOMMODATION' | 'TRANSPORTATION' | 'FOOD' | 'ACTIVITIES' | 'OTHER';

const CATEGORY_LABELS: Record<CostCategory, string> = {
  ACCOMMODATION: '住宿',
  TRANSPORTATION: '交通',
  FOOD: '餐饮',
  ACTIVITIES: '活动',
  OTHER: '其他',
};

export default function BudgetTab({ tripId }: BudgetTabProps) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  
  // 费用汇总
  const [costSummary, setCostSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // 未支付项
  const [unpaidItems, setUnpaidItems] = useState<any[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  
  // 预算决策日志
  const [decisionLog, setDecisionLog] = useState<any>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  
  // 编辑费用对话框
  const [editCostDialogOpen, setEditCostDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    estimatedCost: '',
    actualCost: '',
    costCategory: 'ACCOMMODATION' as CostCategory,
    costNote: '',
    isPaid: false,
  });

  useEffect(() => {
    if (tripId) {
      loadTrip();
      loadCurrentPlanId();
    }
  }, [tripId]);

  useEffect(() => {
    if (tripId) {
      loadCostSummary();
      loadUnpaidItems();
    }
  }, [tripId]);

  useEffect(() => {
    if (currentPlanId && tripId) {
      loadDecisionLog();
    }
  }, [currentPlanId, tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err: any) {
      console.error('Failed to load trip:', err);
      // ✅ 根据错误类型显示不同的错误信息
      if (err.response?.status === 404) {
        toast.error('行程不存在');
      } else if (err.response?.status === 500) {
        toast.error('服务器错误，请稍后重试');
      } else {
        toast.error('加载行程信息失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPlanId = async () => {
    try {
      const plans = await planningWorkbenchApi.getTripPlans(tripId, {
        limit: 1,
        offset: 0,
      });
      if (plans.plans.length > 0) {
        setCurrentPlanId(plans.plans[0].planId);
      }
    } catch (err) {
      console.error('Failed to load current plan ID:', err);
    }
  };

  const loadCostSummary = async () => {
    try {
      setLoadingSummary(true);
      const summary = await itineraryItemsApi.getCostSummary(tripId);
      setCostSummary(summary);
    } catch (err: any) {
      console.error('Failed to load cost summary:', err);
      // ✅ 根据错误类型显示不同的错误信息
      if (err.response?.status === 404) {
        // 404 不显示错误，因为可能还没有费用数据
        console.log('费用汇总不存在（可能还没有费用数据）');
        setCostSummary(null);
      } else if (err.response?.status === 500) {
        toast.error('服务器错误，费用汇总加载失败');
      } else {
        toast.error('加载费用汇总失败');
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadUnpaidItems = async () => {
    try {
      setLoadingUnpaid(true);
      const items = await itineraryItemsApi.getUnpaidItems(tripId);
      setUnpaidItems(items);
    } catch (err: any) {
      console.error('Failed to load unpaid items:', err);
      // ✅ 根据错误类型显示不同的错误信息
      if (err.response?.status === 404) {
        // 404 不显示错误，设置为空数组
        setUnpaidItems([]);
      } else if (err.response?.status === 500) {
        toast.error('服务器错误，未支付项加载失败');
      } else {
        toast.error('加载未支付项失败');
      }
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const loadDecisionLog = async () => {
    if (!currentPlanId) return;
    try {
      setLoadingLog(true);
      const log = await planningWorkbenchApi.getBudgetDecisionLog(currentPlanId, tripId, {
        limit: 50,
        offset: 0,
      });
      setDecisionLog(log);
    } catch (err: any) {
      console.error('Failed to load decision log:', err);
      // 不显示错误，因为可能还没有决策日志
    } finally {
      setLoadingLog(false);
    }
  };

  const handleEditCost = (item: any) => {
    setEditingItem(item);
    setEditForm({
      estimatedCost: item.estimatedCost?.toString() || '',
      actualCost: item.actualCost?.toString() || '',
      costCategory: item.costCategory || 'ACCOMMODATION',
      costNote: item.costNote || '',
      isPaid: item.isPaid || false,
    });
    setEditCostDialogOpen(true);
  };

  const handleSaveCost = async () => {
    if (!editingItem) return;
    try {
      await itineraryItemsApi.updateCost(editingItem.id, {
        estimatedCost: editForm.estimatedCost ? Number(editForm.estimatedCost) : undefined,
        actualCost: editForm.actualCost ? Number(editForm.actualCost) : undefined,
        costCategory: editForm.costCategory,
        costNote: editForm.costNote || undefined,
        isPaid: editForm.isPaid,
      });
      toast.success('费用更新成功');
      setEditCostDialogOpen(false);
      setEditingItem(null);
      loadCostSummary();
      loadUnpaidItems();
    } catch (err: any) {
      console.error('Failed to update cost:', err);
      toast.error(err.message || '更新费用失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const currency = trip?.budgetConfig?.currency || 'CNY';
  const totalBudget = trip?.totalBudget || trip?.budgetConfig?.totalBudget || 0;
  const totalEstimated = costSummary?.totalEstimated || 0;
  const totalActual = costSummary?.totalActual || 0;
  const budgetUsage = totalBudget > 0 ? totalEstimated / totalBudget : 0;

  return (
    <div className="space-y-6">
      {/* 预算概览卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            预算概览
          </CardTitle>
          <CardDescription>
            总预算使用情况和费用统计
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 总预算进度 */}
          {totalBudget > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预算使用率</span>
                <span className="font-medium">
                  {formatCurrency(totalEstimated, currency)} / {formatCurrency(totalBudget, currency)}
                  {' '}
                  ({((budgetUsage * 100).toFixed(1))}%)
                </span>
              </div>
              <Progress 
                value={Math.min(budgetUsage * 100, 100)} 
                className={budgetUsage > 0.8 ? 'h-3' : 'h-3'}
              />
              {budgetUsage > 0.8 && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>预算预警</AlertTitle>
                  <AlertDescription>
                    预算使用率已超过 {((budgetUsage * 100).toFixed(1))}%，请注意控制支出
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* 费用统计 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">预估总费用</div>
              <div className="text-2xl font-bold">{formatCurrency(totalEstimated, currency)}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">实际总费用</div>
              <div className="text-2xl font-bold">{formatCurrency(totalActual, currency)}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">未支付项</div>
              <div className="text-2xl font-bold">{unpaidItems.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签页内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            费用汇总
          </TabsTrigger>
          <TabsTrigger value="unpaid">
            <CreditCard className="w-4 h-4 mr-2" />
            未支付项
            {unpaidItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unpaidItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="log">
            <FileText className="w-4 h-4 mr-2" />
            决策日志
          </TabsTrigger>
        </TabsList>

        {/* 费用汇总 */}
        <TabsContent value="overview" className="space-y-4">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : costSummary ? (
            <>
              {/* 分类汇总 */}
              <Card>
                <CardHeader>
                  <CardTitle>分类费用统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>分类</TableHead>
                        <TableHead>预估费用</TableHead>
                        <TableHead>实际费用</TableHead>
                        <TableHead>项目数</TableHead>
                        <TableHead>占比</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costSummary.byCategory && Object.entries(costSummary.byCategory).map(([category, data]: [string, any]) => {
                        const categoryLabel = CATEGORY_LABELS[category as CostCategory] || category;
                        const estimated = data.estimated || 0;
                        const actual = data.actual || 0;
                        const count = data.count || 0;
                        const percentage = totalEstimated > 0 ? (estimated / totalEstimated * 100).toFixed(1) : '0';
                        return (
                          <TableRow key={category}>
                            <TableCell className="font-medium">{categoryLabel}</TableCell>
                            <TableCell>{formatCurrency(estimated, currency)}</TableCell>
                            <TableCell>{formatCurrency(actual, currency)}</TableCell>
                            <TableCell>{count}</TableCell>
                            <TableCell>{percentage}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 每日汇总 */}
              {costSummary.byDay && costSummary.byDay.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>每日费用统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>预估费用</TableHead>
                          <TableHead>实际费用</TableHead>
                          <TableHead>项目数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costSummary.byDay.map((day: any) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">
                              {format(new Date(day.date), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell>{formatCurrency(day.estimated, currency)}</TableCell>
                            <TableCell>{formatCurrency(day.actual, currency)}</TableCell>
                            <TableCell>{day.itemCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无费用数据
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 未支付项 */}
        <TabsContent value="unpaid" className="space-y-4">
          {loadingUnpaid ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : unpaidItems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>未支付行程项</CardTitle>
                <CardDescription>
                  共 {unpaidItems.length} 项待支付
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>预估费用</TableHead>
                      <TableHead>实际费用</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.date ? format(new Date(item.date), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.placeName || item.place?.nameCN || item.place?.nameEN || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORY_LABELS[item.costCategory as CostCategory] || item.costCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.estimatedCost || 0, currency)}</TableCell>
                        <TableCell>
                          {item.actualCost ? formatCurrency(item.actualCost, currency) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCost(item)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">所有行程项已支付</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 决策日志 */}
        <TabsContent value="log" className="space-y-4">
          {loadingLog ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : decisionLog && decisionLog.items && decisionLog.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>预算决策日志</CardTitle>
                <CardDescription>
                  查看预算评估的完整决策历史
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {decisionLog.items.map((log: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">
                            {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.evaluator || 'BudgetEvaluationService'}
                          </div>
                        </div>
                        <Badge
                          variant={
                            log.result === 'PASS' || log.result === 'PASS_WITH_WARNINGS'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {log.result === 'PASS' ? '通过' :
                           log.result === 'PASS_WITH_WARNINGS' ? '通过（有警告）' :
                           log.result === 'FAIL' ? '失败' : log.result}
                        </Badge>
                      </div>
                      {log.details && (
                        <div className="mt-2 text-sm space-y-1">
                          {log.details.estimatedCost && (
                            <div>
                              预估费用: {formatCurrency(log.details.estimatedCost, currency)}
                            </div>
                          )}
                          {log.details.budgetLimit && (
                            <div>
                              预算限制: {formatCurrency(log.details.budgetLimit, currency)}
                            </div>
                          )}
                          {log.details.usage && (
                            <div>
                              使用率: {((log.details.usage * 100).toFixed(1))}%
                            </div>
                          )}
                          {log.details.warnings && log.details.warnings.length > 0 && (
                            <div className="mt-2">
                              <div className="font-medium text-amber-600">警告:</div>
                              <ul className="list-disc list-inside">
                                {log.details.warnings.map((warning: string, i: number) => (
                                  <li key={i}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {log.details.reason && (
                            <div className="mt-2 text-muted-foreground">
                              {log.details.reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无决策日志
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑费用对话框 */}
      <Dialog open={editCostDialogOpen} onOpenChange={setEditCostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑费用</DialogTitle>
            <DialogDescription>
              {editingItem?.place?.nameCN || editingItem?.place?.nameEN || '行程项'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>费用分类</Label>
              <Select
                value={editForm.costCategory}
                onValueChange={(value) => setEditForm({ ...editForm, costCategory: value as CostCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>预估费用 ({currency})</Label>
              <Input
                type="number"
                value={editForm.estimatedCost}
                onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>实际费用 ({currency})</Label>
              <Input
                type="number"
                value={editForm.actualCost}
                onChange={(e) => setEditForm({ ...editForm, actualCost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>费用备注</Label>
              <Input
                value={editForm.costNote}
                onChange={(e) => setEditForm({ ...editForm, costNote: e.target.value })}
                placeholder="可选"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPaid"
                checked={editForm.isPaid}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isPaid: checked as boolean })}
              />
              <Label htmlFor="isPaid" className="cursor-pointer">
                已支付
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCostDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleSaveCost}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
