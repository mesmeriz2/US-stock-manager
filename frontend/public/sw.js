// Service Worker for US Stock Manager PWA
const CACHE_NAME = 'us-stock-manager-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // 즉시 제어 시작
  return self.clients.claim();
});

// Fetch 이벤트 - Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 항상 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // API 응답은 캐시하지 않음
          return response;
        })
        .catch((error) => {
          console.error('[SW] API fetch failed:', error);
          // API 실패 시 오프라인 응답 반환 (선택사항)
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: '네트워크 연결을 확인해주세요.' 
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 정적 파일: Cache First
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // 캐시에 있으면 캐시 반환 (백그라운드에서 업데이트)
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, response.clone());
                });
              }
            })
            .catch(() => {});
          
          return cachedResponse;
        }

        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // 동적 캐시에 저장
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // 오프라인 폴백 페이지 (선택사항)
            if (request.destination === 'document') {
              return caches.match('/');
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
    );
  }
});

// 백그라운드 동기화 (향후 확장 가능)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-trades') {
    event.waitUntil(
      // 향후 오프라인 거래 동기화 로직 추가
      Promise.resolve()
    );
  }
});

// 푸시 알림 (향후 확장 가능)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || '주식 알림';
  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});














