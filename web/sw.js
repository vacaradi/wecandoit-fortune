/* 위캔두잇 오늘의 운세 — 서비스워커
 *
 * 안드로이드 크롬은 이 파일이 있어야 '앱 설치'를 허용한다.
 * 겸사겸사 영상·이미지를 캐시해 두 번째 방문부터 훨씬 빨라진다.
 *
 * 주의: index.html 은 절대 캐시하지 않는다.
 *       고쳐도 예전 화면이 계속 뜨는 사고가 반복됐다.
 */

// 캐시 이름을 바꾸면 예전 것이 전부 버려진다.
// 내용을 크게 고칠 때마다 숫자를 올린다.
const CACHE = "wcdi-v4";

// 무거워서 캐시할 값어치가 있는 것들
const ASSETS = [
  "/assets/video/main/hero.mp4",
  "/assets/video/main/hero-poster.jpg",
  "/assets/video/main/quote.mp4",
  "/assets/video/main/quote-poster.jpg",
  "/assets/character/poses/wizard-orb.jpg",
  "/assets/brand/logo.png",
  "/assets/brand/icon-192.png",
  "/assets/brand/icon-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // 하나쯤 실패해도 설치는 계속되게 한다
      Promise.allSettled(ASSETS.map((u) => c.add(u)))
    )
  );
});

// 새 버전이 준비됐다는 신호를 받으면 기다리지 않고 바로 넘어간다
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 화면(HTML)은 항상 서버에서 새로 받는다
  const isPage =
    req.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.startsWith("/content/");

  if (isPage) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // 영상·이미지는 캐시 우선
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
