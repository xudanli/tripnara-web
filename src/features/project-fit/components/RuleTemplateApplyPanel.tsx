import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { useApplyRuleTemplate, useRuleTemplates } from '@/hooks/useProjectFit';
import { trustedProjectCommercialLabel } from '@/lib/trusted-projects-display';

interface RuleTemplateApplyPanelProps {
  listingId: string;
  organizationId?: string | null;
}

export function RuleTemplateApplyPanel({ listingId, organizationId }: RuleTemplateApplyPanelProps) {
  const { data: templates, isLoading } = useRuleTemplates(organizationId ?? undefined);
  const applyTemplate = useApplyRuleTemplate(listingId);

  const handleApply = async (templateId: string, templateName: string) => {
    try {
      const result = await applyTemplate.mutateAsync({ templateId });
      toast.success(`已应用「${templateName}」，${result.rulesApplied} 条规则；请提示申请人重新评估`);
    } catch {
      toast.error('应用模板失败');
    }
  };

  if (isLoading) return <LogoLoading size={24} />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        一键应用平台/机构准入规则包。应用后会 bump 规则版本，既有评估将失效。
      </p>
      {(templates ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">暂无可用模板</p>
      )}
      {(templates ?? []).map((tpl) => (
        <div
          key={tpl.id}
          className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-sm">{tpl.name}</p>
            <p className="text-xs text-muted-foreground">{tpl.description}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline">{tpl.ownerSubjectType}</Badge>
              {tpl.commercialType && (
                <Badge variant="secondary">{trustedProjectCommercialLabel(tpl.commercialType)}</Badge>
              )}
              {tpl.destinationTag && <Badge variant="outline">{tpl.destinationTag}</Badge>}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={applyTemplate.isPending}
            onClick={() => void handleApply(tpl.id, tpl.name)}
          >
            应用到本项目
          </Button>
        </div>
      ))}
    </div>
  );
}
