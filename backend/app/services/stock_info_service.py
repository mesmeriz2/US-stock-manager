"""
주식 정보 조회 서비스 (yfinance)
섹터, 산업, 기업 정보 등을 조회합니다.
"""
import logging
from typing import Optional, Dict
import yfinance as yf
from datetime import datetime, timedelta
from ..core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)

class StockInfoService:
    """주식 정보 조회 서비스"""
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = timedelta(hours=24)  # 24시간 캐시
    
    def get_stock_info(self, ticker: str) -> Optional[Dict]:
        """
        종목의 기본 정보 조회 (섹터, 산업, 국가 등)
        
        Args:
            ticker: 종목 심볼
            
        Returns:
            {
                'sector': str,
                'industry': str,
                'country': str,
                'website': str,
                'longName': str,
                'marketCap': float,
                'employees': int,
                'cached_at': datetime
            }
        """
        # 캐시 확인
        if ticker in self._cache:
            cached_data = self._cache[ticker]
            cache_age = datetime.now() - cached_data.get('cached_at', datetime.min)
            if cache_age < self._cache_ttl:
                logger.info(f"[STOCK_INFO] {ticker}: 캐시에서 조회 (나이: {cache_age.seconds // 60}분)")
                return cached_data
        
        try:
            logger.info(f"[STOCK_INFO] {ticker}: yfinance로 정보 조회 시작")
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # 기본 정보 추출
            stock_data = {
                'ticker': ticker,
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown'),
                'country': info.get('country', 'Unknown'),
                'website': info.get('website', ''),
                'longName': info.get('longName', ticker),
                'shortName': info.get('shortName', ticker),
                'marketCap': info.get('marketCap', 0),
                'employees': info.get('fullTimeEmployees', 0),
                'businessSummary': info.get('longBusinessSummary', ''),
                'cached_at': datetime.now()
            }
            
            # 캐시 저장
            self._cache[ticker] = stock_data
            
            logger.info(f"[STOCK_INFO] {ticker}: 조회 완료 - {stock_data['sector']} / {stock_data['industry']}")
            return stock_data
            
        except Exception as e:
            logger.error(f"[STOCK_INFO] {ticker} 정보 조회 실패: {e}")
            # 에러 시 기본값 반환
            return {
                'ticker': ticker,
                'sector': 'Unknown',
                'industry': 'Unknown',
                'country': 'Unknown',
                'website': '',
                'longName': ticker,
                'shortName': ticker,
                'marketCap': 0,
                'employees': 0,
                'businessSummary': '',
                'cached_at': datetime.now()
            }
    
    def get_sector_industry(self, ticker: str) -> Dict[str, str]:
        """
        종목의 섹터와 산업만 빠르게 조회
        
        Args:
            ticker: 종목 심볼
            
        Returns:
            {'sector': str, 'industry': str}
        """
        info = self.get_stock_info(ticker)
        return {
            'sector': info['sector'],
            'industry': info['industry']
        }
    
    def clear_cache(self, ticker: Optional[str] = None):
        """캐시 삭제"""
        if ticker:
            self._cache.pop(ticker, None)
            logger.info(f"[STOCK_INFO] {ticker} 캐시 삭제")
        else:
            self._cache.clear()
            logger.info("[STOCK_INFO] 전체 캐시 삭제")


# 싱글톤 인스턴스
stock_info_service = StockInfoService()














