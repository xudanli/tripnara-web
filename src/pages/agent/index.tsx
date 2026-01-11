import { useSearchParams } from 'react-router-dom';
import { AgentChat } from '@/components/agent';

export default function AgentPage() {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');

  const handleSystem2Response = () => {
    // System2 响应后刷新数据
    // TODO: 实现数据刷新逻辑
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <AgentChat
          activeTripId={tripId}
          onSystem2Response={handleSystem2Response}
          className="h-full"
        />
      </div>
    </div>
  );
}