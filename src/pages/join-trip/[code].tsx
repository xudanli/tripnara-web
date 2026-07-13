import { Navigate, useParams } from 'react-router-dom';

/** 兼容后端 inviteUrl：/join-trip/:code → /invite/:code */
export default function JoinTripRedirectPage() {
  const { code = '' } = useParams<{ code: string }>();
  return <Navigate to={`/invite/${encodeURIComponent(code)}`} replace />;
}
