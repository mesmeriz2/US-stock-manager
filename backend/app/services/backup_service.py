"""
백업 서비스
모든 데이터를 JSON 형식으로 백업
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List
from .. import models
from .. import schemas


def create_backup(
    db: Session,
    request: schemas.BackupCreateRequest
) -> schemas.BackupResponse:
    """
    전체 데이터 백업 생성
    
    Args:
        db: 데이터베이스 세션
        request: 백업 요청 (포함할 항목 지정)
    
    Returns:
        BackupResponse: 백업 데이터와 메타데이터
    """
    now = datetime.now()
    
    # 데이터 추출
    data = schemas.BackupData()
    
    if request.include_accounts:
        accounts = db.query(models.Account).all()
        data.accounts = [
            {
                "id": acc.id,
                "name": acc.name,
                "description": acc.description,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat() if acc.created_at else None,
                "updated_at": acc.updated_at.isoformat() if acc.updated_at else None,
            }
            for acc in accounts
        ]
    
    if request.include_trades:
        trades = db.query(models.Trade).all()
        data.trades = [
            {
                "id": trade.id,
                "account_id": trade.account_id,
                "ticker": trade.ticker,
                "side": trade.side,
                "shares": trade.shares,
                "price_usd": trade.price_usd,
                "trade_date": trade.trade_date.isoformat() if trade.trade_date else None,
                "note": trade.note,
                "created_at": trade.created_at.isoformat() if trade.created_at else None,
                "updated_at": trade.updated_at.isoformat() if trade.updated_at else None,
            }
            for trade in trades
        ]
    
    if request.include_cash:
        cash_list = db.query(models.Cash).all()
        data.cash = [
            {
                "id": cash.id,
                "account_id": cash.account_id,
                "amount_usd": cash.amount_usd,
                "transaction_type": cash.transaction_type,
                "related_trade_id": cash.related_trade_id,
                "related_dividend_id": cash.related_dividend_id,
                "transaction_date": cash.transaction_date.isoformat() if cash.transaction_date else None,
                "note": cash.note,
                "created_at": cash.created_at.isoformat() if cash.created_at else None,
                "updated_at": cash.updated_at.isoformat() if cash.updated_at else None,
            }
            for cash in cash_list
        ]
    
    if request.include_dividends:
        dividends = db.query(models.Dividend).all()
        data.dividends = [
            {
                "id": div.id,
                "account_id": div.account_id,
                "ticker": div.ticker,
                "amount_usd": div.amount_usd,
                "dividend_date": div.dividend_date.isoformat() if div.dividend_date else None,
                "note": div.note,
                "is_auto_imported": div.is_auto_imported,
                "amount_per_share": div.amount_per_share,
                "shares_held": div.shares_held,
                "tax_withheld_usd": div.tax_withheld_usd,
                "created_at": div.created_at.isoformat() if div.created_at else None,
                "updated_at": div.updated_at.isoformat() if div.updated_at else None,
            }
            for div in dividends
        ]
    
    if request.include_realized_pl:
        realized_pl_list = db.query(models.RealizedPL).all()
        data.realized_pl = [
            {
                "id": rpl.id,
                "account_id": rpl.account_id,
                "ticker": rpl.ticker,
                "trade_id_sell_ref": rpl.trade_id_sell_ref,
                "shares": rpl.shares,
                "pl_usd": rpl.pl_usd,
                "pl_per_share_usd": rpl.pl_per_share_usd,
                "matched_lots_json": rpl.matched_lots_json,
                "created_at": rpl.created_at.isoformat() if rpl.created_at else None,
            }
            for rpl in realized_pl_list
        ]
    
    if request.include_snapshots:
        snapshots = db.query(models.DailySnapshot).all()
        data.daily_snapshots = [
            {
                "id": snap.id,
                "snapshot_date": snap.snapshot_date.isoformat() if snap.snapshot_date else None,
                "account_id": snap.account_id,
                "ticker": snap.ticker,
                "shares": snap.shares,
                "avg_cost_usd": snap.avg_cost_usd,
                "market_price_usd": snap.market_price_usd,
                "market_value_usd": snap.market_value_usd,
                "unrealized_pl_usd": snap.unrealized_pl_usd,
                "unrealized_pl_percent": snap.unrealized_pl_percent,
                "total_market_value_usd": snap.total_market_value_usd,
                "total_unrealized_pl_usd": snap.total_unrealized_pl_usd,
                "total_realized_pl_usd": snap.total_realized_pl_usd,
                "total_pl_usd": snap.total_pl_usd,
                "created_at": snap.created_at.isoformat() if snap.created_at else None,
            }
            for snap in snapshots
        ]
    
    if request.include_settings:
        settings = db.query(models.Settings).all()
        data.settings = [
            {
                "id": setting.id,
                "key": setting.key,
                "value": setting.value,
                "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
            }
            for setting in settings
        ]
    
    # 메타데이터 생성
    metadata = schemas.BackupMetadata(
        version="1.0",
        backup_date=now,
        backup_name=request.backup_name,
        total_accounts=len(data.accounts),
        total_trades=len(data.trades),
        total_cash_transactions=len(data.cash),
        total_dividends=len(data.dividends),
        total_realized_pl=len(data.realized_pl),
        total_snapshots=len(data.daily_snapshots),
        total_settings=len(data.settings),
    )
    
    return schemas.BackupResponse(
        metadata=metadata,
        data=data
    )

