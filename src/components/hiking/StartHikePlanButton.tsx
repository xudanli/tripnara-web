import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHikePlanStorage } from '@/hooks/useHikePlanStorage';
import { handleHikePlanError } from '@/lib/hike-plan-error';
import { Button } from '@/components/ui/button';
import { Loader2, Footprints } from 'lucide-react';
import { toast } from 'sonner';
import { hikePlanRepository } from '@/services/hike-plan-repository';

type StartHikePlanButtonProps = {
  routeDirectionId: number;
  nameCN?: string;
  routeDirectionName?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
};

export function StartHikePlanButton({
  routeDirectionId,
  nameCN,
  routeDirectionName,
  className,
  size = 'lg',
}: StartHikePlanButtonProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isApiMode } = useHikePlanStorage();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isApiMode && !isAuthenticated) {
      toast.error('请先登录后再创建云端徒步计划');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const plan = await hikePlanRepository.create({
        routeDirectionId,
        nameCN,
        routeDirectionName,
        plannedDate: new Date().toISOString().slice(0, 10),
      });
      toast.success(`已创建徒步计划：${nameCN ?? '路线'}`);
      navigate(`/dashboard/trails/prep/${plan.id}`);
    } catch (e) {
      if (handleHikePlanError(e, navigate)) return;
      toast.error((e as Error).message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className={className} size={size} onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Footprints className="h-4 w-4 mr-2" />
      )}
      开始准备
    </Button>
  );
}
