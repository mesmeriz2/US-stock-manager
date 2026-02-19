"""
백그라운드 서비스 관련 API 엔드포인트
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict

from ..database import get_db
from ..services.background_price_service import background_price_service

router = APIRouter(prefix="/api/background", tags=["background"])


@router.get("/price-loading-status/", response_model=Dict)
def get_price_loading_status():
    """백그라운드 가격 로딩 상태 조회"""
    return background_price_service.get_loading_status()


@router.post("/start-price-loading/")
def start_price_loading():
    """백그라운드 가격 로딩 시작"""
    background_price_service.start_background_loading()
    return {"message": "Background price loading started"}


@router.post("/stop-price-loading/")
def stop_price_loading():
    """백그라운드 가격 로딩 중지"""
    background_price_service.stop_background_loading()
    return {"message": "Background price loading stopped"}


@router.post("/force-refresh/")
def force_refresh_prices():
    """가격 정보 강제 새로고침"""
    background_price_service.force_refresh()
    return {"message": "Price refresh started"}


@router.get("/cached-prices/", response_model=Dict)
def get_cached_prices():
    """캐시된 모든 가격 정보 조회"""
    return background_price_service.get_all_cached_prices()

