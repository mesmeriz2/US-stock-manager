"""
환율 조회 서비스 (다중 API fallback 지원)
"""
import httpx
from datetime import datetime, date
from typing import Optional, Dict
import os

# API 키 설정
EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY", "")


class FXService:
    """환율 조회 서비스 (다중 API fallback)"""
    
    def __init__(self):
        self.cache: Dict[str, Dict] = {}
        self.cache_duration = 3600  # 3600초 (1시간) 캐시
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def get_rate(self, base: str, quote: str) -> Optional[Dict]:
        """
        환율 조회 (다중 API fallback)
        Args:
            base: 기준 통화 (예: "USD")
            quote: 대상 통화 (예: "KRW")
        Returns: {"base": str, "quote": str, "rate": float, "as_of": date, "cached": bool}
        """
        cache_key = f"{base}{quote}"
        
        # 캐시 확인
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if (datetime.now() - cached_data['timestamp']).seconds < self.cache_duration:
                return {
                    "base": base,
                    "quote": quote,
                    "rate": cached_data['rate'],
                    "as_of": cached_data['as_of'],
                    "cached": True
                }
        
        # 1. ExchangeRate-API 시도 (무료, 신뢰성 높음)
        rate = await self._fetch_from_exchangerate_api(base, quote)
        if rate:
            return self._cache_and_return(cache_key, base, quote, rate)
        
        # 2. Frankfurter API 시도 (무료, EU 중앙은행 데이터)
        rate = await self._fetch_from_frankfurter(base, quote)
        if rate:
            return self._cache_and_return(cache_key, base, quote, rate)
        
        # 3. 한국수출입은행 API 시도 (한국 공식 환율)
        if quote == "KRW" or base == "KRW":
            rate = await self._fetch_from_koreaexim(base, quote)
            if rate:
                return self._cache_and_return(cache_key, base, quote, rate)
        
        # 모든 API 실패 시 기본값 반환
        print(f"All FX APIs failed for {base}/{quote}, using default rate")
        default_rate = 1350.0 if (base == "USD" and quote == "KRW") else 1.0
        return self._cache_and_return(cache_key, base, quote, default_rate)
    
    async def _fetch_from_exchangerate_api(self, base: str, quote: str) -> Optional[float]:
        """ExchangeRate-API에서 환율 조회"""
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{base}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                if 'rates' in data and quote in data['rates']:
                    rate = float(data['rates'][quote])
                    print(f"FX rate fetched from ExchangeRate-API: {base}/{quote} = {rate:.2f}")
                    return rate
        except Exception as e:
            print(f"ExchangeRate-API error: {e}")
        return None
    
    async def _fetch_from_frankfurter(self, base: str, quote: str) -> Optional[float]:
        """Frankfurter API에서 환율 조회 (EU 중앙은행 데이터)"""
        try:
            # Frankfurter는 EUR 기준이므로 변환 필요
            url = f"https://api.frankfurter.app/latest?from={base}&to={quote}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                if 'rates' in data and quote in data['rates']:
                    rate = float(data['rates'][quote])
                    print(f"FX rate fetched from Frankfurter: {base}/{quote} = {rate:.2f}")
                    return rate
        except Exception as e:
            print(f"Frankfurter API error: {e}")
        return None
    
    async def _fetch_from_koreaexim(self, base: str, quote: str) -> Optional[float]:
        """한국수출입은행 API에서 환율 조회"""
        try:
            # 한국수출입은행 API는 KRW 기준
            if base == "USD" and quote == "KRW":
                # 오늘 날짜
                today = datetime.now().strftime("%Y%m%d")
                url = f"https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=YOUR_KEY&searchdate={today}&data=AP01"
                
                # API 키가 없으면 스킵
                # 참고: 한국수출입은행 API는 별도 신청 필요
                # https://www.koreaexim.go.kr/ir/HPHKIR020M01
                return None
        except Exception as e:
            print(f"Korea Eximbank API error: {e}")
        return None
    
    def _cache_and_return(self, cache_key: str, base: str, quote: str, rate: float) -> Dict:
        """환율을 캐시하고 결과 반환"""
        result = {
            "base": base,
            "quote": quote,
            "rate": rate,
            "as_of": date.today(),
            "cached": False
        }
        
        self.cache[cache_key] = {
            "rate": rate,
            "as_of": date.today(),
            "timestamp": datetime.now()
        }
        
        return result
    
    def clear_cache(self, cache_key: Optional[str] = None):
        """캐시 초기화"""
        if cache_key:
            self.cache.pop(cache_key, None)
        else:
            self.cache.clear()


# 싱글톤 인스턴스
fx_service = FXService()