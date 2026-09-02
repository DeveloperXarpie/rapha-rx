import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppFrame from '../components/chrome/AppFrame';
import ScreenBlue from '../components/chrome/ScreenBlue';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

/** The way in. Replaces the landing step of the old CareHomeSelector. */
export default function SplashScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AppFrame>
      <ScreenBlue variant="splash">
        <div
          style={{
            position: 'relative', flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '0 24px', textAlign: 'center',
          }}
        >
          <img
            src="/brand/logo-onblue.png"
            alt={t('app.name')}
            style={{ width: 215, maxWidth: '70%' }}
          />
          <p
            className="font-baloo"
            style={{
              marginTop: 18, fontSize: 21, fontWeight: 500,
              color: BRAND.cyan, textWrap: 'pretty',
            }}
          >
            {t('splash.tagline', 'Digital Therapeutic Platform for Cognitive Health')}
          </p>
        </div>

        <div
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10, padding: '0 24px 44px',
          }}
        >
          <Button
            variant="blue"
            onClick={() => navigate('/signup')}
            style={{ minWidth: 258, minHeight: 68 }}
            leading={
              <img
                src="/brand/tree-glyph.png"
                alt=""
                aria-hidden="true"
                width={34}
                height={34}
                style={{ width: 34, height: 34, flexShrink: 0 }}
              />
            }
          >
            {t('btn.getStarted', 'Get Started')}
          </Button>

          <p
            className="font-baloo"
            style={{ marginTop: 14, fontSize: 17, color: BRAND.cyan }}
          >
            {t('splash.alreadyMember', 'Already a Member?')}
          </p>

          <Button
            variant="blue"
            size="md"
            onClick={() => navigate('/signin')}
            style={{ minWidth: 234, minHeight: 62 }}
          >
            {t('btn.signIn', 'Sign in')}
          </Button>
        </div>
      </ScreenBlue>
    </AppFrame>
  );
}
