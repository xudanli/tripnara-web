/**
 * 用户画像信息卡片组件
 * 显示根据用户回答识别出的用户画像信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User } from 'lucide-react';
import type { PersonaInfo } from '@/types/trip';
import { cn } from '@/lib/utils';

interface PersonaInfoCardProps {
  personaInfo: PersonaInfo;
  className?: string;
}

export default function PersonaInfoCard({
  personaInfo,
  className,
}: PersonaInfoCardProps) {
  const confidencePercent = Math.round(personaInfo.confidence * 100);
  
  // 根据置信度确定颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-blue-600';
    if (confidence >= 0.4) return 'text-amber-600';
    return 'text-slate-600';
  };
  
  const getProgressColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-blue-500';
    if (confidence >= 0.4) return 'bg-amber-500';
    return 'bg-slate-500';
  };
  
  return (
    <Card className={cn('border-blue-200 bg-blue-50/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-blue-600" />
          <span>根据您的回答，我们识别您可能是：</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 画像名称 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {personaInfo.personaName}
            </h3>
            {personaInfo.personaNameEn && (
              <Badge variant="outline" className="text-xs">
                {personaInfo.personaNameEn}
              </Badge>
            )}
          </div>
        </div>
        
        {/* 匹配度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">匹配度</span>
            <span className={cn('text-sm font-semibold', getConfidenceColor(personaInfo.confidence))}>
              {confidencePercent}%
            </span>
          </div>
          <Progress 
            value={confidencePercent} 
            className="h-2"
          />
        </div>
        
        {/* 匹配原因 */}
        {personaInfo.matchReasons && personaInfo.matchReasons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">匹配原因：</h4>
            <ul className="space-y-1.5">
              {personaInfo.matchReasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
