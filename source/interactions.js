/* ==================== 2. INTERACTIONS : interactions ==================== */
/* Includes: PopupsManager, PopupsBase, PopupsModal, PopupsDropdown, PopupsPopover, PopupsTooltip, PopupsToast, HeartStore, HeartButton, HeartButtonManager, FavoritesPlaylistsManager */
/* ==================== 2. INTERACTIONS ==================== */
class PopupsManager {
  constructor({ ui = null, container = document.body } = {}) {
    this.ui = ui;
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) this.container = document.body;
    this.active = new Set();
    this.stack = [];
    this._keyHandler = (e) => this._onKeyDown(e);
    this._resizeHandler = () => this._repositionPopups();
    this._tooltipEnterHandler = (e) => this._onTooltipEnter(e);
    document.addEventListener("keydown", this._keyHandler, true);
    window.addEventListener("resize", this._resizeHandler);
    this._ensureToastContainer();
    this.notificationHistory = [];
    this.enableTooltips();
  }
  static _esc(text = "") {
    return Utils.esc(text);
  }
  static _escAttr(text = "") {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  static get icons() {
    const svg = (attrs, content) => `<svg ${attrs}>${content}</svg>`;
    return {
      close(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`,
          `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`
        );
      },
      heart(size = 16, filled = false) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"`,
          `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`
        );
      },
      playlistAdd(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`
        );
      },
      link(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`
        );
      },
      checkBadge(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`
        );
      },
      user(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/>`
        );
      },
      album(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>`
        );
      },
      play(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"`,
          `<path d="M6 3L16 10L6 17V3Z"/>`
        );
      },
      eye(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
        );
      },
      undo(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>`
        );
      },
      info(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`
        );
      },
      success(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`
        );
      },
      warning(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`
        );
      },
      error(size = 16) {
        return svg(
          `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`,
          `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`
        );
      },
    };
  }
  register(popup) {
    if (this.destroyed) return;
    this.active.add(popup);
    this.stack.push(popup);
  }
  unregister(popup) {
    if (this.destroyed) return;
    this.active.delete(popup);
    const idx = this.stack.indexOf(popup);
    if (idx >= 0) this.stack.splice(idx, 1);
  }
  closeType(type) {
    [...this.stack].reverse().forEach((p) => {
      if (p.type === type && p.isOpen) p.hide();
    });
  }
  closeAll() {
    [...this.stack].reverse().forEach((p) => {
      if (p.isOpen) p.hide();
    });
  }
  cleanup() {
    this.closeAll();
  }
  destroy() {
    this.cleanup();
    this.destroyed = true;
    document.removeEventListener("keydown", this._keyHandler, true);
    window.removeEventListener("resize", this._resizeHandler);
    document.removeEventListener("mouseenter", this._tooltipEnterHandler, true);
  }
  _onKeyDown(e) {
    if (e.key !== "Escape") return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const p = this.stack[i];
      if (p.isOpen && p.type !== "toast" && p.closable !== false) {
        e.preventDefault();
        e.stopPropagation();
        p.hide();
        break;
      }
    }
  }
  _repositionPopups() {
    this.active.forEach((p) => {
      if (p.isOpen && typeof p.reposition === "function") p.reposition();
    });
  }
  _updateToastStack() {
    if (!this._toastContainer) return;
    const toasts = this._toastContainer.querySelectorAll(".popups-toast");
    toasts.forEach((toast, idx) => toast.setAttribute("data-stack-idx", idx));
  }
  _ensureToastContainer() {
    if (this._toastContainer) return this._toastContainer;
    let el = document.getElementById("popups-toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "popups-toast-container";
      el.className = "popups-toast-container";
      document.body.appendChild(el);
    }
    this._toastContainer = el;
    el.addEventListener("mouseenter", () => el.classList.add("popups-stack-expanded"));
    el.addEventListener("mouseleave", () => el.classList.remove("popups-stack-expanded"));
    return el;
  }
  modal(options) {
    const p = new PopupsModal(this, options);
    p.show();
    return p;
  }
  dialog(options) {
    const {
      title = "",
      message = "",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      dangerous = false,
      onConfirm,
      onCancel,
      size = "sm",
    } = options;
    const p = new PopupsModal(this, {
      title,
      size,
      closable: false,
      content: `<p class="popups-dialog-message">${PopupsManager._esc(message)}</p>`,
      actions: [
        { label: cancelLabel, action: "cancel", type: "secondary" },
        { label: confirmLabel, action: "confirm", type: dangerous ? "danger" : "primary" },
      ],
      onAction: (action) => {
        if (action === "confirm") onConfirm && onConfirm();
        else onCancel && onCancel();
      },
      onClose: () => {
        onCancel && onCancel();
      },
    });
    p.show();
    return p;
  }
  dropdown(options) {
    const p = new PopupsDropdown(this, options);
    p.show();
    return p;
  }
  popover(options) {
    const p = new PopupsPopover(this, options);
    p.show();
    return p;
  }
  tooltip(target, text) {
    const options = target instanceof HTMLElement ? { target, text } : target;
    const p = new PopupsTooltip(this, options);
    p.show();
    return p;
  }
  enableTooltips(selector = "[data-tooltip]") {
    this._tooltipSelector = selector;
    document.addEventListener("mouseenter", this._tooltipEnterHandler, true);
  }
  _onTooltipEnter(e) {
    const target = e.target.closest && e.target.closest(this._tooltipSelector);
    if (!target || target._popupsTooltip) return;
    const text = target.dataset.tooltip;
    if (!text || !text.trim()) return;
    const tip = new PopupsTooltip(this, { target, text });
    target._popupsTooltip = tip;
    tip._enterTimer = setTimeout(() => {
      tip._enterTimer = null;
      tip.show();
    }, 250);
    const removeListeners = () => {
      clearTimeout(tip._enterTimer);
      tip._enterTimer = null;
      tip.hide();
      target.removeEventListener("mouseleave", onLeave);
      target.removeEventListener("mousedown", onLeave);
      target._popupsTooltip = null;
    };
    const onLeave = () => removeListeners();
    target.addEventListener("mouseleave", onLeave, { once: true });
    target.addEventListener("mousedown", onLeave, { once: true });
  }
  toast(options) {
    this.notificationHistory.unshift({
      id: Date.now() + Math.random(),
      type: options.type || "info",
      title: options.title || "",
      message: options.message || "",
      timestamp: new Date().toISOString(),
    });
    if (this.notificationHistory.length > 50) this.notificationHistory.length = 50;
    const p = new PopupsToast(this, options);
    p.show();
    return p;
  }
  showNotificationPanel(anchorEl) {
    if (!anchorEl || !this.notificationHistory.length) return;
    const pageSize = 8;
    let currentOffset = 0;
    const buildList = (notifications) => {
      if (!notifications.length) return `<div class="notifications-empty">No notifications yet</div>`;
      return notifications
        .map(
          (n) => `
        <div class="notification-item notification-${n.type}">
          <span class="notification-icon">${PopupsManager.icons[n.type] ? PopupsManager.icons[n.type](16) : PopupsManager.icons.info(16)}</span>
          <div class="notification-content">
            ${n.title ? `<div class="notification-title">${PopupsManager._esc(n.title)}</div>` : ""}
            <div class="notification-message">${PopupsManager._esc(n.message)}</div>
          </div>
          <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>
      `
        )
        .join("");
    };
    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;
    const renderContent = (notifications, hasMore) => `
      <div class="notifications-popover-wrapper">
        <div class="notifications-header"><h3>Notifications</h3></div>
        <div class="notifications-list">${buildList(notifications)}</div>
        ${hasMore ? `<div class="notifications-load-more"><button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div></div>` : ""}
      </div>
    `;
    const popover = this.popover({
      content: renderContent(initialSlice, hasMore),
      persistentActions: ["load-more"],
      onAction: (action) => {
        if (action === "load-more") {
          const loadMoreBtn = popover.el.querySelector(".load-more-btn");
          const spinner = popover.el.querySelector(".load-more-spinner");
          if (loadMoreBtn && spinner) {
            loadMoreBtn.style.display = "none";
            spinner.style.display = "flex";
            setTimeout(() => {
              currentOffset += pageSize;
              const allCurrent = this.notificationHistory.slice(0, currentOffset + pageSize);
              const stillHasMore = this.notificationHistory.length > currentOffset + pageSize;
              const listEl = popover.el.querySelector(".notifications-list");
              if (listEl) listEl.innerHTML = buildList(allCurrent);
              const loadMoreSection = popover.el.querySelector(".notifications-load-more");
              if (loadMoreSection) {
                if (stillHasMore) {
                  loadMoreSection.innerHTML = `<button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div>`;
                } else loadMoreSection.remove();
              }
            }, 1500);
          }
        }
      },
    });
    const rect = anchorEl.getBoundingClientRect();
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const offsetLeft = 7 * rootFontSize;
    let left = rect.left + rect.width / 2 - offsetLeft;
    const popoverWidth = popover.el.offsetWidth;
    if (left + popoverWidth > window.innerWidth - 12) left = window.innerWidth - 12 - popoverWidth;
    if (left < 12) left = 12;
    popover.el.style.left = `${left}px`;
    popover.el.style.top = `${rect.bottom + 8}px`;
  }
  showSongMenu(songId, event) {
    const state = this.ui && this.ui.state;
    const song = state && typeof state.getSongById === "function" && state.getSongById(songId);
    if (!song) return null;
    const isFav =
      this.ui &&
      this.ui.favorites &&
      typeof this.ui.favorites.isSongFavorite === "function" &&
      this.ui.favorites.isSongFavorite(songId);
    const isCached =
      window.offlineCache && typeof window.offlineCache.isCached === "function" && window.offlineCache.isCached(song);
    const dataAttr = (data) => {
      if (!data) return "";
      return Object.entries(data)
        .map(([k, v]) => `data-${k}="${PopupsManager._escAttr(v)}"`)
        .join(" ");
    };
    return this.dropdown({
      triggerEvent: event,
      header: { title: song.title, subtitle: song.artist || "" },
      groups: [
        [
          {
            action: "add-fav",
            label: isFav ? "Remove from Favorites" : "Add to Favorites",
            iconHTML: PopupsManager.icons.heart(16, isFav),
            style: isFav ? "color:rgb(var(--colorPink))" : "",
          },
          { action: "add-playlist", label: "Add to Playlist", iconHTML: PopupsManager.icons.playlistAdd(16) },
        ],
        [
          { action: "copy-link", label: "Copy link", iconHTML: PopupsManager.icons.link(16) },
          {
            action: "offline-toggle",
            label: isCached ? "Remove offline copy" : "Cache for offline",
            iconHTML: PopupsManager.icons.checkBadge(16),
          },
        ],
        [
          {
            action: "view-artist",
            label: "View Artist",
            iconHTML: PopupsManager.icons.user(16),
            data: { artistId: song.artistId },
          },
          {
            action: "view-album",
            label: "View Album",
            iconHTML: PopupsManager.icons.album(16),
            data: { artistId: song.artistId, albumId: song.albumId },
          },
        ],
      ],
      itemExtraData: dataAttr,
      onAction: (action, item) => {
        if (action === "add-fav" && this.ui && this.ui.favorites) this.ui.favorites.toggleSong(song);
        else if (action === "add-playlist") {
          if (window.favoritesPlaylists && typeof window.favoritesPlaylists.addToPlaylistModal === "function")
            window.favoritesPlaylists.addToPlaylistModal(song);
        } else if (action === "view-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", song.artistId);
        } else if (action === "view-album") {
          if (this.ui && typeof this.ui.navigate === "function")
            this.ui.navigate("artist", song.artistId, song.albumId);
        } else if (action === "copy-link") {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          if (navigator.clipboard && navigator.clipboard.writeText)
            navigator.clipboard.writeText(url).then(() => this.toast({ message: "Link copied to clipboard" }));
        } else if (action === "offline-toggle") {
          if (!window.offlineCache) return;
          if (window.offlineCache.isCached && window.offlineCache.isCached(song)) {
            if (window.offlineCache.removeSong) window.offlineCache.removeSong(song);
          } else if (window.offlineCache.cacheSong) window.offlineCache.cacheSong(song);
        }
      },
    });
  }
  showArtistPopover(artistId, event) {
    const state = this.ui && this.ui.state;
    const artist = state && typeof state.getArtistById === "function" && state.getArtistById(artistId);
    if (!artist) return null;
    const albums = artist.albums && artist.albums.length ? artist.albums.length : 0;
    const listeners = artist.monthlyListeners || "24.5K";
    const topPlays = artist.topSong && artist.topSong.plays ? artist.topSong.plays : "12.3K";
    const content = `
      <div class="popover-gradient-border"></div>
      <div class="popover-content">
        <div class="popover-header">
          <div class="popover-avatar-wrapper">
            <img src="${PopupsManager._escAttr(artist.imageUrl)}" class="popover-avatar" alt="${PopupsManager._escAttr(artist.artist)}">
            <div class="popover-avatar-glow"></div>
          </div>
          <div class="popover-title-section">
            <h3 class="popover-artist-name">${PopupsManager._esc(artist.artist)}</h3>
            <span class="popover-genre-badge">${PopupsManager._esc(artist.genre || "Artist")}</span>
          </div>
        </div>
        <div class="popover-stats">
          <div class="popover-stat"><span class="popover-stat-value">${albums}</span><span class="popover-stat-label">Albums</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${listeners}</span><span class="popover-stat-label">Listeners</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${topPlays}</span><span class="popover-stat-label">Plays</span></div>
        </div>
        <div class="popups-popover-actions">
          <button class="popups-action-btn popups-action-primary" data-action="go-artist">${PopupsManager.icons.eye(18)}<span>View Profile</span></button>
          <button class="popups-action-btn popups-action-secondary" data-action="play-top">${PopupsManager.icons.play(18)}<span>Play Top Hit</span></button>
        </div>
        <div class="popover-footer">
          <div class="popover-waveform"><span></span><span></span><span></span><span></span><span></span></div>
          <span class="popover-tip">Click outside to close</span>
        </div>
      </div>
    `;
    return this.popover({
      triggerEvent: event,
      variant: "artist",
      size: "artist",
      content,
      onAction: (action) => {
        if (navigator.vibrate && typeof navigator.vibrate === "function") navigator.vibrate(20);
        if (action === "go-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", artistId);
        } else if (action === "play-top") {
          if (artist.albums && artist.albums.length) {
            const queue = Utils.albumQueue(state, artist.id, artist.albums[0].id);
            if (queue && queue.length && this.ui && this.ui.audioPlayer)
              this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
          }
        }
      },
    });
  }
}

