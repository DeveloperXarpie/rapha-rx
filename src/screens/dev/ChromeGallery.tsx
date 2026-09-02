/**
 * DEV-only visual harness for the redesign chrome. Not reachable in a
 * production build - App.tsx gates the route on import.meta.env.DEV.
 *
 * Kept rather than thrown away after phase 1 (a deliberate divergence from the
 * spec, recorded in the plan): phases 2 and 3 need exactly this surface to
 * check the same components under three languages and three text sizes.
 */
import type { ReactNode } from 'react';
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

      {/* Tasks 5-7 append their sections here. */}

      <div className="wave-overlay" aria-hidden="true" />
    </div>
  );
}
