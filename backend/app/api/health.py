"""
헬스체크 API 엔드포인트
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "us-stock-manager-backend",
        "version": "2.0.0"
    }
