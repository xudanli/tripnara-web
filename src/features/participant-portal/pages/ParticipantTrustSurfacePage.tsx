import { ParticipantTrustSurfacePanel } from '../components/ParticipantTrustSurfacePanel';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';

/** GET /participant/projects/:token/trust-surface */
export default function ParticipantTrustSurfacePage() {
  const { token, invite } = useParticipantProject();

  if (!invite || !token) return null;

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />
      <ParticipantTrustSurfacePanel token={token} />
    </div>
  );
}
