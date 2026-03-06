function getHslVar(name: string): string {
  if (typeof document === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return value ? `hsl(${value})` : '';
}

export function useChartTheme() {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    primary: getHslVar('primary'),
    muted: getHslVar('muted-foreground'),
    profit: getHslVar('profit'),
    loss: getHslVar('loss'),
    background: getHslVar('card'),
    foreground: getHslVar('foreground'),
    border: getHslVar('border'),
    grid: isDark ? 'hsl(228, 25%, 18%)' : 'hsl(35, 18%, 86%)',
    gold: isDark ? '#E8C170' : '#D4A853',
    goldFaded: isDark ? 'rgba(232,193,112,0.15)' : 'rgba(212,168,83,0.12)',
    isDark,
    // Chart-specific
    areaGradientStart: isDark ? 'rgba(212,168,83,0.3)' : 'rgba(212,168,83,0.2)',
    areaGradientEnd: isDark ? 'rgba(212,168,83,0.02)' : 'rgba(212,168,83,0.02)',
    tooltipBg: isDark ? 'hsl(228, 35%, 12%)' : 'hsl(0, 0%, 100%)',
    tooltipBorder: isDark ? 'hsl(228, 25%, 20%)' : 'hsl(35, 18%, 88%)',
  };
}
