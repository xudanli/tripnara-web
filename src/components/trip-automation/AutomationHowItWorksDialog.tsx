import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AUTOMATION_UI_LEVEL_MAP } from '@/lib/trip-automation-authorization.util';
import type { AutomationUiLevel } from '@/api/travel-status.types';

interface AutomationHowItWorksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AutomationHowItWorksDialog({
  open,
  onOpenChange,
}: AutomationHowItWorksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 自动执行如何工作？</DialogTitle>
          <DialogDescription>
            授权中心定义 AI 可在哪些任务上自动行动；超出授权或触及硬边界的事项会进入决策队列，由你或团队确认后再写入行程。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold text-foreground">1. 选择自治级别（四档 UI）</h3>
            <p className="mt-1 text-muted-foreground">
              档位决定 AI 默认行为：从「观察与提醒」到「边界内自动修复」。L2 适合大多数规划阶段；L3
              适合行中低风险微调。
            </p>
            <ul className="mt-2 space-y-1.5">
              {(Object.entries(AUTOMATION_UI_LEVEL_MAP) as Array<[AutomationUiLevel, typeof AUTOMATION_UI_LEVEL_MAP[AutomationUiLevel]]>).map(
                ([id, level]) => (
                  <li key={id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{level.title}</span>
                    {' — '}
                    {level.description}
                  </li>
                ),
              )}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-foreground">2. 按任务分类细调权限</h3>
            <p className="mt-1 text-muted-foreground">
              六组任务（监控、时间路线、活动、预算预订、安全、团队隐私）可逐项设为
              <strong className="font-medium text-foreground"> 自动 </strong>、
              <strong className="font-medium text-foreground"> 需确认 </strong>或
              <strong className="font-medium text-foreground"> 禁止 </strong>。保存后写入
              actionOverrides，并与当前档位合并计算 effectiveTier。
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground">3. 执行边界与团队规则</h3>
            <p className="mt-1 text-muted-foreground">
              预算变动上限、单日时间缓冲、核心体验保护等来自行程约束合约；涉及付款或团队决策的操作，会按
              context-snapshot 中的成员与治理规则要求确认。
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground">4. 审计与撤销</h3>
            <p className="mt-1 text-muted-foreground">
              每次自动执行会写入活动记录；近期记录可在右侧栏撤销（若后端返回 undo 能力）。你可随时暂停自动执行，监控与提醒仍会继续。
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
