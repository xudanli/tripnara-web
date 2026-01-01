import { useState, useEffect } from 'react';
import { tripsApi } from '@/api/trips';
import type { Collaborator, CollaboratorRole } from '@/types/trip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Trash2, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CollaboratorsDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<CollaboratorRole, string> = {
  VIEWER: '查看者',
  EDITOR: '编辑者',
  OWNER: '所有者',
};

export function CollaboratorsDialog({ tripId, open, onOpenChange }: CollaboratorsDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('VIEWER');

  useEffect(() => {
    if (open && tripId) {
      loadCollaborators();
    }
  }, [open, tripId]);

  const loadCollaborators = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getCollaborators(tripId);
      setCollaborators(data);
    } catch (err: any) {
      setError(err.message || '加载协作者列表失败');
      console.error('Failed to load collaborators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || adding) return;

    try {
      setAdding(true);
      setError(null);
      await tripsApi.addCollaborator(tripId, { email: email.trim(), role });
      setEmail('');
      setRole('VIEWER');
      await loadCollaborators();
    } catch (err: any) {
      setError(err.message || '添加协作者失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('确定要移除这位协作者吗？')) return;

    try {
      await tripsApi.removeCollaborator(tripId, userId);
      await loadCollaborators();
    } catch (err: any) {
      setError(err.message || '移除协作者失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>协作者管理</DialogTitle>
          <DialogDescription>添加和管理行程的协作者，设置他们的权限</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* 添加协作者表单 */}
          <form onSubmit={handleAddCollaborator} className="space-y-4 border-b pb-4">
            <div className="grid grid-cols-[1fr,120px,auto] gap-2">
              <div className="space-y-2">
                <Label htmlFor="email">用户邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入用户邮箱地址"
                  required
                  disabled={adding}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">权限</Label>
                <Select value={role} onValueChange={(value) => setRole(value as CollaboratorRole)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">查看者</SelectItem>
                    <SelectItem value="EDITOR">编辑者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={adding || !email.trim()}>
                  {adding ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      添加
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* 协作者列表 */}
          <div>
            <Label className="mb-2 block">协作者列表</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : collaborators.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无协作者
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户 ID</TableHead>
                      <TableHead>权限</TableHead>
                      <TableHead>添加时间</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collaborators.map((collaborator) => (
                      <TableRow key={collaborator.id}>
                        <TableCell className="font-mono text-sm">
                          {collaborator.userId}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{roleLabels[collaborator.role]}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(collaborator.createdAt).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {collaborator.role !== 'OWNER' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCollaborator(collaborator.userId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

