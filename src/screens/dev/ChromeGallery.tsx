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
import ScreenTransition from '../../components/chrome/ScreenTransition';
import { staggerDelay, type TransitionName } from '../../components/chrome/transitions';
import { marqueeGames, GAME_CATALOG } from '../../lib/gameCatalog';
import { Button } from '../../components/ui/Button';
import { BRAND, CATEGORY_BRAND } from '../../styles/tokens';
import type { GameCategory } from '../../styles/tokens';

const CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

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
                <div style={{ background: b.band, color: '#fff', fontWeight: 700, fontSize: 16, padding: '10px 14px', borderRadius: 10, marginTop: 8 }}>
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
            Prescribed by
          </Button>
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

      <Section title="Game tiles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {marqueeGames().slice(0, 3).map((g) => <GameTile key={g.id} game={g} onClick={() => {}} />)}
          {['remember-match', 'word-search', 'recipe-builder'].map((id) => (
            <GameTile key={id} game={GAME_CATALOG[id]} onClick={() => {}} />
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
