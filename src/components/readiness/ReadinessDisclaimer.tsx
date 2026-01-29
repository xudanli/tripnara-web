/**
 * ReadinessDisclaimer 组件
 * 
 * 显示准备度检查的免责声明和责任边界
 * 根据 API v2.0.0 规范，必须显示给用户
 */

import { AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReadinessDisclaimer } from '@/api/readiness';
import { format } from 'date-fns';

interface ReadinessDisclaimerProps {
  disclaimer: ReadinessDisclaimer;
  className?: string;
}

export default function ReadinessDisclaimerComponent({
  disclaimer,
  className,
}: ReadinessDisclaimerProps) {
  return (
    <Card className={cn('border-amber-200 bg-amber-50/50', className)}>
      <CardContent className="p-4 space-y-3">
        {/* 标题 */}
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">
              免责声明
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {disclaimer.message}
            </p>
          </div>
        </div>

        {/* 数据来源 */}
        {disclaimer.dataSources && disclaimer.dataSources.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-900">数据来源：</p>
            <div className="flex flex-wrap gap-1.5">
              {disclaimer.dataSources.map((source, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-[10px] border-amber-300 text-amber-700 bg-amber-50"
                >
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 用户必须自行验证的事项 */}
        {disclaimer.userActionRequired && disclaimer.userActionRequired.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-900">
              请务必自行验证以下事项：
            </p>
            <ul className="space-y-1">
              {disclaimer.userActionRequired.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-amber-800">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 最后更新时间 */}
        {disclaimer.lastUpdated && (
          <div className="pt-2 border-t border-amber-200">
            <p className="text-[10px] text-amber-700">
              数据更新时间：{format(new Date(disclaimer.lastUpdated), 'yyyy-MM-dd HH:mm')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
