import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * 스켈레톤 로딩 컴포넌트
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        variant === 'card' && 'rounded-lg',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

/**
 * 금융 카드 스켈레톤
 */
export function FinancialCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-elevation-2 min-h-[140px] sm:min-h-[120px]">
      <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="p-6 pt-0">
        <Skeleton variant="text" width="80%" height={32} className="mb-2" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  );
}

/**
 * 테이블 로우 스켈레톤
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" />
        </td>
      ))}
    </tr>
  );
}

/**
 * 테이블 스켈레톤
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <table className="w-full">
        <thead>
          <tr className="border-b-2">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton variant="text" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 리스트 아이템 스켈레톤
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  );
}

/**
 * 대시보드 카드 그리드 스켈레톤
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="200px" height={40} />
        <Skeleton variant="rectangular" width="120px" height={36} />
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <FinancialCardSkeleton key={i} />
        ))}
      </div>
      
      <div className="rounded-lg border bg-card shadow-elevation-2 p-6">
        <Skeleton variant="text" width="150px" height={28} className="mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" height={32} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

