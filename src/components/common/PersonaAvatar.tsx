import { useState } from 'react';
import {
  AbuBearIcon,
  DrDreDogIcon,
  NeptuneOtterIcon,
} from '@/components/illustrations/PersonaIcons';
import { cn } from '@/lib/utils';
import {
  getPersonaIconColorClasses,
  getPersonaLogoSrc,
  getPersonaName,
  normalizePersona,
  type PersonaType,
} from '@/lib/persona-icons';

export type PersonaAvatarProps = {
  persona: PersonaType | string;
  size?: number;
  className?: string;
  /** 为 false 时不渲染圆形底（默认透明） */
  withBackground?: boolean;
};

function PersonaIllustration({
  persona,
  size,
  className,
}: {
  persona: PersonaType | string;
  size: number;
  className?: string;
}) {
  const iconSize = Math.round(size * 0.85);
  const colorClass = getPersonaIconColorClasses(persona);
  switch (normalizePersona(persona)) {
    case 'ABU':
      return <AbuBearIcon size={iconSize} className={cn(colorClass, className)} />;
    case 'DR_DRE':
      return <DrDreDogIcon size={iconSize} className={cn(colorClass, className)} />;
    case 'NEPTUNE':
      return <NeptuneOtterIcon size={iconSize} className={cn(colorClass, className)} />;
  }
}

/**
 * 三人格品牌头像：优先 public SVG logo，失败时回退官网同款线稿形象（非 Lucide 功能符号）。
 */
export function PersonaAvatar({
  persona,
  size = 32,
  className,
  withBackground = false,
}: PersonaAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const shell = cn(
    'inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full',
    withBackground && 'bg-muted/40 ring-1 ring-border/60',
    className
  );

  if (!imgFailed) {
    return (
      <span className={shell} style={{ width: size, height: size }}>
        <img
          src={getPersonaLogoSrc(persona)}
          alt={getPersonaName(persona)}
          width={size}
          height={size}
          className="h-full w-full object-contain p-0.5"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={shell} style={{ width: size, height: size }} aria-hidden>
      <PersonaIllustration persona={persona} size={size} />
    </span>
  );
}
