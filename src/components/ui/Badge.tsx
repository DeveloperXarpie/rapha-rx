interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'amber';
}

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  const variantClass = {
    blue:   'bg-blue-100 text-primary-blue',
    green:  'bg-green-100 text-emerald-green',
    purple: 'bg-purple-100 text-accent-purple',
    amber:  'bg-yellow-100 text-amber-700',
  }[variant];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-semibold ${variantClass}`}>
      {children}
    </span>
  );
}
