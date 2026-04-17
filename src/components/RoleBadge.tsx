import { Shield, GraduationCap } from 'lucide-react';

interface RoleBadgeProps {
  role: 'admin' | 'student';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Visual badge for displaying user role.
 *
 * Note: Role data is sourced from the `user_roles` table only — never from
 * the profile or client storage. This component is purely presentational.
 */
export function RoleBadge({ role, size = 'sm', className = '' }: RoleBadgeProps) {
  const isAdmin = role === 'admin';
  const Icon = isAdmin ? Shield : GraduationCap;
  const label = isAdmin ? 'Admin' : 'Student';

  const sizeClasses =
    size === 'md'
      ? 'text-xs px-2.5 py-1 gap-1.5'
      : 'text-[10px] px-2 py-0.5 gap-1';

  const colorClasses = isAdmin
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${colorClasses} ${className}`}
    >
      <Icon className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {label}
    </span>
  );
}
