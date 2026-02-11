/**
 * 可穿戴设备连接卡片
 * @module components/fitness/WearableConnectionCard
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Watch, Link, Unlink, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useWearableConnections, useStravaConnection, useWearableEstimate } from '@/hooks/useWearableConnections';
import type { WearableProvider } from '@/types/fitness-analytics';
import { WEARABLE_PROVIDER_CONFIG } from '@/types/fitness-analytics';

interface WearableConnectionCardProps {
  className?: string;
}

function StravaConnectionItem() {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const {
    isConnected, lastSyncAt, isLoading,
    authorize, isAuthorizing,
    disconnect, isDisconnecting,
    sync, isSyncing,
  } = useStravaConnection();
  
  const config = WEARABLE_PROVIDER_CONFIG.STRAVA;

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <span className="text-xl">{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.name}</span>
              {isLoading ? (
                <Spinner className="w-4 h-4" />
              ) : isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已连接
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">未连接</Badge>
              )}
            </div>
            {isConnected && lastSyncAt && (
              <p className="text-xs text-muted-foreground mt-1">
                上次同步：{format(new Date(lastSyncAt), 'MM月dd日 HH:mm', { locale: zhCN })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              <Button variant="outline" size="sm" onClick={() => sync()} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-1">同步</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDisconnectDialog(true)}>
                <Unlink className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => authorize()} disabled={isAuthorizing}>
              {isAuthorizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link className="w-4 h-4 mr-1" />}
              连接
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>断开 Strava 连接</AlertDialogTitle>
            <AlertDialogDescription>断开后将不再同步您的运动数据。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { disconnect(); setShowDisconnectDialog(false); }}>
              断开连接
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ComingSoonProviderItem({ provider }: { provider: WearableProvider }) {
  const config = WEARABLE_PROVIDER_CONFIG[provider];
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <span className="text-xl">{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium">{config.name}</span>
          <Badge variant="outline" className="ml-2 text-muted-foreground">即将推出</Badge>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled>连接</Button>
    </div>
  );
}

function WearableEstimateCard() {
  const { data: estimate, isLoading } = useWearableEstimate();
  if (isLoading || !estimate) return null;
  
  return (
    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
      <div className="flex items-center gap-2 mb-3">
        <Watch className="w-5 h-5 text-orange-600" />
        <span className="font-medium text-orange-800">基于运动数据的体能评估</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">估算单日最大爬升</p>
          <p className="font-semibold text-lg">{estimate.estimatedMaxDailyAscentM}m</p>
        </div>
        <div>
          <p className="text-muted-foreground">置信度</p>
          <p className="font-semibold text-lg">{Math.round(estimate.confidenceScore * 100)}%</p>
        </div>
      </div>
    </div>
  );
}

export function WearableConnectionCard({ className }: WearableConnectionCardProps) {
  const { data: connections, isLoading } = useWearableConnections();
  const hasStravaConnected = connections?.some(c => c.provider === 'STRAVA' && c.connected);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Watch className="w-5 h-5" />
          运动数据同步
        </CardTitle>
        <CardDescription>连接您的运动设备，获得更准确的体能评估</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Spinner className="w-6 h-6" /></div>
        ) : (
          <>
            <StravaConnectionItem />
            <ComingSoonProviderItem provider="GARMIN" />
            <ComingSoonProviderItem provider="APPLE_HEALTH" />
            {hasStravaConnected && <WearableEstimateCard />}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-700">连接运动设备后，系统将分析您的真实运动数据，更准确地评估体能水平。</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default WearableConnectionCard;
