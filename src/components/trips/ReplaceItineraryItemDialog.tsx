import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { tripsApi } from '@/api/trips';
import type { ReplaceItineraryItemRequest, ReplaceItineraryItemResponse, TravelStyle } from '@/types/trip';
import { AlertCircle } from 'lucide-react';

interface ReplaceItineraryItemDialogProps {
  tripId: string;
  itemId: string;
  placeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: ReplaceItineraryItemResponse) => void;
}

const REPLACE_REASONS = [
  { value: 'too_tired', label: '太累' },
  { value: 'weather_change', label: '天气变化' },
  { value: 'change_style', label: '想换风格' },
  { value: 'too_far', label: '距离太远' },
  { value: 'closed', label: '已关闭' },
  { value: 'other', label: '其他' },
];

const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
  nature: '自然风光',
  culture: '文化历史',
  food: '美食探索',
  citywalk: '城市漫步',
  photography: '摄影打卡',
  adventure: '冒险体验',
};

export function ReplaceItineraryItemDialog({
  tripId,
  itemId,
  placeName,
  open,
  onOpenChange,
  onSuccess,
}: ReplaceItineraryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReplaceItineraryItemRequest>({
    reason: 'too_tired',
    constraints: {},
  });
  const [result, setResult] = useState<ReplaceItineraryItemResponse | null>(null);

  useEffect(() => {
    if (open) {
      // 重置表单
      setFormData({
        reason: 'too_tired',
        constraints: {},
      });
      setError(null);
      setResult(null);
    }
  }, [open]);

  const handleReplace = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await tripsApi.replaceItem(tripId, itemId, formData);
      setResult(response);
    } catch (err: any) {
      setError(err.message || '替换行程项失败');
      console.error('Failed to replace item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (result) {
      onSuccess(result);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>替换行程项</DialogTitle>
          <DialogDescription>
            {placeName && `替换 "${placeName}" 为更合适的地点`}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">替换原因</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value as any })}
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPLACE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.reason === 'change_style' && (
              <div className="space-y-2">
                <Label htmlFor="preferredStyle">偏好风格</Label>
                <Select
                  value={formData.preferredStyle}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferredStyle: value as TravelStyle })
                  }
                >
                  <SelectTrigger id="preferredStyle">
                    <SelectValue placeholder="选择风格" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAVEL_STYLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.reason === 'too_far' || formData.reason === 'other') && (
              <div className="space-y-2">
                <Label htmlFor="customReason">详细说明</Label>
                <Textarea
                  id="customReason"
                  placeholder="请说明替换原因..."
                  value={formData.reason === 'other' ? (formData as any).customReason || '' : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ...(formData.reason === 'other' && { customReason: e.target.value }),
                    } as any)
                  }
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleReplace} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    替换中...
                  </>
                ) : (
                  '查找替换方案'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="font-medium text-green-800 mb-2">找到替换方案</div>
              <div className="text-sm text-green-700">
                <div className="mb-1">
                  <strong>新地点:</strong> Place ID {result.newItem.placeId}
                </div>
                <div className="mb-1">
                  <strong>原因:</strong> {result.newItem.reason}
                </div>
                {result.newItem.evidence && (
                  <div className="text-xs mt-2 space-y-1">
                    {result.newItem.evidence.openingHours && (
                      <div>营业时间: {result.newItem.evidence.openingHours}</div>
                    )}
                    {result.newItem.evidence.rating && (
                      <div>评分: {result.newItem.evidence.rating}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {result.alternatives && result.alternatives.length > 0 && (
              <div className="space-y-2">
                <Label>其他备选方案</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        // 可以选择备选方案
                        setResult({
                          ...result,
                          newItem: {
                            ...result.newItem,
                            placeId: alt.placeId,
                            reason: alt.reason,
                          },
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{alt.placeName}</div>
                          <div className="text-sm text-muted-foreground">{alt.reason}</div>
                        </div>
                        <Badge variant="outline">评分: {alt.score.toFixed(1)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleConfirm}>
                <span>确认替换</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

