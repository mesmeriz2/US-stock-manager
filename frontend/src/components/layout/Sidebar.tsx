import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type Section = 'portfolio' | 'trades' | 'cashflow' | 'settings';

interface SidebarProps {
  active: Section;
  onChange: (section: Section) => void;
}

const NAV_ITEMS: { id: Section; label: string; labelKr: string; icon: typeof LayoutDashboard }[] = [
  { id: 'portfolio', label: 'Portfolio', labelKr: '포트폴리오', icon: LayoutDashboard },
  { id: 'trades', label: 'Trades', labelKr: '거래', icon: ArrowLeftRight },
  { id: 'cashflow', label: 'Cash Flow', labelKr: '자금흐름', icon: Landmark },
  { id: 'settings', label: 'Settings', labelKr: '설정', icon: Settings },
];

export default function Sidebar({ active, onChange }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50',
        'bg-card/95 backdrop-blur-xl border-r border-border/50',
        'transition-all duration-300',
        expanded ? 'w-[var(--sidebar-expanded)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'flex items-center h-[var(--topbar-height)] border-b border-border/50 px-4',
        expanded ? 'justify-start gap-3' : 'justify-center'
      )}>
        <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-glow-gold flex-shrink-0">
          <span className="text-sm font-bold text-white tracking-tight">US</span>
        </div>
        {expanded && (
          <span className="text-sm font-semibold text-foreground truncate animate-fade-in">
            Stock Manager
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
                'group relative',
                expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
              title={expanded ? undefined : item.labelKr}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                isActive && 'scale-110'
              )} />
              {expanded && (
                <span className="text-sm font-medium truncate animate-fade-in">
                  {item.labelKr}
                </span>
              )}
              {!expanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {item.labelKr}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Expand toggle */}
      <div className="p-2 border-t border-border/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
