import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useMyTravelStyle } from '@/hooks/useDecisionProfiling';
import type { TravelStyleCard } from '@/types/trip-decision-profiling';

interface TravelStyleCardViewProps {
  tripId: string;
  card?: TravelStyleCard | null;
  compact?: boolean;
  /** onboarding 未完成但已有推断卡片时展示提示 */
  incompleteSurvey?: boolean;
  /** source 为 inferred 时展示推断提示 */
  inferredPreview?: boolean;
}

export function TravelStyleCardView({
  tripId,
  card: cardProp,
  compact = false,
  incompleteSurvey = false,
  inferredPreview = false,
}: TravelStyleCardViewProps) {
  const { card: fetched, loading, patchNote } = useMyTravelStyle(cardProp === undefined ? tripId : null);
  const card = cardProp !== undefined ? cardProp : fetched;
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading && !card) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!card) {
    return (
      <p className="text-sm text-muted-foreground py-4">尚未完成 Travel Style 调查</p>
    );
  }

  const startEdit = () => {
    setNoteDraft(card.userNote ?? '');
    setEditing(true);
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      await patchNote(noteDraft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {incompleteSurvey ? (
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90 rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 leading-relaxed">
          以下为初步推断，尚未完成正式 Travel Style 调查。完成调查后置信度会提高，并解锁摩擦预警与分摊共识。
        </p>
      ) : null}
      {card.source === 'reused' || card.source === 'reused_edited' ? (
        <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2 leading-relaxed">
          已沿用上次调查 · 可重新调查或编辑备注
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold">{card.styleLabel}</span>
        <Badge variant="secondary" className="text-[10px] font-normal">
          置信度 {Math.round(card.confidence * 100)}%
        </Badge>
      </div>
      {!compact ? <p className="text-sm text-muted-foreground">{card.teamRole}</p> : null}
      {!compact && card.coreDrivers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {card.coreDrivers.map((d) => (
            <Badge key={d} variant="outline" className="text-[10px] font-normal">
              {d}
            </Badge>
          ))}
        </div>
      ) : null}
      {card.compatibilityHints.length > 0 ? (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {card.compatibilityHints.map((h) => (
            <li key={h}>· {h}</li>
          ))}
        </ul>
      ) : null}
      {card.userNote && !editing ? (
        <p className="text-xs italic text-muted-foreground border-l-2 pl-2">{card.userNote}</p>
      ) : null}
      {!compact ? (
        editing ? (
          <div className="space-y-2">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveNote()} disabled={saving}>
                {saving ? '保存中…' : '保存备注'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={startEdit}>
            {card.userNote ? '编辑备注' : '添加微调备注'}
          </Button>
        )
      ) : null}
    </div>
  );
}
