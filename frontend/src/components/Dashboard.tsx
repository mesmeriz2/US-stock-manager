import { useQuery } from '@tanstack/react-query';
import { dashboardApi, backgroundApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw, Clock, Activity } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import PortfolioChart from './PortfolioChart';

interface LoadingStatus {
  total: number;
  completed: number;
  failed: number;
  current_ticker: string | null;
  progress_percent: number;
  estimated_remaining_seconds: number;
  start_time: string;
  estimated_completion: string | null;
}

interface DashboardProps {
  accountId: number | null;
}

export default function Dashboard({ accountId }: DashboardProps) {
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const { toast } = useToast();

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-summary', accountId],
    queryFn: () =>
      dashboardApi
        .getSummary({
          account_id: accountId || undefined,
          include_account_summaries: accountId === null,
        })
        .then((res) => res.data),
    refetchInterval: 60000, // 1분마다 자동 갱신
    retry: 3, // 3번 재시도
    retryDelay: 1000, // 1초 후 재시도
  });

  // 백그라운드 로딩 상태 조회
  const { data: bgStatus } = useQuery({
    queryKey: ['background-loading-status'],
    queryFn: () => backgroundApi.getPriceLoadingStatus().then((res) => res.data),
    refetchInterval: 2000, // 2초마다 상태 확인
  });

  useEffect(() => {
    if (bgStatus) {
      setLoadingStatus(bgStatus);
      // 로딩 중이면 프로그레스 바 표시
      setShowProgress(bgStatus.completed < bgStatus.total && bgStatus.total > 0);
    }
  }, [bgStatus]);

  const handleForceRefresh = useCallback(async () => {
    try {
      await backgroundApi.forceRefresh();
      // 잠시 후 대시보드 새로고침
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error('Failed to force refresh:', error);
      toast({
        title: "새로고침 실패",
        description: error instanceof Error ? error.message : "새로고침 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [refetch, toast]);

  // 카드 데이터 메모이제이션 - Hooks 규칙을 지키기 위해 조건부 return 이전에 선언
  const cards = useMemo(() => [
    {
      title: '총 평가금액',
      valueUSD: summary?.total_market_value_usd || 0,
      valueKRW: summary?.total_market_value_krw || 0,
      icon: Wallet,
      color: 'text-blue-600',
      gradient: 'gradient-info',
      iconGradient: 'from-blue-500 to-blue-700',
    },
    {
      title: '미실현 손익',
      valueUSD: summary?.total_unrealized_pl_usd || 0,
      valueKRW: summary?.total_unrealized_pl_krw || 0,
      icon: (summary?.total_unrealized_pl_usd || 0) >= 0 ? TrendingUp : TrendingDown,
      color:
        (summary?.total_unrealized_pl_usd || 0) >= 0
          ? 'text-green-600'
          : 'text-red-600',
      gradient: (summary?.total_unrealized_pl_usd || 0) >= 0 ? 'gradient-success' : 'gradient-danger',
      iconGradient: (summary?.total_unrealized_pl_usd || 0) >= 0 ? 'from-green-500 to-green-700' : 'from-red-500 to-red-700',
    },
    {
      title: '실현 손익',
      valueUSD: summary?.total_realized_pl_usd || 0,
      valueKRW: summary?.total_realized_pl_krw || 0,
      icon: (summary?.total_realized_pl_usd || 0) >= 0 ? TrendingUp : TrendingDown,
      color:
        (summary?.total_realized_pl_usd || 0) >= 0 ? 'text-green-600' : 'text-red-600',
      gradient: (summary?.total_realized_pl_usd || 0) >= 0 ? 'gradient-success' : 'gradient-danger',
      iconGradient: (summary?.total_realized_pl_usd || 0) >= 0 ? 'from-green-500 to-green-700' : 'from-red-500 to-red-700',
    },
    {
      title: '총 손익',
      valueUSD: summary?.total_pl_usd || 0,
      valueKRW: summary?.total_pl_krw || 0,
      dayChange: summary?.day_change_pl_usd,
      icon: (summary?.total_pl_usd || 0) >= 0 ? TrendingUp : TrendingDown,
      color: (summary?.total_pl_usd || 0) >= 0 ? 'text-green-600' : 'text-red-600',
      gradient: (summary?.total_pl_usd || 0) >= 0 ? 'gradient-success' : 'gradient-danger',
      iconGradient: (summary?.total_pl_usd || 0) >= 0 ? 'from-green-500 to-green-700' : 'from-red-500 to-red-700',
    },
    {
      title: '총 배당금',
      valueUSD: summary?.total_dividends_usd || 0,
      valueKRW: summary?.total_dividends_krw || 0,
      icon: DollarSign,
      color: 'text-green-600',
      gradient: 'gradient-success',
      iconGradient: 'from-green-500 to-green-700',
    },
  ], [summary]);

  // 로딩 상태에 따른 UI 렌더링
  if (isLoading && !summary) {
    return <DashboardSkeleton />;
  }

  // 에러 상태 처리
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-600 text-center">
          <h3 className="text-lg font-semibold mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // summary가 없으면 로딩 상태 표시
  if (!summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          대시보드{accountId !== null && ' - 계정별 보기'}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleForceRefresh}
            variant="outline"
            size="sm"
            className="hover-lift"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          
          <div className="flex items-center gap-2">
            {/* 환율 배지 */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium shadow-sm hover-lift"
              title={`환율: ${formatCurrency(summary.fx_rate_usd_krw ?? 1350, 'KRW')}/USD (기준일: ${summary.fx_rate_as_of ?? '-'})`}
            >
              <DollarSign className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">{Math.round(summary.fx_rate_usd_krw ?? 1350).toLocaleString()}</span>
            </div>
            
            {/* Fear & Greed 배지 */}
            {summary.fear_greed_index && (
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover-lift border ${
                  summary.fear_greed_index.value <= 25
                    ? 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
                    : summary.fear_greed_index.value <= 45
                    ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800'
                    : summary.fear_greed_index.value <= 55
                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800'
                    : summary.fear_greed_index.value <= 75
                    ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800'
                    : 'bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                }`}
                title={`Fear & Greed Index: ${summary.fear_greed_index.value} (${summary.fear_greed_index.classification}) - 기준일: ${new Date(summary.fear_greed_index.as_of).toLocaleDateString('ko-KR')}`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>{summary.fear_greed_index.value}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 백그라운드 로딩 상태 표시 */}
      {showProgress && loadingStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Clock className="h-5 w-5" />
              주가 데이터 업데이트 중
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>진행률: {loadingStatus.completed}/{loadingStatus.total}</span>
                <span>{loadingStatus.progress_percent?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingStatus.progress_percent || 0}%` }}
                />
              </div>
            </div>
            
            {loadingStatus.current_ticker && (
              <div className="text-sm text-blue-700">
                현재 업데이트 중: <span className="font-mono font-semibold">{loadingStatus.current_ticker}</span>
              </div>
            )}
            
            {loadingStatus.estimated_remaining_seconds && (
              <div className="text-sm text-blue-600">
                예상 남은 시간: 약 {Math.ceil(loadingStatus.estimated_remaining_seconds / 60)}분
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            className="min-h-[140px] sm:min-h-[120px] hover-lift relative overflow-hidden group animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* 그라데이션 배경 오버레이 */}
            <div className={`absolute inset-0 ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`bg-gradient-to-br ${card.iconGradient} p-1.5 rounded-lg shadow-sm`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight font-numeric">
                {formatCurrency(card.valueUSD, 'USD')}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-numeric">
                {formatCurrency(card.valueKRW, 'KRW')}
              </div>
              {card.dayChange !== undefined && card.dayChange !== null && (
                <div
                  className={`text-xs mt-2 font-semibold flex items-center gap-1 font-numeric ${
                    card.dayChange >= 0 ? 'text-profit' : 'text-loss'
                  }`}
                >
                  {card.dayChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>
                    전일대비: {card.dayChange >= 0 ? '+' : ''}{formatCurrency(card.dayChange, 'USD')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 포트폴리오 구성 바 차트 - 누적 투자 성과 기준 */}
      {(() => {
        const netInvestment = summary.net_investment_usd || 0; // 순투자금액
        const realizedPL = summary.total_realized_pl_usd || 0; // 실현손익
        const unrealizedPL = summary.total_unrealized_pl_usd || 0; // 미실현손익
        const totalAssets = netInvestment + realizedPL + unrealizedPL; // 총자산
        
        if (totalAssets <= 0) return null;
        
        // 각 세그먼트 너비 계산 (비율 기반, 음수는 절댓값으로 처리)
        const netInvestmentWidth = totalAssets > 0 ? (Math.abs(netInvestment) / totalAssets) * 100 : 0;
        const realizedPLWidth = totalAssets > 0 ? (Math.abs(realizedPL) / totalAssets) * 100 : 0;
        const unrealizedPLWidth = totalAssets > 0 ? (Math.abs(unrealizedPL) / totalAssets) * 100 : 0;
        
        // 세그먼트 위치 계산 (라벨 배치용)
        let netInvestmentLeft = 0;
        let realizedPLLeft = netInvestmentWidth;
        let unrealizedPLLeft = netInvestmentWidth + realizedPLWidth;
        
        // 반응형 라벨 표시 여부 결정 함수
        const shouldShowLabel = (width: number) => width > 8;
        const shouldShowAmount = (width: number) => width > 15;
        const shouldShowCompactLabel = (width: number) => width > 3; // 매우 작은 세그먼트용
        
        return (
          <div className="mb-6">
            <div className="relative w-full">
              {/* 바 차트 - 전체 너비 활용 */}
              <div className="flex h-16 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* 순투자금액 세그먼트 */}
                {netInvestment !== 0 && (
                  <div
                    className="flex items-center justify-center bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 cursor-pointer relative group border-r border-gray-400/40 dark:border-gray-300/20 rounded-l-lg"
                    style={{
                      width: `${Math.max(netInvestmentWidth, 1)}%`, // 최소 1% 너비 보장
                      minWidth: '8px', // 최소 8px 너비 보장
                    }}
                    title={`순투자금액: ${formatCurrency(netInvestment, 'USD')} (입금: ${formatCurrency(summary.total_deposits_usd || 0, 'USD')} - 출금: ${formatCurrency(summary.total_withdrawals_usd || 0, 'USD')})`}
                  >
                    {shouldShowLabel(netInvestmentWidth) ? (
                      <span className="px-2 truncate text-center">
                        {shouldShowAmount(netInvestmentWidth) ? (
                          <>
                            <div className="font-bold">순투자금액</div>
                            <div className="text-[10px] opacity-90">{formatCurrency(netInvestment, 'USD')}</div>
                          </>
                        ) : (
                          <span>순투자금액</span>
                        )}
                      </span>
                    ) : shouldShowCompactLabel(netInvestmentWidth) ? (
                      <span className="text-xs font-bold">투자</span>
                    ) : (
                      <div className="w-1 h-1 bg-white rounded-full opacity-80" />
                    )}
                    
                    {/* 작은 세그먼트용 외부 라벨 */}
                    {netInvestmentWidth < 8 && netInvestmentWidth > 0.1 && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                        순투자금액: {formatCurrency(netInvestment, 'USD')}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* 실현손익 세그먼트 */}
                {realizedPL !== 0 && (
                  <div
                    className={`flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 cursor-pointer relative group border-r ${
                      realizedPL >= 0
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-500/40 dark:border-green-400/20'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500/40 dark:border-red-400/20'
                    } ${netInvestment === 0 ? 'rounded-l-lg' : ''}`}
                    style={{
                      width: `${Math.max(realizedPLWidth, 1)}%`, // 최소 1% 너비 보장
                      minWidth: '8px', // 최소 8px 너비 보장
                    }}
                    title={`실현손익: ${formatCurrency(realizedPL, 'USD')}`}
                  >
                    {shouldShowLabel(realizedPLWidth) ? (
                      <span className="px-2 truncate text-center">
                        {shouldShowAmount(realizedPLWidth) ? (
                          <>
                            <div className="font-bold">실현손익</div>
                            <div className="text-[10px] opacity-90">{formatCurrency(realizedPL, 'USD')}</div>
                          </>
                        ) : (
                          <span>실현손익</span>
                        )}
                      </span>
                    ) : shouldShowCompactLabel(realizedPLWidth) ? (
                      <span className="text-xs font-bold">{realizedPL >= 0 ? '실+' : '실-'}</span>
                    ) : (
                      <div className="w-1 h-1 bg-white rounded-full opacity-80" />
                    )}
                    
                    {/* 작은 세그먼트용 외부 라벨 */}
                    {realizedPLWidth < 8 && realizedPLWidth > 0.1 && (
                      <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none ${
                        realizedPL >= 0 ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        실현손익: {formatCurrency(realizedPL, 'USD')}
                        <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                          realizedPL >= 0 ? 'border-t-green-600' : 'border-t-red-600'
                        }`} />
                      </div>
                    )}
                  </div>
                )}
                
                {/* 미실현손익 세그먼트 */}
                {unrealizedPL !== 0 && (
                  <div
                    className={`flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 cursor-pointer relative group rounded-r-lg ${
                      unrealizedPL >= 0
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white'
                    }`}
                    style={{
                      width: `${Math.max(unrealizedPLWidth, 1)}%`, // 최소 1% 너비 보장
                      minWidth: '8px', // 최소 8px 너비 보장
                    }}
                    title={`미실현손익: ${formatCurrency(unrealizedPL, 'USD')}`}
                  >
                    {shouldShowLabel(unrealizedPLWidth) ? (
                      <span className="px-2 truncate text-center">
                        {shouldShowAmount(unrealizedPLWidth) ? (
                          <>
                            <div className="font-bold">미실현손익</div>
                            <div className="text-[10px] opacity-90">{formatCurrency(unrealizedPL, 'USD')}</div>
                          </>
                        ) : (
                          <span>미실현손익</span>
                        )}
                      </span>
                    ) : shouldShowCompactLabel(unrealizedPLWidth) ? (
                      <span className="text-xs font-bold">{unrealizedPL >= 0 ? '미+' : '미-'}</span>
                    ) : (
                      <div className="w-1 h-1 bg-white rounded-full opacity-80" />
                    )}
                    
                    {/* 작은 세그먼트용 외부 라벨 */}
                    {unrealizedPLWidth < 8 && unrealizedPLWidth > 0.1 && (
                      <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none ${
                        unrealizedPL >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        미실현손익: {formatCurrency(unrealizedPL, 'USD')}
                        <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                          unrealizedPL >= 0 ? 'border-t-emerald-600' : 'border-t-rose-600'
                        }`} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 수치 라벨 - 바 아래에 각 세그먼트 위치에 맞춰 배치 (반응형) */}
              <div className="relative mt-3 h-6 flex items-start">
                {netInvestment !== 0 && netInvestmentWidth > 5 && ( // 5% 이상일 때만 바 아래 라벨 표시
                  <div
                    className="absolute text-xs sm:text-sm font-semibold font-numeric text-gray-600 dark:text-gray-400 whitespace-nowrap"
                    style={{
                      left: `${netInvestmentLeft}%`,
                      maxWidth: `${Math.max(netInvestmentWidth, 10)}%`,
                      transform: 'translateX(0)',
                    }}
                  >
                    {!shouldShowAmount(netInvestmentWidth) && (
                      <div className="truncate" title={formatCurrency(netInvestment, 'USD')}>
                        순투자: {formatCurrency(netInvestment, 'USD')}
                      </div>
                    )}
                  </div>
                )}
                {realizedPL !== 0 && realizedPLWidth > 5 && ( // 5% 이상일 때만 바 아래 라벨 표시
                  <div
                    className={`absolute text-xs sm:text-sm font-semibold font-numeric whitespace-nowrap ${
                      realizedPL >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}
                    style={{
                      left: `${realizedPLLeft}%`,
                      maxWidth: `${Math.max(realizedPLWidth, 10)}%`,
                      transform: 'translateX(0)',
                    }}
                  >
                    {!shouldShowAmount(realizedPLWidth) && (
                      <div className="truncate" title={formatCurrency(realizedPL, 'USD')}>
                        실현: {formatCurrency(realizedPL, 'USD')}
                      </div>
                    )}
                  </div>
                )}
                {unrealizedPL !== 0 && unrealizedPLWidth > 5 && ( // 5% 이상일 때만 바 아래 라벨 표시
                  <div
                    className={`absolute text-xs sm:text-sm font-semibold font-numeric whitespace-nowrap ${
                      unrealizedPL >= 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                    style={{
                      left: `${unrealizedPLLeft}%`,
                      maxWidth: `${Math.max(unrealizedPLWidth, 10)}%`,
                      transform: 'translateX(0)',
                    }}
                  >
                    {!shouldShowAmount(unrealizedPLWidth) && (
                      <div className="truncate" title={formatCurrency(unrealizedPL, 'USD')}>
                        미실현: {formatCurrency(unrealizedPL, 'USD')}
                      </div>
                    )}
                  </div>
                )}
                
                {/* 작은 세그먼트들을 위한 요약 정보 (바 아래) */}
                {(netInvestmentWidth < 5 || realizedPLWidth < 5 || unrealizedPLWidth < 5) && (
                  <div className="absolute left-0 text-xs text-muted-foreground">
                    작은 세그먼트는 마우스 호버로 확인하세요
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 포트폴리오 가치 그래프 */}
      <PortfolioChart accountId={accountId} />

      {/* 계정별 요약 정보 (전체 보기 모드에서만) */}
      {accountId === null && summary?.accounts_summary && summary.accounts_summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>계정별 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 min-w-[120px]">계정명</th>
                    <th className="text-right py-2 px-4 min-w-[120px] hidden sm:table-cell">평가금액(USD)</th>
                    <th className="text-right py-2 px-4 min-w-[120px] hidden md:table-cell">미실현 손익</th>
                    <th className="text-right py-2 px-4 min-w-[120px] hidden lg:table-cell">실현 손익</th>
                    <th className="text-right py-2 px-4 min-w-[120px]">총 손익</th>
                    <th className="text-right py-2 px-4 min-w-[100px] hidden xl:table-cell">전일대비</th>
                    <th className="text-right py-2 px-4 min-w-[80px]">보유 종목</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.accounts_summary.map((acc) => (
                    <tr key={`acc-${acc.account_id}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{acc.account_name ?? '알 수 없음'}</td>
                      <td className="text-right py-2 px-4 hidden sm:table-cell">
                        {formatCurrency(acc.total_market_value_usd, 'USD')}
                      </td>
                      <td className="text-right py-2 px-4 hidden md:table-cell">
                        <span className={
                          (acc.total_unrealized_pl_usd ?? 0) >= 0
                            ? 'text-profit font-numeric'
                            : 'text-loss font-numeric'
                        }>
                          {formatCurrency(acc.total_unrealized_pl_usd, 'USD')}
                        </span>
                        <br />
                        <span className="text-xs font-numeric">
                          ({formatPercent(acc.total_unrealized_pl_percent)})
                        </span>
                      </td>
                      <td className="text-right py-2 px-4 hidden lg:table-cell">
                        <span className={
                          (acc.total_realized_pl_usd ?? 0) >= 0
                            ? 'text-profit font-numeric'
                            : 'text-loss font-numeric'
                        }>
                          {formatCurrency(acc.total_realized_pl_usd, 'USD')}
                        </span>
                      </td>
                      <td
                        className={`text-right py-2 px-4 font-medium font-numeric ${
                          (acc.total_pl_usd ?? 0) >= 0 ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {formatCurrency(acc.total_pl_usd, 'USD')}
                      </td>
                      <td className="text-right py-2 px-4 hidden xl:table-cell">
                        {acc.day_change_pl_usd !== undefined && acc.day_change_pl_usd !== null ? (
                          <span className={`flex items-center justify-end gap-1 font-numeric ${
                            acc.day_change_pl_usd >= 0
                              ? 'text-profit font-semibold'
                              : 'text-loss font-semibold'
                          }`}>
                            {acc.day_change_pl_usd >= 0 ? (
                              <TrendingUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <TrendingDown className="h-3 w-3" aria-hidden="true" />
                            )}
                            <span>{acc.day_change_pl_usd >= 0 ? '+' : ''}{formatCurrency(acc.day_change_pl_usd, 'USD')}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="text-right py-2 px-4">
                        {acc.active_positions_count ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




