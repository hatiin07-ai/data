// 버추얼 캘린더 PWA 서비스워커
// 네트워크 우선(항상 최신) + 실패 시에만 캐시 폴백. SOOP/Supabase 등 외부 요청은 건드리지 않음.
const CACHE = 'virdata-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/viewer/',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // GET, 같은 오리진만 처리 (SOOP iframe·Supabase·API는 통과)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // 온에어 API는 항상 네트워크

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 성공 응답은 캐시에 갱신
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  );
});
