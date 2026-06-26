/**
 * 编辑行程项费用对话框
 * 
 * 用于更新已有行程项的费用信息
 */

import { useState, useEffect } from 'react';
import { useItineraryCost } from '@/hooks';
import type { ItineraryItemDetail, CostCategory, ItemCostRequest } from '@/types/trip';
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
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface EditItemCostDialogProps {
  item: ItineraryItemDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditItemCostDialog({
  item,
  open,
  onOpenChange,
  onSuccess,
}: EditItemCostDialogProps) {
  const { updateCost, updatingCost } = useItineraryCost();
  
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [actualCost, setActualCost] = useState<string>('');
  const [currency, setCurrency] = useState<string>('CNY');
  const [costCategory, setCostCategory] = useState<CostCategory | ''>('');
  const [costNote, setCostNote] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);

  // 初始化表单数据
  useEffect(() => {
    if (item && open) {
      setEstimatedCost(item.estimatedCost?.toString() || '');
      setActualCost(item.actualCost?.toString() || '');
      setCurrency(item.currency || 'CNY');
      setCostCategory(item.costCategory || '');
      setCostNote(item.costNote || '');
      setIsPaid(item.isPaid || false);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const costData: ItemCostRequest = {};
    
    if (estimatedCost) {
      costData.estimatedCost = parseFloat(estimatedCost);
    }
    if (actualCost) {
      costData.actualCost = parseFloat(actualCost);
    }
    if (currency) {
      costData.currency = currency;
    }
    if (costCategory) {
      costData.costCategory = costCategory as CostCategory;
    }
    if (costNote.trim()) {
      costData.costNote = costNote.trim();
    }
    costData.isPaid = isPaid;

    try {
      const result = await updateCost(item.id, costData);
      if (result) {
        toast.success('费用更新成功');
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || '更新失败，请重试');
    }
  };

  const placeName = item.Place?.nameCN || item.Place?.nameEN || '行程项';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            编辑费用
          </DialogTitle>
          <DialogDescription>
            {placeName} - {item.type}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">预估费用</Label>
              <Input
                id="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualCost">实际费用</Label>
              <Input
                id="actualCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">货币</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY (人民币)</SelectItem>
                  <SelectItem value="USD">USD (美元)</SelectItem>
                  <SelectItem value="EUR">EUR (欧元)</SelectItem>
                  <SelectItem value="JPY">JPY (日元)</SelectItem>
                  <SelectItem value="GBP">GBP (英镑)</SelectItem>
                  <SelectItem value="AUD">AUD (澳元)</SelectItem>
                  <SelectItem value="CAD">CAD (加元)</SelectItem>
                  <SelectItem value="CHF">CHF (瑞士法郎)</SelectItem>
                  <SelectItem value="SEK">SEK (瑞典克朗)</SelectItem>
                  <SelectItem value="NOK">NOK (挪威克朗)</SelectItem>
                  <SelectItem value="DKK">DKK (丹麦克朗)</SelectItem>
                  <SelectItem value="ISK">ISK (冰岛克朗)</SelectItem>
                  <SelectItem value="KRW">KRW (韩元)</SelectItem>
                  <SelectItem value="SGD">SGD (新加坡元)</SelectItem>
                  <SelectItem value="HKD">HKD (港币)</SelectItem>
                  <SelectItem value="TWD">TWD (台币)</SelectItem>
                  <SelectItem value="THB">THB (泰铢)</SelectItem>
                  <SelectItem value="MYR">MYR (马来西亚林吉特)</SelectItem>
                  <SelectItem value="IDR">IDR (印尼盾)</SelectItem>
                  <SelectItem value="PHP">PHP (菲律宾比索)</SelectItem>
                  <SelectItem value="VND">VND (越南盾)</SelectItem>
                  <SelectItem value="INR">INR (印度卢比)</SelectItem>
                  <SelectItem value="AED">AED (阿联酋迪拉姆)</SelectItem>
                  <SelectItem value="SAR">SAR (沙特里亚尔)</SelectItem>
                  <SelectItem value="ZAR">ZAR (南非兰特)</SelectItem>
                  <SelectItem value="BRL">BRL (巴西雷亚尔)</SelectItem>
                  <SelectItem value="MXN">MXN (墨西哥比索)</SelectItem>
                  <SelectItem value="ARS">ARS (阿根廷比索)</SelectItem>
                  <SelectItem value="CLP">CLP (智利比索)</SelectItem>
                  <SelectItem value="COP">COP (哥伦比亚比索)</SelectItem>
                  <SelectItem value="PEN">PEN (秘鲁索尔)</SelectItem>
                  <SelectItem value="NZD">NZD (新西兰元)</SelectItem>
                  <SelectItem value="FJD">FJD (斐济元)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costCategory">费用分类</Label>
              <Select value={costCategory} onValueChange={(v) => setCostCategory(v as CostCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCOMMODATION">住宿</SelectItem>
                  <SelectItem value="TRANSPORTATION">交通</SelectItem>
                  <SelectItem value="FOOD">餐饮</SelectItem>
                  <SelectItem value="ACTIVITIES">活动/门票</SelectItem>
                  <SelectItem value="SHOPPING">购物</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="costNote">费用备注</Label>
            <Input
              id="costNote"
              placeholder="如：门票+缆车"
              value={costNote}
              onChange={(e) => setCostNote(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPaid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isPaid" className="text-sm text-muted-foreground cursor-pointer">
              已支付
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updatingCost}
            >
              取消
            </Button>
            <Button type="submit" disabled={updatingCost}>
              {updatingCost ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  更新中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditItemCostDialog;
