import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PRESCRIBERS } from '../../lib/prescribers';
import { BRAND } from '../../styles/tokens';

interface Props {
  /** Highlighted as current, if the resident already has one. */
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * The prescriber list, as a modal sheet. Shared by signup and Settings so the
 * two can never drift apart.
 *
 * Styled as a piece of the screen that opened it rather than as a plain white
 * dialog: the blue panel is the signup wash's own two darkest stops, and each
 * row is the same white field the name and age inputs use.
 */
export default function PrescriberPicker({ selectedId, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    // Remember what opened the sheet so focus can go back there on close - a
    // resident using a keyboard or switch access is otherwise dropped at the
    // top of the document.
    returnFocusTo.current = document.activeElement;
    sheetRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(4,12,50,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('signup.prescribedBy', 'Prescribed by')}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, outline: 'none',
          background: `linear-gradient(180deg, ${BRAND.screen[2]} 0%, ${BRAND.screen[3]} 100%)`,
          border: '3px solid #FFFFFF', borderRadius: 20,
          padding: 20, maxHeight: '80%', overflowY: 'auto',
          boxShadow: '0 14px 30px rgba(4,14,80,0.45)',
        }}
      >
        <p
          className="font-baloo"
          style={{ fontSize: 21, fontWeight: 700, color: '#FFFFFF', textAlign: 'center', marginBottom: 14 }}
        >
          {t('signup.prescribedBy', 'Prescribed by')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRESCRIBERS.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); onClose(); }}
              aria-pressed={p.id === selectedId}
              className="font-baloo"
              style={{
                width: '100%', minHeight: 62, borderRadius: 16,
                // Selected reads as a ring rather than a colour change: on a
                // blue panel a blue border on a white row is nearly invisible.
                border: '2px solid #D3DBEA',
                boxShadow: p.id === selectedId ? `0 0 0 3px ${BRAND.cyanBright}` : 'none',
                background: '#FFFFFF', color: '#1B2438',
                fontSize: 19, textAlign: 'left', padding: '10px 16px',
              }}
            >
              {p.name}
              {p.site && (
                <span style={{ display: 'block', fontSize: 15, color: '#6B7690' }}>{p.site}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
