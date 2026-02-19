"""
포지션 엔진 테스트
"""
import pytest
from datetime import date
from ..services.position_engine import PositionEngine, Position


def test_simple_buy():
    """단순 매수 테스트"""
    position = Position("AAPL")
    position.add_buy(10, 100.0, date(2024, 1, 10), 1, 0)
    
    assert position.total_shares == 10
    assert position.get_avg_cost() == 100.0
    assert position.total_cost == 1000.0
    assert not position.is_closed()


def test_multiple_buys():
    """복수 매수 테스트"""
    position = Position("AAPL")
    position.add_buy(10, 100.0, date(2024, 1, 10), 1, 0)
    position.add_buy(5, 120.0, date(2024, 2, 2), 2, 0)
    
    assert position.total_shares == 15
    assert position.get_avg_cost() == pytest.approx(106.67, rel=0.01)
    assert position.total_cost == 1600.0


def test_fifo_sell():
    """FIFO 매도 테스트"""
    position = Position("AAPL")
    position.add_buy(10, 100.0, date(2024, 1, 10), 1, 0)
    position.add_buy(5, 120.0, date(2024, 2, 2), 2, 0)
    
    # 8주 매도 (첫 번째 로트 10주 중 8주)
    realized = position.process_sell(8, 130.0, date(2024, 3, 15), 3, 1.6)
    
    assert position.total_shares == 7  # 15 - 8
    assert realized['pl_usd'] == pytest.approx(238.4, rel=0.01)  # (130-100)*8 - 1.6
    assert position.realized_pl == pytest.approx(238.4, rel=0.01)


def test_full_sell():
    """전량 매도 테스트"""
    position = Position("MSFT")
    position.add_buy(3, 300.0, date(2024, 4, 1), 4, 0)
    
    # 전량 매도
    realized = position.process_sell(3, 350.0, date(2024, 6, 1), 5, 0)
    
    assert position.total_shares == 0
    assert position.is_closed()
    assert realized['pl_usd'] == 150.0  # (350-300)*3


def test_position_engine():
    """포지션 엔진 통합 테스트"""
    trades = [
        {"id": 1, "ticker": "AAPL", "side": "BUY", "shares": 10, "price_usd": 100, "fee_usd": 0, "trade_date": date(2024, 1, 10)},
        {"id": 2, "ticker": "AAPL", "side": "BUY", "shares": 5, "price_usd": 120, "fee_usd": 0, "trade_date": date(2024, 2, 2)},
        {"id": 3, "ticker": "AAPL", "side": "SELL", "shares": 8, "price_usd": 130, "fee_usd": 1.6, "trade_date": date(2024, 3, 15)},
        {"id": 4, "ticker": "MSFT", "side": "BUY", "shares": 3, "price_usd": 300, "fee_usd": 0, "trade_date": date(2024, 4, 1)},
        {"id": 5, "ticker": "MSFT", "side": "SELL", "shares": 3, "price_usd": 350, "fee_usd": 0, "trade_date": date(2024, 6, 1)},
    ]
    
    engine = PositionEngine()
    engine.process_trades(trades)
    
    # AAPL 포지션 확인
    aapl = engine.get_position("AAPL")
    assert aapl is not None
    assert aapl.total_shares == 7
    assert aapl.realized_pl == pytest.approx(238.4, rel=0.01)
    
    # MSFT 포지션 확인
    msft = engine.get_position("MSFT")
    assert msft is not None
    assert msft.total_shares == 0
    assert msft.is_closed()
    assert msft.realized_pl == 150.0
    
    # 총 실현 손익
    total_realized = engine.get_total_realized_pl()
    assert total_realized == pytest.approx(388.4, rel=0.01)


def test_unrealized_pl():
    """미실현 손익 테스트"""
    position = Position("AAPL")
    position.add_buy(10, 100.0, date(2024, 1, 10), 1, 0)
    
    # 현재가 120일 때
    unrealized_pl, unrealized_percent = position.get_unrealized_pl(120.0)
    assert unrealized_pl == 200.0  # (120-100)*10
    assert unrealized_percent == 20.0  # 20%
    
    # 현재가 90일 때
    unrealized_pl, unrealized_percent = position.get_unrealized_pl(90.0)
    assert unrealized_pl == -100.0  # (90-100)*10
    assert unrealized_percent == -10.0  # -10%


def test_sell_exceeds_shares():
    """매도 수량 초과 오류 테스트"""
    position = Position("AAPL")
    position.add_buy(10, 100.0, date(2024, 1, 10), 1, 0)
    
    with pytest.raises(ValueError):
        position.process_sell(15, 130.0, date(2024, 3, 15), 3, 0)







