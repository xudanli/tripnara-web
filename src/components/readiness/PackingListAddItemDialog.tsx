import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { packingListCategoryLabel, type PackingListLang } from '@/lib/packing-list-display.util';

const CATEGORY_OPTIONS = [
  'clothing',
  'gear',
  'electronics',
  'toiletries',
  'documents',
  'food',
  'safety',
  'medication',
  'other',
] as const;

interface PackingListAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: PackingListLang;
  onSubmit: (values: {
    name: string;
    category: string;
    quantity: number;
    note?: string;
  }) => void;
}

export default function PackingListAddItemDialog({
  open,
  onOpenChange,
  lang,
  onSubmit,
}: PackingListAddItemDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const reset = () => {
    setName('');
    setCategory('other');
    setQuantity(1);
    setNote('');
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      category,
      quantity: Math.max(1, quantity),
      note: note.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加打包物品</DialogTitle>
          <DialogDescription>
            手动添加的物品会保存在本设备，并与系统生成的清单一起展示。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="packing-item-name">物品名称</Label>
            <Input
              id="packing-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：保暖抓绒、备用电池"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {packingListCategoryLabel(cat, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="packing-item-qty">数量</Label>
              <Input
                id="packing-item-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="packing-item-note">备注（可选）</Label>
            <Textarea
              id="packing-item-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="例如：每人一件、放随身行李"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
