import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const CARE_HOMES = [
  { id: 'asha-indiranagar',       key: 'carehome.asha'     },
  { id: 'vatsalya-koramangala',   key: 'carehome.vatsalya' },
  { id: 'prayag-jayanagar',       key: 'carehome.prayag'   },
];

export default function CareHomeSelector() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8">
      <h1 className="text-h1 font-bold text-body-text mb-3 text-center">{t('carehome.selector.title')}</h1>
      <p className="text-h3 text-caption-text mb-12 text-center">{t('carehome.selector.subtitle')}</p>

      <div className="w-full max-w-xl space-y-5">
        {CARE_HOMES.map((home) => (
          <Card
            key={home.id}
            onClick={() => navigate(`/login/${home.id}`)}
            className="min-h-[100px] flex items-center"
          >
            <div className="flex items-center gap-5 w-full">
              <div className="text-4xl">🏠</div>
              <div>
                <p className="text-h3 font-semibold text-body-text">{t(home.key)}</p>
              </div>
              <div className="ml-auto text-caption-text text-2xl">›</div>
            </div>
          </Card>
        ))}

        <div className="pt-6 text-center">
          <Button variant="ghost" onClick={() => navigate('/signup')}>
            {t('btn.createProfile')}
          </Button>
        </div>
      </div>
    </div>
  );
}
