import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <RefreshCw className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// 로딩 카드 컴포넌트 (스켈레톤 UI)
interface LoadingCardProps {
  rows?: number;
  className?: string;
}

export function LoadingCard({ rows = 3, className }: LoadingCardProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 로딩 테이블 행 컴포넌트
interface LoadingTableRowProps {
  columns?: number;
  className?: string;
}

export function LoadingTableRow({ columns = 4, className }: LoadingTableRowProps) {
  return (
    <tr className={cn('animate-pulse', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </td>
      ))}
    </tr>
  );
}