class PopupsBase {
  constructor(manager, options = {}) {
    this.manager = manager;
    this.options = options;
    this.type = "base";
    this.closable = true;
    this.el = null;
    this.isOpen = false;
    this.destroyed = false;
  }
  render() {
    return document.createElement("div");
  }
  show() {
    if (this.destroyed) return;
    this.el = this.render();
    if (!this.el) return;
    this.manager.container.appendChild(this.el);
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.options.onClose && typeof this.options.onClose === "function") {
      try {
        this.options.onClose(this);
      } catch (e) {
        console.error(e);
      }
    }
    if (this.el) this.el.classList.remove("popups-open");
    setTimeout(() => this.destroy(), 220);
  }
  destroy() {
    if (this.destroyed) return;
    this.beforeDestroy && this.beforeDestroy();
    this.detachEvents && this.detachEvents();
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.destroyed = true;
    this.manager.unregister(this);
    this.el = null;
  }
  attachEvents() {}
  detachEvents() {}
}

class PopupsModal extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "modal";
    this.closable = options.closable !== false;
  }
  render() {
    const overlay = document.createElement("div");
    overlay.className = "popups-overlay";
    overlay.setAttribute("role", "presentation");
    const size = this.options.size || "md";
    const closable = this.closable;
    const actions = Array.isArray(this.options.actions) ? this.options.actions : [];
    const actionButtons = actions
      .map((a, idx) => {
        const action = a.action !== undefined ? a.action : String(idx);
        return `<button class="popups-btn popups-btn-${a.type || "secondary"}" data-action="${PopupsManager._escAttr(action)}" type="button">${PopupsManager._esc(a.label || "")}</button>`;
      })
      .join("");
    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true">
        ${this.options.title ? `<div class="popups-modal-header"><h3 class="popups-modal-title">${PopupsManager._esc(this.options.title)}</h3>${closable ? `<button class="popups-close-btn" data-action="close" aria-label="Close">${PopupsManager.icons.close(18)}</button>` : ""}</div>` : closable ? `<button class="popups-close-btn popups-close-float" data-action="close" aria-label="Close">${PopupsManager.icons.close(18)}</button>` : ""}
        <div class="popups-modal-body"></div>
        ${actionButtons ? `<div class="popups-modal-footer">${actionButtons}</div>` : ""}
      </div>
    `;
    const body = overlay.querySelector(".popups-modal-body");
    const content = this.options.content;
    if (content instanceof HTMLElement) body.appendChild(content);
    else if (content != null) body.innerHTML = String(content);
    return overlay;
  }
  attachEvents() {
    this._backdropMouseDown = (e) => {
      if (e.target === this.el) {
        e.preventDefault();
        this._bounce();
      }
    };
    this._onClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "close") {
        this.hide();
        return;
      }
      if (this.options.onAction && typeof this.options.onAction === "function") this.options.onAction(action, this);
      if (this.options.autoClose !== false) this.hide();
    };
    this.el.addEventListener("mousedown", this._backdropMouseDown);
    this.el.addEventListener("click", this._onClick);
  }
  detachEvents() {
    if (this.el) {
      this.el.removeEventListener("mousedown", this._backdropMouseDown);
      this.el.removeEventListener("click", this._onClick);
    }
  }
  _bounce() {
    const inner = this.el && this.el.querySelector(".popups-modal, .popups-dialog");
    if (!inner) return;
    inner.classList.remove("popups-bounce");
    void inner.offsetWidth;
    inner.classList.add("popups-bounce");
    setTimeout(() => inner.classList.remove("popups-bounce"), 300);
  }
}

class PopupsDropdown extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "dropdown";
  }
  render() {
    const el = document.createElement("div");
    el.className = "song menu";
    el.setAttribute("role", "menu");
    el.setAttribute("data-popup", "dropdown");
    const header = this.options.header;
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    const extras = this.options.itemExtraData || (() => "");
    const html = [];
    if (header) {
      html.push(
        `<div class="header"><span class="title">${PopupsManager._esc(header.title || "")}</span><span class="subtitle">${PopupsManager._esc(header.subtitle || "")}</span></div><div class="divider"></div>`
      );
    }
    let groupIndex = 0;
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      if (groupIndex > 0) html.push('<div class="divider"></div>');
      groupIndex += 1;
      html.push('<div class="group">');
      group.forEach((item) => {
        const extra = typeof extras === "function" ? extras(item.data) : extras;
        html.push(`
          <button class="option" data-action="${PopupsManager._escAttr(item.action)}" ${item.style ? `style="${PopupsManager._escAttr(item.style)}"` : ""} ${extra} type="button">
            ${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ""}
            <span class="label">${PopupsManager._esc(item.label || item.action)}</span>
          </button>
        `);
      });
      html.push("</div>");
    });
    el.innerHTML = html.join("");
    return el;
  }
  show() {
    super.show();
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.rect) this.positionAtRect(this.options.rect);
  }
  positionAt(x, y) {
    const pad = 12;
    this.el.style.setProperty("--popups-x", `${x}px`);
    this.el.style.setProperty("--popups-y", `${y}px`);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x,
        top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }
  positionAtRect(rect) {
    this.positionAt(rect.left, rect.bottom + 6);
  }
  attachEvents() {
    this._itemClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      const item = this._findItem(action);
      if (this.options.onAction && typeof this.options.onAction === "function") this.options.onAction(action, item);
      else if (item && typeof item.onClick === "function") item.onClick(action, item);
      this.hide();
    };
    this.el.addEventListener("click", this._itemClick);
    setTimeout(() => {
      this._outsideClick = (e) => {
        if (!this.el.contains(e.target)) this.hide();
      };
      document.addEventListener("click", this._outsideClick, { once: true });
    }, 0);
  }
  detachEvents() {
    if (this.el) this.el.removeEventListener("click", this._itemClick);
    if (this._outsideClick) {
      document.removeEventListener("click", this._outsideClick);
      this._outsideClick = null;
    }
  }
  _findItem(action) {
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }
}

class PopupsPopover extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "popover";
  }
  render() {
    const el = document.createElement("div");
    const size = this.options.size || "md";
    el.className = `popups-popover popups-popover-${size} popups-surface animate-popoverReveal`;
    el.setAttribute("data-popover", this.options.variant || "generic");
    el.innerHTML = `<div class="popups-popover-inner">${this.options.content || ""}</div>`;
    return el;
  }
  show() {
    super.show();
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.x != null && this.options.y != null) this.positionAt(this.options.x, this.options.y);
  }
  positionAt(x, y) {
    const pad = 20;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x,
        top = y;
      if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
      if (top < pad) top = pad;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }
  attachEvents() {
    this._onClick = (e) => {
      e.stopPropagation();
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (this.options.onAction && typeof this.options.onAction === "function")
        this.options.onAction(action, btn.dataset, this);
      if (!this.options.persistentActions || !this.options.persistentActions.includes(action)) this.hide();
    };
    this.el.addEventListener("click", this._onClick);
    setTimeout(() => {
      this._outsideClick = (e) => {
        if (!this.el.contains(e.target)) this.hide();
      };
      window.addEventListener("click", this._outsideClick, { once: true });
    }, 10);
  }
  detachEvents() {
    if (this.el) this.el.removeEventListener("click", this._onClick);
    if (this._outsideClick) {
      window.removeEventListener("click", this._outsideClick);
      this._outsideClick = null;
    }
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.options.onClose && typeof this.options.onClose === "function") {
      try {
        this.options.onClose(this);
      } catch (e) {
        console.error(e);
      }
    }
    if (this.el) this.el.style.animation = "popoverFadeOut 0.2s ease forwards";
    setTimeout(() => this.destroy(), 200);
  }
}

class PopupsTooltip extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "tooltip";
    this.target = options.target;
    this.text = options.text || "";
  }
  render() {
    const el = document.createElement("div");
    el.className = "popups-tooltip";
    el.textContent = this.text;
    return el;
  }
  show() {
    if (this.destroyed || !this.target || !this.target.isConnected) return;
    document.body.appendChild(this.el);
    this.position();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
  }
  position() {
    if (!this.target || !this.el) return;
    const rect = this.target.getBoundingClientRect();
    const tipRect = this.el.getBoundingClientRect();
    const pad = 8;
    let top = rect.top - tipRect.height - 6;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (top < pad) top = rect.bottom + 6;
    if (left < pad) left = pad;
    if (left + tipRect.width > window.innerWidth - pad) left = window.innerWidth - tipRect.width - pad;
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }
  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    if (this.el) this.el.classList.remove("popups-open");
    setTimeout(() => this.destroy(), 160);
  }
}

class PopupsToast extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "toast";
    this.duration = Number(options.duration) || 5000;
    this.remaining = this.duration;
    this.paused = false;
    this.dragStartX = 0;
    this.dragging = false;
  }
  render() {
    const type = ["info", "success", "warning", "error"].includes(this.options.type) ? this.options.type : "info";
    const iconMap = { info: "info", success: "success", warning: "warning", error: "error" };
    const el = document.createElement("div");
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const hasUndo = this.options.onUndo && typeof this.options.onUndo === "function";
    el.innerHTML = `
      <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
      <button class="popups-toast-close" aria-label="Close">${PopupsManager.icons.close(14)}</button>
      <div class="popups-toast-icon">${PopupsManager.icons[iconMap[type]](18)}</div>
      <div class="popups-toast-body">
        ${this.options.title ? `<div class="popups-toast-title">${PopupsManager._esc(this.options.title)}</div>` : ""}
        ${this.options.message ? `<div class="popups-toast-message">${PopupsManager._esc(this.options.message)}</div>` : ""}
      </div>
      ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${PopupsManager.icons.undo(14)}<span>Undo</span></button>` : ""}
    `;
    this._fill = el.querySelector(".popups-toast-progress-fill");
    return el;
  }
  show() {
    if (this.destroyed) return;
    this.el = this.render();
    const container = this.manager._ensureToastContainer();
    container.insertBefore(this.el, container.firstChild);
    this.manager._updateToastStack();
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => this.el.classList.add("popups-open"));
    this._lastTick = performance.now();
    this._tick();
  }
  hide(direction = null) {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    cancelAnimationFrame(this._raf);
    if (direction === "left") this.el.classList.add("popups-toast-out-left");
    else if (direction === "right") this.el.classList.add("popups-toast-out-right");
    else this.el.classList.add("popups-toast-fade-out");
    if (this.options.onClose && typeof this.options.onClose === "function") {
      setTimeout(() => {
        try {
          this.options.onClose(this);
        } catch (e) {
          console.error(e);
        }
      }, 250);
    }
    setTimeout(() => {
      this.destroy();
      this.manager._updateToastStack();
    }, 350);
  }
  attachEvents() {
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");
    this._onClose = () => this.hide();
    closeBtn && closeBtn.addEventListener("click", this._onClose);
    if (undoBtn) {
      this._onUndo = (e) => {
        e.stopPropagation();
        if (this.options.onUndo) this.options.onUndo(this);
        this.hide();
      };
      undoBtn.addEventListener("click", this._onUndo);
    }
    this._onEnter = () => {
      this.paused = true;
    };
    this._onLeave = () => {
      this.paused = false;
      this._lastTick = performance.now();
    };
    this.el.addEventListener("mouseenter", this._onEnter);
    this.el.addEventListener("mouseleave", this._onLeave);
    this._onPointerDown = (e) => {
      if (e.target.closest(".popups-toast-close, .popups-toast-undo")) return;
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.el.classList.add("popups-toast-dragging");
      this.el.style.transition = "none";
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    };
    this._onPointerMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      const scale = this._getStackScale();
      this.el.style.transform = `translate3d(${dx}px, 0, 0) scale(${scale})`;
    };
    this._onPointerUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const dx = e.clientX - this.dragStartX;
      this.el.classList.remove("popups-toast-dragging");
      this.el.style.transition = "";
      this.el.style.transform = "";
      if (dx > 100) {
        this.el.classList.add("popups-toast-out-right");
        setTimeout(() => this.destroy(), 350);
      } else if (dx < -100) {
        this.el.classList.add("popups-toast-out-left");
        setTimeout(() => this.destroy(), 350);
      }
    };
    this.el.addEventListener("pointerdown", this._onPointerDown);
    this.el.addEventListener("pointermove", this._onPointerMove);
    this.el.addEventListener("pointerup", this._onPointerUp);
    this.el.addEventListener("pointercancel", this._onPointerUp);
  }
  detachEvents() {
    if (!this.el) return;
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");
    closeBtn && closeBtn.removeEventListener("click", this._onClose);
    undoBtn && undoBtn.removeEventListener("click", this._onUndo);
    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("pointerdown", this._onPointerDown);
    this.el.removeEventListener("pointermove", this._onPointerMove);
    this.el.removeEventListener("pointerup", this._onPointerUp);
    this.el.removeEventListener("pointercancel", this._onPointerUp);
  }
  _getStackScale() {
    const idx = Number(this.el.getAttribute("data-stack-idx")) || 0;
    if (idx === 0) return 1;
    if (idx === 1) return 0.96;
    if (idx === 2) return 0.92;
    return 0.88;
  }
  _tick() {
    if (this.destroyed || !this.isOpen) return;
    const now = performance.now();
    if (!this.paused) {
      const dt = now - this._lastTick;
      this.remaining -= dt;
      const pct = Math.max(0, (this.remaining / this.duration) * 100);
      if (this._fill) this._fill.style.width = `${pct}%`;
      if (this.remaining <= 0) {
        this.hide();
        return;
      }
    }
    this._lastTick = now;
    this._raf = requestAnimationFrame(() => this._tick());
  }
}

