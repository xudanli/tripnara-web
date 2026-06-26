import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogoLoading } from '@/components/common/LogoLoading';
import { useFitAssessmentDocuments, useUploadFitDocument } from '@/hooks/useProjectFit';
import {
  fitDocumentOcrStatusLabel,
  fitDocumentTypeLabel,
  hasAcceptableFitDocuments,
} from '@/lib/project-fit-display';
import type { FitDocumentType } from '@/types/project-fit';

const DOCUMENT_TYPES: FitDocumentType[] = [
  'ID_CARD',
  'PASSPORT',
  'QUALIFICATION_CERT',
  'MEDICAL_CERT',
  'INSURANCE',
  'OTHER',
];

interface FitAssessmentDocumentsPanelProps {
  assessmentId: string;
  required?: boolean;
}

export function FitAssessmentDocumentsPanel({
  assessmentId,
  required,
}: FitAssessmentDocumentsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<FitDocumentType>('PASSPORT');

  const { data: documents, isLoading } = useFitAssessmentDocuments(assessmentId);
  const upload = useUploadFitDocument(assessmentId);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件不能超过 10MB');
      return;
    }
    try {
      await upload.mutateAsync({ file, documentType });
      toast.success('证件已上传，OCR 识别完成');
    } catch {
      toast.error('上传失败');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const acceptable = hasAcceptableFitDocuments(documents);

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          证件上传{required ? '（规则要求）' : '（可选）'}
        </Label>
        {required && (
          <Badge variant={acceptable ? 'default' : 'secondary'}>
            {acceptable ? '已满足' : 'evaluate 前需至少一条已识别证件'}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        JPG/PNG/WebP/PDF ≤ 10MB。识别结果将自动回填问卷（如资质、证件号掩码）。
      </p>

      {isLoading && <LogoLoading size={20} />}

      {(documents ?? []).map((doc) => (
        <div key={doc.id} className="rounded-md border px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{fitDocumentTypeLabel(doc.documentType)}</span>
            <Badge variant="outline">{fitDocumentOcrStatusLabel(doc.ocrStatus)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{doc.fileName}</p>
          {doc.extractedFields?.documentNumber && (
            <p className="text-xs text-muted-foreground">
              证件号：{doc.extractedFields.documentNumber}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-2">
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as FitDocumentType)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {fitDocumentTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {upload.isPending ? '上传中…' : '选择文件上传'}
        </Button>
      </div>
    </div>
  );
}
