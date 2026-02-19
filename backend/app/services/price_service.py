"""
주가 조회 서비스 (Finnhub API 사용)
"""
import finnhub
from datetime import datetime, timedelta
from typing import Optional, Dict
import time
import os

# Finnhub API 키 설정 (환경변수에서 가져오기)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

# Finnhub 클라이언트 초기화
finnhub_client = finnhub.Client(api_key=FINNHUB_API_KEY) if FINNHUB_API_KEY else None


class PriceService:
    """주가 조회 서비스"""
    
    def __init__(self):
        self.cache: Dict[str, Dict] = {}
        self.cache_duration = 300  # 300초 (5분) 캐시
        self.validation_cache: Dict[str, Dict] = {}  # 티커 검증 캐시
        self.validation_cache_duration = 3600  # 1시간
        # API Rate limit 관리
        self.last_api_call_time = 0.0
        self.min_call_interval = 1.0  # Finnhub 무료 플랜: 초당 1회 (분당 60회)
    
    def _wait_for_rate_limit(self):
        """
        API rate limit을 준수하기 위해 필요시 대기
        
        Finnhub 무료 플랜은 초당 1회 (분당 60회) 제한이 있으므로,
        마지막 API 호출로부터 최소 1초 간격을 유지합니다.
        """
        current_time = time.time()
        time_since_last_call = current_time - self.last_api_call_time
        
        if time_since_last_call < self.min_call_interval:
            wait_time = self.min_call_interval - time_since_last_call
            time.sleep(wait_time)
        
        self.last_api_call_time = time.time()
    
    def get_price(self, ticker: str) -> Optional[Dict]:
        """
        티커의 현재가 조회 (Finnhub API 사용)
        Returns: {"ticker": str, "price_usd": float, "previous_close": float, "as_of": datetime, "cached": bool}
        """
        if not finnhub_client:
            print("[WARN] FINNHUB_API_KEY가 설정되지 않아 가격 조회를 수행할 수 없습니다.")
            return None

        ticker = ticker.upper()
        
        # 캐시 확인
        if ticker in self.cache:
            cached_data = self.cache[ticker]
            cache_age = (datetime.now() - cached_data['timestamp']).seconds
            
            # 캐시가 유효하고 previous_close가 있는 경우만 사용
            if cache_age < self.cache_duration and cached_data.get('previous_close') is not None:
                return {
                    "ticker": ticker,
                    "price_usd": cached_data['price'],
                    "previous_close": cached_data.get('previous_close'),
                    "as_of": cached_data['as_of'],
                    "cached": True
                }
            elif cache_age < self.cache_duration:
                # 캐시는 유효하지만 previous_close가 없으면 새로 조회 필요
                print(f"[CACHE] {ticker}: 캐시 데이터는 있지만 previous_close가 없음. 새로 조회합니다.")
        
        # Finnhub API로 조회 (rate limit 체크)
        try:
            # Rate limit 준수를 위한 대기
            self._wait_for_rate_limit()
            
            # 현재가 조회 (Quote API에서 현재가와 전일 종가 모두 추출)
            quote = finnhub_client.quote(ticker)
            
            if quote and 'c' in quote and quote['c'] is not None:
                current_price = float(quote['c'])
                previous_close = float(quote['pc']) if quote.get('pc') else None
                
                # 유효한 가격인지 확인
                if current_price > 0:
                    result = {
                        "ticker": ticker,
                        "price_usd": current_price,
                        "previous_close": previous_close,
                        "as_of": datetime.now(),
                        "cached": False
                    }
                    
                    # 캐시 저장
                    self.cache[ticker] = {
                        "price": result['price_usd'],
                        "previous_close": previous_close,
                        "as_of": result['as_of'],
                        "timestamp": datetime.now()
                    }
                    
                    pc_str = f"${previous_close:.2f}" if previous_close else "N/A"
                    print(f"[QUOTE] {ticker}: ${current_price:.2f} (Previous Close: {pc_str})")
                    return result
            
            # 현재가 조회 실패 시 캔들 데이터로 시도
            print(f"[QUOTE] Quote failed for {ticker}, trying candle data...")
            
            # 최근 2일 캔들 데이터 조회 (전일 + 당일)
            end_time = int(datetime.now().timestamp())
            start_time = end_time - 172800  # 2일 전
            
            # 추가 API 호출이므로 rate limit 체크
            self._wait_for_rate_limit()
            
            candle_data = finnhub_client.stock_candles(
                symbol=ticker,
                resolution='D',
                _from=start_time,
                to=end_time
            )
            
            if candle_data and 'c' in candle_data and candle_data['c']:
                latest_price = float(candle_data['c'][-1])
                previous_close_candle = float(candle_data['c'][-2]) if len(candle_data['c']) >= 2 else None
                
                if latest_price > 0:
                    result = {
                        "ticker": ticker,
                        "price_usd": latest_price,
                        "previous_close": previous_close_candle,
                        "as_of": datetime.now(),
                        "cached": False
                    }
                    
                    # 캐시 저장
                    self.cache[ticker] = {
                        "price": result['price_usd'],
                        "previous_close": previous_close_candle,
                        "as_of": result['as_of'],
                        "timestamp": datetime.now()
                    }
                    
                    pc_str = f"${previous_close_candle:.2f}" if previous_close_candle else "N/A"
                    print(f"[CANDLE] {ticker}: ${latest_price:.2f} (Previous: {pc_str})")
                    return result
            
            # 캐시가 있으면 오래된 것이라도 반환
            if ticker in self.cache:
                cached_data = self.cache[ticker]
                print(f"[CACHE] {ticker}: 데이터 조회 실패. 캐시된 이전 데이터 사용")
                return {
                    "ticker": ticker,
                    "price_usd": cached_data['price'],
                    "previous_close": cached_data.get('previous_close'),
                    "as_of": cached_data['as_of'],
                    "cached": True
                }
            
            return None
            
        except Exception as e:
            print(f"[ERROR] {ticker}: {e}")
            
            # 캐시가 있으면 오래된 것이라도 반환
            if ticker in self.cache:
                cached_data = self.cache[ticker]
                print(f"[CACHE] {ticker}: 오류 발생. 캐시된 데이터 사용")
                return {
                    "ticker": ticker,
                    "price_usd": cached_data['price'],
                    "previous_close": cached_data.get('previous_close'),
                    "as_of": cached_data['as_of'],
                    "cached": True
                }
            
            return None
    
    def get_multiple_prices(self, tickers: list) -> Dict[str, Optional[Dict]]:
        """
        여러 티커의 가격을 한번에 조회 (Finnhub API 사용)
        
        Note: get_price()가 내부적으로 _wait_for_rate_limit()을 호출하므로
        여기서는 별도의 sleep이 필요하지 않습니다.
        """
        results = {}
        for ticker in tickers:
            results[ticker] = self.get_price(ticker)
        return results
    
    def validate_ticker(self, ticker: str) -> Dict:
        """
        티커 유효성 검증 (Finnhub API 사용)
        Returns: {"ticker": str, "valid": bool, "name": str, "exchange": str, "message": str}
        """
        if not finnhub_client:
            return {
                "ticker": ticker.upper(),
                "valid": False,
                "name": None,
                "exchange": None,
                "message": "FINNHUB_API_KEY가 설정되지 않아 티커 검증을 수행할 수 없습니다."
            }

        ticker = ticker.upper()
        
        # 검증 캐시 확인
        if ticker in self.validation_cache:
            cached_data = self.validation_cache[ticker]
            if (datetime.now() - cached_data['timestamp']).seconds < self.validation_cache_duration:
                return cached_data['result']
        
        # 간단한 티커 형식 검증 (1-5 알파벳)
        if not ticker or len(ticker) > 5 or not ticker.replace('.', '').isalpha():
            result = {
                "ticker": ticker,
                "valid": False,
                "name": None,
                "exchange": None,
                "message": "올바른 티커 형식이 아닙니다."
            }
            return result
        
        try:
            # Finnhub API로 회사 정보 조회 (rate limit 체크)
            self._wait_for_rate_limit()
            company_profile = finnhub_client.company_profile2(symbol=ticker)
            
            if company_profile and company_profile.get('name'):
                result = {
                    "ticker": ticker,
                    "valid": True,
                    "name": company_profile.get('name', ''),
                    "exchange": company_profile.get('exchange', ''),
                    "message": "유효한 티커입니다."
                }
            else:
                # 회사 정보가 없으면 가격 조회로 검증
                price_data = self.get_price(ticker)
                
                if price_data and price_data.get('price_usd', 0) > 0:
                    result = {
                        "ticker": ticker,
                        "valid": True,
                        "name": "",
                        "exchange": "",
                        "message": "유효한 티커입니다."
                    }
                else:
                    result = {
                        "ticker": ticker,
                        "valid": False,
                        "name": None,
                        "exchange": None,
                        "message": "가격 정보를 찾을 수 없습니다."
                    }
            
            # 검증 결과 캐시 저장
            self.validation_cache[ticker] = {
                "result": result,
                "timestamp": datetime.now()
            }
            
            return result
            
        except Exception as e:
            result = {
                "ticker": ticker,
                "valid": False,
                "name": None,
                "exchange": None,
                "message": f"티커 검증 실패: {str(e)}"
            }
            
            # 실패도 캐시 (반복 호출 방지)
            self.validation_cache[ticker] = {
                "result": result,
                "timestamp": datetime.now()
            }
            
            return result
    
    def clear_cache(self, ticker: Optional[str] = None):
        """캐시 초기화"""
        if ticker:
            ticker_upper = ticker.upper()
            self.cache.pop(ticker_upper, None)
            self.validation_cache.pop(ticker_upper, None)
        else:
            self.cache.clear()
            self.validation_cache.clear()


# 싱글톤 인스턴스
price_service = PriceService()

