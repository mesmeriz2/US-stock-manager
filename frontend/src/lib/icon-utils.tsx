import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

/**
 * 아이콘 크기 정의
 */
export const iconSizes = {
  xs: 'h-3 w-3',     // 12px
  sm: 'h-4 w-4',     // 16px
  md: 'h-5 w-5',     // 20px
  lg: 'h-6 w-6',     // 24px
  xl: 'h-8 w-8',     // 32px
  '2xl': 'h-10 w-10', // 40px
} as const;

/**
 * 아이콘 색상 정의
 */
export const iconColors = {
  primary: 'text-blue-600 dark:text-blue-400',
  success: 'text-green-600 dark:text-green-400',
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-sky-600 dark:text-sky-400',
  muted: 'text-muted-foreground',
  profit: 'text-profit',
  loss: 'text-loss',
  neutral: 'text-neutral',
} as const;

interface IconProps {
  icon: LucideIcon;
  size?: keyof typeof iconSizes;
  color?: keyof typeof iconColors;
  className?: string;
}

/**
 * 일관된 아이콘 컴포넌트
 */
export const Icon = ({ 
  icon: IconComponent, 
  size = 'md', 
  color = 'muted',
  className = '' 
}: IconProps) => {
  return (
    <IconComponent 
      className={cn(iconSizes[size], iconColors[color], className)}
    />
  );
};

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  size?: keyof typeof iconSizes;
  variant?: 'ghost' | 'outline' | 'solid';
  className?: string;
  disabled?: boolean;
}

/**
 * 터치 친화적인 아이콘 버튼 (최소 44x44px)
 */
export const IconButton = ({ 
  icon: IconComponent,
  label,
  onClick,
  size = 'md',
  variant = 'ghost',
  className = '',
  disabled = false,
}: IconButtonProps) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center',
        'min-h-[44px] min-w-[44px]',  // WCAG 터치 타겟 크기
        'rounded-lg',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'outline' && 'border border-input hover:bg-accent hover:text-accent-foreground',
        variant === 'solid' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
    >
      <IconComponent className={iconSizes[size]} />
    </button>
  );
};

