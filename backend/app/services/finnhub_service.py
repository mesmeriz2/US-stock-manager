"""
Finnhub API 서비스
기업의 기본 재무 정보 조회를 제공합니다.
"""
import os
import finnhub
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import json
import httpx

class FinnhubService:
    """Finnhub API를 사용한 재무 데이터 조회 서비스"""
    
    def __init__(self):
        # 환경 변수에서 API 키 로드 (없으면 기본값 사용)
        api_key = os.getenv("FINNHUB_API_KEY", "")
        
        if not api_key:
            print("[WARNING] FINNHUB_API_KEY가 설정되지 않았습니다. Finnhub 기능이 제한됩니다.")
            self.client = None
        else:
            self.client = finnhub.Client(api_key=api_key)
        
        # 간단한 메모리 캐시 (1일)
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_duration = timedelta(days=1)
    
    def get_company_basic_financials(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        기업의 기본 재무 정보 조회
        
        Args:
            ticker: 티커 심볼
        
        Returns:
            재무 데이터 딕셔너리 또는 None
        """
        if not self.client:
            return None
        
        ticker = ticker.upper()
        
        # 캐시 확인
        if ticker in self.cache:
            cached_data = self.cache[ticker]
            if datetime.now() - cached_data['timestamp'] < self.cache_duration:
                return cached_data['data']
        
        try:
            # Finnhub API 호출
            result = self.client.company_basic_financials(ticker, 'all')
            
            if not result or 'metric' not in result:
                return None
            
            # 유용한 지표만 추출
            metrics = result.get('metric', {})
            
            # 주요 재무 지표 선택
            financial_data = {
                # 주가 관련 지표
                "52WeekHigh": metrics.get("52WeekHigh"),
                "52WeekLow": metrics.get("52WeekLow"),
                "52WeekPriceReturnDaily": metrics.get("52WeekPriceReturnDaily"),
                
                # 밸류에이션 지표
                "peRatio": metrics.get("peNormalizedAnnual"),  # P/E Ratio
                "pbRatio": metrics.get("pbAnnual"),  # P/B Ratio
                "psRatio": metrics.get("psAnnual"),  # P/S Ratio
                "pcfRatio": metrics.get("pcfShareTTM"),  # Price to Cash Flow
                
                # 배당 관련
                "dividendYieldIndicatedAnnual": metrics.get("dividendYieldIndicatedAnnual"),
                "dividendPerShareAnnual": metrics.get("dividendPerShareAnnual"),
                
                # 수익성 지표
                "epsBasicExclExtraItemsTTM": metrics.get("epsBasicExclExtraItemsTTM"),  # EPS
                "netProfitMarginTTM": metrics.get("netProfitMarginTTM"),  # 순이익률
                "roeTTM": metrics.get("roeTTM"),  # ROE (자기자본이익률)
                "roaTTM": metrics.get("roaTTM"),  # ROA (총자산이익률)
                "roicTTM": metrics.get("roicTTM"),  # ROIC (투하자본수익률)
                
                # 성장률
                "revenueGrowthTTMYoy": metrics.get("revenueGrowthTTMYoy"),  # 매출 성장률
                "epsGrowthTTMYoy": metrics.get("epsGrowthTTMYoy"),  # EPS 성장률
                
                # 재무 건전성
                "currentRatioQuarterly": metrics.get("currentRatioQuarterly"),  # 유동비율
                "debtEquityRatioQuarterly": metrics.get("totalDebt/totalEquityQuarterly"),  # 부채비율
                "quickRatioQuarterly": metrics.get("quickRatioQuarterly"),  # 당좌비율
                
                # 시가총액
                "marketCapitalization": metrics.get("marketCapitalization"),
                
                # 베타 (변동성)
                "beta": metrics.get("beta"),
                
                # 애널리스트 평가
                "analystPriceMean": metrics.get("analystPriceMean"),  # 목표 주가 평균
                "analystPriceHigh": metrics.get("analystPriceHigh"),  # 목표 주가 최고
                "analystPriceLow": metrics.get("analystPriceLow"),  # 목표 주가 최저
            }
            
            # None이 아닌 값만 포함
            financial_data = {k: v for k, v in financial_data.items() if v is not None}
            
            # 캐시 저장
            self.cache[ticker] = {
                'data': financial_data,
                'timestamp': datetime.now()
            }
            
            return financial_data
        
        except Exception as e:
            print(f"[ERROR] Finnhub API 호출 실패 ({ticker}): {e}")
            return None
    
    def get_formatted_financials(self, ticker: str) -> Dict[str, Any]:
        """
        포맷팅된 재무 데이터 반환 (UI 표시용)
        
        Returns:
            {
                'summary': {...},  # 주요 지표 (테이블 컬럼용)
                'details': {...}   # 상세 지표 (툴팁용)
            }
        """
        data = self.get_company_basic_financials(ticker)
        
        if not data:
            return {
                'summary': {},
                'details': {}
            }
        
        # 주요 지표 (테이블 컬럼으로 표시할 항목)
        summary = {
            "peRatio": data.get("peRatio"),
            "dividendYield": data.get("dividendYieldIndicatedAnnual"),
            "marketCap": data.get("marketCapitalization"),
            "52WeekHigh": data.get("52WeekHigh"),
            "52WeekLow": data.get("52WeekLow"),
        }
        
        # 상세 지표 (툴팁으로 표시할 항목)
        details = {
            "밸류에이션": {
                "P/E Ratio": data.get("peRatio"),
                "P/B Ratio": data.get("pbRatio"),
                "P/S Ratio": data.get("psRatio"),
                "P/CF Ratio": data.get("pcfRatio"),
            },
            "수익성": {
                "EPS (TTM)": data.get("epsBasicExclExtraItemsTTM"),
                "순이익률 (TTM)": data.get("netProfitMarginTTM"),
                "ROE (TTM)": data.get("roeTTM"),
                "ROA (TTM)": data.get("roaTTM"),
                "ROIC (TTM)": data.get("roicTTM"),
            },
            "성장률": {
                "매출 성장률 (YoY)": data.get("revenueGrowthTTMYoy"),
                "EPS 성장률 (YoY)": data.get("epsGrowthTTMYoy"),
            },
            "재무 건전성": {
                "유동비율": data.get("currentRatioQuarterly"),
                "부채비율": data.get("debtEquityRatioQuarterly"),
                "당좌비율": data.get("quickRatioQuarterly"),
            },
            "배당": {
                "배당 수익률": data.get("dividendYieldIndicatedAnnual"),
                "주당 배당금": data.get("dividendPerShareAnnual"),
            },
            "애널리스트 평가": {
                "목표 주가 평균": data.get("analystPriceMean"),
                "목표 주가 최고": data.get("analystPriceHigh"),
                "목표 주가 최저": data.get("analystPriceLow"),
            },
            "기타": {
                "시가총액": data.get("marketCapitalization"),
                "베타": data.get("beta"),
                "52주 수익률": data.get("52WeekPriceReturnDaily"),
            }
        }
        
        # None 값 제거
        details = {
            category: {k: v for k, v in metrics.items() if v is not None}
            for category, metrics in details.items()
            if any(v is not None for v in metrics.values())
        }
        
        return {
            'summary': summary,
            'details': details,
            'raw': data
        }
    
    def get_market_status(self) -> Optional[Dict[str, Any]]:
        """
        미국 주식 시장 상태 조회 (Finnhub Market Status 사용)
        참고: https://finnhub.io/docs/api/market-status
        """
        api_key = os.getenv("FINNHUB_API_KEY", "")
        if not api_key:
            print("[WARNING] FINNHUB_API_KEY가 설정되지 않아 시장 상태 조회를 건너뜁니다.")
            return None

        url = "https://finnhub.io/api/v1/stock/market-status"
        params = {"exchange": "US"}
        headers = {"X-Finnhub-Token": api_key}

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json() or {}

            # 키 이름 호환 처리 (isOpen 또는 is_open)
            is_open = data.get("isOpen")
            if is_open is None:
                is_open = data.get("is_open")

            return {
                "is_open": bool(is_open),
                "raw": data,
            }
        except Exception as e:
            print(f"[ERROR] Market status API 호출 실패: {e}")
            # 폴백: 평일 여부
            now = datetime.now()
            is_weekday = now.weekday() < 5
            return {
                "is_open": is_weekday,
                "is_weekday": is_weekday,
                "timestamp": now.isoformat(),
                "fallback": True,
            }


# 싱글톤 인스턴스
finnhub_service = FinnhubService()


