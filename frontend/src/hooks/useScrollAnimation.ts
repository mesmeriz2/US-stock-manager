import { useEffect, useRef } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * IntersectionObserver 기반 스크롤 애니메이션 훅
 * 뷰포트 진입 시 CSS 클래스를 토글하여 scroll-animate-in 상태로 전환
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px' } = options;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      element.classList.add('scroll-animate-in');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('scroll-animate-in');
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}

/**
 * 컨테이너 ref를 반환하며, 내부 자식 요소에 stagger 애니메이션을 적용하는 훅
 * data-stagger 속성을 가진 자식 요소에 순차 적용
 */
export function useStaggeredScrollAnimation(
  options: UseScrollAnimationOptions & { staggerMs?: number } = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px', staggerMs = 100 } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const children = Array.from(container.querySelectorAll<HTMLElement>('[data-stagger]'));
    if (children.length === 0) return;

    if (prefersReducedMotion) {
      children.forEach((el) => el.classList.add('scroll-animate-in'));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((el, index) => {
            setTimeout(() => el.classList.add('scroll-animate-in'), index * staggerMs);
          });
          observer.unobserve(container);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [threshold, rootMargin, staggerMs]);

  return containerRef;
}