class HeartStore {
  constructor(favoritesPlaylists, state) {
    this.fav = favoritesPlaylists;
    this.state = state;
    this._localOverrides = new Map();
  }
  _key(type, id) {
    return `${type}:${id}`;
  }
  is(type, id) {
    const override = this._localOverrides.get(this._key(type, id));
    if (override !== undefined) return override;
    const f = this.fav;
    switch (type) {
      case "song":
        return f.isSong(id);
      case "artist":
        return f.isArtist(id);
      case "album":
        return f.isAlbum(id);
      case "playlist":
        return typeof f.isPlaylist === "function" ? f.isPlaylist(id) : false;
      default:
        return false;
    }
  }
  setOverride(type, id, value) {
    this._localOverrides.set(this._key(type, id), value);
  }
  clearOverride(type, id) {
    this._localOverrides.delete(this._key(type, id));
  }
  async set(type, id, value) {
    if (this.is(type, id) === value) return;
    this.clearOverride(type, id);
    const f = this.fav;
    switch (type) {
      case "song": {
        const song = this.state.getSongById(id);
        if (song) await Promise.resolve(f.toggleSong(song));
        break;
      }
      case "artist":
        await Promise.resolve(f.toggleArtist(id));
        break;
      case "album":
        await Promise.resolve(f.toggleAlbum(id));
        break;
      case "playlist":
        if (typeof f.togglePlaylist === "function") await Promise.resolve(f.togglePlaylist(id));
        break;
    }
  }
}

