import { Outlet } from 'react-router-dom';
import Logo from '@/components/common/Logo';

interface ParticipantMobileLayoutProps {
  projectTitle?: string;
  subtitle?: string;
}

export function ParticipantMobileLayout({ projectTitle, subtitle }: ParticipantMobileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Logo className="h-7 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{projectTitle ?? '成员参与'}</p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : (
              <p className="text-xs text-muted-foreground">TripNARA Participant Portal</p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
