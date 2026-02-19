"""
배당금 조회 서비스 (yfinance 활용)
"""
import logging
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict
import yfinance as yf
from ..core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class DividendService:
    """yfinance를 활용한 배당금 조회 서비스"""
    
    def __init__(self):
        self.cache = {}  # 간단한 캐시 (티커별)
        self.cache_ttl = 3600  # 1시간
    
    def get_dividend_history(
        self,
        ticker: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Dict]:
        """
        yfinance로 배당금 이력 조회
        
        Args:
            ticker: 티커 심볼
            start_date: 시작 날짜 (기본값: 1년 전)
            end_date: 종료 날짜 (기본값: 오늘)
        
        Returns:
            배당금 목록 [{'date': date, 'amount': float}, ...]
        """
        ticker = ticker.upper()
        
        # 기본값 설정
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=365)
        
        try:
            logger.info(f"[DIVIDEND] yfinance로 {ticker} 배당 이력 조회 시작 ({start_date} ~ {end_date})")
            
            # yfinance 티커 객체 생성
            stock = yf.Ticker(ticker)
            
            # 배당금 이력 조회 (타임아웃 설정)
            try:
                dividends = stock.dividends
            except Exception as e:
                logger.error(f"[DIVIDEND] {ticker} yfinance API 호출 실패: {e}")
                raise ExternalServiceError(f"yfinance API 호출 실패: {str(e)}")
            
            if dividends is None:
                logger.warning(f"[DIVIDEND] {ticker}: 배당 데이터가 None입니다 (티커 정보 없을 수 있음)")
                return []
            
            if len(dividends) == 0:
                logger.info(f"[DIVIDEND] {ticker}: 배당 이력 없음")
                return []
            
            # 날짜 범위 필터링 및 변환
            result = []
            for div_date, amount in dividends.items():
                try:
                    # pandas Timestamp를 datetime으로 변환
                    if hasattr(div_date, 'date'):
                        div_date_obj = div_date.date()
                    elif hasattr(div_date, 'to_pydatetime'):
                        div_date_obj = div_date.to_pydatetime().date()
                    else:
                        div_date_obj = datetime.fromisoformat(str(div_date)).date()
                    
                    # 날짜 범위 확인
                    if start_date <= div_date_obj <= end_date:
                        result.append({
                            'date': div_date_obj,
                            'amount': float(amount)
                        })
                except Exception as e:
                    logger.warning(f"[DIVIDEND] {ticker} 배당 데이터 파싱 실패 ({div_date}): {e}")
                    continue
            
            logger.info(f"[DIVIDEND] {ticker}: {len(result)}개 배당 이력 조회 완료")
            return sorted(result, key=lambda x: x['date'], reverse=True)
        
        except ExternalServiceError:
            # 이미 ExternalServiceError면 그대로 전파
            raise
        except Exception as e:
            logger.error(f"[DIVIDEND] {ticker} 배당 이력 조회 실패: {e}", exc_info=True)
            raise ExternalServiceError(f"배당금 정보를 가져올 수 없습니다: {str(e)}")
    
    def get_dividend_yield(self, ticker: str) -> Optional[float]:
        """
        현재 배당 수익률 조회
        
        Args:
            ticker: 티커 심볼
        
        Returns:
            배당 수익률 (퍼센트, 예: 2.5 = 2.5%)
        """
        ticker = ticker.upper()
        
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # 배당 수익률 (이미 퍼센트 단위)
            dividend_yield = info.get('dividendYield')
            
            if dividend_yield is not None:
                # yfinance는 소수로 반환 (0.025 = 2.5%)하므로 100을 곱함
                return float(dividend_yield) * 100
            
            return None
        
        except Exception as e:
            logger.warning(f"[DIVIDEND] {ticker} 배당 수익률 조회 실패: {e}")
            return None
    
    def get_latest_dividend(self, ticker: str) -> Optional[Dict]:
        """
        최근 배당금 정보 조회

        Args:
            ticker: 티커 심볼

        Returns:
            {'date': date, 'amount': float} or None
        """
        try:
            history = self.get_dividend_history(ticker, start_date=date.today() - timedelta(days=365))
            if history:
                return history[0]  # 최신순 정렬이므로 첫 번째
            return None
        except Exception as e:
            logger.warning(f"[DIVIDEND] {ticker} 최근 배당금 조회 실패: {e}")
            return None

    def get_yearly_dividend_total(self, ticker: str, year: Optional[int] = None) -> float:
        """
        특정 연도의 총 배당금 조회

        Args:
            ticker: 티커 심볼
            year: 조회할 연도 (기본값: 현재 연도)

        Returns:
            해당 연도의 총 배당금 합계
        """
        if year is None:
            year = date.today().year

        try:
            # 해당 연도의 시작과 끝 날짜
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)

            history = self.get_dividend_history(ticker, start_date=start_date, end_date=end_date)

            # 배당금 합계 계산
            total = sum(dividend['amount'] for dividend in history)
            logger.info(f"[DIVIDEND] {ticker} {year}년 배당금 총계: ${total:.2f}")
            return total

        except Exception as e:
            logger.warning(f"[DIVIDEND] {ticker} {year}년 배당금 총계 조회 실패: {e}")
            return 0.0


# 전역 서비스 인스턴스
dividend_service = DividendService()

