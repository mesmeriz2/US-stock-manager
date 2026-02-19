"""
백업 및 복원 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
import io
import logging

from .. import schemas
from ..database import get_db
from ..core.exceptions import validation_exception
from ..services.backup_service import create_backup
from ..services.restore_service import restore_backup, create_restore_preview

router = APIRouter(prefix="/api/backup", tags=["backup"])
logger = logging.getLogger(__name__)


@router.post("/create", response_model=schemas.BackupResponse, include_in_schema=True)
@router.post("/create/", response_model=schemas.BackupResponse, include_in_schema=False)
def create_backup_endpoint(
    request: schemas.BackupCreateRequest,
    db: Session = Depends(get_db)
):
    """
    백업 생성
    
    모든 데이터를 JSON 형식으로 백업합니다.
    """
    try:
        backup_response = create_backup(db, request)
        return backup_response
    except Exception as e:
        logger.exception("백업 생성 실패")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "백업 생성 중 오류가 발생했습니다.",
                "error_code": "BACKUP_ERROR"
            }
        )


@router.post("/create/download", include_in_schema=True)
@router.post("/create/download/", include_in_schema=False)
def create_backup_download(
    request: schemas.BackupCreateRequest,
    db: Session = Depends(get_db)
):
    """
    백업 생성 및 다운로드
    
    백업 파일을 JSON 형식으로 다운로드합니다.
    """
    try:
        backup_response = create_backup(db, request)
        
        # JSON 문자열로 변환
        backup_dict = backup_response.model_dump()
        json_str = json.dumps(backup_dict, ensure_ascii=False, indent=2, default=str)
        
        # 파일명 생성
        backup_name = request.backup_name or "backup"
        timestamp = backup_response.metadata.backup_date.strftime("%Y%m%d_%H%M%S")
        filename = f"{backup_name}_{timestamp}.json"
        
        return StreamingResponse(
            io.BytesIO(json_str.encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.exception("백업 다운로드 생성 실패")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "백업 생성 중 오류가 발생했습니다.",
                "error_code": "BACKUP_ERROR"
            }
        )


@router.post("/restore/preview", response_model=schemas.RestorePreview, include_in_schema=True)
@router.post("/restore/preview/", response_model=schemas.RestorePreview, include_in_schema=False)
def restore_preview(
    file: UploadFile = File(...),
    restore_mode: str = "smart_merge",
    account_name_conflict: str = "map",
    duplicate_data: str = "skip",
    db: Session = Depends(get_db)
):
    """
    복원 미리보기
    
    백업 파일을 업로드하여 복원할 데이터를 미리 확인합니다.
    """
    try:
        # 파일 검증
        if not file.filename or not file.filename.lower().endswith('.json'):
            raise validation_exception("JSON 파일만 업로드 가능합니다.")
        
        # 파일 읽기
        content = file.file.read()
        try:
            backup_dict = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise validation_exception(f"잘못된 JSON 형식입니다: {str(e)}")
        
        # 스키마 검증
        try:
            backup_response = schemas.BackupResponse(**backup_dict)
        except Exception as e:
            raise validation_exception(f"백업 파일 형식이 올바르지 않습니다: {str(e)}")
        
        # 복원 요청 생성
        restore_request = schemas.RestoreRequest(
            restore_mode=restore_mode,
            account_name_conflict=account_name_conflict,
            duplicate_data=duplicate_data
        )
        
        # 미리보기 생성
        preview = create_restore_preview(db, backup_response.data, restore_request)
        return preview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("복원 미리보기 생성 실패")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "미리보기 생성 중 오류가 발생했습니다.",
                "error_code": "PREVIEW_ERROR"
            }
        )


@router.post("/restore", response_model=schemas.RestoreResponse, include_in_schema=True)
@router.post("/restore/", response_model=schemas.RestoreResponse, include_in_schema=False)
def restore_backup_endpoint(
    file: UploadFile = File(...),
    restore_mode: str = "smart_merge",
    account_name_conflict: str = "map",
    duplicate_data: str = "skip",
    db: Session = Depends(get_db)
):
    """
    백업 복원
    
    JSON 백업 파일을 업로드하여 데이터를 복원합니다.
    
    - restore_mode: replace (전체 교체), append (추가), smart_merge (스마트 병합, 기본값)
    - account_name_conflict: map (기존 계정 매핑, 기본값), overwrite, create_new
    - duplicate_data: skip (중복 건너뛰기, 기본값), add_all
    """
    try:
        # 파일 검증
        if not file.filename or not file.filename.lower().endswith('.json'):
            raise validation_exception("JSON 파일만 업로드 가능합니다.")
        
        # 파일 읽기
        content = file.file.read()
        try:
            backup_dict = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise validation_exception(f"잘못된 JSON 형식입니다: {str(e)}")
        
        # 스키마 검증
        try:
            backup_response = schemas.BackupResponse(**backup_dict)
        except Exception as e:
            raise validation_exception(f"백업 파일 형식이 올바르지 않습니다: {str(e)}")
        
        # 복원 요청 생성
        restore_request = schemas.RestoreRequest(
            restore_mode=restore_mode,
            account_name_conflict=account_name_conflict,
            duplicate_data=duplicate_data
        )
        
        # 복원 실행
        restore_response = restore_backup(db, backup_response.data, restore_request)
        return restore_response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("백업 복원 실패")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "복원 중 오류가 발생했습니다.",
                "error_code": "RESTORE_ERROR"
            }
        )

