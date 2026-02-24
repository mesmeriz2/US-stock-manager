"""
시장 지수 API 라우터
GET /api/market/indices/ — NASDAQ 100 또는 NQ=F 선물 데이터 반환
"""
from fastapi import APIRouter, HTTPException
from ..schemas import NasdaqIndexData
from ..services.market_index_service import market_index_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/indices/", response_model=NasdaqIndexData)
def get_nasdaq_index():
    """NASDAQ 지수(장 중) 또는 NQ=F 선물(장 외) 현재가 조회"""
    data = market_index_service.get_nasdaq_data()
    if data is None:
        raise HTTPException(status_code=503, detail="NASDAQ 데이터를 가져올 수 없습니다.")
    return data
