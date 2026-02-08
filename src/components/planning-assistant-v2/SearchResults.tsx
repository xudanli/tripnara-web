/**
 * Planning Assistant V2 - 搜索结果列表组件
 */

import { Card, CardContent } from '@/components/ui/card';
import { Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/api/planning-assistant-v2';

interface SearchResultsProps {
  results: SearchResult[];
  className?: string;
}

export function SearchResults({ results, className }: SearchResultsProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-4 space-y-3', className)}>
      {results.map((result, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {result.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {result.snippet}
                </p>
                {result.publishedDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.publishedDate}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
