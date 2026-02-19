/**
 * 디자인 토큰 - 디자인 시스템의 기본 값들을 정의
 */
export const designTokens = {
  // 색상
  colors: {
    profit: 'hsl(var(--profit))',
    profitLight: 'hsl(var(--profit-light))',
    profitDark: 'hsl(var(--profit-dark))',
    loss: 'hsl(var(--loss))',
    lossLight: 'hsl(var(--loss-light))',
    lossDark: 'hsl(var(--loss-dark))',
    neutral: 'hsl(var(--neutral))',
    warning: 'hsl(var(--warning))',
  },
  
  // 간격
  spacing: {
    safe: '0.875rem',           // 14px - 안전한 최소 간격
    touch: '2.75rem',            // 44px - 터치 타겟 크기
    mobilePadding: '1rem',       // 16px - 모바일 패딩
    desktopPadding: '2rem',      // 32px - 데스크탑 패딩
    sectionGap: 'clamp(1.5rem, 5vw, 3rem)', // 반응형 섹션 간격
  },
  
  // 폰트 크기
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  // 아이콘 크기
  iconSizes: {
    xs: '12px',
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '40px',
  },
  
  // 브레이크포인트
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
  },
};

export default designTokens;

