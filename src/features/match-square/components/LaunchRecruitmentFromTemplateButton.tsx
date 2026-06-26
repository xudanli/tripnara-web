import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RouteTemplate } from '@/types/places-routes';
import { buildRecruitmentUrlFromRouteTemplate } from '@/features/match-square/lib/route-template-plaza-bridge';
import { useCanPublishTrustedProject } from '@/hooks/useCanPublishTrustedProject';

type LaunchRecruitmentFromTemplateButtonProps = {
  template: RouteTemplate;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  fullWidth?: boolean;
  compact?: boolean;
};

/** 路线模板 → 可信项目创建页（预填模板参数；需发布权限） */
export function LaunchRecruitmentFromTemplateButton({
  template,
  className,
  size = 'default',
  variant = 'default',
  fullWidth,
  compact,
}: LaunchRecruitmentFromTemplateButtonProps) {
  const navigate = useNavigate();
  const { canPublish, isLoading } = useCanPublishTrustedProject();
  const createUrl = buildRecruitmentUrlFromRouteTemplate(template);

  if (isLoading || !canPublish) {
    return null;
  }

  const handleClick = () => {
    if (!createUrl) {
      toast.message('暂未匹配到路线模板 catalog', {
        description: '可在可信项目创建页手动填写，系统仍会推荐相似模板。',
      });
      navigate('/dashboard/trusted-projects/new');
      return;
    }
    navigate(createUrl);
  };

  return (
    <Button
      type="button"
      className={cn(className, compact && 'gap-1.5')}
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={!template.isActive}
      title={createUrl ? '跳转至可信项目创建页（已预填模板）' : '跳转至可信项目创建页'}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      <Target className={cn('h-4 w-4', !compact && 'mr-2')} />
      {compact ? '发起招募' : '以此路线模板发起可信项目'}
    </Button>
  );
}
