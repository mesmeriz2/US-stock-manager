import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { simulationApi } from '@/services/api';
import { Position } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Calculator, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface SellSimulationModalProps {
  position: Position | null;
  isOpen: boolean;
  onClose: () => void;
  selectedAccountId: number | null;
}

interface SimulationResult {
  ticker: string;
  simulation_type: string;
  shares_to_sell: number;
  sell_price_usd: number;
  current_position: {
    shares: number;
    avg_cost_usd: number;
    market_value_usd: number;
    unrealized_pl_usd: number;
  };
  expected_realized_pl: {
    gross_pl_usd: number;
    gross_pl_krw: number;
    tax_usd: number;
    tax_krw: number;
    net_pl_usd: number;
    net_pl_krw: number;
  };
  remaining_position: {
    shares: number;
    avg_cost_usd: number;
    market_value_usd: number;
    unrealized_pl_usd: number;
    unrealized_pl_percent: number;
  };
  matched_lots: Array<{
    buy_date: string;
    buy_price: number;
    buy_trade_id: number;
    shares: number;
    cost_basis: number;
    proceeds: number;
    pl: number;
  }>;
  tax_note: string;
}

export default function SellSimulationModal({
  position,
  isOpen,
  onClose,
  selectedAccountId,
}: SellSimulationModalProps) {
  const [sharesToSell, setSharesToSell] = useState<string>('');
  const { toast } = useToast();
  
  // 정수로 포맷팅하는 헬퍼 함수
  const formatInteger = (value: number) => Math.round(value).toLocaleString();

  const simulationMutation = useMutation({
    mutationFn: (params: { ticker: string; shares_to_sell: number; account_id?: number }) =>
      simulationApi.simulateSell(params).then((res) => res.data),
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '시뮬레이션 실패',
        description: error.response?.data?.detail || '시뮬레이션 중 오류가 발생했습니다.',
      });
    },
  });

  const handleSimulate = () => {
    if (!position) return;

    const shares = parseFloat(sharesToSell);
    if (isNaN(shares) || shares <= 0) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '올바른 수량을 입력해주세요.',
      });
      return;
    }

    if (shares > position.shares) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: `보유 수량(${position.shares})보다 많이 매도할 수 없습니다.`,
      });
      return;
    }

    // 전체 계정 선택 시 account_id를 undefined로 전달하여 모든 계정의 합산으로 시뮬레이션
    simulationMutation.mutate({
      ticker: position.ticker,
      shares_to_sell: shares,
      account_id: selectedAccountId || undefined,
    });
  };

  const handleClose = () => {
    setSharesToSell('');
    simulationMutation.reset();
    onClose();
  };

  const result = simulationMutation.data as SimulationResult | undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              매도 시뮬레이션
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {position?.ticker} - 예상 손익과 세금을 확인하세요
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 입력 섹션 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">보유 수량</Label>
                  <p className="text-lg font-semibold">
                    {formatInteger(position?.shares || 0)} 주
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">현재가</Label>
                  <p className="text-lg font-semibold">
                    ${formatInteger(position?.market_price_usd || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="shares">매도 수량</Label>
                <div className="flex gap-2">
                  <Input
                    id="shares"
                    type="number"
                    placeholder="매도할 수량 입력"
                    value={sharesToSell}
                    onChange={(e) => setSharesToSell(e.target.value)}
                    min="0"
                    max={position?.shares || 0}
                    step="0.01"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setSharesToSell(position?.shares.toString() || '0')}
                  >
                    전량
                  </Button>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleSimulate}
                disabled={simulationMutation.isPending || !sharesToSell}
              >
                {simulationMutation.isPending ? '계산 중...' : '시뮬레이션 실행'}
              </Button>
            </CardContent>
          </Card>

          {/* 결과 섹션 */}
          {result && (
            <div className="space-y-4">
              {/* 실현 손익 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    {result.expected_realized_pl.net_pl_usd >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    예상 실현 손익
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">총 손익 (세전)</Label>
                      <p
                        className={`text-lg font-semibold ${
                          result.expected_realized_pl.gross_pl_usd >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        ${formatInteger(result.expected_realized_pl.gross_pl_usd)}
                        <span className="text-sm ml-1">
                          (₩{formatInteger(result.expected_realized_pl.gross_pl_krw)})
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">예상 세금</Label>
                      <p className="text-lg font-semibold text-orange-600">
                        ${formatInteger(result.expected_realized_pl.tax_usd)}
                        <span className="text-sm ml-1">
                          (₩{formatInteger(result.expected_realized_pl.tax_krw)})
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">순 손익 (세후)</Label>
                      <p
                        className={`text-lg font-semibold ${
                          result.expected_realized_pl.net_pl_usd >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        ${formatInteger(result.expected_realized_pl.net_pl_usd)}
                        <span className="text-sm ml-1">
                          (₩{formatInteger(result.expected_realized_pl.net_pl_krw)})
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 남은 포지션 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">매도 후 남은 포지션</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">남은 수량</Label>
                      <p className="text-lg font-semibold">
                        {formatInteger(result.remaining_position.shares)} 주
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">평단가</Label>
                      <p className="text-lg font-semibold">
                        ${formatInteger(result.remaining_position.avg_cost_usd)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">평가금액</Label>
                      <p className="text-lg font-semibold">
                        ${formatInteger(result.remaining_position.market_value_usd)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">미실현 손익</Label>
                      <p
                        className={`text-lg font-semibold ${
                          result.remaining_position.unrealized_pl_usd >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        ${formatInteger(result.remaining_position.unrealized_pl_usd)} (
                        {formatPercent(result.remaining_position.unrealized_pl_percent)})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FIFO 매칭 상세 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">FIFO 매칭 상세</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.matched_lots.map((lot, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted rounded-md text-sm grid grid-cols-3 gap-2"
                      >
                        <div>
                          <span className="text-muted-foreground">매수일:</span>{' '}
                          {lot.buy_date}
                        </div>
                        <div>
                          <span className="text-muted-foreground">수량:</span>{' '}
                          {formatInteger(lot.shares)}주
                        </div>
                        <div>
                          <span className="text-muted-foreground">매수가:</span> $
                          {formatInteger(lot.buy_price)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">원가:</span> $
                          {formatInteger(lot.cost_basis)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">판매액:</span> $
                          {formatInteger(lot.proceeds)}
                        </div>
                        <div
                          className={`font-semibold ${
                            lot.pl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          <span className="text-muted-foreground">손익:</span> $
                          {formatInteger(lot.pl)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 세금 안내 */}
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">세금 계산 안내</p>
                      <p className="text-sm text-orange-800 mt-1">{result.tax_note}</p>
                      <p className="text-xs text-orange-700 mt-2">
                        * 이 계산은 간이 계산이며, 실제 세금은 다를 수 있습니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

