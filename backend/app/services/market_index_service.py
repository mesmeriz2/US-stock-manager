"""
시장 지수 조회 서비스 (yfinance)
NASDAQ 100 (장 중) / NQ=F 선물 (장 외) 데이터 조회
"""
import logging
import time
from datetime import datetime
from typing import Optional, Dict
import pytz
import yfinance as yf

logger = logging.getLogger(__name__)

ET_TZ = pytz.timezone('America/New_York')
CACHE_DURATION = 180  # 3분 캐시


class MarketIndexService:
    """NASDAQ 지수/선물 조회 서비스"""

    def __init__(self):
        self._cache: Optional[Dict] = None
        self._cache_ts: float = 0.0

    def _get_market_state(self) -> str:
        """현재 ET 기준 장 상태 반환 ('open' | 'pre_market' | 'post_market' | 'closed')"""
        now_et = datetime.now(ET_TZ)
        weekday = now_et.weekday()  # 0=월 … 4=금, 5=토, 6=일

        if weekday >= 5:
            return 'closed'

        market_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
        pre_market_start = now_et.replace(hour=4, minute=0, second=0, microsecond=0)
        post_market_end = now_et.replace(hour=20, minute=0, second=0, microsecond=0)

        if market_open <= now_et < market_close:
            return 'open'
        elif pre_market_start <= now_et < market_open:
            return 'pre_market'
        elif market_close <= now_et < post_market_end:
            return 'post_market'
        else:
            return 'closed'

    def get_nasdaq_data(self) -> Optional[Dict]:
        """
        NASDAQ 지수 또는 선물 데이터 반환.
        장 중(open): ^NDX 사용, 그 외: NQ=F 사용.
        3분 캐시 적용.
        실패 시 None 반환.
        """
        now = time.time()
        if self._cache and (now - self._cache_ts) < CACHE_DURATION:
            cached = dict(self._cache)
            cached['cached'] = True
            return cached

        market_state = self._get_market_state()
        is_futures = market_state != 'open'
        symbol = 'NQ=F' if is_futures else '^NDX'

        try:
            ticker = yf.Ticker(symbol)
            fi = ticker.fast_info

            price = fi.last_price
            if price is None:
                logger.warning(f"[MARKET_INDEX] {symbol}: 현재가 없음")
                return None
            price = float(price)

            # previous_close: 일별 히스토리 마지막 2개 봉으로 전일 정산가 계산
            # fast_info.previous_close는 선물의 경우 공식 정산가와 다를 수 있음
            hist = ticker.history(period='5d', interval='1d')
            if len(hist) >= 2:
                prev_close = float(hist['Close'].iloc[-2])
            elif len(hist) == 1:
                prev_close = float(hist['Close'].iloc[-1])
            else:
                raw_prev = fi.previous_close
                if raw_prev is None:
                    logger.warning(f"[MARKET_INDEX] {symbol}: 전일 종가 없음")
                    return None
                prev_close = float(raw_prev)
            change = price - prev_close
            change_percent = (change / prev_close * 100) if prev_close != 0 else 0.0

            as_of = datetime.now(ET_TZ).strftime('%Y-%m-%d %H:%M:%S ET')

            result = {
                'symbol': symbol,
                'price': price,
                'change': change,
                'change_percent': change_percent,
                'previous_close': prev_close,
                'is_futures': is_futures,
                'market_state': market_state,
                'as_of': as_of,
                'cached': False,
            }

            self._cache = dict(result)
            self._cache_ts = now

            logger.info(
                f"[MARKET_INDEX] {symbol}: ${price:,.2f} ({change:+.2f}, {change_percent:+.2f}%) "
                f"state={market_state}"
            )
            return result

        except Exception as e:
            logger.error(f"[MARKET_INDEX] {symbol} 조회 실패: {e}")
            return None


# 싱글톤 인스턴스
market_index_service = MarketIndexService()
