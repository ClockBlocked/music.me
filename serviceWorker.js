/* ============================================================================
   MyBeats Service Worker — consolidated
   - Fixes precache (robust, correct paths)
   - Matches message contract expected by pwa.js
   - No auto-skipWaiting (updates require user action)
   - Caches /library/*.json and static assets
   ============================================================================ */

const SW_VERSION = '20261002-combined';
const BASE_PATH = '/music.me';
const STATIC_CACHE = `mybeats-static-${SW_VERSION}`;

const CORE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,

  // Core app scripts
  `${BASE_PATH}/source/jQuery.js`,
  `${BASE_PATH}/source/boot.js`,
  `${BASE_PATH}/source/runtime.js`,
  `${BASE_PATH}/source/core.js`,
  `${BASE_PATH}/source/navigator.js`,
  `${BASE_PATH}/source/builder.js`,
  `${BASE_PATH}/source/layouts.js`,
  `${BASE_PATH}/source/player.js`,
  `${BASE_PATH}/source/interactions.js`,
  `${BASE_PATH}/source/shell.js`,

  // Base styles
  `${BASE_PATH}/stylings/base/fonts.css`,
  `${BASE_PATH}/stylings/base/themes.css`,
  `${BASE_PATH}/stylings/base/setup.css`,
  `${BASE_PATH}/stylings/base/icons.css`,
  `${BASE_PATH}/stylings/base/images.css`,
  `${BASE_PATH}/stylings/base/lists.css`,
  `${BASE_PATH}/stylings/base/shell.css`
];

/* ============================================================================
   IndexedDB Cache Manager (images / songs / metadata)
   ============================================================================ */
class CacheStorageManager {
  constructor() {
    this.dbName = 'mybeats-cache';
    this.dbVersion = 1;
    this.imageQuota = 50 * 1024 * 1024;
    this.songQuota = 100 * 1024 * 1024;
    this._dbPromise = null;
  }

  getDb() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('images')) {
          const s = db.createObjectStore('images', { keyPath: 'url' });
          s.createIndex('timestamp', 'timestamp', { unique: false });
          s.createIndex('size', 'size', { unique: false });
        }
        if (!db.objectStoreNames.contains('songs')) {
          const s = db.createObjectStore('songs', { keyPath: 'url' });
          s.createIndex('timestamp', 'timestamp', { unique: false });
          s.createIndex('size', 'size', { unique: false });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
    return this._dbPromise;
  }

  async getUsage(storeName) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
      let total = 0;
      req.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { total += c.value.size || 0; c.continue(); } else resolve(total);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async get(storeName, url) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(url);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, url, blob) {
    const quota = storeName === 'images' ? this.imageQuota : this.songQuota;
    const usage = await this.getUsage(storeName);
    if (usage + blob.size > quota) await this.evictLRU(storeName, blob.size);
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(storeName, 'readwrite').objectStore(storeName);
      const req = store.put({ url, blob, size: blob.size, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, url) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(url);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async evictLRU(storeName, needed) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(storeName, 'readwrite').objectStore(storeName);
      const req = store.index('timestamp').openCursor();
      let freed = 0;
      req.onsuccess = (e) => {
        const c = e.target.result;
        if (!c || freed >= needed) return resolve();
        freed += c.value.size || 0;
        c.delete();
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async expandQuota(storeName, newQuota) {
    if (storeName === 'images') this.imageQuota = newQuota;
    else if (storeName === 'songs') this.songQuota = newQuota;
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction('metadata', 'readwrite').objectStore('metadata');
      const key = storeName === 'images' ? 'imageQuota' : 'songQuota';
      const req = store.put({ key, value: newQuota });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllCachedUrls(storeName) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
const cacheManager = new CacheStorageManager();

/* ============================================================================
   Helpers
   ============================================================================ */
function isInAppScope(pathname) {
  if (!BASE_PATH) return true;
  return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

function stripBase(pathname) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/';
  }
  return pathname;
}

function resolveAppUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) {
    if (BASE_PATH && path.startsWith(BASE_PATH)) return new URL(path, self.location.origin).href;
    return new URL(`${BASE_PATH}${path}`, self.location.origin).href;
  }
  return new URL(`${BASE_PATH}/${path}`.replace(/\/+/g, '/'), self.location.origin).href;
}

/* ============================================================================
   Request classifiers
   ============================================================================ */
function isHtmlRequest(url) {
  const p = stripBase(url.pathname);
  return p.endsWith('.html') || p === '/' || p === '/index.html';
}

function isImageRequest(url) {
  const p = stripBase(url.pathname);
  return p.startsWith('/content/albumCovers/') || p.startsWith('/content/artistPortraits/');
}

function isSongRequest(url) {
  const p = stripBase(url.pathname);
  return p.startsWith('/content/songs/') && (p.endsWith('.webm') || p.endsWith('.mp3') || p.endsWith('.m4a'));
}

function isLibraryIndexRequest(url) {
  const p = stripBase(url.pathname);
  return p.startsWith('/library/') && p.endsWith('.json');
}

function isStaticAssetRequest(url) {
  const p = stripBase(url.pathname);
  return (
    p.endsWith('.css') || p.endsWith('.js') ||
    p.endsWith('.ttf') || p.endsWith('.woff') || p.endsWith('.woff2') ||
    p.endsWith('.svg') || p.endsWith('.webmanifest') || p.endsWith('.json')
  );
}

/* ============================================================================
   Response helpers
   ============================================================================ */
function createRangeResponse(blob, rangeHeader) {
  const size = blob.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return new Response(blob, {
      headers: { 'Content-Type': blob.type || 'audio/webm', 'Accept-Ranges': 'bytes' }
    });
  }
  let start, end;
  if (!match[1] && match[2]) {
    const suffix = parseInt(match[2], 10);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = match[1] ? parseInt(match[1], 10) : 0;
    end = match[2] ? parseInt(match[2], 10) : size - 1;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  const chunk = blob.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type': blob.type || 'audio/webm',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunk.size)
    }
  });
}

