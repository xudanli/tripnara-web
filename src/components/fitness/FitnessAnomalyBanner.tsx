/**
 * 体能异常提醒横幅
 * 当检测到体能异常时显示提醒
 * 
 * @module components/fitness/FitnessAnomalyBanner
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { AlertTriangle, X, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFitnessAnomalies, useHasHighSeverityAnomaly } from '@/hooks/useFitnessAnomalies';
import type { FitnessAnomaly, AnomalySeverity } from '@/types/fitness-analytics';
import { ANOMALY_TYPE_CONFIG, ANOMALY_SEVERITY_CONFIG } from '@/types/fitness-analytics';

interface FitnessAnomalyBannerProps {
  highSeverityOnly?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

function SeverityIcon({ severity }: { severity: AnomalySeverity }) {
  switch (severity) {
    case 'HIGH':
      return <AlertTriangle className="w-5 h-5" />;
    case 'MEDIUM':
      return <AlertCircle className="w-5 h-5" />;
    case 'LOW':
      return <Info className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
}

function AnomalyItem({ 
  anomaly, 
  onViewDetails 
}: { 
  anomaly: FitnessAnomaly; 
  onViewDetails?: () => void;
}) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const typeConfig = ANOMALY_TYPE_CONFIG[anomaly.type];
  const severityConfig = ANOMALY_SEVERITY_CONFIG[anomaly.severity];

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      severityConfig.bgColorClass,
      severityConfig.borderClass
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', severityConfig.colorClass)}>
          <SeverityIcon severity={anomaly.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-medium', severityConfig.colorClass)}>
              {typeConfig.icon} {typeConfig.label}
            </span>
            <Badge variant="outline" className={cn('text-xs', severityConfig.colorClass)}>
              {severityConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isZh ? anomaly.descriptionZh : anomaly.description}
          </p>
          
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">建议：</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {typeConfig.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="shrink-0">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {anomaly.relatedTripIds && anomaly.relatedTripIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              关联 {anomaly.relatedTripIds.length} 次行程
            </p>
          )}
        </div>
        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onViewDetails}
            className="shrink-0"
          >
            详情
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function FitnessAnomalyBanner({
  highSeverityOnly = false,
  dismissible = true,
  onDismiss,
  onViewDetails,
  className,
}: FitnessAnomalyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { data, isLoading } = useFitnessAnomalies();
  
  if (isDismissed || isLoading) return null;
  if (!data?.hasAnomaly) return null;
  
  const anomalies = highSeverityOnly 
    ? data.anomalies.filter(a => a.severity === 'HIGH')
    : data.anomalies;
  
  if (anomalies.length === 0) return null;
  
  const highestSeverity = anomalies.reduce<AnomalySeverity>((highest, anomaly) => {
    const severityOrder: AnomalySeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
    return severityOrder.indexOf(anomaly.severity) > severityOrder.indexOf(highest)
      ? anomaly.severity
      : highest;
  }, 'LOW');
  
  const severityConfig = ANOMALY_SEVERITY_CONFIG[highestSeverity];
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <>
      <Card className={cn(
        'border-l-4',
        severityConfig.borderClass,
        severityConfig.bgColorClass,
        className
      )}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5', severityConfig.colorClass)}>
              <SeverityIcon severity={highestSeverity} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('font-semibold', severityConfig.colorClass)}>
                  体能异常提醒
                </span>
                <Badge variant="outline" className={cn('text-xs', severityConfig.colorClass)}>
                  {anomalies.length} 项
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {anomalies.length === 1 
                  ? ANOMALY_TYPE_CONFIG[anomalies[0].type].label
                  : `检测到 ${anomalies.length} 项体能异常，建议查看详情`
                }
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDetails(true)}
              >
                查看详情
              </Button>
              {dismissible && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDetails} onOpenChange={setShowDetails}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              体能异常提醒
            </AlertDialogTitle>
            <AlertDialogDescription>
              检测到以下体能异常，请关注您的身体状况
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {anomalies.map((anomaly, index) => (
              <AnomalyItem 
                key={index} 
                anomaly={anomaly}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>暂时忽略</AlertDialogCancel>
            {onViewDetails && (
              <AlertDialogAction onClick={onViewDetails}>
                查看体能报告
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function HighSeverityAnomalyAlert({
  onViewDetails,
  className,
}: {
  onViewDetails?: () => void;
  className?: string;
}) {
  const { hasHighSeverity, isLoading } = useHasHighSeverityAnomaly();
  
  if (isLoading || !hasHighSeverity) return null;
  
  return (
    <FitnessAnomalyBanner
      highSeverityOnly
      onViewDetails={onViewDetails}
      className={className}
    />
  );
}

export default FitnessAnomalyBanner;
