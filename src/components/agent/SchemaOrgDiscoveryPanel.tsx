import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Braces, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchemaOrgDiscoveryPayload } from '@/types/schema-org-discovery';
import {
  buildSchemaOrgExportJson,
  hasSchemaOrgDiscoveryContent,
} from '@/lib/schema-org-discovery.util';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface SchemaOrgDiscoveryPanelProps {
  discovery: SchemaOrgDiscoveryPayload;
  className?: string;
  compact?: boolean;
}

export default function SchemaOrgDiscoveryPanel({
  discovery,
  className,
  compact = false,
}: SchemaOrgDiscoveryPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const exportJson = useMemo(() => buildSchemaOrgExportJson(discovery), [discovery]);

  if (!hasSchemaOrgDiscoveryContent(discovery)) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      toast.success(
        t('agent.schemaOrgDiscovery.copySuccess', { defaultValue: '已复制 JSON-LD' })
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('agent.schemaOrgDiscovery.copyFailed', { defaultValue: '复制失败' }));
    }
  };

  return (
    <Card
      className={cn(
        'border-gate-allow-border/80 bg-gate-allow/20 dark:bg-gate-allow/10',
        compact && 'shadow-none',
        className
      )}
    >
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className={cn('flex items-center gap-2 text-base', compact && 'text-sm')}>
            <Braces className="h-4 w-4 text-gate-allow-foreground" />
            {t('agent.schemaOrgDiscovery.title', { defaultValue: 'Schema.org 发现层' })}
            <Badge variant="outline" className="text-[10px] font-normal">
              {t('agent.schemaOrgDiscovery.debugBadge', { defaultValue: 'SEO / 导出' })}
            </Badge>
          </CardTitle>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopy}>
            {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
            {t('agent.schemaOrgDiscovery.copyJsonLd', { defaultValue: '复制 JSON-LD' })}
          </Button>
        </div>
        {discovery.summary ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{discovery.summary}</p>
        ) : null}
      </CardHeader>
      <CardContent className={cn('space-y-3', compact && 'pt-0')}>
        {discovery.entities && discovery.entities.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              {t('agent.schemaOrgDiscovery.entities', {
                defaultValue: '发现实体（{{count}}）',
                count: discovery.entities.length,
              })}
            </p>
            <ul className="space-y-1">
              {discovery.entities.map((entity) => (
                <li
                  key={entity.id ?? `${entity.type}-${entity.name ?? ''}`}
                  className="flex flex-wrap items-center gap-1.5 rounded border border-border/60 bg-background/60 px-2 py-1 text-[11px]"
                >
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">
                    {entity.type}
                  </Badge>
                  <span className="font-medium text-foreground">{entity.name ?? entity.id ?? '—'}</span>
                  {entity.source ? (
                    <span className="text-muted-foreground">· {entity.source}</span>
                  ) : null}
                  {entity.url ? (
                    <a
                      href={entity.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-gate-allow-foreground underline-offset-2 hover:underline dark:text-gate-allow-foreground"
                    >
                      {entity.url}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <details className="text-[10px]">
          <summary className="cursor-pointer select-none text-muted-foreground">
            {t('agent.schemaOrgDiscovery.previewJson', { defaultValue: 'JSON-LD 预览' })}
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded border bg-muted/25 p-2 font-mono leading-snug">
            {exportJson}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
