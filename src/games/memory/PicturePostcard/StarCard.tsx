import { useTranslation } from 'react-i18next';

// Spec SS4.5 — the level star card is the game's sole achievement signal. It is
// gated on an explicit Continue tap (no auto-dismiss) so rotation can never
// swallow it, and a 0-star level repeat carries NO failure framing.

export interface StarCardProps {
  stars: 0 | 1 | 2 | 3;
  correctCount: number;
  level: number;
  onContinue: () => void;
}

export default function StarCard({ stars, correctCount, level, onContinue }: StarCardProps) {
  const { t } = useTranslation();

  const sentence = stars === 3
    ? t('pp.star.sentence.3', 'Wonderful - you spotted nearly everything.')
    : stars === 2
    ? t('pp.star.sentence.2', 'Well done - your eyes are getting sharper.')
    : stars === 1
    ? t('pp.star.sentence.1', 'Good work - every round trains your memory.')
    : t('pp.star.repeat', "Let's enjoy this level once more.");

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="card max-w-md w-full flex flex-col gap-6 items-center p-8 text-center">
        <h3 className="text-h2 font-bold text-body-text">
          {t('pp.star.levelDone', 'Level {{n}} complete', { n: level })}
        </h3>
        {stars > 0 && (
          <div className="flex gap-3" aria-label={t('pp.star.count', '{{n}} stars', { n: stars })}>
            {Array.from({ length: stars }).map((_, i) => (
              <span key={i} className="text-6xl" aria-hidden="true">⭐</span>
            ))}
          </div>
        )}
        <p className="text-h3 text-body-text">
          {t('pp.star.accuracy', '{{n}} of 10 correct', { n: correctCount })}
        </p>
        <p className="text-h3 text-caption-text">{sentence}</p>
        <button type="button" onClick={onContinue} className="btn-primary w-full min-h-[96px] min-w-[96px]">
          {t('pp.star.continue', 'Continue')}
        </button>
      </div>
    </div>
  );
}
