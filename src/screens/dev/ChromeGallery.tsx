/**
 * DEV-only visual harness for the redesign chrome. Not reachable in a
 * production build - App.tsx gates the route on import.meta.env.DEV.
 *
 * Kept rather than thrown away after phase 1 (a deliberate divergence from the
 * spec, recorded in the plan): phases 2 and 3 need exactly this surface to
 * check the same components under three languages and three text sizes.
 */
import { useState, type ReactNode } from 'react';
import CategoryBadge from '../../components/chrome/CategoryBadge';
import ProgressBar from '../../components/chrome/ProgressBar';
import GameRow from '../../components/chrome/GameRow';
import GameTile from '../../components/chrome/GameTile';
import CategoryPanel from '../../components/chrome/CategoryPanel';
import Popup from '../../components/chrome/Popup';
import ScreenTransition from '../../components/chrome/ScreenTransition';
import { staggerDelay, type TransitionName } from '../../components/chrome/transitions';
import { marqueeGames, sessionGamesByCategory, GAME_CATALOG } from '../../lib/gameCatalog';
import { Button } from '../../components/ui/Button';
import { GameIntroView } from '../GameIntro';
import { GAME_SKILLS } from '../../lib/gameSkills';
import { ScoreCardView } from '../ScoreCard';
import HistoryMetrics from '../../components/chrome/HistoryMetrics';
import { BRAND, CATEGORY_BRAND, SCORE_UI } from '../../styles/tokens';
import type { GameCategory } from '../../styles/tokens';

const CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

