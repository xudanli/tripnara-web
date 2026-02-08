/**
 * Airbnb 搜索结果组件
 * 
 * 展示 Airbnb 搜索结果列表，符合 Miller's Law（限制在 5-8 个结果）
 */

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AirbnbSearchCard } from './AirbnbSearchCard';
import { AirbnbAuthPrompt } from './AirbnbAuthPrompt';
import type { AirbnbListing, AirbnbSearchResponse } from '@/api/airbnb';

interface AirbnbSearchResultsProps {
  results: AirbnbSearchResponse | null;
  loading: boolean;
  error: string | null;
  isAuthorized: boolean;
  onViewDetails?: (listingId: string) => void;
  onAddToTrip?: (listing: AirbnbListing) => void;
  onAuthorize?: () => void;
  className?: string;
  maxVisible?: number; // 默认显示的最大数量（符合 Miller's Law）
  searchParams?: {
    checkin?: string;
    checkout?: string;
    adults?: number;
  };
}

export function AirbnbSearchResults({
  results,
  loading,
  error,
  isAuthorized,
  onViewDetails,
  onAddToTrip,
  onAuthorize,
  className,
  maxVisible = 5, // 默认显示 5 个，符合 Miller's Law
  searchParams,
}: AirbnbSearchResultsProps) {
  const [showAll, setShowAll] = useState(false);

  // 如果未授权，显示授权提示
  if (!isAuthorized && !loading && !error) {
    return (
      <div className={cn("space-y-4", className)}>
        <AirbnbAuthPrompt 
          onAuthorized={onAuthorize}
          compact
        />
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">正在搜索 Airbnb 房源...</p>
        <p className="text-xs text-muted-foreground mt-1">预计 3-5 秒</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium">搜索失败</p>
          <p className="text-sm mt-1">{error}</p>
        </AlertDescription>
      </Alert>
    );
  }

  // 无结果
  if (!results || results.results.length === 0) {
    return (
      <Alert className={className}>
        <Search className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium">未找到房源</p>
          <p className="text-sm mt-1">
            请尝试修改搜索条件，或选择其他日期/地点。
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  const visibleResults = showAll 
    ? results.results 
    : results.results.slice(0, maxVisible);
  const hasMore = results.results.length > maxVisible;

  return (
    <div className={cn("space-y-4", className)}>
      {/* 结果统计 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          找到 <span className="font-medium text-foreground">{results.total}</span> 个房源
        </p>
        {results.searchUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(results.searchUrl, '_blank', 'noopener,noreferrer')}
          >
            在 Airbnb 查看全部
          </Button>
        )}
      </div>

      {/* 搜索结果列表 */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-4">
          {visibleResults.map((listing) => (
            <AirbnbSearchCard
              key={listing.id}
              listing={listing}
              onViewDetails={onViewDetails}
              onAddToTrip={onAddToTrip}
              searchParams={searchParams}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 显示更多/收起按钮 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                收起 ({results.results.length - maxVisible} 个)
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                显示更多 ({results.results.length - maxVisible} 个)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
