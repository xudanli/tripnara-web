import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

export function ReplaceItineraryItemDialog({
  tripId,
  itemId,
  placeName,
  open,
  onOpenChange,
  onSuccess,
}: ReplaceItineraryItemDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const REPLACE_REASONS = [
    { value: 'too_tired', label: t('dialogs.replaceItineraryItem.reasons.tooTired') },
    { value: 'weather_change', label: t('dialogs.replaceItineraryItem.reasons.weatherChange') },
    { value: 'change_style', label: t('dialogs.replaceItineraryItem.reasons.changeStyle') },
    { value: 'too_far', label: t('dialogs.replaceItineraryItem.reasons.tooFar') },
    { value: 'closed', label: t('dialogs.replaceItineraryItem.reasons.closed') },
    { value: 'other', label: t('dialogs.replaceItineraryItem.reasons.other') },
  ];

  const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
    nature: t('dialogs.replaceItineraryItem.travelStyles.nature'),
    culture: t('dialogs.replaceItineraryItem.travelStyles.culture'),
    food: t('dialogs.replaceItineraryItem.travelStyles.food'),
    citywalk: t('dialogs.replaceItineraryItem.travelStyles.citywalk'),
    photography: t('dialogs.replaceItineraryItem.travelStyles.photography'),
    adventure: t('dialogs.replaceItineraryItem.travelStyles.adventure'),
  };
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
      setError(err.message || t('dialogs.replaceItineraryItem.replaceFailed'));
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
          <DialogTitle>{t('dialogs.replaceItineraryItem.title')}</DialogTitle>
          <DialogDescription>
            {placeName && t('dialogs.replaceItineraryItem.replacePlace', { placeName })}
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
              <Label htmlFor="reason">{t('dialogs.replaceItineraryItem.reason')}</Label>
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
                <Label htmlFor="preferredStyle">{t('dialogs.replaceItineraryItem.preferredStyle')}</Label>
                <Select
                  value={formData.preferredStyle}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferredStyle: value as TravelStyle })
                  }
                >
                  <SelectTrigger id="preferredStyle">
                    <SelectValue placeholder={t('dialogs.replaceItineraryItem.selectStyle')} />
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
                <Label htmlFor="customReason">{t('dialogs.replaceItineraryItem.customReason')}</Label>
                <Textarea
                  id="customReason"
                  placeholder={t('dialogs.replaceItineraryItem.customReasonPlaceholder')}
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
                    {t('dialogs.replaceItineraryItem.replacing')}
                  </>
                ) : (
                  t('dialogs.replaceItineraryItem.findReplacement')
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="font-medium text-green-800 mb-2">{t('dialogs.replaceItineraryItem.foundReplacement')}</div>
              <div className="text-sm text-green-700">
                <div className="mb-1">
                  <strong>{t('dialogs.replaceItineraryItem.newPlace')}</strong> Place ID {result.newItem.placeId}
                </div>
                <div className="mb-1">
                  <strong>{t('dialogs.replaceItineraryItem.reasonLabel')}</strong> {result.newItem.reason}
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
                <Label>{t('dialogs.replaceItineraryItem.otherAlternatives')}</Label>
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
                <span>{t('dialogs.replaceItineraryItem.confirmReplace')}</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

