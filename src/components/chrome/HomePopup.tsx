import { Button } from '../ui/Button';

export interface HomePopupAction {
  label: string;
  onClick: () => void;
  variant?: 'green' | 'secondary';
}

/**
 * Home's locked and completed-category messages (FINAL_SPEC 6.2, 6.4). The same
 * overlay as GameShell's exit dialog, so the app has one dialog look.
 */
export default function HomePopup({
  message, actions,
}: { message: string; actions: HomePopupAction[] }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
    >
      <div className="panel-surface p-8 max-w-sm w-full shadow-xl">
        <p className="text-h2 font-bold text-body-text mb-8 text-center">{message}</p>
        <div className="flex flex-col gap-3">
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant ?? 'green'} fullWidth onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
