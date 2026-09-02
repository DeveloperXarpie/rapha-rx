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
  ...rest
}: ButtonProps) {
  const isBrand = variant === 'green' || variant === 'blue';

  if (isBrand) {
    /*
     * The handoff gives each brand button a fixed px width so the label never
     * wraps. Hindi and Kannada do not fit those widths, so min-height is honoured
     * and width is left to grow. See the i18n divergence in the spec.
     */
    const lead = leading === undefined && variant === 'green' ? <Leaf /> : leading;
    const trail = trailing === undefined && variant === 'green' ? <Leaf mirrored /> : trailing;

    return (
      <button
        className={`btn-brand btn-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{ minHeight: size === 'lg' ? 66 : 58, fontSize: size === 'lg' ? 21 : 19 }}
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
      {...rest}
    >
      {children}
    </button>
  );
}
