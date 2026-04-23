interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const API_URL = import.meta.env.VITE_API_URL;

export function Avatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-32 h-32 text-2xl',
  };

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={`${API_URL}${avatarUrl}`}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-border`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-text-primary text-bg-primary flex items-center justify-center font-medium border border-border`}>
      {initials}
    </div>
  );
}
