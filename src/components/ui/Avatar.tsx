interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
}

const PALETTE = [
  'bg-primary-blue',
  'bg-emerald-green',
  'bg-accent-purple',
  'bg-accent-amber',
];

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({ firstName, lastName, size = 'md' }: AvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const color = pickColor(firstName + lastName);
  const sizeClass = {
    sm: 'w-14 h-14 text-h3',
    md: 'w-20 h-20 text-h2',
    lg: 'w-28 h-28 text-h1',
  }[size];

  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
}
