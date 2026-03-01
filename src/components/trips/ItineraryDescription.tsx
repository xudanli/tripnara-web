/**
 * ItineraryDescription - 行程描述展示组件
 *
 * 遵循 TripNARA 视觉规范：
 * - Clarity over Charm：清晰、可信、可执行
 * - Evidence is the aesthetic：信息结构清晰，层级分明
 * - Quiet confidence：比例、留白、层级、细节一致
 *
 * 将 AI 生成的 Markdown 文本解析为结构化展示，支持：
 * - 标题层级（###、##）
 * - 列表项
 * - 粗体
 * - ⚠️ 警告行（使用 gate-warn 样式）
 * - 分隔线
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'divider' }
  | { type: 'warning'; text: string };

function parseBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="font-medium text-foreground">{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '---') {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        const currTrimmed = curr.trim();
        if (currTrimmed.startsWith('- ')) {
          const parts: string[] = [currTrimmed.slice(2).trim()];
          i++;
          while (i < lines.length) {
            const next = lines[i];
            const nextTrimmed = next.trim();
            if (!nextTrimmed || nextTrimmed.startsWith('- ') || nextTrimmed.startsWith('#') || nextTrimmed.startsWith('---')) break;
            parts.push(nextTrimmed);
            i++;
          }
          items.push(parts.join(' '));
        } else if (!currTrimmed) {
          i++;
          break;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (trimmed.includes('⚠️') || trimmed.startsWith('⚠')) {
      blocks.push({ type: 'warning', text: trimmed.replace(/^⚠️?\s*/, '').trim() });
      i++;
      continue;
    }

    if (trimmed) {
      const paraLines: string[] = [trimmed];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (!next.trim() || next.trim().startsWith('#') || next.trim().startsWith('-') || next.trim().startsWith('---') || next.includes('⚠️')) {
          break;
        }
        paraLines.push(next.trim());
        i++;
      }
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
      continue;
    }

    i++;
  }

  return blocks;
}

export interface ItineraryDescriptionProps {
  content: string;
  className?: string;
}

export function ItineraryDescription({ content, className }: ItineraryDescriptionProps) {
  const blocks = parseBlocks(content);

  const firstParagraphIdx = blocks.findIndex((b) => b.type === 'paragraph');

  return (
    <div className={cn('space-y-5 text-sm', className)}>
      {blocks.map((block, idx) => {
        if (block.type === 'divider') {
          return <Separator key={idx} className="my-4" />;
        }

        if (block.type === 'h2') {
          return (
            <h2
              key={idx}
              className="text-base font-semibold text-foreground tracking-tight mt-6 first:mt-0"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3
              key={idx}
              className="text-sm font-medium text-foreground mt-4 first:mt-0"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === 'paragraph') {
          const isLead = idx === firstParagraphIdx && block.text.length > 30;
          return (
            <p
              key={idx}
              className={cn(
                'leading-relaxed',
                isLead ? 'text-foreground/90' : 'text-muted-foreground'
              )}
            >
              {parseBold(block.text)}
            </p>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-2 pl-4 list-disc text-muted-foreground">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {parseBold(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'warning') {
          return (
            <Alert
              key={idx}
              className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {parseBold(block.text)}
              </AlertDescription>
            </Alert>
          );
        }

        return null;
      })}
    </div>
  );
}
