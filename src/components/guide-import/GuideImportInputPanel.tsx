import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, ImagePlus, Link2, Plus, Type, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuideImportCard } from '@/components/guide-import/guide-import-ui';
import { guideImportPrimaryButtonClass } from '@/components/guide-import/guide-import-ui';
import { GUIDE_CONTENT_MAX_CHARS, validateGuideLinkUrl, validateGuideTextContent } from '@/lib/guide-to-plan-mapper';

type ImportTab = 'link' | 'screenshot' | 'text' | 'file';

export type GuideImportPayload =
  | { kind: 'link'; url: string }
  | { kind: 'text'; content: string; title?: string }
  | { kind: 'screenshot'; file: File; title?: string }
  | { kind: 'file'; file: File; title?: string };

interface GuideImportInputPanelProps {
  onImport: (payload: GuideImportPayload) => Promise<void>;
  disabled?: boolean;
  importing?: boolean;
  /** 解析/生成进行中时的提示 */
  lockHint?: string;
  className?: string;
  compact?: boolean;
}

export function GuideImportInputPanel({
  onImport,
  disabled,
  importing,
  lockHint,
  className,
  compact = false,
}: GuideImportInputPanelProps) {
  const [tab, setTab] = useState<ImportTab>('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [textBody, setTextBody] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLInputElement>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const busy = disabled || importing;
  const textOverLimit = textBody.length > GUIDE_CONTENT_MAX_CHARS;
  const textLimitError = textBody.trim() ? validateGuideTextContent(textBody) : null;
  const linkTrimmed = linkUrl.trim();
  const linkError = linkTrimmed ? validateGuideLinkUrl(linkTrimmed) : null;

  const resetForm = () => {
    setLinkUrl('');
    setTextBody('');
    setScreenshotPreview(null);
    setScreenshotFile(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
    if (dropRef.current) dropRef.current.value = '';
  };

  const handleAddLink = async () => {
    if (!linkTrimmed || busy) return;
    const urlErr = validateGuideLinkUrl(linkTrimmed);
    if (urlErr) return;
    await onImport({ kind: 'link', url: linkTrimmed });
    resetForm();
  };

  const handleAddText = async () => {
    if (!textBody.trim() || busy || textOverLimit) return;
    const contentErr = validateGuideTextContent(textBody.trim());
    if (contentErr) return;
    await onImport({ kind: 'text', content: textBody.trim() });
    resetForm();
  };

  const processImageFile = (file: File) => {
    const preview = URL.createObjectURL(file);
    setScreenshotPreview(preview);
    setScreenshotFile(file);
    setFileName(file.name);
    setTab('screenshot');
  };

  const handleAddScreenshot = async () => {
    if (!screenshotFile || busy) return;
    await onImport({
      kind: 'screenshot',
      file: screenshotFile,
      title: fileName ?? undefined,
    });
    resetForm();
  };

  const handleAddFile = async (file: File) => {
    if (busy) return;
    await onImport({ kind: 'file', file, title: file.name });
    resetForm();
  };

  const onDropFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) processImageFile(file);
    else void handleAddFile(file);
  };

  return (
    <GuideImportCard className={cn(compact ? 'space-y-4' : 'space-y-5', className)} compact={compact} padding>
      {lockHint && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-1.5 leading-relaxed">
          {lockHint}
        </p>
      )}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ImportTab)}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 bg-muted/60">
          <TabsTrigger value="link" className="text-xs gap-1.5 py-2 data-[state=active]:bg-white">
            <Link2 className="w-3.5 h-3.5" />
            粘贴链接
          </TabsTrigger>
          <TabsTrigger value="screenshot" className="text-xs gap-1.5 py-2 data-[state=active]:bg-white">
            <ImagePlus className="w-3.5 h-3.5" />
            上传截图
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs gap-1.5 py-2 data-[state=active]:bg-white">
            <Type className="w-3.5 h-3.5" />
            粘贴文字
          </TabsTrigger>
          <TabsTrigger value="file" className="text-xs gap-1.5 py-2 data-[state=active]:bg-white">
            <FileUp className="w-3.5 h-3.5" />
            上传文件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link" className={cn(compact ? 'space-y-3 mt-3' : 'space-y-4 mt-5')}>
          <div>
            <p className="text-sm font-medium mb-1.5">粘贴公共网页链接</p>
            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
              <Input
                placeholder="粘贴小红书 / 公众号 / 博客链接"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={busy}
                onKeyDown={(e) => e.key === 'Enter' && void handleAddLink()}
                className={cn('flex-1 min-w-0', linkError && linkTrimmed && 'border-destructive')}
                aria-invalid={Boolean(linkError && linkTrimmed)}
              />
              <Button
                type="button"
                className="flex-shrink-0"
                onClick={() => void handleAddLink()}
                disabled={busy || !linkTrimmed || Boolean(linkError)}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加链接
              </Button>
            </div>
            {linkError && linkTrimmed ? (
              <p className="text-xs text-destructive mt-1">{linkError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground mt-1.5">
              支持小红书、微信公众号、微博、知乎、博客、B站等公开链接；解析时将自动抓取正文
            </p>
          </div>
        </TabsContent>

        <TabsContent value="screenshot" className={cn(compact ? 'space-y-3 mt-3' : 'space-y-4 mt-5')}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={onDropFile}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            选择攻略截图
          </Button>
          {screenshotPreview && (
            <img
              src={screenshotPreview}
              alt="攻略截图"
              className="max-h-28 rounded-xl border object-contain mx-auto"
            />
          )}
          <Button
            type="button"
            className={guideImportPrimaryButtonClass('w-full')}
            disabled={busy || !screenshotFile}
            onClick={() => void handleAddScreenshot()}
          >
            {importing ? '上传中…' : '添加截图攻略'}
          </Button>
        </TabsContent>

        <TabsContent value="text" className={cn(compact ? 'space-y-3 mt-3' : 'space-y-4 mt-5')}>
          <Textarea
            placeholder="复制攻略正文、路线安排或评论区精华"
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            disabled={busy}
            className={compact ? 'min-h-[96px]' : 'min-h-[140px]'}
          />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={cn('text-muted-foreground', textOverLimit && 'text-destructive')}>
              {textBody.length.toLocaleString()} / {GUIDE_CONTENT_MAX_CHARS.toLocaleString()} 字
            </span>
            {textLimitError && <span className="text-destructive">{textLimitError}</span>}
          </div>
          <Button
            type="button"
            className={guideImportPrimaryButtonClass('w-full')}
            disabled={busy || !textBody.trim() || textOverLimit}
            onClick={() => void handleAddText()}
          >
            {importing ? '添加中…' : '添加文字攻略'}
          </Button>
        </TabsContent>

        <TabsContent value="file" className={cn(compact ? 'space-y-3 mt-3' : 'space-y-4 mt-5')}>
          <input
            ref={dropRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={onDropFile}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => dropRef.current?.click()}
          >
            <FileUp className="w-4 h-4 mr-2" />
            选择 PDF / Word / Excel
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            文件解析将在后端就绪后自动提取正文；单篇提取正文上限 {GUIDE_CONTENT_MAX_CHARS.toLocaleString()} 字
          </p>
        </TabsContent>
      </Tabs>

      {/* 拖拽区 — 全 tab 共用 */}
      <div
          disabled={busy}
          className={cn(
          'rounded-xl border-2 border-dashed border-border bg-muted/20 text-center',
          compact ? 'p-5' : 'p-8',
          busy && 'opacity-50 pointer-events-none',
        )}
      >
        <input
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          id="guide-drop-zone"
          disabled={busy}
          onChange={onDropFile}
        />
        <label htmlFor="guide-drop-zone" className="cursor-pointer block">
          <Upload className={cn('mx-auto text-muted-foreground mb-1.5', compact ? 'w-7 h-7' : 'w-8 h-8')} />
          <p className="text-sm font-medium text-foreground">拖拽截图或文件到此处，或点击上传</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            支持 JPG、PNG、PDF、Word、Excel、TXT，单文件 ≤ 20MB
          </p>
        </label>
      </div>
    </GuideImportCard>
  );
}