class HeartButton {
  constructor(el, type, id, manager) {
    this.el = el;
    this.type = type;
    this.id = String(id);
    this.manager = manager;
    this.isHovering = false;
    this.phase = null;
    this._timer = null;
    this._onEnter = () => {
      this.isHovering = true;
      this.render();
    };
    this._onLeave = () => {
      this.isHovering = false;
      this.render();
    };
    this._onClick = (e) => this._handleClick(e);
    el.addEventListener("mouseenter", this._onEnter);
    el.addEventListener("mouseleave", this._onLeave);
    el.addEventListener("click", this._onClick);
    el.classList.add("heart-bound");
    this.render();
  }
  get liked() {
    return this.manager.store.is(this.type, this.id);
  }
  _icon() {
    if (this.phase === "error") return PopupsManager.icons.heart(20, true);
    if (this.phase === "confirm") return PopupsManager.icons.heart(20, true);
    if (this.liked) return this.isHovering ? PopupsManager.icons.heart(20, true) : PopupsManager.icons.heart(18, true);
    return this.isHovering ? PopupsManager.icons.heart(20, false) : PopupsManager.icons.heart(18, false);
  }
  render() {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }
    this.el.innerHTML = this._icon();
    const liked = this.liked;
    this.el.classList.toggle("favorited", liked);
    this.el.classList.toggle("is-favorite", liked);
    this.el.classList.toggle("heart-busy", this.phase !== null);
    this.el.setAttribute("aria-pressed", String(liked));
    this.el.setAttribute("title", liked ? "Remove from favorites" : "Add to favorites");
  }
  async _handleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (this.phase === "confirm" || this.phase === "error") return;
    const wasLiked = this.liked;
    try {
      if (wasLiked) {
        await this.manager.store.set(this.type, this.id, false);
        this.phase = null;
        this.render();
      } else {
        this.phase = "confirm";
        this.render();
        await this.manager.store.set(this.type, this.id, true);
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          this.phase = null;
          this.render();
        }, 3000);
      }
    } catch (err) {
      this.manager.store.setOverride(this.type, this.id, wasLiked);
      this.phase = "error";
      this.render();
      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        this.phase = null;
        this.render();
      }, 4000);
    }
  }
  sync() {
    if (this.phase === "confirm" || this.phase === "error") return;
    this.render();
  }
  destroy() {
    clearTimeout(this._timer);
    this._timer = null;
    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("click", this._onClick);
    this.el.classList.remove("heart-bound");
    this.manager._instances.delete(this.el);
  }
}

