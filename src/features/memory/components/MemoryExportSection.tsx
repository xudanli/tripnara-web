import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';

type MemoryExportSectionProps = {
  onExport: () => Promise<unknown>;
  exporting?: boolean;
};

export function MemoryExportSection({ onExport, exporting }: MemoryExportSectionProps) {
  const handleExport = async () => {
    try {
      const data = await onExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tripnara-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('记忆数据已导出');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_export_title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          导出 GDPR 合规 JSON，不含对话原文，仅含结构化记忆与 id/hash。
        </p>
        <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
          {MEMORY_CONSOLE_UI_DEFAULT_ZH.section_export_button}
        </Button>
      </CardContent>
    </Card>
  );
}
