/**
 * The debug level jumper: pick a level, tap a game, land straight on its board
 * at that level.
 *
 * Unlike /dev/chrome this ships in the production bundle, because the levels
 * worth checking are the ones a resident meets on the care-home tablet, where
 * the real service worker and the real screen are. It is reached only from
 * Home's dev strip, behind the same five taps on the version label that already
 * guard `dev: complete today`, so a resident cannot arrive here by accident.
 *
 * Rounds started from here are sandboxed - see the `debug` prop on GameShell.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScreenBlue from '../../components/chrome/ScreenBlue';
import { allByCategory } from '../../lib/gameCatalog';
import { DEBUG_LEVEL_PARAM, MAX_DEBUG_LEVEL } from '../../lib/debugLevels';
import type { GameCategory } from '../../styles/tokens';

const CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

/** Reads its own 1-100 ladder from Dexie rather than the difficulty score, so
 *  the score override the jumper works by has nothing to act on. */
const NOT_JUMPABLE = new Set(['picture-postcard']);

const AMBER = '#FFE9A8';

const LEVELS = Array.from({ length: MAX_DEBUG_LEVEL }, (_, i) => i + 1);

export default function DebugLevels() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [level, setLevel] = useState(1);

  function jump(gameId: string) {
    // Straight to the board, deliberately skipping /title - a title screen is
    // not a level, and Free Play already exercises it.
    navigate(`/app/game/${gameId}?${DEBUG_LEVEL_PARAM}=${level}`);
  }

  return (
    <ScreenBlue>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '16px 18px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => navigate('/app/home')}
            className="font-mono"
            style={{ fontSize: 12, color: AMBER, border: `1px dashed ${AMBER}`, borderRadius: 4, padding: '4px 10px' }}
          >
            back
          </button>
          <span className="font-mono" style={{ fontSize: 13, color: AMBER }}>dev: levels</span>
        </div>

        <p className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 14, lineHeight: 1.5 }}>
          Rounds started here are sandboxed: no difficulty write, no "last level"
          write, analytics tagged <span style={{ color: AMBER }}>debug:true</span>.
          Finishing a round replays the same level.
        </p>

        <div className="font-mono" style={{ fontSize: 11, color: AMBER, marginBottom: 6 }}>level</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {LEVELS.map((n) => (
            <button
              key={n}
              onClick={() => setLevel(n)}
              className="font-mono"
              aria-pressed={n === level}
              style={{
                fontSize: 13, minWidth: 38, padding: '7px 0', borderRadius: 4,
                border: `1px ${n === level ? 'solid' : 'dashed'} ${AMBER}`,
                background: n === level ? AMBER : 'transparent',
                color: n === level ? '#10237E' : AMBER,
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {CATEGORIES.map((category) => (
          <div key={category} style={{ marginBottom: 18 }}>
            <div className="font-mono" style={{ fontSize: 11, color: AMBER, marginBottom: 6 }}>
              {category}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allByCategory(category).map((game) => {
                const blocked = NOT_JUMPABLE.has(game.id);
                return (
                  <button
                    key={game.id}
                    onClick={() => jump(game.id)}
                    disabled={blocked}
                    className="font-mono"
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 10, textAlign: 'left',
                      fontSize: 13, padding: '9px 11px', borderRadius: 4,
                      border: '1px dashed rgba(255,255,255,0.28)',
                      background: 'rgba(9,26,140,0.5)',
                      color: blocked ? 'rgba(255,255,255,0.35)' : '#fff',
                      cursor: blocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span>{game.id}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                      {blocked ? 'own 1-100 ladder, not jumpable' : t(game.nameKey, game.id)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScreenBlue>
  );
}
