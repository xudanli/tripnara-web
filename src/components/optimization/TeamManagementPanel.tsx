/**
 * 团队管理面板组件
 * 
 * 支持创建团队、管理成员、查看团队约束
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type {
  Team,
  TeamMember,
  TeamType,
  DecisionWeightMode,
  MemberRole,
  FitnessLevelType,
  ExperienceLevelType,
  TeamConstraintsResponse,
  TeamWeightsResponse,
} from '@/types/optimization-v2';
import {
  Users,
  UserPlus,
  Crown,
  Eye,
  User,
  Settings,
  Trash2,
  Shield,
  Mountain,
  Clock,
  AlertTriangle,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ==================== 配置 ====================

const TEAM_TYPE_CONFIG: Record<TeamType, { label: string; icon: React.ElementType }> = {
  FAMILY: { label: '家庭', icon: Users },
  FRIENDS: { label: '朋友', icon: Users },
  EXPEDITION: { label: '探险队', icon: Mountain },
  TOUR_GROUP: { label: '旅行团', icon: Users },
  CUSTOM: { label: '自定义', icon: Settings },
};

const DECISION_MODE_CONFIG: Record<DecisionWeightMode, { label: string; description: string }> = {
  EQUAL: { label: '平等决策', description: '所有成员权重相同' },
  LEADER_DOMINANT: { label: '领队主导', description: '领队拥有更高决策权' },
  EXPERIENCE_WEIGHTED: { label: '经验加权', description: '经验丰富者权重更高' },
  FITNESS_WEIGHTED: { label: '体能加权', description: '体能强者权重更高' },
  CUSTOM: { label: '自定义', description: '手动设置每人权重' },
};

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ElementType; color: string }> = {
  LEADER: { label: '领队', icon: Crown, color: 'text-yellow-500' },
  MEMBER: { label: '成员', icon: User, color: 'text-blue-500' },
  OBSERVER: { label: '观察者', icon: Eye, color: 'text-gray-500' },
};

const FITNESS_LEVEL_CONFIG: Record<FitnessLevelType, { label: string; color: string }> = {
  BEGINNER: { label: '初级', color: 'bg-green-100 text-green-700' },
  INTERMEDIATE: { label: '中级', color: 'bg-blue-100 text-blue-700' },
  ADVANCED: { label: '高级', color: 'bg-purple-100 text-purple-700' },
  EXPERT: { label: '专家', color: 'bg-red-100 text-red-700' },
};

const EXPERIENCE_LEVEL_CONFIG: Record<ExperienceLevelType, { label: string }> = {
  NOVICE: { label: '新手' },
  SOME_EXPERIENCE: { label: '有经验' },
  EXPERIENCED: { label: '经验丰富' },
  EXPERT: { label: '专家' },
};

// ==================== 子组件 ====================

/** 成员卡片 */
function MemberCard({
  member,
  isLeader = false,
  onEdit,
  onRemove,
  readonly = false,
  /** 归一化后的决策权重（0-100），用于展示；未传时用原始 decisionWeight */
  displayWeightPercent,
}: {
  member: TeamMember;
  isLeader?: boolean;
  onEdit?: (member: TeamMember) => void;
  onRemove?: (userId: string) => void;
  readonly?: boolean;
  displayWeightPercent?: number;
}) {
  const roleConfig = ROLE_CONFIG[member.role as MemberRole] ?? ROLE_CONFIG.MEMBER;
  const fitnessConfig = FITNESS_LEVEL_CONFIG[member.fitnessLevel as FitnessLevelType] ?? FITNESS_LEVEL_CONFIG.INTERMEDIATE;
  const RoleIcon = roleConfig?.icon ?? User;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.displayName}`} />
        <AvatarFallback>{member.displayName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{member.displayName}</span>
          <RoleIcon className={cn('h-4 w-4', roleConfig.color)} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={cn('text-xs', fitnessConfig.color)}>
            {fitnessConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            权重 {displayWeightPercent !== undefined ? Math.round(displayWeightPercent) : Math.round(member.decisionWeight * 100)}%
          </span>
        </div>
      </div>

      {!readonly && (
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {onRemove && !isLeader && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(member.userId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** 团队约束展示 */
function TeamConstraintsDisplay({
  constraints,
}: {
  constraints: TeamConstraintsResponse;
}) {
  const c = constraints?.constraints ?? {};
  const sources = constraints?.constraintSources ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span>团队约束（最弱链原则）</span>
      </div>
      
      <div className="grid gap-2 text-sm">
        {c.maxDailyAscentM && (
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <span>每日最大爬升</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{c.maxDailyAscentM}m</span>
              <Badge variant="outline" className="text-xs">
                {sources.find(s => s.constraint === 'maxDailyAscentM')?.sourceDisplayName}
              </Badge>
            </div>
          </div>
        )}
        
        {c.maxDailyHours && (
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>每日最大活动时长</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{c.maxDailyHours}h</span>
              <Badge variant="outline" className="text-xs">
                {sources.find(s => s.constraint === 'maxDailyHours')?.sourceDisplayName}
              </Badge>
            </div>
          </div>
        )}

        {c.altitudeLimit && (
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>海拔限制</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{c.altitudeLimit}m</span>
              <Badge variant="outline" className="text-xs">
                {sources.find(s => s.constraint === 'altitudeLimit')?.sourceDisplayName}
              </Badge>
            </div>
          </div>
        )}

        {c.specialNeeds && c.specialNeeds.length > 0 && (
          <div className="p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>特殊需求</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.specialNeeds.map((need, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {need}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 权重分配展示 */
function WeightsDistribution({
  weights,
}: {
  weights: TeamWeightsResponse;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Scale className="h-4 w-4 text-blue-500" />
        <span>决策权重分配</span>
      </div>
      
      <div className="space-y-2">
        {weights.memberContributions.map((member) => (
          <div key={member.userId} className="flex items-center gap-3">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {member.displayName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{member.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(member.contributionWeight * 100)}%
                </span>
              </div>
              <Progress value={member.contributionWeight * 100} className="h-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 添加成员对话框 */
function AddMemberDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (member: Omit<TeamMember, 'userId' | 'personalWeights'>) => void;
}) {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<MemberRole>('MEMBER');
  const [fitness, setFitness] = React.useState<FitnessLevelType>('INTERMEDIATE');
  const [experience, setExperience] = React.useState<ExperienceLevelType>('SOME_EXPERIENCE');
  const [weight, setWeight] = React.useState([0.5]);

  const handleAdd = () => {
    if (!name.trim()) return;
    
    onAdd({
      displayName: name.trim(),
      role,
      fitnessLevel: fitness,
      experienceLevel: experience,
      decisionWeight: weight[0],
    });
    
    // Reset form
    setName('');
    setRole('MEMBER');
    setFitness('INTERMEDIATE');
    setExperience('SOME_EXPERIENCE');
    setWeight([0.5]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加团队成员</DialogTitle>
          <DialogDescription>
            添加新成员到团队，设置其角色和能力等级
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              placeholder="请输入成员姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>角色</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={cn('h-4 w-4', config.color)} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>体能等级</Label>
              <Select value={fitness} onValueChange={(v) => setFitness(v as FitnessLevelType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FITNESS_LEVEL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>经验等级</Label>
            <Select value={experience} onValueChange={(v) => setExperience(v as ExperienceLevelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPERIENCE_LEVEL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>决策权重</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(weight[0] * 100)}%
              </span>
            </div>
            <Slider
              value={weight}
              onValueChange={setWeight}
              max={1}
              step={0.05}
              className="py-2"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主组件 ====================

export interface TeamManagementPanelProps {
  /** 团队数据 */
  team?: Team;
  /** 团队约束 */
  constraints?: TeamConstraintsResponse;
  /** 团队权重 */
  weights?: TeamWeightsResponse;
  /** 添加成员回调 */
  onAddMember?: (member: Omit<TeamMember, 'userId' | 'personalWeights'>) => void;
  /** 移除成员回调 */
  onRemoveMember?: (userId: string) => void;
  /** 编辑成员回调 */
  onEditMember?: (member: TeamMember) => void;
  /** 更新团队设置回调 */
  onUpdateSettings?: (settings: Partial<Team>) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function TeamManagementPanel({
  team,
  constraints,
  weights,
  onAddMember,
  onRemoveMember,
  onEditMember,
  onUpdateSettings,
  readonly = false,
  loading = false,
  className,
}: TeamManagementPanelProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState({
    members: true,
    constraints: true,
    weights: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            尚未创建团队
          </p>
          {!readonly && (
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              创建团队
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const teamTypeConfig = TEAM_TYPE_CONFIG[team.type as TeamType] ?? TEAM_TYPE_CONFIG.CUSTOM;
  const decisionModeConfig = DECISION_MODE_CONFIG[team.decisionWeightMode as DecisionWeightMode] ?? DECISION_MODE_CONFIG.EQUAL;
  const TeamIcon = teamTypeConfig?.icon ?? Users;
  const leader = team.members.find(m => m.role === 'LEADER');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TeamIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{teamTypeConfig.label}</Badge>
                <span className="text-xs">{(team.members || []).length} 成员</span>
              </CardDescription>
            </div>
          </div>
          {!readonly && onUpdateSettings && (
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          )}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{decisionModeConfig.label}</span>
            <span className="text-muted-foreground">- {decisionModeConfig.description}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 成员列表 */}
        <div>
          <button
            className="flex items-center justify-between w-full py-2"
            onClick={() => toggleSection('members')}
          >
            <span className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              团队成员 ({(team.members || []).length})
            </span>
            {expandedSections.members ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.members && (
            <div className="space-y-2 mt-2">
              {(() => {
                const contribMap = new Map(
                  weights?.memberContributions?.map(c => [c.userId, c.contributionWeight * 100]) ?? []
                );
                const total = team.members.reduce((s, m) => s + (m.decisionWeight ?? 0), 0);
                return team.members.map(member => (
                  <MemberCard
                    key={member.userId}
                    member={member}
                    isLeader={member.role === 'LEADER'}
                    onEdit={onEditMember}
                    onRemove={onRemoveMember}
                    readonly={readonly}
                    displayWeightPercent={
                      contribMap.has(member.userId) ? contribMap.get(member.userId)
                      : total > 0 ? (member.decisionWeight ?? 0) / total * 100
                      : undefined
                    }
                  />
                ));
              })()}
              
              {!readonly && onAddMember && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  添加成员
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* 团队约束 */}
        {constraints && (
          <>
            <div>
              <button
                className="flex items-center justify-between w-full py-2"
                onClick={() => toggleSection('constraints')}
              >
                <span className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  团队约束
                </span>
                {expandedSections.constraints ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {expandedSections.constraints && (
                <div className="mt-2">
                  <TeamConstraintsDisplay constraints={constraints} />
                </div>
              )}
            </div>
            
            <Separator />
          </>
        )}

        {/* 权重分配 */}
        {weights && (
          <div>
            <button
              className="flex items-center justify-between w-full py-2"
              onClick={() => toggleSection('weights')}
            >
              <span className="font-medium flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                权重分配
              </span>
              {expandedSections.weights ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.weights && (
              <div className="mt-2">
                <WeightsDistribution weights={weights} />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* 添加成员对话框 */}
      {onAddMember && (
        <AddMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={onAddMember}
        />
      )}
    </Card>
  );
}

// ==================== 导出 ====================

export default TeamManagementPanel;
export { MemberCard, TeamConstraintsDisplay, WeightsDistribution, AddMemberDialog };
