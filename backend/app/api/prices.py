"""
주가 관련 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, crud
from ..database import get_db
from ..services.price_service import price_service

router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.get("/{ticker}", response_model=schemas.PriceResponse, include_in_schema=True)
@router.get("/{ticker}/", response_model=schemas.PriceResponse, include_in_schema=False)
def get_price(ticker: str, db: Session = Depends(get_db)):
    """티커의 현재가 조회"""
    price_data = price_service.get_price(ticker)
    
    if not price_data:
        raise HTTPException(status_code=404, detail=f"티커 {ticker}의 시세를 조회할 수 없습니다.")
    
    # DB 캐시 저장
    crud.get_or_create_price_cache(db, ticker, price_data['price_usd'], price_data['as_of'])
    
    return price_data


@router.post("/refresh/{ticker}", include_in_schema=True)
@router.post("/refresh/{ticker}/", include_in_schema=False)
def refresh_price(ticker: str, db: Session = Depends(get_db)):
    """특정 티커의 시세 강제 갱신"""
    # 캐시 삭제
    price_service.clear_cache(ticker)
    
    # 새로 조회
    price_data = price_service.get_price(ticker)
    
    if not price_data:
        raise HTTPException(status_code=404, detail=f"티커 {ticker}의 시세를 조회할 수 없습니다.")
    
    # DB 캐시 저장
    crud.get_or_create_price_cache(db, ticker, price_data['price_usd'], price_data['as_of'])
    
    return price_data


@router.post("/refresh-all/")
def refresh_all_prices(db: Session = Depends(get_db)):
    """모든 보유 종목의 시세 갱신"""
    from ..services.position_engine import PositionEngine
    
    # 모든 거래에서 티커 추출
    trades = crud.get_all_trades_for_calculation(db)
    engine = PositionEngine()
    engine.process_trades(trades)
    
    tickers = [ticker for ticker in engine.positions.keys()]
    
    # 캐시 초기화
    price_service.clear_cache()
    
    # 모든 티커 가격 조회
    results = price_service.get_multiple_prices(tickers)
    
    # DB 캐시 저장
    for ticker, price_data in results.items():
        if price_data:
            crud.get_or_create_price_cache(db, ticker, price_data['price_usd'], price_data['as_of'])
    
    success_count = sum(1 for v in results.values() if v is not None)
    
    return {
        "message": f"{success_count}/{len(tickers)} 종목의 시세가 갱신되었습니다.",
        "results": results
    }


@router.get("/validate/{ticker}", response_model=schemas.TickerValidationResponse, include_in_schema=True)
@router.get("/validate/{ticker}/", response_model=schemas.TickerValidationResponse, include_in_schema=False)
def validate_ticker(ticker: str):
    """티커 유효성 검증"""
    return price_service.validate_ticker(ticker)




