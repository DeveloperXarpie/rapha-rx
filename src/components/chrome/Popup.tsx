import { Button } from '../ui/Button';
import { POPUP_UI } from '../../styles/tokens';

export interface PopupAction {
  label: string;
  onClick: () => void;
  /** `primary` is the lime button; `secondary` an outlined one for Back or No. */
  variant?: 'primary' | 'secondary';
}

/**
 * The app's one dialog (amends 2026-11-23, page 6): a lavender panel held by a navy
 * line and a pale outer rim, the message in navy, and the lime button. Home's locked
 * and completed-category messages (FINAL_SPEC 6.2, 6.4) and the in-game exit
 * confirmation both use it.
 */
export default function Popup({
  title, message, actions,
}: { title?: string; message: string; actions: PopupAction[] }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
    >
      <div
        style={{
          width: '100%', maxWidth: 360, borderRadius: 30,
          border: `4px solid ${POPUP_UI.border}`,
          boxShadow: `0 0 0 6px ${POPUP_UI.rim}, 0 14px 30px rgba(4, 14, 80, 0.45)`,
          background: `linear-gradient(180deg, ${POPUP_UI.faceTop} 0%, ${POPUP_UI.faceBottom} 100%)`,
          padding: '36px 24px 28px', textAlign: 'center', color: POPUP_UI.text,
        }}
      >
        {title && <h3 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>{title}</h3>}
        <p style={{ fontSize: title ? 20 : 28, fontWeight: title ? 600 : 800, lineHeight: 1.3, marginBottom: 32 }}>
          {message}
        </p>
        <div className="flex flex-col items-center" style={{ gap: 14 }}>
          {actions.map((a) =>
            a.variant === 'secondary' ? (
              <button
                key={a.label}
                onClick={a.onClick}
                className="font-baloo"
                style={{
                  width: '100%', maxWidth: 240, minHeight: 64, borderRadius: 32,
                  border: `3px solid ${POPUP_UI.border}`, background: 'rgba(255,255,255,0.35)',
                  color: POPUP_UI.text, fontSize: 23, fontWeight: 800,
                }}
              >
                {a.label}
              </button>
            ) : (
              <Button key={a.label} variant="lime" size="md" onClick={a.onClick} style={{ width: '100%', maxWidth: 240 }}>
                {a.label}
              </Button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
