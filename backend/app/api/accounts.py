"""
계정 관리 API
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import crud, schemas

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("/", response_model=schemas.AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account: schemas.AccountCreate,
    db: Session = Depends(get_db)
):
    """계정 생성"""
    # 중복 이름 체크
    existing = crud.get_account_by_name(db, account.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"계정명 '{account.name}'이 이미 존재합니다."
        )
    
    return crud.create_account(db, account)


@router.get("/", response_model=List[schemas.AccountResponse])
def get_accounts(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """계정 목록 조회"""
    return crud.get_accounts(db, is_active=is_active, skip=skip, limit=limit)


@router.get("/{account_id}", response_model=schemas.AccountResponse, include_in_schema=True)
@router.get("/{account_id}/", response_model=schemas.AccountResponse, include_in_schema=False)
def get_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """계정 상세 조회"""
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정 ID {account_id}를 찾을 수 없습니다."
        )
    return account


@router.put("/{account_id}", response_model=schemas.AccountResponse, include_in_schema=True)
@router.put("/{account_id}/", response_model=schemas.AccountResponse, include_in_schema=False)
def update_account(
    account_id: int,
    account_update: schemas.AccountUpdate,
    db: Session = Depends(get_db)
):
    """계정 수정"""
    logger.debug(f"Updating account {account_id}")
    logger.debug(f"Update data: {account_update.model_dump(exclude_unset=True)}")
    
    # 이름 중복 체크
    if account_update.name:
        existing = crud.get_account_by_name(db, account_update.name)
        if existing and existing.id != account_id:
            logger.warning(f"Duplicate name detected: {account_update.name} (existing id: {existing.id})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"계정명 '{account_update.name}'이 이미 존재합니다."
            )
        logger.debug("Name check passed")
    
    try:
        updated = crud.update_account(db, account_id, account_update)
        if not updated:
            logger.warning(f"Account {account_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"계정 ID {account_id}를 찾을 수 없습니다."
            )
        logger.info(f"Account {account_id} updated successfully")
        return updated
    except ValueError as e:
        logger.warning(f"ValueError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=True)
@router.delete("/{account_id}/", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """계정 삭제"""
    try:
        success = crud.delete_account(db, account_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"계정 ID {account_id}를 찾을 수 없습니다."
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

