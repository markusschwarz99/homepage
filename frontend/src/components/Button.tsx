import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base = 'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors font-sans';

  const variants = {
    primary: 'bg-accent text-bg-primary border border-accent hover:bg-accent-hover',
    secondary: 'bg-transparent text-text-primary border border-border hover:bg-bg-secondary',
    danger: 'bg-transparent text-red-600 border border-red-600 hover:bg-red-50',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
