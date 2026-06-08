import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MatchSquareAccess } from '@/types/match-square';
import { permissionBlockMessage } from '../lib/permissions';
import { plazaBanner } from '../lib/plaza-visual';

interface PermissionGateBannerProps {
  access: MatchSquareAccess;
  action: 'post' | 'apply';
}

export function PermissionGateBanner({ access, action }: PermissionGateBannerProps) {
  const blocked = action === 'post' ? !access.canPost : !access.canApply;
  if (!blocked) return null;

  return (
    <div className={cn(plazaBanner.base, plazaBanner.confirm)} role="status">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div className="flex-1 space-y-2">
        <p className="leading-relaxed">{permissionBlockMessage(action)}</p>
        <Button size="sm" variant="outline" className="h-8 border-current/20 bg-background/50" asChild>
          <Link to="/dashboard/tripnara/odyssey">去完成 Odyssey 入网</Link>
        </Button>
      </div>
    </div>
  );
}
