import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MBTI_TYPE_OPTIONS } from '../constants/premium-stress-test';
import type { MbtiQuadrant, MbtiType } from '@/types/odyssey-travel-persona';

interface MbtiSelfSelectStepProps {
  selected: MbtiType | null;
  onSelect: (type: MbtiType) => void;
}

/** 四 temperament · 绿/蓝收敛到 nara，紫改冰川蓝，黄保留琥珀 */
const QUADRANT_CARD: Record<
  MbtiQuadrant,
  { surface: string; active: string; glow: string; label: string }
> = {
  NT: {
    surface: 'border-nara-glacier-border/40 bg-gradient-to-br from-[#88C0D0]/90 via-[#88C0D0] to-[#3D6570]',
    active: 'border-nara-glacier-border ring-nara-glacier-border/80 shadow-nara-glacier/25',
    glow: 'shadow-[0_0_14px_rgba(136,192,208,0.55)]',
    label: '分析家',
  },
  NF: {
    surface: 'border-gate-allow-border/40 bg-gradient-to-br from-[#5E7D5B]/90 via-[#5E7D5B] to-[#3D5239]',
    active: 'border-gate-allow-border ring-gate-allow-border/80 shadow-gate-allow/25',
    glow: 'shadow-[0_0_14px_rgba(94,125,91,0.5)]',
    label: '外交家',
  },
  SJ: {
    surface: 'border-nara-glacier-border/40 bg-gradient-to-br from-[#88C0D0]/80 via-[#6BA8B8] to-[#3D6570]',
    active: 'border-nara-glacier-border ring-nara-glacier-border/80 shadow-nara-glacier/25',
    glow: 'shadow-[0_0_14px_rgba(136,192,208,0.5)]',
    label: '守护者',
  },
  SP: {
    surface: 'border-amber-300/40 bg-gradient-to-br from-[#F0BD62] via-[#E2A343] to-[#c2410c]',
    active: 'border-amber-100 ring-amber-200/80 shadow-amber-400/25',
    glow: 'shadow-[0_0_14px_rgba(226,163,67,0.45)]',
    label: '黄人 · 探险家',
  },
};

export function MbtiSelfSelectStep({ selected, onSelect }: MbtiSelfSelectStepProps) {
  return (
    <div className="flex flex-1 flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 1 · 底层人格</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          已知自己的旅行人格？
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">直接一键点亮你的 MBTI 职场社交名片</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3">
        {MBTI_TYPE_OPTIONS.map((item, index) => {
          const isActive = selected === item.type;
          const theme = QUADRANT_CARD[item.quadrant as MbtiQuadrant] ?? QUADRANT_CARD.NT;

          return (
            <motion.button
              key={item.type}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025 }}
              onClick={() => onSelect(item.type as MbtiType)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200',
                theme.surface,
                isActive
                  ? cn('scale-[1.02] shadow-lg ring-2', theme.active, theme.glow)
                  : 'hover:scale-[1.01] hover:brightness-105 hover:shadow-md'
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 opacity-0 transition-opacity',
                  isActive && 'opacity-100'
                )}
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)',
                }}
              />
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                {theme.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-white drop-shadow-sm">{item.type}</p>
              <p className="mt-0.5 text-xs text-white/85">{item.nickname}</p>
              {isActive && (
                <motion.span
                  layoutId="mbti-glow"
                  className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
