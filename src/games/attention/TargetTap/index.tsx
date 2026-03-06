import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

export default function TargetTap({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const startedAt = useRef(Date.now());

  function handleComplete() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: { targetHits: 0, totalTargets: 0, distractorTaps: 0 },
    });
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
      <div className="text-7xl">🎯</div>
      <Badge variant="green">Attention</Badge>
      <h3 className="text-h1 font-bold text-body-text">Target Tap</h3>
      <p className="text-h3 text-caption-text">{t('game.stub.comingSoon')}</p>

      <div className="bg-gray-50 rounded-2xl p-6 text-left w-full max-w-sm">
        <p className="text-caption font-semibold text-caption-text mb-2">{t('game.stub.levelConfig')} <strong>{levelConfig.id}</strong></p>
        <pre className="text-small text-caption-text overflow-auto">
          {JSON.stringify(levelConfig.params, null, 2)}
        </pre>
      </div>

      <Button fullWidth onClick={handleComplete}>
        {t('btn.completeTest')}
      </Button>
    </div>
  );
}
