import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Settings,
} from 'lucide-react';
import type { Section } from './Sidebar';

interface BottomNavProps {
  active: Section;
  onChange: (section: Section) => void;
}

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'portfolio', label: '포트폴리오', icon: LayoutDashboard },
  { id: 'trades', label: '거래', icon: ArrowLeftRight },
  { id: 'cashflow', label: '자금', icon: Landmark },
  { id: 'settings', label: '설정', icon: Settings },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[60px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
