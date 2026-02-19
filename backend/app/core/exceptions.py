"""
커스텀 예외 클래스들
"""
from fastapi import HTTPException
from typing import Optional


class StockManagerException(Exception):
    """기본 예외 클래스"""
    def __init__(self, message: str, error_code: Optional[str] = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(StockManagerException):
    """유효성 검증 오류"""
    pass


class NotFoundError(StockManagerException):
    """리소스를 찾을 수 없음"""
    pass


class BusinessLogicError(StockManagerException):
    """비즈니스 로직 오류"""
    pass


class ExternalServiceError(StockManagerException):
    """외부 서비스 오류"""
    pass


def create_http_exception(
    status_code: int,
    detail: str,
    error_code: Optional[str] = None
) -> HTTPException:
    """HTTP 예외 생성 헬퍼"""
    return HTTPException(
        status_code=status_code,
        detail={
            "message": detail,
            "error_code": error_code
        }
    )


# 일반적인 HTTP 예외들
def not_found_exception(resource: str, identifier: str) -> HTTPException:
    """404 예외 생성"""
    return create_http_exception(
        404,
        f"{resource}을(를) 찾을 수 없습니다. (ID: {identifier})",
        "NOT_FOUND"
    )


def validation_exception(message: str, error_code: Optional[str] = None) -> HTTPException:
    """400 예외 생성 - 사용자 친화적인 검증 오류 메시지"""
    if error_code is None:
        error_code = "VALIDATION_ERROR"
    return create_http_exception(
        400,
        message,  # 메시지가 이미 충분히 설명적이므로 접두사 제거
        error_code
    )


def business_logic_exception(message: str, error_code: Optional[str] = None) -> HTTPException:
    """422 예외 생성 - 비즈니스 로직 오류"""
    if error_code is None:
        error_code = "BUSINESS_LOGIC_ERROR"
    return create_http_exception(
        422,
        message,
        error_code
    )


def external_service_exception(service: str, message: str, error_code: Optional[str] = None) -> HTTPException:
    """503 예외 생성 - 외부 서비스 오류"""
    if error_code is None:
        error_code = "EXTERNAL_SERVICE_ERROR"
    return create_http_exception(
        503,
        f"{service} 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요. ({message})",
        error_code
    )










