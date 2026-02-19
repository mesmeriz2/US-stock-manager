import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { backupApi } from '../services/api';
import { RestorePreview } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Upload, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface RestoreModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RestoreModal({ onClose, onSuccess }: RestoreModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<string>('smart_merge');
  const [accountNameConflict, setAccountNameConflict] = useState<string>('map');
  const [duplicateData, setDuplicateData] = useState<string>('skip');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'restoring'>('upload');

  // 복원 미리보기
  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      backupApi.restorePreview(file, restoreMode, accountNameConflict, duplicateData),
    onSuccess: (data) => {
      setPreview(data.data);
      setStep('preview');
    },
    onError: (error: any) => {
      console.error('Preview error:', error);
      const errorMessage = error.response?.data?.detail || '미리보기 생성에 실패했습니다.';
      alert(`미리보기 실패:\n${errorMessage}`);
    },
  });

  // 복원 실행
  const restoreMutation = useMutation({
    mutationFn: (file: File) =>
      backupApi.restore(file, restoreMode, accountNameConflict, duplicateData),
    onSuccess: (data) => {
      if (data.data.success) {
        alert(data.data.message);
        onSuccess?.();
        onClose();
      } else {
        alert(`복원 실패:\n${data.data.message}\n\n오류:\n${data.data.errors.join('\n')}`);
      }
    },
    onError: (error: any) => {
      console.error('Restore error:', error);
      const errorMessage = error.response?.data?.detail || '복원에 실패했습니다.';
      alert(`복원 실패:\n${errorMessage}`);
      setStep('preview');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setStep('upload');
    }
  };

  const handlePreview = () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요.');
      return;
    }
    previewMutation.mutate(selectedFile);
  };

  const handleRestore = () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요.');
      return;
    }
    if (!confirm('복원을 시작하시겠습니까?\n\n주의: 복원 모드에 따라 기존 데이터가 변경될 수 있습니다.')) {
      return;
    }
    setStep('restoring');
    restoreMutation.mutate(selectedFile);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              <h2 className="text-2xl font-bold">데이터 복원</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 단계 1: 파일 업로드 및 설정 */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* 파일 선택 */}
              <div>
                <Label htmlFor="backup_file">백업 파일 선택 (JSON)</Label>
                <input
                  id="backup_file"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* 복원 모드 선택 */}
              <div>
                <Label>복원 모드</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="smart_merge"
                      checked={restoreMode === 'smart_merge'}
                      onChange={(e) => setRestoreMode(e.target.value)}
                    />
                    <span>스마트 병합 (권장) - 기존 데이터와 병합</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={(e) => setRestoreMode(e.target.value)}
                    />
                    <span>전체 교체 - 모든 기존 데이터 삭제 후 복원</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="append"
                      checked={restoreMode === 'append'}
                      onChange={(e) => setRestoreMode(e.target.value)}
                    />
                    <span>추가 - 기존 데이터 유지하고 추가</span>
                  </label>
                </div>
              </div>

              {/* 충돌 처리 설정 (스마트 병합 모드) */}
              {restoreMode === 'smart_merge' && (
                <>
                  <div>
                    <Label>계정 이름 충돌 처리</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="map"
                          checked={accountNameConflict === 'map'}
                          onChange={(e) => setAccountNameConflict(e.target.value)}
                        />
                        <span>기존 계정 매핑 (기본값)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="overwrite"
                          checked={accountNameConflict === 'overwrite'}
                          onChange={(e) => setAccountNameConflict(e.target.value)}
                        />
                        <span>덮어쓰기</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="create_new"
                          checked={accountNameConflict === 'create_new'}
                          onChange={(e) => setAccountNameConflict(e.target.value)}
                        />
                        <span>새 이름 생성</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>중복 데이터 처리</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="skip"
                          checked={duplicateData === 'skip'}
                          onChange={(e) => setDuplicateData(e.target.value)}
                        />
                        <span>건너뛰기 (기본값)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="add_all"
                          checked={duplicateData === 'add_all'}
                          onChange={(e) => setDuplicateData(e.target.value)}
                        />
                        <span>모두 추가</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* 미리보기 버튼 */}
              <div className="pt-4">
                <Button
                  onClick={handlePreview}
                  disabled={!selectedFile || previewMutation.isPending}
                  className="w-full"
                >
                  {previewMutation.isPending ? '미리보기 생성 중...' : '미리보기'}
                </Button>
              </div>
            </div>
          )}

          {/* 단계 2: 미리보기 */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-5 h-5" />
                <h3 className="text-lg font-semibold">복원 미리보기</h3>
              </div>

              {/* 경고 메시지 */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">경고</span>
                  </div>
                  <ul className="mt-2 list-disc list-inside text-sm text-yellow-700">
                    {preview.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 복원 통계 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">계정</div>
                  <div className="text-lg font-semibold">
                    복원: {preview.accounts_to_restore}
                  </div>
                  <div className="text-xs text-gray-500">
                    매핑: {preview.accounts_to_map} | 생성: {preview.accounts_to_create}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">거래 내역</div>
                  <div className="text-lg font-semibold">
                    복원: {preview.trades_to_restore}
                  </div>
                  <div className="text-xs text-gray-500">
                    중복: {preview.trades_duplicate}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">현금 거래</div>
                  <div className="text-lg font-semibold">{preview.cash_to_restore}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">배당금</div>
                  <div className="text-lg font-semibold">{preview.dividends_to_restore}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">실현 손익</div>
                  <div className="text-lg font-semibold">{preview.realized_pl_to_restore}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">스냅샷</div>
                  <div className="text-lg font-semibold">{preview.snapshots_to_restore}</div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  뒤로
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={restoreMutation.isPending}
                  className="flex-1"
                >
                  {restoreMutation.isPending ? '복원 중...' : '복원 실행'}
                </Button>
              </div>
            </div>
          )}

          {/* 단계 3: 복원 중 */}
          {step === 'restoring' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold">복원 중...</p>
              <p className="text-sm text-gray-600 mt-2">잠시만 기다려주세요.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

