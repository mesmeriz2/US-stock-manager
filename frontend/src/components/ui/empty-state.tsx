import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { FileText, TrendingUp, Wallet, DollarSign, Database, BarChart3 } from 'lucide-react';

export type EmptyStateType = 'portfolio' | 'trades' | 'cash' | 'dividends' | 'backup' | 'analysis';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig: Record<EmptyStateType, { icon: React.ComponentType<{ className?: string }>; defaultTitle: string; defaultDescription: string; emoji: string }> = {
  portfolio: {
    icon: TrendingUp,
    defaultTitle: '포지션이 없습니다',
    defaultDescription: '거래를 등록하여 포지션을 추가하세요',
    emoji: '📊',
  },
  trades: {
    icon: FileText,
    defaultTitle: '거래 내역이 없습니다',
    defaultDescription: '첫 거래를 등록해보세요',
    emoji: '📝',
  },
  cash: {
    icon: Wallet,
    defaultTitle: '현금 거래가 없습니다',
    defaultDescription: '입출금 내역을 추가하세요',
    emoji: '💰',
  },
  dividends: {
    icon: DollarSign,
    defaultTitle: '배당 내역이 없습니다',
    defaultDescription: '배당 정보를 추가하세요',
    emoji: '💵',
  },
  backup: {
    icon: Database,
    defaultTitle: '백업이 없습니다',
    defaultDescription: '데이터를 백업하여 안전하게 보관하세요',
    emoji: '💾',
  },
  analysis: {
    icon: BarChart3,
    defaultTitle: '분석 데이터가 없습니다',
    defaultDescription: '포트폴리오 데이터를 확인하세요',
    emoji: '📈',
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 relative">
        <div className="text-6xl mb-2 animate-fade-in">{config.emoji}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full p-6 blur-xl animate-pulse-glow" />
        </div>
        <div className="relative bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-full p-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gradient-primary">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description || config.defaultDescription}
      </p>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="gradient" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

