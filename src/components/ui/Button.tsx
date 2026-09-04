import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'green' | 'blue';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  /**
   * Glyph before the label. `green` defaults to a leaf; pass null to suppress.
   * Ignored by the three legacy variants.
   */
  leading?: React.ReactNode;
  /** Glyph after the label. `green` defaults to a mirrored leaf. */
  trailing?: React.ReactNode;
}

const LEAF = '/brand/leaf.png';

function Leaf({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <img
      src={LEAF}
      alt=""
      aria-hidden="true"
      width={30}
      height={30}
      style={{ width: 30, height: 30, flexShrink: 0, transform: mirrored ? 'scaleX(-1)' : undefined }}
    />
  );
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className = '',
  leading,
  trailing,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isBrand = variant === 'green' || variant === 'blue';

  if (isBrand) {
    /*
     * The handoff gives each brand button a fixed px width so the label never
     * wraps. Hindi and Kannada do not fit those widths, so min-height is honoured
     * and width is left to grow. See the i18n divergence in the spec.
     *
     * 28/23 rather than the 21/19 this shipped with, in panels 8px and 6px
     * taller than the handoff's 66/58. The prototype sets a label size per
     * button - 26 on Start Session and the confirmation Next, 27 on Get Started,
     * 23-24 on the rest - and 21/19 sat under every one of them, which read as
     * small on a screen built for residents. 28 is a deliberate step past the
     * prototype's own 26, asked for on top of it.
     */
    const lead = leading === undefined && variant === 'green' ? <Leaf /> : leading;
    const trail = trailing === undefined && variant === 'green' ? <Leaf mirrored /> : trailing;

    return (
      <button
        className={`btn-brand btn-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
        /*
         * The caller's style is MERGED, not spread over the top. `{...rest}`
         * used to carry it and, being a later prop, replaced this object whole -
         * so every button that passed a width (Start Session, Let's Begin, Back
         * to Home, Continue, Next, Get Started) lost both. Measured before the
         * fix, Start Session rendered at the inherited 16px in a 40px box, not
         * the 21px/66px this file has always claimed to set.
         */
        style={{
          minHeight: size === 'lg' ? 74 : 64,
          /*
           * The label shrinks rather than wraps. At the full 28px "Start Session"
           * needs more than a 320px screen leaves, and Kannada's "ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ"
           * more than a 360px one, so both broke onto two lines with the leaves
           * stranded beside them. vw tracks the column on a phone, where the
           * column IS the viewport; on desktop .app-root caps the width and the
           * clamp simply saturates at its maximum.
           */
          fontSize: size === 'lg' ? 'clamp(21px, 7.2vw, 28px)' : 'clamp(18px, 6vw, 23px)',
          ...style,
        }}
        {...rest}
      >
        {lead}
        <span>{children}</span>
        {trail}
      </button>
    );
  }

  const base =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeClass = size === 'lg' ? 'min-h-[80px] px-8 py-4 text-btn' : 'min-h-[56px] px-6 py-3 text-body-md';
  const widthClass = fullWidth ? 'w-full' : '';

  const variantClass = {
    primary:   'bg-primary-blue text-white hover:bg-blue-700',
    secondary: 'bg-card-bg text-primary-blue border-2 border-primary-blue hover:bg-hover-state',
    ghost:     'text-primary-blue hover:bg-hover-state',
  }[variant];

  return (
    <button
      className={`${base} ${sizeClass} ${widthClass} ${variantClass} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}
