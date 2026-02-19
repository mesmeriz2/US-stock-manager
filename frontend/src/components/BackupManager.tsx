import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { backupApi } from '../services/api';
import { BackupCreateRequest } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Download, Database } from 'lucide-react';

export default function BackupManager() {
  const [backupRequest, setBackupRequest] = useState<BackupCreateRequest>({
    include_accounts: true,
    include_trades: true,
    include_cash: true,
    include_dividends: true,
    include_realized_pl: true,
    include_snapshots: true,
    include_settings: true,
    backup_name: '',
  });

  // 백업 생성 및 다운로드
  const createBackupMutation = useMutation({
    mutationFn: (request: BackupCreateRequest) => backupApi.createDownload(request),
    onSuccess: (response) => {
      // Blob을 파일로 다운로드
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = backupRequest.backup_name 
        ? `${backupRequest.backup_name}_${timestamp}.json`
        : `backup_${timestamp}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('백업 파일이 다운로드되었습니다.');
    },
    onError: (error: any) => {
      console.error('Backup error:', error);
      const errorMessage = error.response?.data?.detail || '백업 생성에 실패했습니다.';
      alert(`백업 실패:\n${errorMessage}`);
    },
  });

  const handleCreateBackup = () => {
    if (createBackupMutation.isPending) return;
    
    createBackupMutation.mutate(backupRequest);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5" />
          <h2 className="text-2xl font-bold">데이터 백업</h2>
        </div>

        <div className="space-y-4">
          {/* 백업 이름 */}
          <div>
            <Label htmlFor="backup_name">백업 이름 (선택)</Label>
            <Input
              id="backup_name"
              type="text"
              placeholder="예: monthly_backup"
              value={backupRequest.backup_name || ''}
              onChange={(e) =>
                setBackupRequest({ ...backupRequest, backup_name: e.target.value })
              }
            />
          </div>

          {/* 백업 항목 선택 */}
          <div>
            <Label className="mb-2 block">백업할 항목 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_accounts}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_accounts: e.target.checked,
                    })
                  }
                />
                <span>계정 (Account)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_trades}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_trades: e.target.checked,
                    })
                  }
                />
                <span>거래 내역 (Trade)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_cash}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_cash: e.target.checked,
                    })
                  }
                />
                <span>현금 내역 (Cash)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_dividends}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_dividends: e.target.checked,
                    })
                  }
                />
                <span>배당금 (Dividend)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_realized_pl}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_realized_pl: e.target.checked,
                    })
                  }
                />
                <span>실현 손익 (RealizedPL)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_snapshots}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_snapshots: e.target.checked,
                    })
                  }
                />
                <span>일일 스냅샷 (Snapshot)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupRequest.include_settings}
                  onChange={(e) =>
                    setBackupRequest({
                      ...backupRequest,
                      include_settings: e.target.checked,
                    })
                  }
                />
                <span>설정 (Settings)</span>
              </label>
            </div>
          </div>

          {/* 백업 생성 버튼 */}
          <div className="pt-4">
            <Button
              onClick={handleCreateBackup}
              disabled={createBackupMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {createBackupMutation.isPending ? '백업 생성 중...' : '백업 생성 및 다운로드'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-semibold">백업 정보:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>백업 파일은 JSON 형식으로 저장됩니다.</li>
          <li>캐시 데이터(FXRateCache, PriceCache)는 백업에 포함되지 않습니다.</li>
          <li>백업 파일을 안전한 위치에 보관하세요.</li>
          <li>정기적으로 백업을 생성하는 것을 권장합니다.</li>
        </ul>
      </div>
    </div>
  );
}

