import { spritePath } from './sprites';
import { COLOURS } from './palette';

interface Props {
  id: string;
  ariaLabel: string;
  interactive: boolean;
  found: boolean;
  onTap?: () => void;
}

/**
 * One item card.
 *
 * The found state is a pink wash in `multiply` blend rather than a tint on the sprite.
 * The card underneath is white and the object sits on it, so multiply turns the card
 * pink and leaves the object's own colours alone, which is what the mockup draws.
 * Tinting the sprite would wash the object out.
 *
 * The tick badge is not decoration. The mockup carries the found state on colour alone,
 * which is invisible to a colour-blind resident, so a second non-colour cue rides along.
 */
export function Card({ id, ariaLabel, interactive, found, onTap }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={interactive ? found : undefined}
      disabled={!interactive}
      onClick={interactive ? onTap : undefined}
      className="relative aspect-[3/4] w-full rounded-xl overflow-hidden select-none transition-transform disabled:cursor-default enabled:active:scale-95"
      style={{
        background: COLOURS.cardFill,
        boxShadow: `inset 0 0 0 1px ${COLOURS.cardEdge}, 0 2px 4px rgba(11,32,74,.18)`,
      }}
    >
      <img
        src={spritePath(id)}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain p-[10%]"
      />

      {found && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: COLOURS.foundFill, mixBlendMode: 'multiply' }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ boxShadow: `inset 0 0 0 3px ${COLOURS.foundEdge}` }}
          />
          <span
            aria-hidden
            className="absolute right-1 top-1 flex items-center justify-center rounded-full font-bold text-white"
            style={{ width: 22, height: 22, fontSize: 14, background: COLOURS.foundEdge }}
          >
            &#10003;
          </span>
        </>
      )}
    </button>
  );
}