class HeartButtonManager {
  constructor(favoritesPlaylists, state) {
    this.store = new HeartStore(favoritesPlaylists, state);
    this._instances = new Map();
    window.addEventListener("mybeats:favorites-changed", (e) => {
      const { type, id } = e.detail || {};
      if (type && id != null) this._syncEntity(type, String(id));
      else this._syncAll();
    });
    this._observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) this.bindAll(node);
        }
      }
    });
    const startObserving = () => this._observer.observe(document.body, { childList: true, subtree: true });
    if (document.body) startObserving();
    else document.addEventListener("DOMContentLoaded", startObserving, { once: true });
  }
  static describe(el) {
    const d = el.dataset || {};
    if (d.heartType && d.heartId) return { type: d.heartType, id: d.heartId };
    if (d.favSong) return { type: "song", id: d.favSong };
    if (d.artistHeart) return { type: "artist", id: d.artistHeart };
    if (d.heartPlaylist) return { type: "playlist", id: d.heartPlaylist };
    if (d.action === "toggle-favorite-album" && d.albumId) return { type: "album", id: d.albumId };
    return null;
  }
  static get SELECTOR() {
    return [
      "[data-heart-type][data-heart-id]",
      "[data-fav-song]",
      "[data-artist-heart]",
      "[data-heart-playlist]",
      '[data-action="toggle-favorite-album"][data-album-id]',
    ].join(",");
  }
  bindAll(root = document) {
    if (root instanceof HTMLElement && root.matches?.(HeartButtonManager.SELECTOR)) this._bindOne(root);
    const els = root.querySelectorAll ? root.querySelectorAll(HeartButtonManager.SELECTOR) : [];
    els.forEach((el) => this._bindOne(el));
  }
  _bindOne(el) {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === "") return;
    const existing = this._instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) {
        existing.sync();
        return;
      }
      existing.destroy();
    }
    this._instances.set(el, new HeartButton(el, info.type, info.id, this));
  }
  _syncEntity(type, id) {
    for (const hb of this._instances.values()) {
      if (hb.type === type && hb.id === id) hb.sync();
    }
  }
  _syncAll() {
    for (const hb of this._instances.values()) hb.sync();
  }
  async toggle(type, id) {
    const sid = String(id);
    const next = !this.store.is(type, sid);
    await this.store.set(type, sid, next);
  }
  notify(type, id) {
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: type, id: String(id) } }));
  }
  prune() {
    for (const hb of [...this._instances.values()]) {
      if (!hb.el.isConnected) hb.destroy();
    }
  }
  destroy() {
    this._observer.disconnect();
    for (const hb of [...this._instances.values()]) hb.destroy();
    this._instances.clear();
  }
  async set(type, id, value) {
    await this.store.set(type, id, value);
    this.notify(type, id);
  }
}

