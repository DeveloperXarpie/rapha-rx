interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'amber';
}

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  const variantClass = {
    blue:   'text-white border border-blue-700 [background:linear-gradient(180deg,#5fa1ff_0%,#2a66b8_100%)]',
    green:  'text-white border border-emerald-700 [background:linear-gradient(180deg,#5fcca5_0%,#2f9a74_100%)]',
    purple: 'text-white border border-violet-700 [background:linear-gradient(180deg,#b18ce4_0%,#7f56b3_100%)]',
    amber:  'text-amber-900 border border-amber-500 [background:linear-gradient(180deg,#ffe58f_0%,#f8c94f_100%)]',
  }[variant];

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-caption font-semibold shadow-[0_2px_0_rgba(0,0,0,0.2)] [font-family:'Baloo_2','Inter',sans-serif] ${variantClass}`}>
      {children}
    </span>
  );
}
