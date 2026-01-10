import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { approvalsApi } from '@/api/approvals';
import type { ApprovalRequest, RiskLevel } from '@/types/approval';
import { ApprovalStatus } from '@/types/approval';
import { CheckCircle2, XCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalCardProps {
  approvalId: string;
  onDecision?: (approved: boolean) => void;
  onClose?: () => void;
}

// 风险等级颜色配置
const riskLevelColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

// 风险等级图标
const riskLevelIcons: Record<RiskLevel, typeof AlertTriangle> = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

// 状态颜色配置
const statusColors: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-800 border-green-200',
  [ApprovalStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
  [ApprovalStatus.EXPIRED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [ApprovalStatus.CANCELLED]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function ApprovalCard({ approvalId, onDecision, onClose }: ApprovalCardProps) {
  const { t } = useTranslation();
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApproval();
  }, [approvalId]);

  const loadApproval = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await approvalsApi.getApproval(approvalId);
      setApproval(data);
    } catch (err: any) {
      console.error('Failed to load approval:', err);
      setError(err.message || '加载审批请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await approvalsApi.handleDecision(approvalId, {
        approved: true,
        decisionNote: note || undefined,
        resumeAgent: true,
      });

      setApproval(result.approval);
      onDecision?.(true);

      if (result.agentResumed) {
        // Agent 已恢复，可以显示提示消息
        // 这个提示可以在父组件中处理
      }
    } catch (err: any) {
      console.error('Approval failed:', err);
      
      if (err.response?.status === 404) {
        setError('审批请求不存在或已被删除');
      } else if (err.response?.status === 409) {
        setError('此审批请求已被处理，无法重复操作');
        // 刷新审批详情
        await loadApproval();
      } else if (err.response?.status === 400) {
        setError('请求参数错误，请检查后重试');
      } else {
        setError(err.message || '批准失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await approvalsApi.handleDecision(approvalId, {
        approved: false,
        decisionNote: note || undefined,
        resumeAgent: true,
      });

      setApproval(result.approval);
      onDecision?.(false);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      
      if (err.response?.status === 404) {
        setError('审批请求不存在或已被删除');
      } else if (err.response?.status === 409) {
        setError('此审批请求已被处理，无法重复操作');
        await loadApproval();
      } else {
        setError(err.message || '拒绝失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 检查是否过期
  const isExpired = approval?.expiresAt 
    ? new Date(approval.expiresAt) < new Date()
    : false;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Spinner className="w-6 h-6" />
          <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !approval) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!approval) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>审批请求不存在</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 如果已处理，显示状态
  if (approval.status !== ApprovalStatus.PENDING) {
    const StatusIcon = approval.status === ApprovalStatus.APPROVED 
      ? CheckCircle2 
      : approval.status === ApprovalStatus.REJECTED
      ? XCircle
      : Clock;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>审批请求已处理</CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>{approval.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge className={cn('border', statusColors[approval.status])}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {approval.status}
          </Badge>
          
          {approval.decisionNote && (
            <div>
              <Label>审批备注</Label>
              <p className="text-sm text-muted-foreground mt-1">{approval.decisionNote}</p>
            </div>
          )}

          {approval.handledAt && (
            <div>
              <Label>处理时间</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(approval.handledAt).toLocaleString('zh-CN')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const RiskIcon = riskLevelIcons[approval.riskLevel];

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle>需要您的审批</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>{approval.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 过期警告 */}
        {isExpired && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>此审批请求已过期</AlertDescription>
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 详细描述 */}
        {approval.description && (
          <div>
            <Label>详细说明</Label>
            <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
          </div>
        )}

        {/* 风险等级 */}
        <div className="flex items-center gap-2">
          <Label>风险等级：</Label>
          <Badge className={cn('border flex items-center gap-1', riskLevelColors[approval.riskLevel])}>
            <RiskIcon className="w-3 h-3" />
            {approval.riskLevel}
          </Badge>
        </div>

        {/* 操作详情 */}
        {approval.payload && (
          <div>
            <Label>操作详情</Label>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(approval.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 过期时间 */}
        {approval.expiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              过期时间: {new Date(approval.expiresAt).toLocaleString('zh-CN')}
            </span>
          </div>
        )}

        {/* 备注输入 */}
        <div className="space-y-2">
          <Label htmlFor="approval-note">备注（可选）</Label>
          <Textarea
            id="approval-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="请输入审批备注..."
            rows={3}
            disabled={submitting || isExpired}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={submitting || isExpired}
            className="flex-1"
            variant="default"
          >
            {submitting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                处理中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                批准
              </>
            )}
          </Button>
          <Button
            onClick={handleReject}
            disabled={submitting || isExpired}
            className="flex-1"
            variant="outline"
          >
            {submitting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                处理中...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                拒绝
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
