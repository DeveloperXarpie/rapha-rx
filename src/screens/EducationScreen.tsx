import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScreenBlue from '../components/chrome/ScreenBlue';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

/**
 * "Keep Your Brain Active", shown before every session.
 *
 * Purely informational. It sets no flags and picks no games - startSession did
 * all of that before the resident got here - so arriving twice in one day is
 * harmless and it needs no redirect guard. That is the whole reason the flag it
 * used to own was renamed to sessionStarted.
 */
export default function EducationScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ScreenBlue>
      <div
        style={{
          position: 'relative', flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '0 26px', textAlign: 'center',
        }}
      >
        <img
          src="/brand/logo-white.png"
          alt=""
          aria-hidden="true"
          style={{ width: 136, opacity: 0.9, marginBottom: 26 }}
        />

        <h1
          className="font-baloo"
          style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}
        >
          {t('education.title', 'Keep Your Brain Active')}
        </h1>

        {(['education.line1', 'education.line2', 'education.line3'] as const).map((key, i) => (
          <p
            key={key}
            className="font-baloo"
            style={{
              marginTop: i === 0 ? 20 : 12,
              fontSize: 19, fontWeight: 500, lineHeight: 1.4,
              color: BRAND.cyan, textWrap: 'pretty',
            }}
          >
            {t(key, '')}
          </p>
        ))}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '0 20px 40px' }}>
        <Button
          variant="green"
          size="md"
          onClick={() => navigate('/app/intro/memory')}
          style={{ minWidth: 176 }}
        >
          {t('btn.letsBegin', "Let's Begin")}
        </Button>
      </div>
    </ScreenBlue>
  );
}
