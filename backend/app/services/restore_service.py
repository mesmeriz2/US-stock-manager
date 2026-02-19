"""
복원 서비스
백업 데이터를 데이터베이스로 복원 (스마트 병합 지원)
"""
from sqlalchemy.orm import Session
from sqlalchemy import delete
from typing import Dict, Any, List, Set, Tuple, Optional
from datetime import datetime, date
from .. import models
from .. import schemas
from .. import crud


class IDMapping:
    """ID 매핑 테이블 관리"""
    def __init__(self):
        self.account_map: Dict[int, int] = {}  # old_id -> new_id
        self.trade_map: Dict[int, int] = {}  # old_id -> new_id
        self.dividend_map: Dict[int, int] = {}  # old_id -> new_id
        self.realized_pl_map: Dict[int, int] = {}  # old_id -> new_id
        self.cash_map: Dict[int, int] = {}  # old_id -> new_id
        self.snapshot_map: Dict[int, int] = {}  # old_id -> new_id
    
    def get_account_id(self, old_id: int) -> Optional[int]:
        """계정 ID 매핑 조회"""
        return self.account_map.get(old_id)
    
    def get_trade_id(self, old_id: int) -> Optional[int]:
        """거래 ID 매핑 조회"""
        return self.trade_map.get(old_id)
    
    def get_dividend_id(self, old_id: int) -> Optional[int]:
        """배당금 ID 매핑 조회"""
        return self.dividend_map.get(old_id)


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """날짜 문자열을 datetime으로 변환"""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        return None


def _parse_date_only(date_str: Optional[str]) -> Optional[date]:
    """날짜 문자열을 date로 변환 (YYYY-MM-DD 형식)"""
    if not date_str:
        return None
    try:
        from datetime import date as date_type
        # ISO 형식 (YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM:SS)에서 날짜 부분만 추출
        date_part = date_str.split('T')[0]
        return date_type.fromisoformat(date_part)
    except:
        return None


def create_restore_preview(
    db: Session,
    backup_data: schemas.BackupData,
    request: schemas.RestoreRequest
) -> schemas.RestorePreview:
    """
    복원 미리보기 생성
    
    Args:
        db: 데이터베이스 세션
        backup_data: 백업 데이터
        request: 복원 요청 설정
    
    Returns:
        RestorePreview: 복원 미리보기 정보
    """
    preview = schemas.RestorePreview()
    warnings = []
    
    # Account 처리
    existing_accounts_by_name = {}
    for acc in db.query(models.Account).all():
        existing_accounts_by_name[acc.name] = acc
    
    accounts_to_map = 0
    accounts_to_create = 0
    
    for backup_acc in backup_data.accounts:
        name = backup_acc.get("name")
        if name in existing_accounts_by_name:
            accounts_to_map += 1
        else:
            accounts_to_create += 1
    
    preview.accounts_to_map = accounts_to_map
    preview.accounts_to_create = accounts_to_create
    preview.accounts_to_restore = len(backup_data.accounts)
    
    # Trade 중복 감지
    existing_trade_hashes = set()
    if request.duplicate_data == "skip":
        existing_trades = crud.get_all_trades_for_calculation(db)
        for trade in existing_trades:
            hash_key = f"{trade['account_id']}_{trade['ticker']}_{trade['side']}_{trade['shares']}_{trade['price_usd']}_{trade['trade_date']}"
            existing_trade_hashes.add(hash_key)
    
    trades_duplicate = 0
    for backup_trade in backup_data.trades:
        # Account ID 매핑 필요
        old_account_id = backup_trade.get("account_id")
        if request.restore_mode == "smart_merge":
            # 나중에 실제 복원 시 매핑됨
            pass
        
        hash_key = f"{old_account_id}_{backup_trade.get('ticker')}_{backup_trade.get('side')}_{backup_trade.get('shares')}_{backup_trade.get('price_usd')}_{backup_trade.get('trade_date')}"
        if hash_key in existing_trade_hashes:
            trades_duplicate += 1
    
    preview.trades_to_restore = len(backup_data.trades)
    preview.trades_duplicate = trades_duplicate
    
    preview.cash_to_restore = len(backup_data.cash)
    preview.dividends_to_restore = len(backup_data.dividends)
    preview.realized_pl_to_restore = len(backup_data.realized_pl)
    preview.snapshots_to_restore = len(backup_data.daily_snapshots)
    preview.settings_to_restore = len(backup_data.settings)
    
    if request.restore_mode == "replace":
        warnings.append("경고: 전체 교체 모드는 모든 기존 데이터를 삭제합니다.")
    
    preview.warnings = warnings
    
    return preview


