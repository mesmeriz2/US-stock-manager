import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analysisApi, dividendsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  PieChart as PieChartIcon,
  Target,
  Info,
  DollarSign,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { PortfolioAnalysis as PortfolioAnalysisType, DividendByTicker } from '@/types';

interface PortfolioAnalysisProps {
  accountId: number | null;
}

// 섹터별 색상 팔레트
const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#10b981',
  'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#ec4899',
  'Communication Services': '#8b5cf6',
  'Industrials': '#06b6d4',
  'Consumer Defensive': '#84cc16',
  'Energy': '#ef4444',
  'Basic Materials': '#f97316',
  'Real Estate': '#6366f1',
  'Utilities': '#14b8a6',
  'Unknown': '#9ca3af'
};

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
  '#06b6d4', '#84cc16', '#ef4444', '#f97316', '#6366f1'
];

export default function PortfolioAnalysis({ accountId }: PortfolioAnalysisProps) {
  const queryClient = useQueryClient();
  
  const { data: analysis, isLoading: analysisLoading, refetch } = useQuery({
    queryKey: ['portfolio-analysis', accountId],
    queryFn: () => analysisApi.getPortfolioAnalysis(accountId || undefined)
      .then(res => res.data),
    refetchInterval: 300000, // 5분
  });

  // 배당 데이터 조회: 배당 메뉴의 캐시를 우선 활용
  // 1. 먼저 캐시 확인 (배당 메뉴에서 이미 로드한 데이터)
  const cachedDividendData = queryClient.getQueryData<DividendByTicker[]>(
    ['dividends-by-ticker', accountId, false]
  );

  // 2. 캐시가 있으면 API 호출 스킵, 없으면 조용히 호출
  const { data: dividendByTicker, isLoading: dividendLoading } = useQuery({
    queryKey: ['dividends-by-ticker', accountId, false], // showAllYears: false로 올해 데이터
    queryFn: () => dividendsApi.getByTicker(accountId || undefined, { year: new Date().getFullYear() })
      .then(res => res.data),
    enabled: !cachedDividendData, // 캐시가 있으면 API 호출 안 함
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    initialData: cachedDividendData, // 캐시를 초기값으로 사용
  });

  // 3. 최종 데이터 사용 (API 응답 또는 캐시)
  const finalDividendData = dividendByTicker || cachedDividendData;

  // 전체 로딩 상태 (캐시가 있으면 배당 로딩은 false)
  const isLoading = analysisLoading || (dividendLoading && !cachedDividendData);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {data.sector || data.industry}
          </p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-gray-600 dark:text-gray-400">종목 수:</span>
              <span className="font-semibold">{data.count}개</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600 dark:text-gray-400">평가금액:</span>
              <span className="font-semibold">{formatCurrency(data.total_value_usd, 'USD')}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600 dark:text-gray-400">비중:</span>
              <span className="font-semibold">{formatPercent(data.percentage)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600 dark:text-gray-400">손익:</span>
              <span className={`font-semibold ${data.unrealized_pl_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.unrealized_pl_usd >= 0 ? '+' : ''}{formatCurrency(data.unrealized_pl_usd, 'USD')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 로딩 중일 때는 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">데이터 로딩 중...</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {analysisLoading && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>포트폴리오 분석 데이터 조회 중</span>
                </div>
              )}
              {dividendLoading && !cachedDividendData && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>배당금 데이터 조회 중</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">데이터가 없습니다.</p>
      </div>
    );
  }

  // 종목별 투자규모 데이터 (상위 10개)
  const topPositionsByValue = analysis.positions_with_info
    .filter(pos => pos.market_value_usd && pos.market_value_usd > 0)
    .sort((a, b) => (b.market_value_usd || 0) - (a.market_value_usd || 0))
    .slice(0, 10)
    .map(pos => ({
      ticker: pos.ticker,
      value: pos.market_value_usd || 0,
      percentage: pos.weight || 0
    }));

  // 종목별 배당규모 데이터 (상위 10개, 당해 연도 기준)
  // 캐시된 데이터 또는 API 응답 데이터 사용
  const topPositionsByDividend = finalDividendData
    ?.filter(div => div.total_amount_usd > 0)
    .sort((a, b) => b.total_amount_usd - a.total_amount_usd)
    .slice(0, 10)
    .map(div => ({
      ticker: div.ticker,
      dividend: div.total_amount_usd
    })) || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">포트폴리오 분석</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 포지션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.total_positions}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 평가금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analysis.total_market_value_usd, 'USD')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 손익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analysis.total_unrealized_pl_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.total_unrealized_pl_usd >= 0 ? '+' : ''}{formatCurrency(analysis.total_unrealized_pl_usd, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(analysis.total_unrealized_pl_percent)}
            </p>
          </CardContent>
        </Card>

      </div>




      {/* 종목별 투자규모 분포 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            종목별 투자규모 분포 (상위 10개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPositionsByValue}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="ticker"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                  <YAxis tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`} fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, 'USD'), '투자금액']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 종목별 배당규모 분포 */}
      {topPositionsByDividend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              종목별 배당규모 분포 (상위 10개, {new Date().getFullYear()}년)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPositionsByDividend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis
                    dataKey="ticker"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`} fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value, 'USD'), '배당금']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="dividend" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 포지션 상세 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            포지션별 상세
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">종목</th>
                  <th className="text-right p-2">비중</th>
                  <th className="text-right p-2">평가금액</th>
                  <th className="text-right p-2">손익</th>
                  <th className="text-right p-2">수익률</th>
                </tr>
              </thead>
              <tbody>
                {analysis.positions_with_info
                  .sort((a, b) => (b.weight || 0) - (a.weight || 0))
                  .map((position) => (
                    <tr key={position.ticker} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="p-2">
                        <div className="font-semibold">{position.ticker}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {position.longName}
                        </div>
                      </td>
                      <td className="text-right p-2 font-semibold">
                        {formatPercent(position.weight || 0)}
                      </td>
                      <td className="text-right p-2">
                        {formatCurrency(position.market_value_usd || 0, 'USD')}
                      </td>
                      <td className={`text-right p-2 font-semibold ${(position.unrealized_pl_usd || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(position.unrealized_pl_usd || 0) >= 0 ? '+' : ''}{formatCurrency(position.unrealized_pl_usd || 0, 'USD')}
                      </td>
                      <td className={`text-right p-2 ${(position.unrealized_pl_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(position.unrealized_pl_percent || 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


