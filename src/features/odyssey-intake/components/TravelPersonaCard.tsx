import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TravelPersonaRadar } from './TravelPersonaRadar';
import { TripStatusCTA } from './TripStatusCTA';
import { useGyroscopeTilt } from '../hooks/useGyroscopeTilt';
import { tripIntentLabel } from '../lib/trip-intent';
import { SEMANTIC_BLUE_HEX } from '@/lib/semantic-colors';
import type { OdysseyIdentityCard, OdysseyProfileCardUi } from '@/types/odyssey-intake';

interface TravelPersonaCardProps {
  card: OdysseyIdentityCard;
  ui?: Pick<OdysseyProfileCardUi, 'gyroscopeEnabled' | 'cta' | 'tripIntentTagOptions'>;
  shimmer?: boolean;
  refreshMessage?: string;
  selectedTripIntentTag?: string;
  onTripIntentChange?: (tagId: string) => void;
  compact?: boolean;
  className?: string;
}

export function TravelPersonaCard({
  card,
  ui,
  shimmer = false,
  refreshMessage,
  selectedTripIntentTag,
  onTripIntentChange,
  compact = false,
  className,
}: TravelPersonaCardProps) {
  const gyroEnabled = ui?.gyroscopeEnabled ?? true;
  const { ref, onMouseMove, onMouseLeave } = useGyroscopeTilt(gyroEnabled);
  const { theme } = card;
  const accent = theme.accentColor ?? SEMANTIC_BLUE_HEX;
  const intentOptions = ui?.tripIntentTagOptions ?? [];
  const currentIntentLabel = tripIntentLabel(selectedTripIntentTag, intentOptions);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-transform duration-200 ease-out',
        compact ? 'min-h-[200px]' : 'min-h-[280px]',
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
        background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
      }}
    >
      {shimmer && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          animate={{
            backgroundPosition: ['200% 0%', '-200% 0%'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage: `linear-gradient(105deg, transparent 40%, ${accent}55 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div className="relative z-[1] flex h-full flex-col p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              {card.mbtiType} · {theme.quadrant}
            </p>
            <h2 className={cn('mt-1 font-semibold leading-tight', compact ? 'text-lg' : 'text-xl')}>
              {card.title}
            </h2>
            {selectedTripIntentTag && (
              <motion.span
                key={selectedTripIntentTag}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2 inline-flex items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/90"
              >
                本次出行 · {currentIntentLabel ?? selectedTripIntentTag}
              </motion.span>
            )}
            {!compact && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/75">
                {card.subtitle}
              </p>
            )}
          </div>
          <TravelPersonaRadar
            radar={card.radar}
            size={compact ? 100 : 130}
            accent={accent}
            className="shrink-0 text-white/80"
          />
        </div>

        {refreshMessage && shimmer && (
          <p className="mt-3 text-xs text-white/80">{refreshMessage}</p>
        )}

        {onTripIntentChange &&
          ui?.cta?.action === 'trip_intent' &&
          (ui.tripIntentTagOptions?.length ?? 0) > 0 && (
          <div className="mt-auto pt-4">
            <TripStatusCTA
              label={ui.cta?.label ?? '调整本次出行状态'}
              value={selectedTripIntentTag}
              options={ui.tripIntentTagOptions ?? []}
              onChange={onTripIntentChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function TravelPersonaCardEmpty({
  onStart,
  className,
}: {
  onStart: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        'group relative w-full min-h-[200px] overflow-hidden rounded-2xl border border-dashed border-white/20',
        'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6 text-left transition hover:border-white/40',
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Odyssey Intake</p>
      <h2 className="mt-2 text-lg font-semibold text-white">发现你的旅行人格</h2>
      <p className="mt-2 text-sm text-white/60">MBTI 自选 · 硬核背书 · 3 道行中博弈题 · 生成旅行身份名片</p>
      <span className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm text-white group-hover:bg-white/20">
        开始测评 →
      </span>
    </button>
  );
}
