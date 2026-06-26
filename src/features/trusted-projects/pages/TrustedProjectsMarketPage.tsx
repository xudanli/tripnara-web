import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { TrustedProjectCard } from '../components/TrustedProjectCard';
import { useTrustedProjects } from '@/hooks/useTrustedProjects';
import { useCanPublishTrustedProject } from '@/hooks/useCanPublishTrustedProject';

interface TrustedProjectsMarketPageProps {
  /** 公开站为 /trusted-projects；Dashboard 为 /dashboard/trusted-projects */
  basePath?: string;
  showDashboardChrome?: boolean;
}

export default function TrustedProjectsMarketPage({
  basePath = '/dashboard/trusted-projects',
  showDashboardChrome = true,
}: TrustedProjectsMarketPageProps) {
  const [destination, setDestination] = useState('');
  const [query, setQuery] = useState<{ destination?: string }>({});
  const { data: projects, isLoading, isError, refetch } = useTrustedProjects(query);
  const { canPublish } = useCanPublishTrustedProject();

  const detailPrefix = basePath;

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="tp-dest" className="text-xs font-medium text-muted-foreground">
            目的地筛选
          </label>
          <Input
            id="tp-dest"
            placeholder="例如 Iceland"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setQuery({ destination: destination || undefined })}
          />
        </div>
        <Button variant="secondary" onClick={() => setQuery({ destination: destination || undefined })}>
          搜索
        </Button>
        {showDashboardChrome && canPublish && (
          <Button asChild>
            <Link to="/dashboard/trusted-projects/new">
              <Plus className="mr-1 h-4 w-4" />
              发布项目
            </Link>
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <LogoLoading size={36} />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm">
          加载失败
          <Button variant="link" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(projects ?? []).map((project) => (
            <TrustedProjectCard key={project.id} project={project} detailPathPrefix={detailPrefix} />
          ))}
        </div>
      )}

      {!isLoading && !isError && (projects ?? []).length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">暂无已发布项目</p>
      )}
    </div>
  );

  if (!showDashboardChrome) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">可信旅行项目</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            认证发布者 · 审核上架 · 可解释信任档案
          </p>
        </header>
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard"
          title="可信旅行项目"
          subtitle="认证发布 · 平台审核 · 替代广场公开招募"
          maxWidth="full"
        />
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{content}</div>
    </div>
  );
}
