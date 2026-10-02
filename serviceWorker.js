const SW_VERSION = '20261002-combined';
const BASE_PATH = '/music.me';
const STATIC_CACHE = `mybeats-static-${SW_VERSION}`;

////////////////////  Cached Pages  ////
////////////////////////////////////////
const CORE_ASSETS = [
  `${BASE_PATH}/source/boot.js`,
  `${BASE_PATH}/source/runtime.js`,
  `${BASE_PATH}/source/core.js`,
  `${BASE_PATH}/source/builder.js`,
  `${BASE_PATH}/source/layouts.js`,
  `${BASE_PATH}/source/player.js`,
  `${BASE_PATH}/source/interactions.js`,

  // StyleSheets
  `${BASE_PATH}/stylings/base/fonts.css`,
  `${BASE_PATH}/stylings/base/themes.css`,
  `${BASE_PATH}/stylings/base/setup.css`,
  `${BASE_PATH}/stylings/base/icons.css`,
  `${BASE_PATH}/stylings/base/images.css`,
  `${BASE_PATH}/stylings/base/lists.css`
];



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    C A C H E   M A N A G E M E N T
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
class CacheStorageManager {
  constructor() {
    this.dbName = 'mybeats-cache';
    this.dbVersion = 1;
    this.defaultImageQuota = 50 * 1024 * 1024;
    this.defaultSongQuota = 100 * 1024 * 1024;
    this.imageQuota = this.defaultImageQuota;
    this.songQuota = this.defaultSongQuota;
    this._dbPromise = null;
  }

  async getDb() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('images')) {
          const imgStore = db.createObjectStore('images', { keyPath: 'url' });
          imgStore.createIndex('timestamp', 'timestamp', { unique: false });
          imgStore.createIndex('size', 'size', { unique: false });
        }

        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'url' });
          songStore.createIndex('timestamp', 'timestamp', { unique: false });
          songStore.createIndex('size', 'size', { unique: false });
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
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.openCursor();
      let total = 0;

      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          total += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve(total);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async has(storeName, url) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(url);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, url) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, url, blob) {
    const size = blob.size;
    const quota = storeName === 'images' ? this.imageQuota : this.songQuota;
    const currentUsage = await this.getUsage(storeName);

    if (currentUsage + size > quota) {
      await this.evictLRU(storeName, size);
    }

    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const entry = { url, blob, size, timestamp: Date.now() };
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, url) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async evictLRU(storeName, neededSpace) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const idx = store.index('timestamp');
      const request = idx.openCursor();
      let freed = 0;

      request.onsuccess = event => {
        const cursor = event.target.result;

        if (!cursor) {
          resolve();
          return;
        }

        if (freed >= neededSpace) {
          resolve();
          return;
        }

        freed += cursor.value.size || 0;
        cursor.delete();
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async expandQuota(storeName, newQuota) {
    if (storeName === 'images') {
      this.imageQuota = newQuota;
    } else if (storeName === 'songs') {
      this.songQuota = newQuota;
    }

    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const key = storeName === 'images' ? 'imageQuota' : 'songQuota';
      const request = store.put({ key, value: newQuota });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedUrls(storeName) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const cacheManager = new CacheStorageManager();




/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
        H E L P E R S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
function isInAppScope(pathname) {
  if (!BASE_PATH) return true;
  return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

function stripBase(pathname) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    const stripped = pathname.slice(BASE_PATH.length);
    return stripped || '/';
  }
  return pathname;
}

function resolveAppUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith('/')) {
    if (BASE_PATH && path.startsWith(BASE_PATH)) {
      return new URL(path, self.location.origin).href;
    }
    return new URL(`${BASE_PATH}${path}`, self.location.origin).href;
  }

  return new URL(
    `${BASE_PATH}/${path}`.replace(/\/+/g, '/'),
    self.location.origin
  ).href;
}



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   R E Q U E S T   T Y P E S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
function isHtmlRequest(url) {
  const p = stripBase(url.pathname);
  return p.endsWith('.html') || p === '/' || p === '/index.html';
}

function isImageRequest(url) {
  const p = stripBase(url.pathname);
  return (
    p.startsWith('/content/albumCovers/') ||
    p.startsWith('/content/artistPortraits/')
  );
}

function isSongRequest(url) {
  const p = stripBase(url.pathname);
  return p.startsWith('/content/songs/') && p.endsWith('.webm');
}

function isLibraryRequest(url) {
  const p = stripBase(url.pathname);
  return p === '/modules/library.js';
}

function isCssRequest(url) {
  return stripBase(url.pathname).endsWith('.css');
}

function isJsModuleRequest(url) {
  const p = stripBase(url.pathname);
  return p.startsWith('/modules/') && p.endsWith('.js');
}

function isStaticAssetRequest(url) {
  const p = stripBase(url.pathname);
  return (
    p.endsWith('.css') ||
    p.endsWith('.js') ||
    p.endsWith('.ttf') ||
    p.endsWith('.woff') ||
    p.endsWith('.woff2')
  );
}



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈=
   R E S P O N S E   H E L P E R S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
