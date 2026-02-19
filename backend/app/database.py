from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stock_manager.db")

# SQLite와 다른 DB에 따른 설정 분기
if "sqlite" in DATABASE_URL:
    # SQLite 설정
    connect_args = {
        "check_same_thread": False,
        "timeout": 30,
    }
    # SQLite는 NullPool 사용 (각 요청마다 연결 생성/해제)
    # WAL 모드에서도 동시성 문제를 피하기 위해 권장됨
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        poolclass=NullPool,
        echo=False,
    )
else:
    # PostgreSQL 등 다른 DB 설정
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 스타일 Base 클래스"""
    pass


def get_db():
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """데이터베이스 초기화"""
    from sqlalchemy import event, text
    
    Base.metadata.create_all(bind=engine)
    
    # SQLite 최적화 설정 적용
    if "sqlite" in DATABASE_URL:
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            # WAL 모드 활성화 (동시성 개선)
            cursor.execute("PRAGMA journal_mode=WAL")
            # 동기화 모드 최적화
            cursor.execute("PRAGMA synchronous=NORMAL")
            # 캐시 크기 증가 (10MB)
            cursor.execute("PRAGMA cache_size=-10000")
            # 외래 키 제약조건 활성화
            cursor.execute("PRAGMA foreign_keys=ON")
            # 임시 파일을 메모리에 저장
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()

