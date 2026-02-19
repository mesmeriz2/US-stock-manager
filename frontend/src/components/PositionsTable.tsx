import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { positionsApi, finnhubApi } from '@/services/api';
import { Position, FinnhubFinancials } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, RefreshCw, AlertCircle, Info, Search, Calculator } from 'lucide-react';
import SellSimulationModal from './SellSimulationModal';

type SortField = 'ticker' | 'shares' | 'avg_cost_usd' | 'market_price_usd' | 'market_value_usd' | 'day_change_pl_usd' | 'day_change_pl_percent' | 'realized_pl_usd' | 'unrealized_pl_usd' | 'unrealized_pl_percent' | 'weight' | 'holding_days';
type SortDirection = 'asc' | 'desc';

interface PositionsTableProps {
  accountId: number | null;
}

export default function PositionsTable({ accountId }: PositionsTableProps) {
  const [includeClosed, setIncludeClosed] = useState(false);
  const [sortField, setSortField] = useState<SortField>('ticker');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulationPosition, setSimulationPosition] = useState<Position | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: positions, isLoading, refetch } = useQuery({
    queryKey: ['positions', accountId, includeClosed],
    queryFn: () =>
      positionsApi
        .getAll({ account_id: accountId || undefined, include_closed: includeClosed })
        .then((res) => res.data),
  });

  // 호버된 티커의 재무 데이터 조회
  const { data: financialData } = useQuery({
    queryKey: ['finnhub-financials', hoveredTicker],
    queryFn: () =>
      hoveredTicker
        ? finnhubApi.getFinancials(hoveredTicker).then((res) => res.data)
        : Promise.resolve(null),
    enabled: !!hoveredTicker,
    staleTime: 24 * 60 * 60 * 1000, // 24시간
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // 비중 계산을 위한 총 평가금액 계산 (메모이제이션)
  const totalMarketValue = useMemo(() => {
    if (!positions) return 0;
    return positions.reduce((sum, position) => {
      // 전량 매도된 주식(shares = 0)은 비중 계산에서 제외
      if (position.shares > 0 && position.market_value_usd != null) {
        return sum + position.market_value_usd;
      }
      return sum;
    }, 0);
  }, [positions]);

  // 검색 필터링된 포지션 목록 (메모이제이션)
  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    if (!searchQuery.trim()) return positions;
    
    const query = searchQuery.toLowerCase();
    return positions.filter(position => 
      position.ticker.toLowerCase().includes(query)
    );
  }, [positions, searchQuery]);

  // 정렬된 포지션 목록 (메모이제이션)
  const sortedPositions = useMemo(() => {
    if (!filteredPositions) return [];
    return [...filteredPositions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // 비중 정렬의 경우 계산된 비중 사용
    if (sortField === 'weight') {
      const aWeight = a.shares > 0 && a.market_value_usd != null && totalMarketValue > 0 
        ? (a.market_value_usd / totalMarketValue) * 100 
        : 0;
      const bWeight = b.shares > 0 && b.market_value_usd != null && totalMarketValue > 0 
        ? (b.market_value_usd / totalMarketValue) * 100 
        : 0;
      aVal = aWeight;
      bVal = bWeight;
    }
    
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    // null/undefined를 맨 뒤로 정렬
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction * aVal.localeCompare(bVal);
    }
    
    return direction * ((aVal as number) - (bVal as number));
    });
  }, [filteredPositions, sortField, sortDirection, totalMarketValue]);

  // 보유 기간 포맷팅 함수 (메모이제이션)
  const formatHoldingDays = useCallback((days: number | undefined | null): string => {
    if (days == null) return '-';
    
    if (days < 30) {
      return `${days}일`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months}개월`;
    } else {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      return months > 0 ? `${years}년 ${months}개월` : `${years}년`;
    }
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (hoveredTicker) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setHoveredTicker(null);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [hoveredTicker]);

  if (isLoading) {
    return <div className="text-center p-8">로딩 중...</div>;
  }

  // 모바일 카드 뷰 컴포넌트
  const MobilePositionCard = ({ position }: { position: Position }) => {
    const isPriceLoaded = position.market_price_usd != null;
    const isClosed = position.shares <= 0;
    
    return (
      <Card className={`mb-3 hover-lift ${
        isClosed 
          ? 'bg-gray-100 dark:bg-gray-800/50' 
          : !isPriceLoaded 
            ? 'bg-amber-50 dark:bg-amber-950/20' 
            : ''
      }`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(`https://finance.yahoo.com/quote/${position.ticker}/`, '_blank')}
                className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {position.ticker}
              </button>
              <button
                onMouseEnter={() => setHoveredTicker(position.ticker)}
                onMouseLeave={() => setHoveredTicker(null)}
                onClick={() => setHoveredTicker(position.ticker)}
                className="p-1"
                aria-label={`${position.ticker} 재무 정보 보기`}
              >
                <Info className="h-4 w-4 text-blue-400" />
              </button>
              {!isPriceLoaded && !isClosed && (
                <AlertCircle className="h-4 w-4 text-amber-500" title="가격 정보 대기 중" />
              )}
              {isClosed && (
                <span className="text-xs px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded">
                  전량매도
                </span>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSimulationPosition(position)}
              disabled={position.shares <= 0}
              className="min-h-[44px] min-w-[44px]"
            >
              <Calculator className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-1">보유수량</div>
              <div className="font-medium font-numeric">{formatNumber(position.shares, 0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">보유기간</div>
              <div className="font-medium">{formatHoldingDays(position.holding_days)}</div>
            </div>
            
            {/* 전량 매도 종목: 실현손익만 표시 */}
            {isClosed ? (
              <>
                <div className="col-span-2 pt-2 border-t">
                  <div className="text-muted-foreground text-xs mb-1">실현 손익</div>
                  <div className={`font-bold font-numeric text-base ${
                    (position.realized_pl_usd || 0) >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {formatCurrency(position.realized_pl_usd || 0, 'USD')}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 보유 중인 종목: 기존 정보 표시 */}
                <div>
                  <div className="text-muted-foreground text-xs mb-1">평단가</div>
                  <div className="font-medium font-numeric">{formatCurrency(position.avg_cost_usd, 'USD')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">현재가</div>
                  <div className="font-medium font-numeric">
                    {isPriceLoaded ? (
                      formatCurrency(position.market_price_usd, 'USD')
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        대기 중
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">평가금액</div>
                  <div className="font-medium font-numeric">
                    {isPriceLoaded ? (
                      formatCurrency(position.market_value_usd!, 'USD')
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        대기 중
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">수익률</div>
                  <div className={`font-bold font-numeric text-base ${
                    isPriceLoaded && position.unrealized_pl_percent != null
                      ? position.unrealized_pl_percent >= 0 
                        ? 'text-profit' 
                        : 'text-loss'
                      : ''
                  }`}>
                    {isPriceLoaded && position.unrealized_pl_percent != null ? (
                      formatPercent(position.unrealized_pl_percent)
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        대기 중
                      </span>
                    )}
                  </div>
                </div>
                {isPriceLoaded && position.unrealized_pl_usd != null && (
                  <div className="col-span-2 pt-2 border-t">
                    <div className="text-muted-foreground text-xs mb-1">미실현 손익</div>
                    <div className={`font-bold font-numeric text-base ${
                      position.unrealized_pl_usd >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {formatCurrency(position.unrealized_pl_usd, 'USD')}
                    </div>
                  </div>
                )}
                {position.realized_pl_usd != null && position.realized_pl_usd !== 0 && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs mb-1">실현 손익</div>
                    <div className={`font-semibold font-numeric ${
                      position.realized_pl_usd >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {formatCurrency(position.realized_pl_usd, 'USD')}
                    </div>
                  </div>
                )}
                {position.day_change_pl_usd !== undefined && position.day_change_pl_usd !== null && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs mb-1">전일대비</div>
                    <div className={`font-semibold font-numeric ${
                      position.day_change_pl_usd >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {position.day_change_pl_usd >= 0 ? '+' : ''}{formatCurrency(position.day_change_pl_usd, 'USD')}
                      {position.day_change_pl_percent !== undefined && position.day_change_pl_percent !== null && (
                        <span className="ml-2 text-xs">
                          ({position.day_change_pl_percent >= 0 ? '+' : ''}{position.day_change_pl_percent.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>보유 현황</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeClosed"
                    checked={includeClosed}
                    onChange={(e) => setIncludeClosed(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="includeClosed" className="cursor-pointer">
                    전량 매도 포함
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  새로고침
                </Button>
              </div>
            </div>
            {/* 검색 입력 */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="티커 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
        {/* 모바일 뷰 */}
        {isMobile ? (
          <div className="space-y-3">
            {sortedPositions.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-lg font-medium">포지션이 없습니다</div>
                  <div className="text-sm">거래를 등록하여 포지션을 추가하세요</div>
                </div>
              </div>
            ) : (
              sortedPositions.map((position) => (
                <MobilePositionCard key={position.ticker} position={position} />
              ))
            )}
          </div>
        ) : (
          /* 데스크탑 뷰 (테이블) */
        <div className="overflow-x-auto scrollbar-hide">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                <TableHead className="min-w-[80px] py-2 px-3">
                  <button
                    onClick={() => handleSort('ticker')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors group"
                  >
                    티커
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'ticker' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[85px] py-2 px-2">
                  <button
                    onClick={() => handleSort('shares')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    보유수량
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'shares' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[85px] py-2 px-2 hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('holding_days')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    보유기간
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'holding_days' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[85px] py-2 px-2 hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('avg_cost_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    평단가
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'avg_cost_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[85px] py-2 px-2">
                  <button
                    onClick={() => handleSort('market_price_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    현재가
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'market_price_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[100px] py-2 px-2 hidden md:table-cell">
                  <button
                    onClick={() => handleSort('market_value_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    평가금액
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'market_value_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[90px] py-2 px-2 hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('day_change_pl_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    전일대비($)
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'day_change_pl_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[80px] py-2 px-2 hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('day_change_pl_percent')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    전일대비(%)
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'day_change_pl_percent' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[100px] py-2 px-2 hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('realized_pl_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    실현손익
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'realized_pl_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[100px] py-2 px-2 hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('unrealized_pl_usd')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    미실현손익
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'unrealized_pl_usd' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-right min-w-[85px] py-2 px-2">
                  <button
                    onClick={() => handleSort('unrealized_pl_percent')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors group"
                  >
                    수익률
                    <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === 'unrealized_pl_percent' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  </button>
                </TableHead>
                <TableHead className="text-center min-w-[60px] py-2 px-2">
                  <span className="text-muted-foreground">액션</span>
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {sortedPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-lg font-medium">포지션이 없습니다</div>
                    <div className="text-sm">거래를 등록하여 포지션을 추가하세요</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedPositions.map((position) => {
                const isPriceLoaded = position.market_price_usd != null;
                const isClosed = position.shares <= 0;
                const rowClassName = isClosed 
                  ? 'bg-gray-100 dark:bg-gray-800/50' 
                  : !isPriceLoaded 
                    ? 'bg-amber-50' 
                    : '';

                // 비중 계산 (전량 매도된 주식은 비중 표시하지 않음)
                const weight = position.shares > 0 && position.market_value_usd != null && totalMarketValue > 0
                  ? (position.market_value_usd / totalMarketValue) * 100
                  : null;
                
                return (
                  <TableRow key={position.ticker} className={`${rowClassName} animate-fade-in`}>
                    <TableCell className="font-medium py-2 px-3">
                      <div className="flex items-center gap-2">
                        {/* 재무 정보 아이콘 - 티커 앞에 배치 */}
                        <div 
                          className="relative"
                          onMouseEnter={() => setHoveredTicker(position.ticker)}
                          onMouseLeave={() => setHoveredTicker(null)}
                        >
                          <Info className="h-4 w-4 text-blue-400 cursor-help flex-shrink-0" />
                        </div>
                        <button
                          onClick={() => window.open(`https://finance.yahoo.com/quote/${position.ticker}/`, '_blank')}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {position.ticker}
                        </button>
                        {!isPriceLoaded && !isClosed && (
                          <AlertCircle className="h-4 w-4 text-amber-500" title="가격 정보 대기 중" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 font-numeric whitespace-nowrap">
                      {formatNumber(position.shares, 0)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden sm:table-cell whitespace-nowrap">
                      {formatHoldingDays(position.holding_days)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden sm:table-cell font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        formatCurrency(position.avg_cost_usd, 'USD')
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : isPriceLoaded ? (
                        formatCurrency(position.market_price_usd, 'USD')
                      ) : (
                        <span className="text-amber-600 flex items-center justify-end gap-1">
                          <AlertCircle className="h-3 w-3" />
                          대기 중
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden md:table-cell font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : isPriceLoaded ? (
                        formatCurrency(position.market_value_usd!, 'USD')
                      ) : (
                        <span className="text-amber-600 flex items-center justify-end gap-1">
                          <AlertCircle className="h-3 w-3" />
                          대기 중
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden xl:table-cell font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : position.day_change_pl_usd !== undefined && position.day_change_pl_usd !== null ? (
                        <span className={
                          position.day_change_pl_usd >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }>
                          {position.day_change_pl_usd >= 0 ? '+' : ''}{formatCurrency(position.day_change_pl_usd, 'USD')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden lg:table-cell font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : position.day_change_pl_percent !== undefined && position.day_change_pl_percent !== null ? (
                        <span className={`font-medium ${
                          position.day_change_pl_percent >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {position.day_change_pl_percent >= 0 ? '+' : ''}{position.day_change_pl_percent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden xl:table-cell font-numeric whitespace-nowrap">
                      {position.realized_pl_usd != null && position.realized_pl_usd !== 0 ? (
                        <span className={
                          position.realized_pl_usd >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }>
                          {formatCurrency(position.realized_pl_usd, 'USD')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 hidden lg:table-cell font-numeric whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : isPriceLoaded && position.unrealized_pl_usd != null ? (
                        <span className={
                          position.unrealized_pl_usd >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }>
                          {formatCurrency(position.unrealized_pl_usd, 'USD')}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          대기 중
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right py-2 px-2 font-medium font-numeric whitespace-nowrap ${
                        !isClosed && isPriceLoaded && position.unrealized_pl_percent != null
                          ? position.unrealized_pl_percent >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                          : ''
                      }`}
                    >
                      {isClosed ? (
                        <span className="text-muted-foreground">-</span>
                      ) : isPriceLoaded && position.unrealized_pl_percent != null ? (
                        formatPercent(position.unrealized_pl_percent)
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          대기 중
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2 px-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSimulationPosition(position)}
                        disabled={position.shares <= 0}
                        title="매도 시뮬레이션"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
        )}
      </CardContent>
    </Card>

    {/* 재무 데이터 모달 - 화면 중앙에 고정 표시 */}
    {hoveredTicker && financialData && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none animate-fade-in"
        onMouseEnter={() => setHoveredTicker(hoveredTicker)}
        onMouseLeave={() => setHoveredTicker(null)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-modal-title"
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-elevation-5 w-full max-w-md sm:max-w-lg max-h-[85vh] overflow-hidden pointer-events-auto animate-scale-in">
          <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
            <h4 id="financial-modal-title" className="font-semibold text-lg text-gradient-primary">{hoveredTicker} 재무 정보</h4>
            <button 
              onClick={() => setHoveredTicker(null)}
              aria-label="모달 닫기"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded p-1"
            >
              <span className="text-2xl leading-none">&times;</span>
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
            {Object.keys(financialData.details).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(financialData.details).map(([category, metrics]) => (
                  <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <div className="font-semibold text-blue-600 dark:text-blue-400 mb-3 text-base bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-2 rounded-lg">
                      {category}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(metrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50 hover-lift">
                          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{key}</span>
                          <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                            {typeof value === 'number' 
                              ? value.toFixed(2) 
                              : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                재무 데이터를 불러오는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* 매도 시뮬레이션 모달 */}
    <SellSimulationModal
      position={simulationPosition}
      isOpen={simulationPosition !== null}
      onClose={() => setSimulationPosition(null)}
      selectedAccountId={accountId}
    />
  </>
  );
}





