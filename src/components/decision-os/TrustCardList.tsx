import { TrustCard, type TrustCardProps } from './TrustCard';
import type { Gate1TrustCard } from '@/types/decision-os';

interface TrustCardListProps {
  cards: Gate1TrustCard[];
  variant?: TrustCardProps['variant'];
  projectId?: string;
  onAlternativeClick?: TrustCardProps['onAlternativeClick'];
  className?: string;
}

export function TrustCardList({
  cards,
  variant = 'advisor',
  projectId,
  onAlternativeClick,
  className,
}: TrustCardListProps) {
  return (
    <div className={className ?? 'grid gap-4'}>
      {cards.map((card) => (
        <TrustCard
          key={card.cardId}
          card={card}
          variant={variant}
          projectId={projectId}
          onAlternativeClick={onAlternativeClick}
        />
      ))}
    </div>
  );
}
