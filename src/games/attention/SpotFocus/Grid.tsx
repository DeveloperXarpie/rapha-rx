import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { COLOURS } from './palette';
import type { SceneCell } from '../../../lib/contentGenerators/spotFocus';

interface Props {
  rows: SceneCell[][];
  tone: 'blue' | 'red';
  label: string;
  interactive: boolean;
  found: Set<string>;
  onTap?: (row: number, col: number) => void;
}

/** One labelled panel of cards: the ribbon, the blue frame, and the grid inside it. */
export function Grid({ rows, tone, label, interactive, found, onTap }: Props) {
  const { t } = useTranslation();
  const cols = rows[0]?.length ?? 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span
        className="whitespace-nowrap rounded-full px-4 py-2 text-body-md font-bold"
        style={{
          background: tone === 'blue' ? COLOURS.ribbonBlue : COLOURS.ribbonRed,
          color: COLOURS.ribbonText,
          boxShadow: '0 3px 0 rgba(0,0,0,.22)',
        }}
      >
        {label}
      </span>

      <div
        className="w-full rounded-2xl p-2"
        style={{ background: COLOURS.panelFrame, boxShadow: '0 4px 0 rgba(0,0,0,.2)' }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {rows.map((row, r) =>
            row.map((cell, c) => (
              <Card
                key={`${r}-${c}`}
                id={cell.id}
                // Labelled by position, never by object. Naming them would read "Green
                // apple" on one side and "Orange" on the other, announcing the very
                // difference the player was asked to find.
                ariaLabel={t('spot-focus.aria.cell', 'Picture {{col}} in row {{row}}', {
                  row: r + 1,
                  col: c + 1,
                })}
                interactive={interactive}
                found={found.has(`${r}-${c}`)}
                onTap={onTap ? () => onTap(r, c) : undefined}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
