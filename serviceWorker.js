const SW_VERSION = 'v2025.07.1';

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
        if (request.result) {
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
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
        if (!cursor) { resolve(); return; }
        if (freed >= neededSpace) { resolve(); return; }
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

function isImageRequest(url) {
  return url.pathname.startsWith('/content/albumCovers/') ||
         url.pathname.startsWith('/content/artistPortraits/');
}

function isSongRequest(url) {
  return url.pathname.startsWith('/content/songs/') && url.pathname.endsWith('.webm');
}

function isLibraryRequest(url) {
  return url.pathname === '/modules/library.js';
}

function isCssRequest(url) {
  return url.pathname.endsWith('.css');
}

function isHtmlRequest(url) {
  return url.pathname.endsWith('.html') || url.pathname === '/';
}

function isJsModuleRequest(url) {
  return url.pathname.startsWith('/modules/') && url.pathname.endsWith('.js');
}

async function handleImageRequest(request) {
  const url = request.url;
  const cached = await cacheManager.get('images', url);

  if (cached) {
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        networkResponse.clone().blob().then(blob => {
          cacheManager.put('images', url, blob);
        });
      }
    }).catch(() => {});
    return new Response(cached);
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const blob = await networkResponse.clone().blob();
    cacheManager.put('images', url, blob);
  }
  return networkResponse;
}

async function handleSongRequest(request) {
  const url = request.url;
  const cached = await cacheManager.get('songs', url);

  if (cached) {
    return new Response(cached);
  }

  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const blob = await networkResponse.clone().blob();
      cacheManager.put('songs', url, blob);
    }
    return networkResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const blob = await networkResponse.clone().blob();
    cacheManager.put('songs', url, blob);
  }
  return networkResponse;
}

async function handleLibraryRequest(request) {
  const cache = await caches.open('mybeats-static-' + SW_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function handleNavigationRequest(request) {
  return fetch(request);
}

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('mybeats-static-') && name !== 'mybeats-static-' + SW_VERSION)
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

  if (isHtmlRequest(url)) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isCssRequest(url)) {
    event.respondWith(fetch(request));
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

  if (isJsModuleRequest(url)) {
    event.respondWith(fetch(request));
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
    icon: '/manifest/icons/icon-192x192.png',
    badge: '/manifest/icons/icon-72x72.png',
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
        client.postMessage({ type: 'NOTIFICATION_CLICK', action, data });
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', event => {
  const { type, storeName, url, quota } = event.data;

  switch (type) {
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
        event.waitUntil(
          fetch(url).then(response => {
            if (response.ok) {
              return response.blob().then(blob => {
                return cacheManager.put('songs', url, blob);
              });
            }
          }).then(() => {
            if (event.source) {
              event.source.postMessage({
                type: 'SONG_CACHED',
                url
              });
            }
          })
        );
      }
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});