/* ============================================================================
   Request handlers
   ============================================================================ */
async function handleImageRequest(request) {
  const url = request.url;
  const cached = await cacheManager.get('images', url);
  if (cached) {
    fetch(request).then((r) => {
      if (r.ok) return r.clone().blob().then((b) => cacheManager.put('images', url, b));
    }).catch(() => {});
    return new Response(cached, { headers: { 'Content-Type': cached.type || 'image/jpeg' } });
  }
  const net = await fetch(request);
  if (net.ok) {
    net.clone().blob().then((b) => cacheManager.put('images', url, b)).catch(() => {});
  }
  return net;
}

async function handleSongRequest(request) {
  const url = request.url;
  const rangeHeader = request.headers.get('range');
  const cached = await cacheManager.get('songs', url);
  if (cached) {
    return rangeHeader
      ? createRangeResponse(cached, rangeHeader)
      : new Response(cached, { headers: { 'Content-Type': cached.type || 'audio/webm', 'Accept-Ranges': 'bytes' } });
  }
  const net = await fetch(request);
  if (net.ok && !rangeHeader) {
    net.clone().blob().then((b) => cacheManager.put('songs', url, b)).catch(() => {});
  }
  return net;
}

async function handleNavigationRequest(request) {
  try {
    const net = await fetch(request);
    if (net.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(`${BASE_PATH}/`)) ||
      (await caches.match(`${BASE_PATH}/index.html`)) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

async function handleStaticAssetRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(async (r) => {
      if (r.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, r.clone());
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const net = await fetch(request);
    if (net.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, net.clone());
    }
    return net;
  } catch {
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

async function overwriteCachedFiles(files) {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(files.map(async (file) => {
    try {
      const absoluteUrl = resolveAppUrl(file);
      const req = new Request(absoluteUrl, { cache: 'no-cache' });
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res);
    } catch (err) {
      console.warn('[SW] overwrite failed:', file, err.message);
    }
  }));
}

async function precache() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(CORE_ASSETS.map((url) =>
    cache.add(url).catch((err) => console.warn('[SW] precache miss:', url, err.message))
  ));
}

/* ============================================================================
   Lifecycle
   ============================================================================ */
self.addEventListener('install', (event) => {
  // Do NOT skipWaiting automatically — pwa.js will trigger SKIP_WAITING
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('mybeats-static-') && n !== STATIC_CACHE)
        .map((n) => caches.delete(n))
    );
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION }));
  })());
});

