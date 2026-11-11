/* ============================================================================
   MyBeats PWA — single source of truth for:
   - Service worker registration + updates
   - Install prompt
   - Connectivity
   - Deep links
   - Widgets, push, cache API
   - Toasts (used everywhere)
   ============================================================================ */
(function () {
  'use strict';

  const CFG = {
    swPath: '/music.me/serviceWorker.js',
    swScope: '/music.me/',
    syncTag: 'content-sync',
    whatsNewUrl: 'https://clockblocked.github.io/music.me/?page=whats-new',
    checkThrottleMs: 10 * 60 * 1000,
    periodicSyncIntervalMs: 6 * 60 * 60 * 1000,
    widgetTag: 'now-playing',
    fallbackAlbumArt: 'https://clockblocked.github.io/music.me/manifest/android/192.png',
    installBannerTimeoutMs: 3000
  };

  const STATE = {
    supported: false,
    registration: null,
    installingWorker: null,
    waitingWorker: null,
    activeWorker: null,
    lastCheck: 0,
    reloading: false,
    hadController: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    deferredPrompt: null,
    installBanner: null,
    installBannerDismissed: false
  };

  /* -------------------------------------------------------------------------
     Toast UI
     ------------------------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById('pwa-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-styles';
    style.textContent = [
      '.pwa-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 24px);transform:translate(-50%,120%);width:min(92vw,420px);background:rgba(45,51,59,.85);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(173,186,199,.15);border-radius:18px;padding:16px 18px;z-index:2147483000;box-shadow:0 18px 50px rgba(0,0,0,.55);transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .3s ease;opacity:0;color:#cdd9e5;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      '.pwa-toast.pwa-visible{transform:translate(-50%,0);opacity:1}',
      '.pwa-toast::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;border-radius:18px 18px 0 0;background:linear-gradient(135deg,#f47067 0%,#d96c75 100%)}',
      '.pwa-toast-title{font-weight:700;font-size:15px;letter-spacing:.2px;margin-bottom:4px}',
      '.pwa-toast-body{font-size:13.5px;line-height:1.45;color:#768390}',
      '.pwa-toast-actions{display:flex;gap:10px;margin-top:12px}',
      '.pwa-btn{flex:1;border:0;cursor:pointer;font-weight:600;font-size:13px;padding:9px 14px;border-radius:12px;transition:transform .15s ease,filter .2s ease,background .2s ease}',
      '.pwa-btn:active{transform:scale(.96)}',
      '.pwa-btn-primary{background:linear-gradient(135deg,#f47067 0%,#d96c75 100%);color:#fff}',
      '.pwa-btn-primary:hover{filter:brightness(1.08)}',
      '.pwa-btn-ghost{background:rgba(173,186,199,.08);color:#adbac7}',
      '.pwa-btn-ghost:hover{background:rgba(173,186,199,.14)}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function showToast(opts) {
    injectStyles();
    const existing = document.getElementById(opts.id);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.id = opts.id;
    toast.setAttribute('role', 'status');

    const title = document.createElement('div');
    title.className = 'pwa-toast-title';
    title.textContent = opts.title || '';
    toast.appendChild(title);

    if (opts.body) {
      const body = document.createElement('div');
      body.className = 'pwa-toast-body';
      body.textContent = opts.body;
      toast.appendChild(body);
    }

    const dismiss = () => {
      toast.classList.remove('pwa-visible');
      setTimeout(() => toast.remove(), 500);
    };

    if (Array.isArray(opts.actions) && opts.actions.length) {
      const row = document.createElement('div');
      row.className = 'pwa-toast-actions';
      opts.actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pwa-btn ' + (action.primary ? 'pwa-btn-primary' : 'pwa-btn-ghost');
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          try { action.onClick && action.onClick(); } finally { dismiss(); }
        });
        row.appendChild(btn);
      });
      toast.appendChild(row);
    }

    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('pwa-visible')));
    if (!opts.sticky) setTimeout(dismiss, opts.duration || 5000);
    return dismiss;
  }

  /* -------------------------------------------------------------------------
     Install prompt banner
     ------------------------------------------------------------------------- */
  function createInstallBanner() {
    if (STATE.installBanner || STATE.installBannerDismissed) return STATE.installBanner;
    const banner = document.createElement('div');
    banner.className = 'installBanner';
    banner.setAttribute('data-overlay', 'install');
    banner.style.pointerEvents = 'none';
    banner.innerHTML = `
      <div class="text">
        <p class="title">Install App</p>
        <p class="desc">Add to Home Screen for fast, full-screen access</p>
      </div>
      <div class="arrow">
        <svg viewBox="0 0 24 24">
          <polyline points="7 17 12 22 17 17"/>
          <line x1="12" y1="22" x2="12" y2="2"/>
        </svg>
      </div>`;
    banner.addEventListener('click', async () => {
      if (!STATE.deferredPrompt) return;
      STATE.deferredPrompt.prompt();
      const { outcome } = await STATE.deferredPrompt.userChoice;
      STATE.deferredPrompt = null;
      if (outcome === 'accepted') banner.remove();
    });
    document.body.prepend(banner);
    STATE.installBanner = banner;
    return banner;
  }

  function wireInstallPrompt() {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      STATE.deferredPrompt = e;
      const banner = createInstallBanner();
      if (banner) {
        banner.style.pointerEvents = 'auto';
        banner.style.opacity = '1';
      }
    });

    window.addEventListener('appinstalled', () => {
      if (STATE.installBanner) STATE.installBanner.remove();
      STATE.deferredPrompt = null;
      STATE.installBanner = null;
      showToast({
        id: 'installed',
        title: 'Installed',
        body: 'MyBeats is now on your home screen.',
        duration: 4000
      });
    });

    // Auto-fade the pre-prompt banner after a few seconds (before user interacts)
    setTimeout(() => {
      const banner = STATE.installBanner;
      if (!banner || !banner.parentNode) return;
      if (!STATE.deferredPrompt) {
        banner.style.opacity = '0';
        banner.style.pointerEvents = 'none';
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 250);
      }
    }, CFG.installBannerTimeoutMs);
  }

  /* -------------------------------------------------------------------------
     Service worker registration
     ------------------------------------------------------------------------- */
  function detectSupport() {
    const hasSW = 'serviceWorker' in navigator;
    const hasFetch = 'fetch' in window;
    const hasPromise = typeof Promise !== 'undefined';
    const isSecure =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.includes('.local');
    STATE.supported = hasSW && hasFetch && hasPromise && isSecure;
    return STATE.supported;
  }

  async function registerServiceWorker() {
    try {
      const reg = await navigator.serviceWorker.register(CFG.swPath, {
        scope: CFG.swScope,
        updateViaCache: 'none'
      });
      STATE.registration = reg;

      // Worker already waiting (from previous visit)
      if (reg.waiting && navigator.serviceWorker.controller) {
        STATE.waitingWorker = reg.waiting;
        showAppUpdateToast(reg);
      }

      // Worker installing now
      if (reg.installing) trackWorker(reg.installing);

      // Future updates
      reg.addEventListener('updatefound', () => {
        if (reg.installing) trackWorker(reg.installing);
      });

      // First-install vs. update controller handling
      STATE.hadController = !!navigator.serviceWorker.controller;
      if (navigator.serviceWorker.controller) {
        STATE.activeWorker = navigator.serviceWorker.controller;
      }

      scheduleUpdateChecks(reg);
      registerPeriodicSync(reg);

      window.dispatchEvent(new CustomEvent('sw:ready', { detail: { registration: reg } }));
      return reg;
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err.message);
      window.dispatchEvent(new CustomEvent('sw:registration-failed', { detail: { error: err.message } }));
      return null;
    }
  }

  function trackWorker(worker) {
    STATE.installingWorker = worker;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        STATE.installingWorker = null;
        if (navigator.serviceWorker.controller) {
          STATE.waitingWorker = worker;
          if (STATE.registration) showAppUpdateToast(STATE.registration);
        }
      } else if (worker.state === 'activated') {
        STATE.activeWorker = worker;
        STATE.waitingWorker = null;
      } else if (worker.state === 'redundant') {
        STATE.installingWorker = null;
        STATE.waitingWorker = null;
      }
    });
  }

  function showAppUpdateToast(reg) {
    showToast({
      id: 'app-update',
      title: 'Update available',
      body: 'A new version of MyBeats is ready.',
      sticky: true,
      actions: [
        {
          label: 'Update',
          primary: true,
          onClick: () => {
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            // controllerchange handler will reload
          }
        },
        { label: 'Later', onClick: () => {} }
      ]
    });
  }

  function scheduleUpdateChecks(reg) {
    const check = () => {
      const now = Date.now();
      if (now - STATE.lastCheck < CFG.checkThrottleMs) return;
      STATE.lastCheck = now;
      reg.update().catch(() => {});
    };
    setTimeout(check, 3000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', check);
  }

  async function registerPeriodicSync(reg) {
    try {
      if (!('periodicSync' in reg)) return;
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await reg.periodicSync.register(CFG.syncTag, { minInterval: CFG.periodicSyncIntervalMs });
      }
    } catch { /* unsupported */ }
  }

  /* -------------------------------------------------------------------------
     Controller change: only reload when we had a controller (i.e., an update)
     ------------------------------------------------------------------------- */
  function wireControllerChange() {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!STATE.hadController) {
        // First-ever install — no reload needed
        STATE.hadController = true;
        STATE.activeWorker = navigator.serviceWorker.controller;
        return;
      }
      if (STATE.reloading) return;
      STATE.reloading = true;
      window.location.reload();
    });
  }

  /* -------------------------------------------------------------------------
     SW messages → app events
     ------------------------------------------------------------------------- */
  function wireServiceWorkerMessages() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data || {};

      switch (data.type) {
        case 'LIBRARY_UPDATED':
          showLibraryUpdateToast();
          break;

        case 'CONTENT_SYNCED':
          window.dispatchEvent(new CustomEvent('mybeats:content-synced', {
            detail: { version: data.version, refreshed: data.refreshed }
          }));
          refreshContentImages();
          break;

        case 'NOTIFICATION_CLICK':
          window.dispatchEvent(new CustomEvent('mybeats:notification-click', {
            detail: { action: data.action, data: data.data }
          }));
          break;

        case 'SONG_CACHED':
          window.dispatchEvent(new CustomEvent('mybeats:song-cached', { detail: { url: data.url } }));
          break;

        case 'SONG_DELETED':
          window.dispatchEvent(new CustomEvent('mybeats:song-deleted', { detail: { url: data.url } }));
          break;

        case 'CACHE_STATUS_RESULT':
          window.dispatchEvent(new CustomEvent('mybeats:cache-status', { detail: data }));
          break;

        case 'CACHE_CLEARED':
          window.dispatchEvent(new CustomEvent('mybeats:cache-cleared', { detail: { storeName: data.storeName } }));
          break;

        case 'QUOTA_EXPANDED':
          window.dispatchEvent(new CustomEvent('mybeats:quota-expanded', { detail: data }));
          break;

        case 'CACHE_URLS_RESULT':
          window.dispatchEvent(new CustomEvent('mybeats:cache-urls-result', { detail: { results: data.results } }));
          break;

        case 'SYNC_CACHE_RECENT':
          window.dispatchEvent(new CustomEvent('mybeats:sync-cache-recent'));
          break;

        case 'SW_ACTIVATED':
          window.dispatchEvent(new CustomEvent('sw:activated', { detail: { version: data.version } }));
          break;

        // Fallback: forward everything
        default:
          if (data.type) {
            window.dispatchEvent(new CustomEvent('sw:message', { detail: data }));
          }
      }
    });
  }

  function showLibraryUpdateToast() {
    showToast({
      id: 'library-update',
      title: 'MyBeats Music',
      body: 'New music content is available now!',
      sticky: true,
      actions: [
        {
          label: "What's new",
          primary: true,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('mybeats:navigate', { detail: { page: 'whats-new' } }));
            try {
              if (window.Router && typeof window.Router.navigate === 'function') {
                window.Router.navigate('whats-new');
                return;
              }
            } catch { /* noop */ }
            window.location.assign(CFG.whatsNewUrl);
          }
        },
        { label: 'Close', onClick: () => {} }
      ]
    });
  }

  function refreshContentImages() {
    const stamp = Date.now();
    document.querySelectorAll('img').forEach((img) => {
      try {
        const url = new URL(img.src);
        if (url.origin !== window.location.origin) return;
        if (!url.pathname.includes('/content/')) return;
        url.searchParams.set('sync', stamp);
        img.src = url.toString();
      } catch { /* noop */ }
    });
  }

  /* -------------------------------------------------------------------------
     Connectivity
     ------------------------------------------------------------------------- */
  function wireConnectivity() {
    window.addEventListener('offline', () => {
      STATE.isOnline = false;
      showToast({
        id: 'isOffline',
        title: 'You are offline',
        body: 'Cached pages and artwork are still available.',
        duration: 4000
      });
      window.dispatchEvent(new CustomEvent('sw:offline'));
    });
    window.addEventListener('online', () => {
      STATE.isOnline = true;
      showToast({
        id: 'isOnline',
        title: 'Back online',
        body: 'Syncing the latest content.',
        duration: 3000
      });
      if (STATE.registration) STATE.registration.update().catch(() => {});
      window.dispatchEvent(new CustomEvent('sw:online'));
    });
  }

  /* -------------------------------------------------------------------------
     Deep links (?page=, ?share=, protocol handler)
     ------------------------------------------------------------------------- */
  function wireDeepLinks() {
    const params = new URLSearchParams(window.location.search);

    const page = params.get('page');
    if (page) {
      const go = () => {
        window.dispatchEvent(new CustomEvent('mybeats:navigate', { detail: { page } }));
        try {
          if (window.Router && typeof window.Router.navigate === 'function') window.Router.navigate(page);
        } catch { /* noop */ }
      };
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', () => setTimeout(go, 300));
    }

    if (params.get('share') === '1') {
      window.dispatchEvent(new CustomEvent('mybeats:shared', {
        detail: {
          title: params.get('shared_title') || '',
          text: params.get('shared_text') || '',
          url: params.get('shared_url') || ''
        }
      }));
    }

    const q = params.get('q');
    if (q && q.indexOf('web+mybeats:') === 0) {
      window.dispatchEvent(new CustomEvent('mybeats:protocol', {
        detail: { query: q.replace('web+mybeats:', '') }
      }));
    }
  }

  /* -------------------------------------------------------------------------
     Widgets
     ------------------------------------------------------------------------- */
  function wireWidgets() {
    window.addEventListener('mybeats:trackchange', (e) => updateWidget(e.detail || {}));
  }

  async function updateWidget(track) {
    if (!('widgets' in navigator)) return;
    const data = {
      title: track.title || 'Nothing playing',
      artist: track.artist || 'MyBeats Music',
      albumArt: track.albumArt || CFG.fallbackAlbumArt,
      status: track.isPlaying ? 'Now playing' : 'Paused'
    };
    try { await navigator.widgets.updateByTag(CFG.widgetTag, data); } catch { /* noop */ }
  }

  /* -------------------------------------------------------------------------
     Public cache API (wraps SW postMessage)
     ------------------------------------------------------------------------- */
  function postToSW(message) {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) return resolve(null);
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 3000);
      channel.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data); };
      navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
    });
  }

  function cacheUrls(urls) {
    if (!Array.isArray(urls)) return Promise.resolve(null);
    return postToSW({ type: 'CACHE_URLS', urls });
  }

  function cacheSong(url) {
    return postToSW({ type: 'CACHE_SONG', url });
  }

  function deleteSong(url) {
    return postToSW({ type: 'DELETE_SONG', url });
  }

  function getCacheStatus() {
    return postToSW({ type: 'GET_CACHE_STATUS' });
  }

  function expandQuota(storeName, quota) {
    return postToSW({ type: 'EXPAND_QUOTA', storeName, quota });
  }

  function clearCache(storeName) {
    return postToSW({ type: 'CLEAR_CACHE', storeName });
  }

  function triggerUpdate() {
    if (!STATE.waitingWorker) {
      // fall back to a plain update check
      if (STATE.registration) STATE.registration.update().catch(() => {});
      return false;
    }
    STATE.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  /* -------------------------------------------------------------------------
     Push
     ------------------------------------------------------------------------- */
  async function subscribePush(vapidPublicKey) {
    if (!('PushManager' in window)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
      const options = { userVisibleOnly: true };
      if (vapidPublicKey) options.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      return await reg.pushManager.subscribe(options);
    } catch { return null; }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
    return out;
  }

  /* -------------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------------- */
  window.MyBeatsPWA = {
    // lifecycle
    register: registerServiceWorker,
    checkForUpdates: () => STATE.registration && STATE.registration.update().catch(() => {}),
    triggerUpdate,

    // cache
    cacheUrls,
    cacheSong,
    deleteSong,
    getCacheStatus,
    expandQuota,
    clearCache,

    // misc
    updateWidget,
    subscribePush,
    toast: showToast,

    // introspection
    get state() { return STATE; }
  };

  /* -------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------- */
  async function init() {
    wireConnectivity();
    wireDeepLinks();
    wireWidgets();
    wireInstallPrompt();
    wireControllerChange();
    wireServiceWorkerMessages();

    if (!detectSupport()) {
      console.warn('[PWA] Service worker unsupported in this context.');
      return;
    }
    await registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();