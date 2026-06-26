import { useState } from 'react';
import { Scale, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import AddTeamMemberDialog from '@/components/trips/team/AddTeamMemberDialog';
import { EditMemberDialog, MemberCard } from '@/components/optimization/TeamManagementPanel';
import type { TeamMember } from '@/types/optimization-v2';
import { memberRoleLabel } from '@/lib/team-tab-model';

interface TeamMembersListProps {
  members: TeamMember[];
  loading?: boolean;
  readonly?: boolean;
  creatorUserId?: string;
  openAddMember?: boolean;
  onOpenAddMemberChange?: (open: boolean) => void;
  onAddMember?: (member: TeamMember, email?: string) => void | Promise<void>;
  onEditMember?: (member: TeamMember) => void;
  onRemoveMember?: (userId: string) => void;
  isEditMemberPending?: boolean;
  onInvite?: () => void;
  onOpenDecisionRules?: () => void;
}

export default function TeamMembersList({
  members,
  loading = false,
  readonly = false,
  creatorUserId,
  openAddMember,
  onOpenAddMemberChange,
  onAddMember,
  onEditMember,
  onRemoveMember,
  isEditMemberPending = false,
  onInvite,
  onOpenDecisionRules,
}: TeamMembersListProps) {
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; displayName: string } | null>(null);

  const addOpen = openAddMember ?? internalAddOpen;
  const setAddOpen = onOpenAddMemberChange ?? setInternalAddOpen;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">成员</CardTitle>
              <CardDescription className="text-sm">
                {members.length > 0 ? `${members.length} 位同行者` : '邀请同行者一起规划'}
              </CardDescription>
            </div>
            {!readonly ? (
              <div className="flex items-center gap-1 shrink-0">
                {onOpenDecisionRules ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={onOpenDecisionRules}
                  >
                    <Scale className="h-3.5 w-3.5 mr-1" />
                    决策规则
                  </Button>
                ) : null}
                {onInvite ? (
                  <Button variant="outline" size="sm" className="h-8" onClick={onInvite}>
                    邀请
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              还没有成员，邀请同行者一起规划
            </div>
          ) : (
            members.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                isLeader={member.role === 'LEADER'}
                hideWeight
                roleLabel={memberRoleLabel(member, member.userId === creatorUserId)}
                readonly={readonly}
                onEdit={onEditMember ? (m) => setMemberToEdit(m) : undefined}
                onRemove={
                  onRemoveMember
                    ? (userId) => setMemberToRemove({ userId, displayName: member.displayName })
                    : undefined
                }
              />
            ))
          )}

          {!readonly && onAddMember ? (
            <Button variant="outline" className="w-full mt-2" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              添加成员
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {onAddMember ? (
        <AddTeamMemberDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdd={onAddMember}
          onInvite={onInvite}
          existingMemberUserIds={members.map((m) => m.userId)}
        />
      ) : null}

      {onEditMember ? (
        <EditMemberDialog
          open={!!memberToEdit}
          onOpenChange={(open) => !open && setMemberToEdit(null)}
          member={memberToEdit}
          onSave={(updated) => {
            onEditMember(updated);
            setMemberToEdit(null);
          }}
          isSubmitting={isEditMemberPending}
          hideDecisionWeight
        />
      ) : null}

      {onRemoveMember ? (
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>移出团队成员</AlertDialogTitle>
              <AlertDialogDescription>
                确定将 <strong>{memberToRemove?.displayName}</strong> 移出团队？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (memberToRemove) {
                    onRemoveMember(memberToRemove.userId);
                    setMemberToRemove(null);
                  }
                }}
              >
                确定移出
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