class FavoritesPlaylistsManager {
  constructor(state) {
    this.state = state;
  }
  get popups() {
    return window.popups || null;
  }
  get ui() {
    return window.uiManager || null;
  }
  _toast(options) {
    const popups = this.popups;
    if (!popups) return;
    popups.toast({ type: options.type || "info", message: options.message, duration: 6000, onUndo: options.onUndo });
  }
  isSong(id) {
    return this.state.favoriteSongs.some((sid) => String(sid) === String(id));
  }
  toggleSong(song) {
    const id = String(song.id);
    const idx = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
    if (idx >= 0) {
      this.state.favoriteSongs.splice(idx, 1);
      this._toast({
        message: `Removed "${song.title}" from favorites`,
        onUndo: () => {
          if (!this.isSong(id)) {
            this.state.favoriteSongs.push(id);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        },
      });
    } else {
      this.state.favoriteSongs.push(id);
      this._toast({
        message: `Added "${song.title}" to favorites`,
        onUndo: () => {
          const i = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
          if (i >= 0) {
            this.state.favoriteSongs.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        },
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "song", id: id } }));
  }
  isArtist(id) {
    return this.state.favoriteArtists.some((aid) => String(aid) === String(id));
  }
  toggleArtist(id) {
    const sid = String(id);
    const idx = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
    const artist = this.state.getArtistById(id);
    const name = artist?.artist || "Artist";
    if (idx >= 0) {
      this.state.favoriteArtists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite artists`,
        onUndo: () => {
          if (!this.isArtist(id)) {
            this.state.favoriteArtists.push(sid);
            this.state.persist();
            this.ui?.render();
          }
        },
      });
    } else {
      this.state.favoriteArtists.push(sid);
      this._toast({
        message: `Added ${name} to favorite artists`,
        onUndo: () => {
          const i = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteArtists.splice(i, 1);
            this.state.persist();
            this.ui?.render();
          }
        },
      });
    }
    this.state.persist();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "artist", id: sid } }));
    this.ui?.render();
  }
  isAlbum(id) {
    return this.state.favoriteAlbums.some((aid) => String(aid) === String(id));
  }
  toggleAlbum(id) {
    const sid = String(id);
    const idx = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
    const album = this.state.getAlbumById(id);
    const name = album?.album || "Album";
    if (idx >= 0) {
      this.state.favoriteAlbums.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorite albums`,
        onUndo: () => {
          if (!this.isAlbum(id)) {
            this.state.favoriteAlbums.push(sid);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        },
      });
    } else {
      this.state.favoriteAlbums.push(sid);
      this._toast({
        message: `Added ${name} to favorite albums`,
        onUndo: () => {
          const i = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteAlbums.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        },
      });
    }
    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "album", id: sid } }));
  }
  isPlaylist(id) {
    return (this.state.favoritePlaylists || []).some((pid) => String(pid) === String(id));
  }
  togglePlaylist(id) {
    const pid = String(id);
    this.state.favoritePlaylists = this.state.favoritePlaylists || [];
    const idx = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
    const pl = this.getPlaylist(pid);
    const name = pl?.name || "Playlist";
    if (idx >= 0) {
      this.state.favoritePlaylists.splice(idx, 1);
      this._toast({
        message: `Removed ${name} from favorites`,
        onUndo: () => {
          if (!this.isPlaylist(pid)) {
            this.state.favoritePlaylists.push(pid);
            this.state.persist();
            this.ui?.render();
          }
        },
      });
    } else {
      this.state.favoritePlaylists.push(pid);
      this._toast({
        message: `Added ${name} to favorites`,
        onUndo: () => {
          const i = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
          if (i >= 0) {
            this.state.favoritePlaylists.splice(i, 1);
            this.state.persist();
            this.ui?.render();
          }
        },
      });
    }
    this.state.persist();
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", { detail: { type: "playlist", id: pid } }));
  }
  getPlaylist(id) {
    const sid = String(id);
    return this.state.playlists.find((p) => String(p.id) === sid);
  }
  createPlaylist({ name, description = "", tags = [] } = {}) {
    const playlist = {
      id: Utils.newId("pl"),
      name: name || "Unnamed Playlist",
      description,
      tags: Array.isArray(tags) ? tags : [],
      songs: [],
    };
    this.state.playlists.push(playlist);
    this.state.persist();
    return playlist;
  }
  renamePlaylist(id, newName) {
    const pl = this.getPlaylist(id);
    if (!pl || !newName.trim()) return false;
    pl.name = newName.trim();
    this.state.persist();
    return true;
  }
  updateDesc(id, description) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.description = description;
    this.state.persist();
    return true;
  }
  updateTags(id, tags) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    pl.tags = Array.isArray(tags) ? tags : [];
    this.state.persist();
    return true;
  }
  deletePlaylist(id) {
    const pl = this.getPlaylist(id);
    if (!pl) return false;
    const name = pl.name;
    this.state.playlists = this.state.playlists.filter((p) => String(p.id) !== String(id));
    this.state.persist();
    if (this.popups) this.popups.toast({ type: "success", message: `Playlist "${name}" deleted` });
    return true;
  }
  reorderSongs(id, newOrder) {
    const pl = this.getPlaylist(id);
    if (!pl || !Array.isArray(newOrder)) return false;
    pl.songs = newOrder.map((sid) => String(sid));
    this.state.persist();
    return true;
  }
  removeSongFromPlaylist(playlistId, songId) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return false;
    const sid = String(songId);
    const before = [...pl.songs];
    const song = this.state.getSongById(sid);
    pl.songs = pl.songs.filter((id) => String(id) !== sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Removed "${song.title}" from ${pl.name}`,
        onUndo: () => {
          pl.songs = before;
          this.state.persist();
          if (this.ui?.state?.currentPage === "editPlaylist" && this.ui.state.editingPlaylistId === playlistId)
            this.ui.render();
        },
      });
    }
    return true;
  }
  addSongToPlaylist(playlistId, songId) {
    const pl = this.getPlaylist(playlistId);
    const sid = String(songId);
    if (!pl || pl.songs.some((id) => String(id) === sid)) return false;
    const song = this.state.getSongById(sid);
    pl.songs.push(sid);
    this.state.persist();
    if (song) {
      this._toast({
        message: `Added "${song.title}" to ${pl.name}`,
        onUndo: () => {
          pl.songs = pl.songs.filter((id) => String(id) !== sid);
          this.state.persist();
          this.ui?.render();
        },
      });
    }
    return true;
  }
  openModal() {
    const popups = this.popups;
    if (!popups) return;
    const content = document.createElement("div");
    content.className = "popups-playlist-list";
    content.innerHTML = this.state.playlists.length
      ? this.state.playlists
          .map(
            (pl) => `
      <div class="popups-playlist-row" data-action="view" data-id="${Utils.esc(pl.id)}">
        <div class="popups-playlist-cover">${this._coverPreview(pl, 40)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        <div class="popups-playlist-actions">
          <button class="popups-icon-btn" data-action="edit" data-id="${Utils.esc(pl.id)}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="popups-icon-btn popups-danger" data-action="delete" data-id="${Utils.esc(pl.id)}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `
          )
          .join("")
      : `<p class="popups-empty">No playlists yet.</p>`;
    const modal = popups.modal({
      title: "Your Playlists",
      size: "md",
      content,
      closable: true,
      actions: [{ label: "Create New Playlist", action: "create", type: "primary" }],
      onAction: (action) => {
        if (action === "create") this.createNewPlaylist();
      },
    });
    content.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "view") {
        modal.hide();
        this.ui?.navigate("playlists");
        this.state.selectedPlaylistName = this.getPlaylist(id)?.name || null;
        this.ui?.render();
      } else if (action === "edit") {
        modal.hide();
        this.editPlaylist(id);
      } else if (action === "delete") {
        modal.hide();
        this._confirmDelete(id);
      }
    });
  }
  _coverPreview(pl, size = 40) {
    const state = this.state;
    const songs = pl.songs
      .map((sid) => state.getSongById(sid))
      .filter(Boolean)
      .slice(0, 4);
    if (!songs.length)
      return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${this._playlistIcon(Math.round(size * 0.5))}</div>`;
    if (songs.length === 1)
      return `<img src="${songs[0].coverUrl}" width="${size}" height="${size}" class="popups-cover-img">`;
    return `
      <div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">
        ${Array.from({ length: 4 })
          .map((_, i) =>
            songs[i]
              ? `<img src="${songs[i].coverUrl}" class="popups-cover-quarter">`
              : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`
          )
          .join("")}
      </div>
    `;
  }
  _playlistIcon(size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 9-10 9-10-9 10-9z"/></svg>`;
  }
  _confirmDelete(id) {
    const pl = this.getPlaylist(id);
    if (!pl) return;
    this.popups.dialog({
      title: "Delete Playlist?",
      message: `Are you sure you want to delete "${pl.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: () => {
        this.deletePlaylist(id);
        if (this.state.selectedPlaylistName === pl.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
        this.ui?.render();
      },
    });
  }
  createNewPlaylist() {
    const popups = this.popups;
    if (!popups) return;
    const wrap = document.createElement("div");
    wrap.className = "popups-form";
    wrap.innerHTML = `
      <div class="popups-field">
        <label for="new-pl-name">Playlist name</label>
        <input type="text" id="new-pl-name" class="popups-input" placeholder="e.g. Late Night Drive" autocomplete="off" maxlength="80">
      </div>
      <div class="popups-field">
        <label for="new-pl-desc">Description <span>(optional)</span></label>
        <textarea id="new-pl-desc" class="popups-textarea" rows="2" placeholder="What's this playlist about?" maxlength="240"></textarea>
      </div>
      <div class="popups-field">
        <label>Tags <span>(optional, press Enter)</span></label>
        <div class="popups-tag-input-wrap"><input type="text" id="new-pl-tags" class="popups-input" placeholder="e.g. Chill, Workout, Focus" maxlength="20"></div>
        <div class="popups-tag-list" id="new-pl-tag-list"></div>
      </div>
    `;
    const tagInput = wrap.querySelector("#new-pl-tags");
    const tagList = wrap.querySelector("#new-pl-tag-list");
    const tags = [];
    const renderTags = () => {
      tagList.innerHTML = tags
        .map(
          (t) => `
        <span class="popups-tag-chip" data-tag="${Utils.esc(t)}">
          ${Utils.esc(t)}
          <button type="button" class="popups-tag-remove" data-tag="${Utils.esc(t)}">×</button>
        </span>
      `
        )
        .join("");
    };
    tagInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const raw = tagInput.value.trim();
      if (!raw) return;
      const vals = raw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      vals.forEach((v) => {
        if (!tags.includes(v) && tags.length < 8) tags.push(v);
      });
      tagInput.value = "";
      renderTags();
    });
    tagList.addEventListener("click", (e) => {
      const btn = e.target.closest(".popups-tag-remove");
      if (!btn) return;
      const t = btn.dataset.tag;
      const i = tags.indexOf(t);
      if (i >= 0) tags.splice(i, 1);
      renderTags();
    });
    const nameInput = wrap.querySelector("#new-pl-name");
    const modal = popups.modal({
      title: "Create Playlist",
      size: "sm",
      content: wrap,
      closable: true,
      actions: [
        { label: "Cancel", action: "cancel", type: "secondary" },
        { label: "Create", action: "create", type: "primary" },
      ],
      onAction: (action, popup) => {
        if (action !== "create") return;
        const name = nameInput.value.trim();
        if (!name) {
          popups.toast({ type: "warning", message: "Please enter a playlist name" });
          return;
        }
        const description = wrap.querySelector("#new-pl-desc").value.trim();
        this.createPlaylist({ name, description, tags: [...tags] });
        popups.toast({ type: "success", message: `Playlist "${name}" created` });
        this.ui?.render();
        popup.hide();
      },
    });
    setTimeout(() => nameInput.focus(), 50);
  }
  editPlaylist(id) {
    if (!this.ui) return;
    this.state.editingPlaylistId = id;
    this.state.selectedPlaylistName = this.getPlaylist(id)?.name || null;
    this.ui.navigate("editPlaylist");
    history.pushState(null, "", `/playlist/${id}/edit`);
  }
  addToPlaylistModal(song) {
    const popups = this.popups;
    if (!popups) return;
    if (!this.state.playlists.length) {
      popups.modal({
        title: "Add to Playlist",
        size: "sm",
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [{ label: "Create Playlist", action: "create", type: "primary" }],
        onAction: (action) => {
          if (action === "create") this.createNewPlaylist();
        },
      });
      return;
    }
    const content = document.createElement("div");
    content.className = "popups-add-to-playlist";
    const songHeader = song
      ? `
      <div class="popups-song-context">
        <img src="${song.coverUrl || Config.DEFAULT_COVER}" class="popups-song-context-thumb" alt="">
        <div class="popups-song-context-info">
          <p class="popups-song-context-title">${Utils.esc(song.title)}</p>
          <p class="popups-song-context-sub">${Utils.esc(song.artist || "")}</p>
        </div>
      </div>
    `
      : "";
    const list = this.state.playlists
      .map(
        (pl) => `
      <button class="popups-playlist-row" data-action="add" data-id="${Utils.esc(pl.id)}">
        <div class="popups-playlist-cover">${this._coverPreview(pl, 44)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        ${pl.songs.some((sid) => String(sid) === String(song?.id)) ? `<span class="popups-in-list-badge">In playlist</span>` : ""}
      </button>
    `
      )
      .join("");
    content.innerHTML = songHeader + `<div class="popups-playlist-list">${list}</div>`;
    const modal = popups.modal({
      title: song ? `Add to Playlist` : "Select Playlist",
      size: "sm",
      content,
      closable: true,
      actions: [{ label: "Create New", action: "create", type: "secondary" }],
      onAction: (action) => {
        if (action === "create") {
          modal.hide();
          this.createNewPlaylist();
        }
      },
    });
    content.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();
      const plId = btn.dataset.id;
      const pl = this.getPlaylist(plId);
      if (!pl || !song) return;
      if (pl.songs.some((sid) => String(sid) === String(song.id))) {
        popups.toast({ type: "warning", message: `"${song.title}" is already in ${pl.name}` });
        return;
      }
      this.addSongToPlaylist(plId, song.id);
      modal.hide();
    });
  }
}

/*============= GLOBAL REGISTRY (window) =============*/
window.PopupsManager = PopupsManager;
window.PopupsBase = PopupsBase;
window.PopupsModal = PopupsModal;
window.PopupsDropdown = PopupsDropdown;
window.PopupsPopover = PopupsPopover;
window.PopupsTooltip = PopupsTooltip;
window.PopupsToast = PopupsToast;
window.HeartStore = HeartStore;
window.HeartButton = HeartButton;
window.HeartButtonManager = HeartButtonManager;
window.FavoritesPlaylistsManager = FavoritesPlaylistsManager;
