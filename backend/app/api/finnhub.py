"""
Finnhub API 엔드포인트
기업 재무 데이터 조회
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from ..services.finnhub_service import finnhub_service

router = APIRouter(prefix="/api/finnhub", tags=["finnhub"])


@router.get("/financials/{ticker}/")
def get_company_financials(ticker: str) -> Dict[str, Any]:
    """
    기업의 기본 재무 정보 조회
    
    Args:
        ticker: 티커 심볼
    
    Returns:
        {
            'summary': {...},  # 주요 지표
            'details': {...},  # 상세 지표
            'raw': {...}       # 원본 데이터
        }
    """
    result = finnhub_service.get_formatted_financials(ticker)
    
    if not result['raw']:
        raise HTTPException(
            status_code=404, 
            detail=f"티커 {ticker}의 재무 데이터를 조회할 수 없습니다. API 키가 설정되어 있는지 확인하세요."
        )
    
    return result


@router.get("/financials/raw/{ticker}/")
def get_company_financials_raw(ticker: str) -> Dict[str, Any]:
    """
    기업의 원본 재무 정보 조회 (Finnhub API 원본)
    
    Args:
        ticker: 티커 심볼
    
    Returns:
        Finnhub API 원본 데이터
    """
    result = finnhub_service.get_company_basic_financials(ticker)
    
    if not result:
        raise HTTPException(
            status_code=404, 
            detail=f"티커 {ticker}의 재무 데이터를 조회할 수 없습니다."
        )
    
    return result


