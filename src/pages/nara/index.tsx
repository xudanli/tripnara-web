/**
 * Nara 智能体对话页 — 三栏布局（左栏由 DashboardLayout/MainSidebar 提供）
 * 路径: /dashboard/nara?tripId=...
 */
import NaraConversationWorkspace from '@/components/nara/NaraConversationWorkspace';

export default function NaraPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <NaraConversationWorkspace />
    </div>
  );
}
