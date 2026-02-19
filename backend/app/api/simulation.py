"""
손익 시뮬레이션 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from .. import crud, schemas
from ..database import get_db
from ..services.position_engine import PositionEngine
from ..services.price_aggregator import price_aggregator

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("/sell/")
def simulate_sell(
    ticker: str = Query(..., description="티커 심볼"),
    shares_to_sell: float = Query(..., gt=0, description="매도할 수량"),
    account_id: Optional[int] = Query(None, description="계정 ID (선택)"),
    db: Session = Depends(get_db)
):
    """
    매도 시뮬레이션 (FIFO 기반)
    
    Args:
        ticker: 티커 심볼
        shares_to_sell: 매도할 수량
        account_id: 계정 ID (선택)
    
    Returns:
        예상 실현 손익, 잔여 포지션 정보, 세금 계산 등
    """
    ticker = ticker.upper()
    
    # 거래 데이터 로드
    trades = crud.get_all_trades_for_calculation(db, account_id)
    
    # 포지션 엔진으로 계산
    engine = PositionEngine()
    engine.process_trades(trades)
    
    # 해당 티커의 포지션 객체 조회
    position_obj = engine.get_position(ticker)
    
    if not position_obj or position_obj.is_closed():
        raise HTTPException(
            status_code=404,
            detail=f"{ticker} 포지션을 찾을 수 없습니다."
        )
    
    current_shares = position_obj.total_shares
    
    if shares_to_sell > current_shares:
        raise HTTPException(
            status_code=400,
            detail=f"보유 수량({current_shares})보다 많은 수량을 매도할 수 없습니다."
        )
    
    # 현재 가격 조회
    position_dict = position_obj.to_dict()
    price_data = price_aggregator.get_prices_for_positions([position_dict])
    current_price = price_data.get(ticker, {}).get('price_usd')
    
    if not current_price:
        raise HTTPException(
            status_code=404,
            detail=f"{ticker}의 현재가를 조회할 수 없습니다."
        )
    
    # FIFO 기반 실현 손익 계산
    # Position 객체의 lots를 직접 사용
    realized_pl = 0.0
    shares_remaining = shares_to_sell
    matched_lots = []
    
    for lot in position_obj.lots:
        if shares_remaining <= 0:
            break
        
        shares_from_lot = min(shares_remaining, lot.remaining_shares)
        cost_basis = shares_from_lot * lot.price_usd
        proceeds = shares_from_lot * current_price
        pl_from_lot = proceeds - cost_basis
        
        matched_lots.append({
            'buy_date': lot.trade_date.isoformat(),
            'buy_price': lot.price_usd,
            'buy_trade_id': lot.trade_id,
            'shares': shares_from_lot,
            'cost_basis': cost_basis,
            'proceeds': proceeds,
            'pl': pl_from_lot,
        })
        
        realized_pl += pl_from_lot
        shares_remaining -= shares_from_lot
    
    # 매도 후 잔여 포지션 계산
    remaining_shares = current_shares - shares_to_sell
    
    if remaining_shares > 0:
        # 새로운 평단가 계산 (FIFO로 매도했으므로 남은 lot들의 평균)
        remaining_cost = 0.0
        shares_accounted = 0.0
        
        for lot in position_obj.lots:
            # 이 lot에서 매도된 수량 계산
            lot_shares_sold = 0.0
            for matched in matched_lots:
                if matched['buy_trade_id'] == lot.trade_id:
                    lot_shares_sold += matched['shares']
            
            remaining_in_lot = lot.remaining_shares - lot_shares_sold
            if remaining_in_lot > 0:
                remaining_cost += remaining_in_lot * lot.price_usd
                shares_accounted += remaining_in_lot
        
        new_avg_cost = remaining_cost / shares_accounted if shares_accounted > 0 else 0.0
        new_market_value = remaining_shares * current_price
        new_unrealized_pl = new_market_value - remaining_cost
        new_unrealized_pl_percent = (new_unrealized_pl / remaining_cost * 100) if remaining_cost > 0 else 0.0
    else:
        new_avg_cost = 0.0
        new_market_value = 0.0
        new_unrealized_pl = 0.0
        new_unrealized_pl_percent = 0.0
    
    # 세금 계산 (미국 주식 양도소득세)
    # 연간 250만원 공제, 초과분에 대해 22% 세금
    tax_free_threshold_krw = 2_500_000  # 250만원
    # 간단히 환율 1,350원으로 계산 (실제로는 거래일 환율 적용)
    fx_rate = 1350.0
    
    realized_pl_krw = realized_pl * fx_rate
    
    if realized_pl_krw > tax_free_threshold_krw:
        taxable_amount_krw = realized_pl_krw - tax_free_threshold_krw
        tax_amount_krw = taxable_amount_krw * 0.22  # 22% 세율
        tax_amount_usd = tax_amount_krw / fx_rate
    else:
        tax_amount_krw = 0.0
        tax_amount_usd = 0.0
    
    net_pl_usd = realized_pl - tax_amount_usd
    net_pl_krw = realized_pl_krw - tax_amount_krw
    
    return {
        "ticker": ticker,
        "simulation_type": "SELL",
        "shares_to_sell": shares_to_sell,
        "sell_price_usd": current_price,
        "current_position": {
            "shares": current_shares,
            "avg_cost_usd": position_obj.get_avg_cost(),
            "market_value_usd": current_shares * current_price,
            "unrealized_pl_usd": position_obj.get_unrealized_pl(current_price)[0] if current_price else None,
        },
        "expected_realized_pl": {
            "gross_pl_usd": realized_pl,
            "gross_pl_krw": realized_pl_krw,
            "tax_usd": tax_amount_usd,
            "tax_krw": tax_amount_krw,
            "net_pl_usd": net_pl_usd,
            "net_pl_krw": net_pl_krw,
        },
        "remaining_position": {
            "shares": remaining_shares,
            "avg_cost_usd": new_avg_cost,
            "market_value_usd": new_market_value,
            "unrealized_pl_usd": new_unrealized_pl,
            "unrealized_pl_percent": new_unrealized_pl_percent,
        },
        "matched_lots": matched_lots,
        "tax_note": f"연간 양도소득 {tax_free_threshold_krw:,}원 공제 후 22% 세율 적용 (간이 계산)",
    }

