import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OdysseyTripMetaRequest } from '@/types/odyssey-intake';

interface TripMetaStepProps {
  initial?: Partial<OdysseyTripMetaRequest>;
  onSubmit: (payload: OdysseyTripMetaRequest) => Promise<void>;
  isLoading?: boolean;
}

export function TripMetaStep({ initial, onSubmit, isLoading }: TripMetaStepProps) {
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !startDate || !endDate) {
      setError('请填写完整行程信息');
      return;
    }
    setError(null);
    try {
      await onSubmit({ destination: destination.trim(), startDate, endDate });
    } catch {
      setError('保存失败，请重试');
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>本次出行计划</CardTitle>
          <CardDescription>用于 Hard Gate 过滤：时间与目的地不匹配的旅伴不会推荐给你。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">目的地</Label>
              <Input
                id="destination"
                placeholder="例如 Iceland"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">出发日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">返程日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '保存中…' : '开始匹配旅伴'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
