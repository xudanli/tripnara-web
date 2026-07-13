/**
 * 统一邀请入口解析
 */

export type InviteKind = 'trip_member' | 'team' | 'gate1_participant';

export interface ResolvedInvitePreview {
  title?: string;
  subtitle?: string;
  destination?: string;
  tripId?: string;
  projectId?: string;
  label?: string;
  expired?: boolean;
}

export interface ResolvedInvite {
  kind: InviteKind;
  token: string;
  targetPath: string;
  preview?: ResolvedInvitePreview;
}
