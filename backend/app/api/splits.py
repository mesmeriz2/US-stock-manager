"""
주식 분할/병합 관련 API 엔드포인트
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from .. import crud, schemas, models
from ..database import get_db
from ..core.exceptions import (
    not_found_exception,
    validation_exception,
    business_logic_exception
)
from ..services.position_engine import PositionEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/splits", tags=["splits"])


@router.get("/preview", response_model=schemas.StockSplitPreview)
@router.get("/preview/", response_model=schemas.StockSplitPreview, include_in_schema=False)
def preview_stock_split(
    ticker: str = Query(..., description="티커 심볼"),
    split_date: date = Query(..., description="분할/병합 실행일"),
    ratio_from: float = Query(..., gt=0, description="분할 전 비율 (예: 1)"),
    ratio_to: float = Query(..., gt=0, description="분할 후 비율 (예: 10)"),
    db: Session = Depends(get_db)
):
    """분할/병합 적용 전 미리보기"""
    try:
        # 입력 검증
        if not ticker or not ticker.strip():
            raise validation_exception("티커는 필수입니다.")
        
        if split_date > date.today():
            raise validation_exception("분할/병합 날짜는 오늘 이후 날짜일 수 없습니다.")
        
        if ratio_from <= 0 or ratio_to <= 0:
            raise validation_exception("비율은 0보다 커야 합니다.")
        
        # 미리보기 조회
        preview = crud.preview_stock_split(
            db=db,
            ticker=ticker,
            split_date=split_date,
            ratio_from=ratio_from,
            ratio_to=ratio_to
        )
        
        return preview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"분할/병합 미리보기 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "미리보기 조회 중 오류가 발생했습니다.",
                "error_code": "PREVIEW_ERROR",
                "detail": str(e)
            }
        )


@router.post("/", response_model=schemas.StockSplitResponse)
def create_stock_split(
    stock_split: schemas.StockSplitCreate,
    apply: bool = Query(False, description="생성과 동시에 적용 여부"),
    db: Session = Depends(get_db)
):
    """분할/병합 이벤트 생성 (선택적으로 적용)"""
    try:
        # 입력 검증
        if not stock_split.ticker or not stock_split.ticker.strip():
            raise validation_exception("티커는 필수입니다.")
        
        if stock_split.split_date > date.today():
            raise validation_exception("분할/병합 날짜는 오늘 이후 날짜일 수 없습니다.")
        
        if stock_split.ratio_from <= 0 or stock_split.ratio_to <= 0:
            raise validation_exception("비율은 0보다 커야 합니다.")
        
        # 중복 확인
        existing = crud.get_stock_split_by_ticker_and_date(
            db=db,
            ticker=stock_split.ticker,
            split_date=stock_split.split_date
        )
        
        if existing:
            raise validation_exception(
                f"이미 {stock_split.split_date}에 {stock_split.ticker}의 분할/병합이 등록되어 있습니다. (ID: {existing.id})"
            )
        
        # 분할/병합 이벤트 생성
        db_split = crud.create_stock_split(db, stock_split)
        
        # apply 옵션이 True이면 즉시 적용
        if apply:
            try:
                result = crud.apply_stock_split(db, db_split.id)
                logger.info(f"분할/병합 생성 및 적용 완료: {db_split.ticker} ({db_split.split_date})")
                
                # 포지션 재계산
                try:
                    crud.clear_realized_pl(db)
                    trades = crud.get_all_trades_for_calculation(db)
                    engine = PositionEngine()
                    engine.process_trades(trades)
                    realized_pl_list = engine.get_all_realized_pl_history()
                    for realized in realized_pl_list:
                        crud.save_realized_pl(db, realized)
                    logger.info(f"포지션 재계산 완료: {len(realized_pl_list)}건의 실현 손익 저장")
                except Exception as recalc_error:
                    logger.error(f"포지션 재계산 중 오류 발생: {recalc_error}", exc_info=True)
                    # 재계산 실패해도 분할/병합 적용은 성공한 것으로 간주
                
            except Exception as apply_error:
                logger.error(f"분할/병합 적용 중 오류 발생: {apply_error}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail={
                        "message": "분할/병합 이벤트는 생성되었지만 적용 중 오류가 발생했습니다.",
                        "error_code": "APPLY_ERROR",
                        "detail": str(apply_error),
                        "split_id": db_split.id
                    }
                )
        
        return db_split
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"분할/병합 생성 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "분할/병합 생성 중 오류가 발생했습니다.",
                "error_code": "CREATE_ERROR",
                "detail": str(e)
            }
        )


@router.get("/", response_model=List[schemas.StockSplitResponse])
def get_stock_splits(
    ticker: Optional[str] = Query(None, description="티커 심볼 (필터링)"),
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 개수"),
    db: Session = Depends(get_db)
):
    """분할/병합 목록 조회"""
    splits = crud.get_stock_splits(db, ticker=ticker, skip=skip, limit=limit)
    return splits


@router.get("/{ticker}", response_model=List[schemas.StockSplitResponse])
def get_stock_splits_by_ticker(
    ticker: str,
    db: Session = Depends(get_db)
):
    """특정 티커의 분할/병합 이벤트 조회"""
    splits = crud.get_stock_splits(db, ticker=ticker, skip=0, limit=1000)
    return splits


@router.post("/{split_id}/apply")
def apply_stock_split(
    split_id: int,
    recalculate_positions: bool = Query(True, description="적용 후 포지션 재계산 여부"),
    db: Session = Depends(get_db)
):
    """분할/병합 적용"""
    try:
        # 분할/병합 적용
        result = crud.apply_stock_split(db, split_id)
        
        # 포지션 재계산
        if recalculate_positions:
            try:
                crud.clear_realized_pl(db)
                trades = crud.get_all_trades_for_calculation(db)
                engine = PositionEngine()
                engine.process_trades(trades)
                realized_pl_list = engine.get_all_realized_pl_history()
                for realized in realized_pl_list:
                    crud.save_realized_pl(db, realized)
                logger.info(f"포지션 재계산 완료: {len(realized_pl_list)}건의 실현 손익 저장")
                result['realized_pl_recalculated'] = True
                result['realized_pl_count'] = len(realized_pl_list)
            except Exception as recalc_error:
                logger.error(f"포지션 재계산 중 오류 발생: {recalc_error}", exc_info=True)
                result['realized_pl_recalculated'] = False
                result['recalc_error'] = str(recalc_error)
        
        return result
        
    except ValueError as e:
        raise validation_exception(str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"분할/병합 적용 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "분할/병합 적용 중 오류가 발생했습니다.",
                "error_code": "APPLY_ERROR",
                "detail": str(e)
            }
        )