/** The three panel states, plus a replayable unlock animation. */
function PanelDemo() {
  const [run, setRun] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
      <CategoryPanel category="memory" status="completed" games={sessionGamesByCategory('memory')}
        unlocking={false} onTileTap={noop} onUnlockAnimationEnd={noop} />
      <CategoryPanel key={run} category="attention" status="active" games={sessionGamesByCategory('attention')}
        unlocking={run > 0} onTileTap={noop} onUnlockAnimationEnd={noop} />
      <CategoryPanel category="executive" status="locked" games={sessionGamesByCategory('executive')}
        unlocking={false} onTileTap={noop} onUnlockAnimationEnd={noop} />
      <Button variant="secondary" onClick={() => setRun((n) => n + 1)}>Replay unlock</Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ padding: '20px' }}>
      <h2 className="font-baloo" style={{ color: '#fff', fontSize: 21, fontWeight: 700, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A phone-shaped box, so the full-screen cards render at a real size. */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 390, height: 760, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

const noop = () => {};

const TRANSITION_NAMES: TransitionName[] = [
  'launchToSplash', 'onboardingStep', 'homeToIntro',
  'introToTitle', 'titleToBoard', 'boardToIntro', 'boardToSummary',
];

function TransitionDemo() {
  const [name, setName] = useState<TransitionName>('homeToIntro');
  const [run, setRun] = useState(0);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {TRANSITION_NAMES.map((n) => (
          <button
            key={n}
            onClick={() => { setName(n); setRun((r) => r + 1); }}
            style={{
              color: '#fff', fontSize: 11, padding: '6px 10px', borderRadius: 8,
              background: n === name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <ScreenTransition key={`${name}-${run}`} name={name}>
        <div style={{ background: 'rgba(9,26,140,0.5)', borderRadius: 18, padding: 20 }}>
          <p className="font-baloo" style={{ color: '#fff', fontSize: 19, fontWeight: 700 }}>{name}</p>
          {[0, 1, 2].map((i) => (
            <p key={i} style={{ color: '#C6F87A', fontSize: 15, marginTop: 6 }}>
              row {i}, stagger {staggerDelay(i)}ms
            </p>
          ))}
        </div>
      </ScreenTransition>
    </div>
  );
}

function ProgressDemo() {
  const [run, setRun] = useState(0);
  return (
    <div>
      {CATEGORIES.map((c) => (
        <div key={`${c}-${run}`} style={{ marginBottom: 10 }}>
          <ProgressBar
            durationMs={2000}
            color={CATEGORY_BRAND[c].accent}
            trackColor="rgba(255,255,255,0.16)"
            running
          />
        </div>
      ))}
      <button onClick={() => setRun((r) => r + 1)} style={{ color: '#fff', fontSize: 15, textDecoration: 'underline' }}>
        replay
      </button>
    </div>
  );
}

export default function ChromeGallery() {
  return (
    <div className="screen-blue" style={{ minHeight: '100%' }}>
      <Section title="Brand palette">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[...BRAND.screen, BRAND.navy, BRAND.cyan, BRAND.cyanBright, BRAND.muted, BRAND.lime].map((c) => (
            <div key={c} style={{ width: 72 }}>
              <div style={{ height: 44, borderRadius: 10, background: c, border: '1px solid rgba(255,255,255,0.3)' }} />
              <p style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Category palette">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CATEGORIES.map((c) => {
            const b = CATEGORY_BRAND[c];
            return (
              <div key={c} style={{ background: b.gradient, borderRadius: 16, padding: 12 }}>
                <p className="font-baloo" style={{ color: b.accent, fontWeight: 700, fontSize: 19 }}>{c}</p>
                <p style={{ color: b.label, fontSize: 15 }}>label colour on the category wash</p>
                <div style={{ background: BRAND.introBand, color: '#fff', fontWeight: 700, fontSize: 16, padding: '10px 14px', borderRadius: 10, marginTop: 8 }}>
                  practice band
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Buttons">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Button variant="green">Start Session</Button>
          <Button variant="green" size="md">Let&apos;s Begin</Button>
          <Button variant="green" disabled>Disabled</Button>
          <Button variant="blue" leading={<img src="/brand/tree-glyph.png" alt="" aria-hidden="true" width={34} height={34} />}>
            Get Started
          </Button>
          <Button variant="blue" size="md">Sign in</Button>
          <Button variant="blue" fullWidth trailing={<span style={{ fontSize: 15 }}>&#9660;</span>}>
            Recommended by
          </Button>
          <p style={{ color: '#fff', fontSize: 15 }}>The board&apos;s green, as every game&apos;s primary action now wears it:</p>
          <Button variant="kit">Ready</Button>
          <Button variant="kit" size="md">Next round</Button>
          <Button variant="kit" disabled>Done</Button>
          <p style={{ color: '#fff', fontSize: 15 }}>Legacy variants, unchanged:</p>
          <Button variant="primary" size="md">Primary</Button>
          <Button variant="secondary" size="md">Secondary</Button>
        </div>
      </Section>

      <Section title="Category badges and progress">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          {CATEGORIES.map((c) => <CategoryBadge key={c} category={c} size={88} />)}
          <CategoryBadge category="memory" size={52} />
        </div>
        <ProgressDemo />
      </Section>

      <Section title="Game rows">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <GameRow game={GAME_CATALOG['market-memory']} lastLevel={12} />
          <GameRow game={GAME_CATALOG['spot-focus']} lastLevel={3} />
          <GameRow game={GAME_CATALOG['serve-guests']} />
        </div>
      </Section>

      <Section title="Home category panels">
        <PanelDemo />
      </Section>

      <Section title="Home popups">
        <div style={{ position: 'relative', height: 260, transform: 'translateZ(0)', overflow: 'hidden' }}>
          <Popup
            message="You have finished this today."
            actions={[{ label: 'Proceed', onClick: noop }, { label: 'Back', onClick: noop, variant: 'secondary' }]}
          />
        </div>
        <div style={{ position: 'relative', height: 260, transform: 'translateZ(0)', overflow: 'hidden', marginTop: 12 }}>
          <Popup message="Play the assigned games." actions={[{ label: 'Continue', onClick: noop }]} />
        </div>
      </Section>

      <Section title="Game tiles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {marqueeGames().slice(0, 3).map((g) => <GameTile key={g.id} game={g} onClick={() => {}} />)}
          {['remember-match', 'word-search', 'recipe-builder'].map((id) => (
            <GameTile key={id} game={GAME_CATALOG[id]} onClick={() => {}} />
          ))}
        </div>
      </Section>

      <Section title="Game intros">
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {Object.keys(GAME_SKILLS).map((id) => (
            <Phone key={id}><GameIntroView game={GAME_CATALOG[id]} onContinue={noop} onBack={noop} /></Phone>
          ))}
        </div>
      </Section>

      {/* The first is what residents see today, from the empty placeholder. The rest
          use sample values to show the lines scoring will fill in. */}
      <Section title="Score cards">
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          <Phone>
            <ScoreCardView game={GAME_CATALOG['market-memory']} data={{ cards: [], accoladeKey: null }} onContinue={noop} onClose={noop} />
          </Phone>
          <Phone>
            <ScoreCardView
              game={GAME_CATALOG['market-memory']}
              data={{ cards: [{ skill: 'recall', score: 80, band: 4 }, { skill: 'retention', score: 50, band: 2 }], accoladeKey: 'scoreCard.accolade.3' }}
              unlocked="attention" onContinue={noop} onClose={noop}
            />
          </Phone>
          <Phone>
            <ScoreCardView
              game={GAME_CATALOG['market-memory']}
              data={{ cards: [{ skill: 'recall', score: 100, band: 5 }, { skill: 'retention', score: 100, band: 5 }], accoladeKey: 'scoreCard.accolade.6' }}
              onContinue={noop} onClose={noop}
            />
          </Phone>
          <Phone>
            <ScoreCardView
              game={GAME_CATALOG['serve-guests']}
              data={{ cards: [{ skill: 'sequencing', score: 35, band: 1 }, { skill: 'decisionMaking', score: 92, band: 5 }], accoladeKey: 'scoreCard.accolade.3' }}
              onContinue={noop} onClose={noop}
            />
          </Phone>
        </div>
      </Section>

      {/* Tap each bar to open it. Sample values: a week of Memory with one day off
          Station Master, then a first session with no history yet. */}
      <Section title="History metrics (10-minute summary)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {[
            {
              dates: ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'],
              rows: [
                { skill: 'recall' as const, scores: [55, 60, 58, 66, 70, 72, 80] },
                { skill: 'association' as const, scores: [40, null, 50, 62, 58, 75, 0] },
              ],
            },
            { dates: ['2026-11-23'], rows: [{ skill: 'recall' as const, scores: [72] }] },
          ].map((history, i) => (
            <div key={i} style={{ width: 360, padding: 16, borderRadius: 16, background: SCORE_UI.summaryBg, color: '#FFFFFF', display: 'flex', justifyContent: 'center' }}>
              <HistoryMetrics history={history} today="2026-11-23" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Transitions">
        <TransitionDemo />
      </Section>

      <div className="wave-overlay" aria-hidden="true" />
    </div>
  );
}
