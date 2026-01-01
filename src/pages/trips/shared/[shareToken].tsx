import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { SharedTripResponse, ImportTripFromShareRequest } from '@/types/trip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, DollarSign, Download, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function SharedTripPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sharedTrip, setSharedTrip] = useState<SharedTripResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<ImportTripFromShareRequest>({
    destination: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (shareToken) {
      loadSharedTrip();
    }
  }, [shareToken]);

  useEffect(() => {
    // 当加载完分享行程后，填充导入表单的默认值
    if (sharedTrip?.trip) {
      setImportData({
        destination: sharedTrip.trip.destination,
        startDate: sharedTrip.trip.startDate.split('T')[0],
        endDate: sharedTrip.trip.endDate.split('T')[0],
      });
    }
  }, [sharedTrip]);

  const loadSharedTrip = async () => {
    if (!shareToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getSharedTrip(shareToken);
      setSharedTrip(data);
    } catch (err: any) {
      setError(err.message || '加载分享行程失败');
      console.error('Failed to load shared trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!shareToken || importing) return;
    try {
      setImporting(true);
      const result = await tripsApi.importFromShare(shareToken, importData);
      // 导入成功后跳转到新行程详情页
      navigate(`/dashboard/trips/${result.tripId}`);
    } catch (err: any) {
      setError(err.message || '导入行程失败');
      setImportDialogOpen(false);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !sharedTrip) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-red-600">{error || '分享链接无效或已过期'}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trip = sharedTrip.trip;
  const canEdit = sharedTrip.permission === 'EDIT';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{trip.destination}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(trip.startDate), 'yyyy-MM-dd')} -{' '}
                  {format(new Date(trip.endDate), 'yyyy-MM-dd')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>¥{((trip.totalBudget ?? 0) as number).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {canEdit ? '可编辑' : '仅查看'}
            </Badge>
            {isAuthenticated && (
              <Button onClick={() => setImportDialogOpen(true)}>
                <Download className="w-4 h-4 mr-2" />
                导入到我的行程
              </Button>
            )}
            {!isAuthenticated && (
              <Button onClick={() => navigate('/login')} variant="outline">
                登录以导入行程
              </Button>
            )}
          </div>
        </div>

        {/* 行程详情 */}
        <Card>
          <CardHeader>
            <CardTitle>行程安排</CardTitle>
          </CardHeader>
          <CardContent>
            {trip.TripDay.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                该行程暂无安排
              </div>
            ) : (
              <div className="space-y-4">
                {trip.TripDay.map((day) => (
                  <div key={day.id} className="border rounded-lg p-4">
                    <div className="font-medium mb-3">
                      {format(new Date(day.date), 'yyyy年MM月dd日')}
                    </div>
                    {day.ItineraryItem.length === 0 ? (
                      <div className="text-sm text-muted-foreground">该日暂无安排</div>
                    ) : (
                      <div className="space-y-2">
                        {day.ItineraryItem.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {item.Place?.nameCN || item.Trail?.nameCN || item.type}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(item.startTime), 'HH:mm')} -{' '}
                                {format(new Date(item.endTime), 'HH:mm')}
                              </div>
                            </div>
                            <Badge variant="outline">{item.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>导入行程</DialogTitle>
            <DialogDescription>
              将分享的行程导入到您的账户，您可以修改目的地和日期
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-destination">目的地</Label>
              <Input
                id="import-destination"
                value={importData.destination}
                onChange={(e) =>
                  setImportData({ ...importData, destination: e.target.value })
                }
                placeholder="输入目的地"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="import-startDate">开始日期</Label>
                <Input
                  id="import-startDate"
                  type="date"
                  value={importData.startDate}
                  onChange={(e) =>
                    setImportData({ ...importData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-endDate">结束日期</Label>
                <Input
                  id="import-endDate"
                  type="date"
                  value={importData.endDate}
                  onChange={(e) =>
                    setImportData({ ...importData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? '导入中...' : '导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

