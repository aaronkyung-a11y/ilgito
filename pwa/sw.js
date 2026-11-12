// 삼국지 일기토 서비스 워커: 한 번 열면 오프라인에서도 실행되고, 온라인이면 열 때마다 새 판을 확인한다.
// build.js가 버전을 채워 저장소 루트의 sw.js로 내보낸다.
const VERSION = '__VERSION__';
const CACHE = 'ilgito-' + VERSION, FONTS = 'ilgito-fonts';
const CORE = ['./', 'manifest.webmanifest', 'vendor/three.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const PAGE = new URL('./', self.registration.scope);

self.addEventListener('install', (e) => {
  // 새 판을 받아 둘 때 브라우저 HTTP 캐시에 남은 옛 파일을 집지 않도록 서버에서 다시 받는다
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
// 열린 화면이 서비스 워커의 버전을 물어본다. 화면이 옛 판일 때만 "새 버전 적용" 단추를 띄우는 데 쓴다
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'ilgito-ver' && e.ports && e.ports[0]) e.ports[0].postMessage({ v: VERSION });
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ilgito-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // 게임 화면(루트)만 맡는다. versions/의 옛 스냅샷 같은 다른 페이지는 그대로 서버에서 받는다
      if (url.pathname !== PAGE.pathname && url.pathname !== PAGE.pathname + 'index.html') return;
      // 서버에 새 판이 있는지 매번 확인한다(ETag 재검증이라 GitHub Pages의 10분 HTTP 캐시에 걸리지 않는다).
      // 4초 안에 답이 없거나 오프라인이면 캐시본을 보여 주고, 늦게 온 응답은 캐시에 넣어 둔다
      const net = fetch(PAGE.href, { cache: 'no-cache' }).then((res) => {
        if (!res.ok) throw new Error('status ' + res.status);
        const copy = res.clone();
        return caches.open(CACHE).then((c) => c.put('./', copy)).then(() => res);
      });
      e.waitUntil(net.catch(() => {}));
      e.respondWith(Promise.race([net, timeout(4000)]).catch(() => caches.open(CACHE).then((c) => c.match('./')).then((hit) => hit || net)));
      return;
    }
    if (url.pathname.endsWith('/sw.js')) return;
    // 엔진·아이콘·매니페스트: 캐시 우선(파일이 바뀌면 버전과 함께 캐시 이름이 바뀐다)
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // 글꼴: 캐시 우선, 뒤에서 갱신. 버전이 바뀌어도 지우지 않는다
    e.respondWith(
      caches.open(FONTS).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});
