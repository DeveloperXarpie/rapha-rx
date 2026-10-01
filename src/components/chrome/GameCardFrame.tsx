import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KIT_COLOURS } from '../../lib/uiKit';

interface Props {
  /** The game's splash art, cover-cropped behind the panel. */
  art: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The frame the game intro and the score card share: the game's own splash art
 * filling the screen, a close X in the corner, and one tall blue panel.
 *
 * The art is cover-cropped rather than letterboxed like the title screen, because
 * nothing here addresses the artwork by position - the panel sits over the middle
 * and only the edges of the scene show, which is the point of it.
 *
 * The panel scrolls inside itself if the copy outgrows it (a Kannada skill list
 * on a short phone), so the close X and the art never move.
 */
export default function GameCardFrame({ art, onClose, children }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ position: 'relative', overflow: 'hidden', background: '#0E2AA8' }}
    >
      <img
        src={art}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
        }}
      />

      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ position: 'relative', padding: '56px 16px 32px' }}
      >
        <div
          className="flex-1 min-h-0 flex flex-col items-center"
          style={{
            background: KIT_COLOURS.instruction,
            border: `4px solid ${KIT_COLOURS.instructionRim}`,
            borderRadius: 40,
            boxShadow: '0 10px 28px rgba(8, 26, 52, 0.45)',
            padding: '28px 22px',
            color: KIT_COLOURS.instructionText,
            textAlign: 'center',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label={t('gameTitle.close', 'Close')}
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 44, height: 44, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.6)',
          background: 'rgba(10,20,40,0.45)',
          color: '#FFFFFF', fontSize: 20, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        &#10005;
      </button>
    </div>
  );
}
