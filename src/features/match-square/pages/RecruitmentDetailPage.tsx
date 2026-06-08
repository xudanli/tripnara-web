import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { RecruitmentDetailPanel } from '../components/RecruitmentDetailPanel';
import { resolveRecruitmentTitle } from '../lib/resolve-recruitment-display';
import { usePostDetail } from '../hooks/useMatchSquare';
import { plazaLayout } from '../lib/plaza-visual';

/** 招募详情独立页 — 供分享链接与「在新页面打开」 */
export default function RecruitmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: postRaw } = usePostDetail(id);
  const navTitle = postRaw ? resolveRecruitmentTitle(postRaw) : '招募详情';

  if (!id) return null;

  return (
    <div className={plazaLayout.page}>
      <div className={plazaLayout.header}>
        <DashboardSubpageHeader
          backTo="/dashboard/tripnara/plaza"
          title={navTitle}
          maxWidth="4xl"
          className={cn('bg-transparent', plazaLayout.headerText)}
        />
      </div>

      <RecruitmentDetailPanel postId={id} variant="page" />
    </div>
  );
}