def restore_backup(
    db: Session,
    backup_data: schemas.BackupData,
    request: schemas.RestoreRequest
) -> schemas.RestoreResponse:
    """
    백업 데이터 복원
    
    Args:
        db: 데이터베이스 세션
        backup_data: 백업 데이터
        request: 복원 요청 설정
    
    Returns:
        RestoreResponse: 복원 결과
    """
    response = schemas.RestoreResponse(
        success=False,
        message="",
        errors=[]
    )
    
    try:
        # 전체 교체 모드
        if request.restore_mode == "replace":
            # 의존성 순서대로 삭제 (자식 테이블 먼저)
            db.execute(delete(models.RealizedPL))
            db.execute(delete(models.Cash))
            db.execute(delete(models.DailySnapshot))
            db.execute(delete(models.Trade))
            db.execute(delete(models.Dividend))
            db.execute(delete(models.Settings))
            db.execute(delete(models.Account))
            db.commit()
        
        # ID 매핑 테이블 생성
        id_mapping = IDMapping()
        
        # 1. Account 복원
        existing_accounts_by_name = {}
        for acc in db.query(models.Account).all():
            existing_accounts_by_name[acc.name] = acc
        
        accounts_created = 0
        accounts_mapped = 0
        
        for backup_acc in backup_data.accounts:
            old_id = backup_acc.get("id")
            name = backup_acc.get("name")
            
            # 기존 계정 매핑 또는 생성
            if request.account_name_conflict == "map" and name in existing_accounts_by_name:
                # 기존 계정 사용
                existing_acc = existing_accounts_by_name[name]
                id_mapping.account_map[old_id] = existing_acc.id
                accounts_mapped += 1
            else:
                # 새 계정 생성
                account_create = schemas.AccountCreate(
                    name=name,
                    description=backup_acc.get("description"),
                    is_active=backup_acc.get("is_active", True)
                )
                new_acc = crud.create_account(db, account_create)
                id_mapping.account_map[old_id] = new_acc.id
                accounts_created += 1
        
        response.accounts_created = accounts_created
        response.accounts_mapped = accounts_mapped
        
        # 2. Trade 복원
        existing_trade_hashes = set()
        if request.duplicate_data == "skip":
            existing_trades = crud.get_all_trades_for_calculation(db)
            for trade in existing_trades:
                hash_key = f"{trade['account_id']}_{trade['ticker']}_{trade['side']}_{trade['shares']}_{trade['price_usd']}_{trade['trade_date']}"
                existing_trade_hashes.add(hash_key)
        
        trades_restored = 0
        trades_skipped = 0
        
        for backup_trade in backup_data.trades:
            old_id = backup_trade.get("id")
            old_account_id = backup_trade.get("account_id")
            
            # Account ID 매핑
            new_account_id = id_mapping.get_account_id(old_account_id)
            if not new_account_id:
                response.errors.append(f"거래 {old_id}: 계정 ID {old_account_id}를 찾을 수 없습니다.")
                continue
            
            # 중복 체크
            if request.duplicate_data == "skip":
                hash_key = f"{new_account_id}_{backup_trade.get('ticker')}_{backup_trade.get('side')}_{backup_trade.get('shares')}_{backup_trade.get('price_usd')}_{backup_trade.get('trade_date')}"
                if hash_key in existing_trade_hashes:
                    trades_skipped += 1
                    continue
            
            # Trade 생성
            trade_date = _parse_date_only(backup_trade.get("trade_date"))
            if not trade_date:
                response.errors.append(f"거래 {old_id}: 잘못된 날짜 형식")
                continue
            
            trade_create = schemas.TradeCreate(
                account_id=new_account_id,
                ticker=backup_trade.get("ticker"),
                side=backup_trade.get("side"),
                shares=backup_trade.get("shares"),
                price_usd=backup_trade.get("price_usd"),
                trade_date=trade_date,
                note=backup_trade.get("note")
            )
            new_trade = crud.create_trade(db, trade_create)
            id_mapping.trade_map[old_id] = new_trade.id
            trades_restored += 1
        
        response.trades_restored = trades_restored
        response.trades_skipped = trades_skipped
        
        # 3. Dividend 복원
        dividends_restored = 0
        for backup_div in backup_data.dividends:
            old_id = backup_div.get("id")
            old_account_id = backup_div.get("account_id")
            
            # Account ID 매핑
            new_account_id = id_mapping.get_account_id(old_account_id)
            if not new_account_id:
                response.errors.append(f"배당금 {old_id}: 계정 ID {old_account_id}를 찾을 수 없습니다.")
                continue
            
            # Dividend 생성
            dividend_date = _parse_date_only(backup_div.get("dividend_date"))
            if not dividend_date:
                response.errors.append(f"배당금 {old_id}: 잘못된 날짜 형식")
                continue
            
            dividend_create = schemas.DividendCreate(
                account_id=new_account_id,
                ticker=backup_div.get("ticker"),
                amount_usd=backup_div.get("amount_usd"),
                dividend_date=dividend_date,
                note=backup_div.get("note"),
                amount_per_share=backup_div.get("amount_per_share"),
                shares_held=backup_div.get("shares_held"),
                tax_withheld_usd=backup_div.get("tax_withheld_usd")
            )
            new_dividend = crud.create_dividend(db, dividend_create)
            id_mapping.dividend_map[old_id] = new_dividend.id
            dividends_restored += 1
        
        response.dividends_restored = dividends_restored
        
        # 4. Cash 복원
        # 주의: Trade와 연결된 Cash(related_trade_id가 있는 Cash)는 복원하지 않음
        # Trade 생성 시 자동으로 Cash가 생성되므로 중복을 피하기 위함
        cash_restored = 0
        cash_skipped = 0
        for backup_cash in backup_data.cash:
            old_account_id = backup_cash.get("account_id")
            
            # Account ID 매핑
            new_account_id = id_mapping.get_account_id(old_account_id)
            if not new_account_id:
                response.errors.append(f"현금 거래: 계정 ID {old_account_id}를 찾을 수 없습니다.")
                continue
            
            # Trade와 연결된 Cash는 건너뛰기 (Trade 생성 시 자동으로 생성됨)
            old_related_trade_id = backup_cash.get("related_trade_id")
            if old_related_trade_id:
                # Trade가 복원되었는지 확인
                new_related_trade_id = id_mapping.get_trade_id(old_related_trade_id)
                if new_related_trade_id:
                    # Trade가 복원되었으므로 자동 생성된 Cash가 있을 것임 - 건너뛰기
                    cash_skipped += 1
                    continue
            
            # Dividend ID 매핑
            new_related_dividend_id = None
            old_related_dividend_id = backup_cash.get("related_dividend_id")
            if old_related_dividend_id:
                new_related_dividend_id = id_mapping.get_dividend_id(old_related_dividend_id)
            
            # Cash 생성 (Trade/Dividend와 연결되지 않은 독립적인 현금 거래만 복원)
            transaction_date = _parse_date_only(backup_cash.get("transaction_date"))
            if not transaction_date:
                response.errors.append(f"현금 거래: 잘못된 날짜 형식")
                continue
            
            cash_create = schemas.CashCreate(
                account_id=new_account_id,
                amount_usd=backup_cash.get("amount_usd"),
                transaction_type=backup_cash.get("transaction_type"),
                transaction_date=transaction_date,
                note=backup_cash.get("note")
            )
            new_cash = crud.create_cash(db, cash_create, related_trade_id=None, related_dividend_id=new_related_dividend_id)
            cash_restored += 1
        
        response.cash_restored = cash_restored
        response.cash_skipped = cash_skipped
        
        # 5. RealizedPL 복원
        realized_pl_restored = 0
        for backup_rpl in backup_data.realized_pl:
            old_account_id = backup_rpl.get("account_id")
            old_trade_id_sell_ref = backup_rpl.get("trade_id_sell_ref")
            
            # Account ID 매핑
            new_account_id = id_mapping.get_account_id(old_account_id)
            if not new_account_id:
                response.errors.append(f"실현 손익: 계정 ID {old_account_id}를 찾을 수 없습니다.")
                continue
            
            # Trade ID 매핑
            new_trade_id_sell_ref = id_mapping.get_trade_id(old_trade_id_sell_ref)
            if not new_trade_id_sell_ref:
                response.errors.append(f"실현 손익: 거래 ID {old_trade_id_sell_ref}를 찾을 수 없습니다.")
                continue
            
            # RealizedPL 생성
            realized_pl_data = {
                "account_id": new_account_id,
                "ticker": backup_rpl.get("ticker"),
                "trade_id_sell_ref": new_trade_id_sell_ref,
                "shares": backup_rpl.get("shares"),
                "pl_usd": backup_rpl.get("pl_usd"),
                "pl_per_share_usd": backup_rpl.get("pl_per_share_usd"),
                "matched_lots": backup_rpl.get("matched_lots_json")
            }
            crud.save_realized_pl(db, realized_pl_data)
            realized_pl_restored += 1
        
        response.realized_pl_restored = realized_pl_restored
        
        # 6. DailySnapshot 복원
        snapshots_restored = 0
        for backup_snap in backup_data.daily_snapshots:
            old_account_id = backup_snap.get("account_id")
            
            # Account ID 매핑 (nullable)
            new_account_id = None
            if old_account_id is not None:
                new_account_id = id_mapping.get_account_id(old_account_id)
                if not new_account_id:
                    response.errors.append(f"스냅샷: 계정 ID {old_account_id}를 찾을 수 없습니다.")
                    continue
            
            # Snapshot 생성
            snapshot_date = _parse_date_only(backup_snap.get("snapshot_date"))
            if not snapshot_date:
                response.errors.append(f"스냅샷: 잘못된 날짜 형식")
                continue
            
            snapshot_create = schemas.DailySnapshotCreate(
                snapshot_date=snapshot_date,
                account_id=new_account_id,
                ticker=backup_snap.get("ticker"),
                shares=backup_snap.get("shares"),
                avg_cost_usd=backup_snap.get("avg_cost_usd"),
                market_price_usd=backup_snap.get("market_price_usd"),
                market_value_usd=backup_snap.get("market_value_usd"),
                unrealized_pl_usd=backup_snap.get("unrealized_pl_usd"),
                unrealized_pl_percent=backup_snap.get("unrealized_pl_percent"),
                total_market_value_usd=backup_snap.get("total_market_value_usd"),
                total_unrealized_pl_usd=backup_snap.get("total_unrealized_pl_usd"),
                total_realized_pl_usd=backup_snap.get("total_realized_pl_usd"),
                total_pl_usd=backup_snap.get("total_pl_usd")
            )
            db_snapshot = crud.create_snapshot(db, snapshot_create)
            snapshots_restored += 1
        
        response.snapshots_restored = snapshots_restored
        
        # 7. Settings 복원
        settings_restored = 0
        for backup_setting in backup_data.settings:
            key = backup_setting.get("key")
            value = backup_setting.get("value")
            
            # 기존 설정 확인
            existing_setting = db.query(models.Settings).filter(models.Settings.key == key).first()
            if existing_setting:
                existing_setting.value = value
                existing_setting.updated_at = datetime.now()
            else:
                new_setting = models.Settings(key=key, value=value)
                db.add(new_setting)
            
            settings_restored += 1
        
        if settings_restored > 0:
            db.commit()
        
        response.settings_restored = settings_restored
        
        # 성공 처리
        response.success = True
        response.message = f"복원이 완료되었습니다. (계정: 생성 {accounts_created}, 매핑 {accounts_mapped}, 거래: 복원 {trades_restored}, 건너뜀 {trades_skipped}, 현금: 복원 {cash_restored}, 건너뜀 {cash_skipped})"
        
    except Exception as e:
        db.rollback()
        response.success = False
        response.message = f"복원 중 오류가 발생했습니다: {str(e)}"
        response.errors.append(str(e))
        import traceback
        response.errors.append(traceback.format_exc())
    
    return response

