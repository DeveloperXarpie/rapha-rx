import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PRESCRIBERS } from '../../lib/prescribers';

interface Props {
  /** Highlighted as current, if the resident already has one. */
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * The prescriber list, as a modal sheet. Shared by signup and Settings so the
 * two can never drift apart.
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
          width: '100%', maxWidth: 420, background: '#FFFFFF',
          borderRadius: 16, padding: 16, outline: 'none',
          maxHeight: '80%', overflowY: 'auto',
        }}
      >
        <p
          className="font-baloo"
          style={{ fontSize: 19, fontWeight: 700, color: '#1B2438', marginBottom: 12 }}
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
                border: `2px solid ${p.id === selectedId ? '#2A86DE' : '#D3DBEA'}`,
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
