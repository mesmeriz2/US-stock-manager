"""
환율 관련 API 엔드포인트
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..services.fx_service import fx_service

router = APIRouter(prefix="/api/fx", tags=["fx"])


@router.get("/usdkrw", response_model=schemas.FXRateResponse, include_in_schema=True)
@router.get("/usdkrw/", response_model=schemas.FXRateResponse, include_in_schema=False)
async def get_usd_krw_rate(db: Session = Depends(get_db)):
    """USD/KRW 환율 조회"""
    rate_data = await fx_service.get_rate("USD", "KRW")
    
    if rate_data:
        # DB 캐시 저장
        crud.get_or_create_fx_cache(db, "USD", "KRW", rate_data['rate'], rate_data['as_of'])
    
    return rate_data


@router.post("/refresh/")
async def refresh_fx_rate(db: Session = Depends(get_db)):
    """환율 강제 갱신"""
    # 캐시 삭제
    fx_service.clear_cache()
    
    # 새로 조회
    rate_data = await fx_service.get_rate("USD", "KRW")
    
    if rate_data:
        # DB 캐시 저장
        crud.get_or_create_fx_cache(db, "USD", "KRW", rate_data['rate'], rate_data['as_of'])
    
    return rate_data