/* ============================================================================
   Fetch router
   ============================================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!isInAppScope(url.pathname)) return;

  if (request.mode === 'navigate' || isHtmlRequest(url)) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  if (isSongRequest(url)) {
    event.respondWith(handleSongRequest(request));
    return;
  }
  if (isLibraryIndexRequest(url) || isStaticAssetRequest(url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
});

/* ============================================================================
   Background Sync
   ============================================================================ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'content-sync' || event.tag === 'cache-recent-songs') {
    event.waitUntil(self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'SYNC_CACHE_RECENT' }));
    }));
  }
});

/* ============================================================================
   Push
   ============================================================================ */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MyBeats';
  const options = {
    body: data.body || 'New music available!',
    icon: `${BASE_PATH}/manifest/icons/icon-192x192.png`,
    badge: `${BASE_PATH}/manifest/icons/icon-72x72.png`,
    tag: data.tag || 'mybeats-notification',
    data: data.payload || {},
    actions: data.actions || []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length) {
        const client = list[0];
        client.focus();
        client.postMessage({ type: 'NOTIFICATION_CLICK', action: event.action, data });
      } else {
        self.clients.openWindow(`${BASE_PATH}/`);
      }
    })
  );
});

/* ============================================================================
   Message contract — must match pwa.js
   ============================================================================ */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      if (Array.isArray(data.urls)) {
        event.waitUntil((async () => {
          const cache = await caches.open(STATIC_CACHE);
          const results = await Promise.allSettled(data.urls.map(async (u) => {
            const abs = resolveAppUrl(u);
            const res = await fetch(abs, { cache: 'no-cache' });
            if (res.ok) await cache.put(abs, res.clone());
            return abs;
          }));
          if (event.source) {
            event.source.postMessage({ type: 'CACHE_URLS_RESULT', results });
          }
        })());
      }
      break;

    case 'UPDATE_PUSH':
      if (Array.isArray(data.files)) event.waitUntil(overwriteCachedFiles(data.files));
      break;

    case 'GET_CACHE_STATUS':
      event.waitUntil((async () => {
        const [imageUsage, songUsage, imageUrls, songUrls] = await Promise.all([
          cacheManager.getUsage('images'),
          cacheManager.getUsage('songs'),
          cacheManager.getAllCachedUrls('images'),
          cacheManager.getAllCachedUrls('songs')
        ]);
        if (event.source) {
          event.source.postMessage({
            type: 'CACHE_STATUS_RESULT',
            images: { usage: imageUsage, quota: cacheManager.imageQuota, count: imageUrls.length, urls: imageUrls },
            songs: { usage: songUsage, quota: cacheManager.songQuota, count: songUrls.length, urls: songUrls }
          });
        }
      })());
      break;

    case 'EXPAND_QUOTA':
      if (data.storeName && data.quota) {
        event.waitUntil(cacheManager.expandQuota(data.storeName, data.quota).then(() => {
          if (event.source) event.source.postMessage({ type: 'QUOTA_EXPANDED', storeName: data.storeName, newQuota: data.quota });
        }));
      }
      break;

    case 'CLEAR_CACHE':
      if (data.storeName) {
        event.waitUntil(cacheManager.clear(data.storeName).then(() => {
          if (event.source) event.source.postMessage({ type: 'CACHE_CLEARED', storeName: data.storeName });
        }));
      }
      break;

    case 'CACHE_SONG':
      if (data.url) {
        const abs = resolveAppUrl(data.url);
        event.waitUntil(
          fetch(abs)
            .then((r) => (r.ok ? r.blob().then((b) => cacheManager.put('songs', abs, b)) : null))
            .then(() => { if (event.source) event.source.postMessage({ type: 'SONG_CACHED', url: abs }); })
            .catch((err) => console.error('[SW] CACHE_SONG failed:', err))
        );
      }
      break;

    case 'DELETE_SONG':
      if (data.url) {
        event.waitUntil(cacheManager.delete('songs', data.url).then(() => {
          if (event.source) event.source.postMessage({ type: 'SONG_DELETED', url: data.url });
        }));
      }
      break;

    case 'CHECK_UPDATES':
      // No-op acknowledgment; real update is triggered via reg.update() in pwa.js
      if (event.source) event.source.postMessage({ type: 'UPDATE_CHECK_ACK' });
      break;
  }
});