function createRangeResponse(blob, rangeHeader) {
  const size = blob.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!match) {
    return new Response(blob, {
      headers: {
        'Content-Type': blob.type || 'audio/webm',
        'Accept-Ranges': 'bytes'
      }
    });
  }

  let start;
  let end;

  if (!match[1] && match[2]) {
    const suffix = parseInt(match[2], 10);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = match[1] ? parseInt(match[1], 10) : 0;
    end = match[2] ? parseInt(match[2], 10) : size - 1;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${size}`
      }
    });
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



/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   R E Q U E S T   H A N D L E R S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
async function handleImageRequest(request) {
  const url = request.url;
  const cached = await cacheManager.get('images', url);

  if (cached) {
    // Stale-while-revalidate for images
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          return networkResponse
            .clone()
            .blob()
            .then(blob => cacheManager.put('images', url, blob));
        }
      })
      .catch(() => {});

    return new Response(cached);
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    const blob = await networkResponse.clone().blob();
    cacheManager.put('images', url, blob).catch(() => {});
  }

  return networkResponse;
}

async function handleSongRequest(request) {
  const url = request.url;
  const rangeHeader = request.headers.get('range');
  const cached = await cacheManager.get('songs', url);

  if (cached) {
    if (rangeHeader) {
      return createRangeResponse(cached, rangeHeader);
    }

    return new Response(cached, {
      headers: {
        'Content-Type': cached.type || 'audio/webm',
        'Accept-Ranges': 'bytes'
      }
    });
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok && !rangeHeader) {
    const blob = await networkResponse.clone().blob();
    cacheManager.put('songs', url, blob).catch(() => {});
  }

  return networkResponse;
}

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    return (
      cachedResponse ||
      await caches.match(`${BASE_PATH}/`) ||
      await caches.match(`${BASE_PATH}/index.html`)
    );
  }
}

async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update static assets in the background
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches
            .open(STATIC_CACHE)
            .then(cache => cache.put(request, networkResponse.clone()))
            .catch(() => {});
        }
      })
      .catch(() => {});

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    return new Response('', {
      status: 408,
      statusText: 'Request Timeout'
    });
  }
}

async function handleLibraryRequest(request) {
  return handleStaticAssetRequest(request);
}

async function overwriteCachedFiles(files) {
  const cache = await caches.open(STATIC_CACHE);

  for (const file of files) {
    try {
      const absoluteUrl = resolveAppUrl(file);
      const request = new Request(absoluteUrl, { cache: 'no-cache' });
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response);
      }
    } catch (error) {
      console.error('Failed to overwrite cached file:', file, error);
    }
  }
}

/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   E V E N T   L I S T E N E R S
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(error => {
        console.error('Precache failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(
              name =>
                name.startsWith('mybeats-static-') &&
                name !== STATIC_CACHE
            )
            .map(name => caches.delete(name))
        );
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
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

  if (isLibraryRequest(url)) {
    event.respondWith(handleLibraryRequest(request));
    return;
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
});

self.addEventListener('sync', event => {
  if (event.tag === 'cache-recent-songs') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_CACHE_RECENT' });
        });
      })
    );
  }
});

self.addEventListener('push', event => {
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

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          action,
          data
        });
      } else {
        self.clients.openWindow(`${BASE_PATH}/`);
      }
    })
  );
});

self.addEventListener('message', event => {
  const data = event.data || {};
  const { type, storeName, url, quota } = data;

  switch (type) {
    case 'UPDATE_PUSH':
      if (Array.isArray(data.files)) {
        event.waitUntil(overwriteCachedFiles(data.files));
      }
      break;

    case 'GET_CACHE_STATUS':
      event.waitUntil(
        Promise.all([
          cacheManager.getUsage('images'),
          cacheManager.getUsage('songs'),
          cacheManager.getAllCachedUrls('images'),
          cacheManager.getAllCachedUrls('songs')
        ]).then(([imageUsage, songUsage, imageUrls, songUrls]) => {
          if (event.source) {
            event.source.postMessage({
              type: 'CACHE_STATUS_RESULT',
              images: {
                usage: imageUsage,
                quota: cacheManager.imageQuota,
                count: imageUrls.length,
                urls: imageUrls
              },
              songs: {
                usage: songUsage,
                quota: cacheManager.songQuota,
                count: songUrls.length,
                urls: songUrls
              }
            });
          }
        })
      );
      break;

    case 'EXPAND_QUOTA':
      if (storeName && quota) {
        event.waitUntil(
          cacheManager.expandQuota(storeName, quota).then(() => {
            if (event.source) {
              event.source.postMessage({
                type: 'QUOTA_EXPANDED',
                storeName,
                newQuota: quota
              });
            }
          })
        );
      }
      break;

    case 'CLEAR_CACHE':
      if (storeName) {
        event.waitUntil(
          cacheManager.clear(storeName).then(() => {
            if (event.source) {
              event.source.postMessage({
                type: 'CACHE_CLEARED',
                storeName
              });
            }
          })
        );
      }
      break;

    case 'CACHE_SONG':
      if (url) {
        const absoluteUrl = resolveAppUrl(url);

        event.waitUntil(
          fetch(absoluteUrl)
            .then(response => {
              if (response.ok) {
                return response.blob().then(blob => {
                  return cacheManager.put('songs', absoluteUrl, blob);
                });
              }
            })
            .then(() => {
              if (event.source) {
                event.source.postMessage({
                  type: 'SONG_CACHED',
                  url: absoluteUrl
                });
              }
            })
            .catch(error => {
              console.error('CACHE_SONG failed:', error);
            })
        );
      }
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});
