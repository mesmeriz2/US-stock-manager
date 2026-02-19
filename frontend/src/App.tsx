import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard';
import PositionsTable from './components/PositionsTable';
import TradeForm from './components/TradeForm';
import TradesTable from './components/TradesTable';
import CashManager from './components/CashManager';
import AccountManager from './components/AccountManager';
import AccountSelector from './components/AccountSelector';
import DividendManager from './components/DividendManager';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import BackupManager from './components/BackupManager';
import RestoreModal from './components/RestoreModal';
import StockSplitManager from './components/StockSplitManager';
import { Toaster } from './components/ui/toaster';
import { TrendingUp, FileText, PlusSquare, Moon, Sun, Wallet, Users, DollarSign, Keyboard, X, PieChart, Database, Split } from 'lucide-react';
import { Button } from './components/ui/button';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type Tab = 'dashboard' | 'positions' | 'trades' | 'add' | 'cash' | 'dividends' | 'analysis' | 'accounts' | 'backup' | 'splits';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  // 다크모드 상태를 localStorage에서 초기화
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // 다크모드 초기 적용
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 다크모드 토글 함수 (useCallback으로 메모이제이션)
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const newDarkMode = !prev;
      // localStorage에 저장
      localStorage.setItem('darkMode', String(newDarkMode));
      return newDarkMode;
    });
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt/Option 키 조합
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('positions');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('add');
            break;
          case '4':
            e.preventDefault();
            setActiveTab('trades');
            break;
          case '5':
            e.preventDefault();
            setActiveTab('cash');
            break;
          case '6':
            e.preventDefault();
            setActiveTab('dividends');
            break;
          case '7':
            e.preventDefault();
            setActiveTab('analysis');
            break;
          case '9':
            e.preventDefault();
            setActiveTab('accounts');
            break;
          case 'd':
          case 'D':
            e.preventDefault();
            toggleDarkMode();
            break;
          case 'h':
          case 'H':
          case '?':
            e.preventDefault();
            setShowShortcuts(true);
            break;
          case 'r':
          case 'R':
            e.preventDefault();
            window.location.reload();
            break;
        }
      }
      
      // ESC 키로 모달 닫기
      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDarkMode]);

  const tabs = [
    { id: 'dashboard' as Tab, label: '홈', icon: TrendingUp },
    { id: 'positions' as Tab, label: '보유', icon: FileText },
    { id: 'add' as Tab, label: '등록', icon: PlusSquare },
    { id: 'trades' as Tab, label: '내역', icon: FileText },
    { id: 'cash' as Tab, label: '현금', icon: Wallet },
    { id: 'dividends' as Tab, label: '배당', icon: DollarSign },
    { id: 'analysis' as Tab, label: '분석', icon: PieChart },
    { id: 'splits' as Tab, label: '분할/병합', icon: Split },
    { id: 'accounts' as Tab, label: '계정', icon: Users },
    { id: 'backup' as Tab, label: '백업', icon: Database },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* 헤더 */}
        <header className="border-b bg-gradient-to-r from-background to-gray-50/50 dark:to-gray-900/50 sticky top-0 z-40 shadow-elevation-1">
          <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient-primary">미국 주식 자산관리</h1>
              <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                {/* 계정 선택 (계정 관리 탭이 아닐 때만 표시) */}
                {activeTab !== 'accounts' && (
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                    <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">계정:</span>
                    <AccountSelector
                      value={selectedAccountId}
                      onChange={setSelectedAccountId}
                      showAllOption={true}
                      className="flex-1 sm:flex-initial min-w-[120px]"
                    />
                  </div>
                )}
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleDarkMode} 
                    aria-label={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    title="다크모드 전환 (Alt+D)"
                  >
                    {darkMode ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowShortcuts(true)} 
                    aria-label="키보드 단축키 보기"
                    className="h-11 w-11 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    title="키보드 단축키 (Alt+H)"
                  >
                    <Keyboard className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <nav className="border-b bg-background overflow-x-auto scrollbar-hide sticky top-[73px] sm:top-[81px] z-30 shadow-sm">
          <div className="container mx-auto px-3 md:px-4">
            <div className="flex space-x-2 md:space-x-4 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const tabIndex = tabs.indexOf(tab) + 1;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-label={`${tab.label} 탭으로 이동 (Alt+${tabIndex !== 7 ? tabIndex : 7})`}
                    className={`flex items-center gap-2 md:gap-2.5 py-3 md:py-4 px-4 md:px-5 border-b-2 transition-all duration-200 whitespace-nowrap text-sm sm:text-base min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative ${
                      activeTab === tab.id
                        ? 'border-transparent text-primary font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    title={`${tab.label} (Alt+${tabIndex !== 7 ? tabIndex : 7})`}
                  >
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-t-full" />
                    )}
                    <Icon className={`h-5 w-5 md:h-5 md:w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* 메인 콘텐츠 */}
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 lg:py-8">
          {activeTab === 'dashboard' && <Dashboard accountId={selectedAccountId} />}
          {activeTab === 'positions' && (
            <div className="space-y-4 md:space-y-6">
              <PositionsTable accountId={selectedAccountId} />
            </div>
          )}
          {activeTab === 'add' && (
            <div className="max-w-4xl mx-auto">
              <TradeForm selectedAccountId={selectedAccountId} />
            </div>
          )}
          {activeTab === 'trades' && <TradesTable accountId={selectedAccountId} />}
          {activeTab === 'cash' && <CashManager accountId={selectedAccountId} />}
          {activeTab === 'dividends' && <DividendManager accountId={selectedAccountId} />}
          {activeTab === 'analysis' && <PortfolioAnalysis accountId={selectedAccountId} />}
          {activeTab === 'splits' && <StockSplitManager />}
          {activeTab === 'accounts' && <AccountManager />}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <BackupManager />
              <div className="mt-4">
                <Button onClick={() => setShowRestoreModal(true)}>
                  <Database className="w-4 h-4 mr-2" />
                  데이터 복원
                </Button>
              </div>
            </div>
          )}
        </main>

        
        {/* 키보드 단축키 도움말 모달 */}
        {showShortcuts && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Keyboard className="h-6 w-6" />
                  키보드 단축키
                </h2>
                <button 
                  onClick={() => setShowShortcuts(false)} 
                  aria-label="모달 닫기"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">탭 네비게이션</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>홈</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+1</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>보유</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+2</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>등록</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+3</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>내역</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+4</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>현금</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+5</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>배당</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+6</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>분석</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+7</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>계정</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+9</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 text-green-600 dark:text-green-400">기타 기능</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>다크모드 전환</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+D</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>새로고침</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+R</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>단축키 도움말</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Alt+H</kbd>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span>모달 닫기</span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">ESC</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Mac 사용자는 Alt 대신 Option 키를 사용하세요
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowShortcuts(false)}>닫기</Button>
              </div>
            </div>
          </div>
        )}

        {/* 복원 모달 */}
        {showRestoreModal && (
          <RestoreModal
            onClose={() => setShowRestoreModal(false)}
            onSuccess={() => {
              // 복원 성공 시 데이터 새로고침
              window.location.reload();
            }}
          />
        )}

        {/* 토스트 알림 */}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;





