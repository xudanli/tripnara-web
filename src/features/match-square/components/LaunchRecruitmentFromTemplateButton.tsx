import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RouteTemplate } from '@/types/places-routes';
import {
  buildRecruitmentUrlFromRouteTemplate,
  resolveCatalogEntryFromTemplate,
} from '@/features/match-square/lib/route-template-plaza-bridge';
import { LaunchRecruitmentDialog } from './LaunchRecruitmentDialog';

type LaunchRecruitmentFromTemplateButtonProps = {
  template: RouteTemplate;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  fullWidth?: boolean;
  compact?: boolean;
  /** true = POST launch-recruitment；false = 跳转发布页（链路 B 兜底） */
  preferDirectLaunch?: boolean;
};

/** §链路 A · 路线模板 → 搭子广场发起招募 */
export function LaunchRecruitmentFromTemplateButton({
  template,
  className,
  size = 'default',
  variant = 'default',
  fullWidth,
  compact,
  preferDirectLaunch = true,
}: LaunchRecruitmentFromTemplateButtonProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const catalogEntry = resolveCatalogEntryFromTemplate(template);
  const fallbackUrl = buildRecruitmentUrlFromRouteTemplate(template);

  const handleClick = () => {
    if (preferDirectLaunch && catalogEntry) {
      setDialogOpen(true);
      return;
    }
    if (!fallbackUrl) {
      toast.message('暂未匹配到结伴广场模板 catalog', {
        description: '可在广场手动发起招募，愿景解析后仍会推荐相似模板。',
      });
      navigate('/dashboard/tripnara/plaza/new');
      return;
    }
    navigate(fallbackUrl);
  };

  return (
    <>
      <Button
        type="button"
        className={cn(className, compact && 'gap-1.5')}
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={!template.isActive}
        title={
          catalogEntry
            ? `绑定模板：${catalogEntry.titleZh}`
            : '将跳转至广场发布页（规则匹配模板）'
        }
        style={fullWidth ? { width: '100%' } : undefined}
      >
        <Target className={cn('h-4 w-4', !compact && 'mr-2')} />
        {compact ? '发起招募' : '以此路线模板发起车队招募'}
      </Button>

      {catalogEntry && (
        <LaunchRecruitmentDialog
          template={template}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
