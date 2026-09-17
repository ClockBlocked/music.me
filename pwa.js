(function () {
  'use strict';

  const CFG = {
    swPath: '/sw.js',
    syncTag: 'content-sync',
    whatsNewUrl: '/?page=whats-new',
    checkThrottleMs: 10 * 60 * 1000,
    periodicSyncIntervalMs: 6 * 60 * 60 * 1000,
    widgetTag: 'now-playing',
    fallbackAlbumArt: '/app/manifest/android/192.png'
  };

  let lastCheck = 0;
  let reloading = false;
  let swRegistration = null;

  function init() {
    if (!('serviceWorker' in navigator)) return;
    registerServiceWorker();
    handleDeepLinks();
    wireConnectivity();
    wireWidgetHooks();
  }

  async function registerServiceWorker() {
    try {
      swRegistration = await navigator.serviceWorker.register(CFG.swPath);

      if (swRegistration.waiting && navigator.serviceWorker.controller) {
        showAppUpdateToast(swRegistration);
      }

      swRegistration.addEventListener('updatefound', () => {
        const worker = swRegistration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showAppUpdateToast(swRegistration);
          }
        });
      });

      navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      await registerPeriodicSync(swRegistration);
      scheduleUpdateCheck(true);
    } catch (err) {}
  }

  async function registerPeriodicSync(reg) {
    try {
      if (!('periodicSync' in reg)) return;
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await reg.periodicSync.register(CFG.syncTag, { minInterval: CFG.periodicSyncIntervalMs });
      }
    } catch (err) {}
  }

  function scheduleUpdateCheck(immediate) {
    const run = () => throttledCheck();
    if (immediate) setTimeout(run, 3000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') run();
    });
    window.addEventListener('online', run);
  }

  function throttledCheck() {
    const now = Date.now();
    if (now - lastCheck < CFG.checkThrottleMs) return;
    lastCheck = now;
    checkForUpdates();
  }

  function checkForUpdates() {
    if (swRegistration) {
      swRegistration.update().catch(() => {});
    }
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATES' });
    }
  }

  function onServiceWorkerMessage(event) {
    const data = event.data || {};
    if (data.type === 'LIBRARY_UPDATED') {
      showLibraryUpdateToast();
    } else if (data.type === 'CONTENT_SYNCED') {
      handleContentSynced(data);
    }
  }

  function handleContentSynced(data) {
    window.dispatchEvent(new CustomEvent('mybeats:content-synced', {
      detail: { version: data.version, refreshed: data.refreshed }
    }));
    refreshContentImages();
  }

  function refreshContentImages() {
    const stamp = Date.now();
    document.querySelectorAll('img').forEach(img => {
      try {
        const url = new URL(img.src);
        if (url.origin !== window.location.origin) return;
        if (!url.pathname.startsWith('/content/')) return;
        url.searchParams.set('sync', stamp);
        img.src = url.toString();
      } catch (err) {}
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
          }
        },
        { label: 'Later', onClick: () => {} }
      ]
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
            } catch (err) {}
            window.location.assign(CFG.whatsNewUrl);
          }
        },
        { label: 'Close', onClick: () => {} }
      ]
    });
  }






/**
 「 Online & Offline 」
-------------------------
**/
  function wireConnectivity() {
    window.addEventListener('offline', () => {
      showToast({
        id: 'isOffline',
        title: 'You are offline',
        body: 'Cached pages and artwork are still available.',
        sticky: false,
        duration: 4000
      });
    });
    window.addEventListener('online', () => {
      showToast({
        id: 'isOnline',
        title: 'Back online',
        body: 'Syncing the latest content.',
        sticky: false,
        duration: 3000
      });
    });
  }






  function handleDeepLinks() {
    const params = new URLSearchParams(window.location.search);

    const page = params.get('page');
    if (page) {
      const go = () => {
        window.dispatchEvent(new CustomEvent('mybeats:navigate', { detail: { page: page } }));
        try {
          if (window.Router && typeof window.Router.navigate === 'function') {
            window.Router.navigate(page);
          }
        } catch (err) {}
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

  function wireWidgetHooks() {
    window.addEventListener('mybeats:trackchange', e => updateWidget(e.detail || {}));
  }

  async function updateWidget(track) {
    if (!('widgets' in navigator)) return;
    const data = {
      title: track.title || 'Nothing playing',
      artist: track.artist || 'MyBeats Music',
      albumArt: track.albumArt || CFG.fallbackAlbumArt,
      status: track.isPlaying ? 'Now playing' : 'Paused'
    };
    try {
      await navigator.widgets.updateByTag(CFG.widgetTag, data);
    } catch (err) {}
  }

  async function subscribePush(vapidPublicKey) {
    if (!('PushManager' in window)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
      const options = { userVisibleOnly: true };
      if (vapidPublicKey) options.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      return await reg.pushManager.subscribe(options);
    } catch (err) {
      return null;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function cacheUrls(urls) {
    if (navigator.serviceWorker.controller && Array.isArray(urls)) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls: urls });
    }
  }

  function injectStyles() {
    if (document.getElementById('pwa-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-styles';
    style.textContent = [
      '.pwa-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 24px);transform:translate(-50%,120%);width:min(92vw,420px);background:rgba(18,20,28,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px 18px;z-index:2147483000;box-shadow:0 18px 50px rgba(0,0,0,.55);transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .3s ease;opacity:0;color:#f3f4f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      '.pwa-toast.pwa-visible{transform:translate(-50%,0);opacity:1}',
      '.pwa-toast::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;border-radius:18px 18px 0 0;background:linear-gradient(135deg,#f4726a 0%,#ec4899 100%)}',
      '.pwa-toast-title{font-weight:700;font-size:15px;letter-spacing:.2px;margin-bottom:4px}',
      '.pwa-toast-body{font-size:13.5px;line-height:1.45;color:rgba(243,244,248,.78)}',
      '.pwa-toast-actions{display:flex;gap:10px;margin-top:12px}',
      '.pwa-btn{flex:1;border:0;cursor:pointer;font-weight:600;font-size:13px;padding:9px 14px;border-radius:12px;transition:transform .15s ease,filter .2s ease,background .2s ease}',
      '.pwa-btn:active{transform:scale(.96)}',
      '.pwa-btn-primary{background:linear-gradient(135deg,#f4726a 0%,#ec4899 100%);color:#fff}',
      '.pwa-btn-primary:hover{filter:brightness(1.08)}',
      '.pwa-btn-ghost{background:rgba(255,255,255,.08);color:rgba(243,244,248,.85)}',
      '.pwa-btn-ghost:hover{background:rgba(255,255,255,.14)}'
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
      opts.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pwa-btn ' + (action.primary ? 'pwa-btn-primary' : 'pwa-btn-ghost');
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          try {
            action.onClick && action.onClick();
          } finally {
            dismiss();
          }
        });
        row.appendChild(btn);
      });
      toast.appendChild(row);
    }

    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('pwa-visible')));

    if (!opts.sticky) {
      setTimeout(dismiss, opts.duration || 5000);
    }
    return dismiss;
  }

  window.MyBeatsPWA = {
    checkForUpdates: checkForUpdates,
    updateWidget: updateWidget,
    subscribePush: subscribePush,
    cacheUrls: cacheUrls,
    toast: showToast
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
