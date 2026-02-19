"""
Fear & Greed Index 조회 서비스 (Alternative.me API 사용)
"""
import httpx
from datetime import datetime, date
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)


class FearGreedService:
    """Fear & Greed Index 조회 서비스"""
    
    def __init__(self):
        self.cache: Optional[Dict] = None
        self.cache_duration = 3600  # 3600초 (1시간) 캐시
        self.cache_timestamp: Optional[datetime] = None
        self.client = httpx.AsyncClient(timeout=10.0)
        self.api_url = "https://api.alternative.me/fng/"
    
    async def get_index(self) -> Optional[Dict]:
        """
        Fear & Greed Index 조회
        Returns: {
            "value": int (0-100),
            "classification": str (Extreme Fear, Fear, Neutral, Greed, Extreme Greed),
            "timestamp": int (Unix timestamp),
            "as_of": date,
            "cached": bool
        }
        """
        # 캐시 확인
        if self.cache and self.cache_timestamp:
            cache_age = (datetime.now() - self.cache_timestamp).seconds
            if cache_age < self.cache_duration:
                logger.debug(f"[FEAR_GREED] 캐시된 데이터 사용 (age: {cache_age}s)")
                return {
                    **self.cache,
                    "cached": True
                }
        
        # API 호출
        try:
            logger.info("[FEAR_GREED] Alternative.me API 호출 중...")
            response = await self.client.get(self.api_url)
            
            if response.status_code == 200:
                data = response.json()
                
                # API 응답 구조: {"name": "Fear and Greed Index", "data": [{"value": "25", "value_classification": "Extreme Fear", "timestamp": "1234567890", ...}]}
                if 'data' in data and len(data['data']) > 0:
                    latest = data['data'][0]
                    
                    value = int(latest.get('value', 0))
                    classification = latest.get('value_classification', 'Neutral')
                    timestamp = int(latest.get('timestamp', 0))
                    
                    # Unix timestamp를 date로 변환
                    as_of_date = date.today()
                    if timestamp > 0:
                        try:
                            dt = datetime.fromtimestamp(timestamp)
                            as_of_date = dt.date()
                        except Exception as e:
                            logger.warning(f"[FEAR_GREED] 타임스탬프 변환 실패: {e}")
                    
                    result = {
                        "value": value,
                        "classification": classification,
                        "timestamp": timestamp,
                        "as_of": as_of_date,
                        "cached": False
                    }
                    
                    # 캐시 저장
                    self.cache = {
                        "value": value,
                        "classification": classification,
                        "timestamp": timestamp,
                        "as_of": as_of_date
                    }
                    self.cache_timestamp = datetime.now()
                    
                    logger.info(f"[FEAR_GREED] 조회 성공: {value} ({classification})")
                    return result
                else:
                    logger.error("[FEAR_GREED] API 응답에 데이터가 없습니다")
                    return None
            else:
                logger.error(f"[FEAR_GREED] API 호출 실패: HTTP {response.status_code}")
                return None
                
        except httpx.TimeoutException:
            logger.error("[FEAR_GREED] API 호출 타임아웃")
            return None
        except Exception as e:
            logger.error(f"[FEAR_GREED] API 호출 중 오류: {e}")
            return None
    
    def clear_cache(self):
        """캐시 초기화"""
        self.cache = None
        self.cache_timestamp = None
        logger.info("[FEAR_GREED] 캐시 초기화 완료")


# 싱글톤 인스턴스
fear_greed_service = FearGreedService()









