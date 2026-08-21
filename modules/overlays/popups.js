/* ============================================================
   Popups — unified manager for Modals, Dialogs, Dropdowns,
   Popovers, Tooltips and Toasts.
   No Tailwind. Pure JS + CSS variables.
   ============================================================ */

export class Popups {
  constructor({ ui = null, container = document.body } = {}) {
    this.ui = ui;
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
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

  ///////////////  Helpers  ////////
  static _escape(text = "") {
    if (window.Utils && typeof window.Utils.escapeHtml === "function") {
      return window.Utils.escapeHtml(text);
    }
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  static _escapeAttr(text = "") {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      }
    };
  }

  ///////////////  Adding  -  Removing  ///////
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

  ///////////////  Positioning  ////////
  _onKeyDown(e) {
    if (e.key !== "Escape") return;
    // close the topmost closable non-toast popup
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
    toasts.forEach((toast, idx) => {
      toast.setAttribute("data-stack-idx", idx);
    });
  }

  //  Toasts Area [ check - or else - create ]
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

    //  Focus on all Toasts when hovering
    el.addEventListener("mouseenter", () =>
      el.classList.add("popups-stack-expanded")
    );

    //  Reverse
    el.addEventListener("mouseleave", () =>
      el.classList.remove("popups-stack-expanded")
    );

    return el;
  }

  /* ---------- public factories ---------- */

  modal(options) {
    const p = new _ModalPopup(this, options);
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
      size = "sm"
    } = options;

    const p = new _ModalPopup(this, {
      title,
      size,
      closable: false,
      content: `<p class="popups-dialog-message">${Popups._escape(message)}</p>`,
      actions: [
        { label: cancelLabel, action: "cancel", type: "secondary" },
        {
          label: confirmLabel,
          action: "confirm",
          type: dangerous ? "danger" : "primary"
        }
      ],
      onAction: (action) => {
        if (action === "confirm") onConfirm && onConfirm();
        else onCancel && onCancel();
      },
      onClose: () => {
        onCancel && onCancel();
      }
    });
    p.show();
    return p;
  }

  dropdown(options) {
    const p = new _DropdownPopup(this, options);
    p.show();
    return p;
  }

  popover(options) {
    const p = new _PopoverPopup(this, options);
    p.show();
    return p;
  }

  tooltip(target, text) {
    const options = target instanceof HTMLElement ? { target, text } : target;
    const p = new _TooltipPopup(this, options);
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

    const tip = new _TooltipPopup(this, { target, text });
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
      timestamp: new Date().toISOString()
    });
    if (this.notificationHistory.length > 50) {
      this.notificationHistory.length = 50;
    }

    const p = new _ToastPopup(this, options);
    p.show();
    return p;
  }



	
  showNotificationPanel(anchorEl) {
//////////////  Component creation  ////////
    if (!anchorEl || !this.notificationHistory.length) return;

    const pageSize = 8;
    let currentOffset = 0;

    //  Inner content
const buildList = (notifications) => {
    if (!notifications.length) {
        return `<div class="notifications-empty">No notifications yet</div>`;
    }
    return notifications
        .map(
            (n) => `
            <div class="notification-item notification-${n.type}">
                <span class="notification-icon">
                    ${Popups.icons[n.type] ? Popups.icons[n.type](16) : Popups.icons.info(16)}
                </span>
                <div class="notification-content">
                    ${n.title ? `<div class="notification-title">${Popups._escape(n.title)}</div>` : ''}
                    <div class="notification-message">${Popups._escape(n.message)}</div>
                </div>
                <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
            </div>
        `
        )
        .join("");
};

    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;

    // Component area
    const renderContent = (notifications, hasMore) => {
      return `
            <div class="notifications-popover-wrapper">
                <div class="notifications-header">
                    <h3>Notifications</h3>
                </div>
                <div class="notifications-list">
                    ${buildList(notifications)}
                </div>
                ${
                  hasMore
                    ? `
                    <div class="notifications-load-more">
                        <button class="load-more-btn" data-action="load-more">Load earlier</button>
                        <div class="load-more-spinner" style="display:none;">
                            <span class="spinner"></span>
                            Loading…
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;
    };

    // Pagination
    const popover = this.popover({
      //  PopOver + 8 notifications MAX
      content: renderContent(initialSlice, hasMore),

					persistentActions: ['load-more'],

      //  "Next" 8 notifications
      onAction: (action) => {
        if (action === "load-more") {
          const loadMoreBtn = popover.el.querySelector(".load-more-btn");
          const spinner = popover.el.querySelector(".load-more-spinner");
          if (loadMoreBtn && spinner) {
            loadMoreBtn.style.display = "none";
            spinner.style.display = "flex";
            setTimeout(() => {
              currentOffset += pageSize;
              const moreNotifications = this.notificationHistory.slice(
                currentOffset,
                currentOffset + pageSize
              );
              const allCurrent = this.notificationHistory.slice(
                0,
                currentOffset + pageSize
              );
              const stillHasMore =
                this.notificationHistory.length > currentOffset + pageSize;

              const listEl = popover.el.querySelector(".notifications-list");
              if (listEl) listEl.innerHTML = buildList(allCurrent);

              const loadMoreSection = popover.el.querySelector(
                ".notifications-load-more"
              );
              if (loadMoreSection) {
                if (stillHasMore) {
                  loadMoreSection.innerHTML = `
                                    <button class="load-more-btn" data-action="load-more">Load earlier</button>
                                    <div class="load-more-spinner" style="display:none;">
                                        <span class="spinner"></span>
                                        Loading…
                                    </div>
                                `;
                } else {
                  loadMoreSection.remove();
                }
              }
            }, 1500);
          }
        }
      }
    });
//////////////////////////////////////




//////////////////////  Positioning  ////////////
const rect = anchorEl.getBoundingClientRect();
const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
const offsetLeft = 7 * rootFontSize; // 7rem → px

let left = rect.left + rect.width / 2 - offsetLeft;
const popoverWidth = popover.el.offsetWidth;

// Keep it completely on screen
if (left + popoverWidth > window.innerWidth - 12) {
  left = window.innerWidth - 12 - popoverWidth;
}
if (left < 12) left = 12;

popover.el.style.left = `${left}px`;
popover.el.style.top = `${rect.bottom + 8}px`;
//////////////////////////////////////
  }



	
  showSongMenu(songId, event) {
    const state = this.ui && this.ui.state;
    const song =
      state &&
      typeof state.getSongById === "function" &&
      state.getSongById(songId);
    if (!song) return null;

    const isFav =
      this.ui &&
      this.ui.favorites &&
      typeof this.ui.favorites.isSongFavorite === "function" &&
      this.ui.favorites.isSongFavorite(songId);

    const isCached =
      window.offlineCache &&
      typeof window.offlineCache.isCached === "function" &&
      window.offlineCache.isCached(song);

    const dataAttr = (data) => {
      if (!data) return "";
      return Object.entries(data)
        .map(([k, v]) => `data-${k}="${Popups._escapeAttr(v)}"`)
        .join(" ");
    };

    return this.dropdown({
      triggerEvent: event,
      header: {
        title: song.title,
        subtitle: song.artist || ""
      },
      groups: [
        [
          {
            action: "add-fav",
            label: isFav ? "Remove from Favorites" : "Add to Favorites",
            iconHTML: Popups.icons.heart(16, isFav),
            style: isFav ? "color:rgb(var(--colorPink))" : ""
          },
          {
            action: "add-playlist",
            label: "Add to Playlist",
            iconHTML: Popups.icons.playlistAdd(16)
          }
        ],
        [
          {
            action: "copy-link",
            label: "Copy link",
            iconHTML: Popups.icons.link(16)
          },
          {
            action: "offline-toggle",
            label: isCached ? "Remove offline copy" : "Cache for offline",
            iconHTML: Popups.icons.checkBadge(16)
          }
        ],
        [
          {
            action: "view-artist",
            label: "View Artist",
            iconHTML: Popups.icons.user(16),
            data: { artistId: song.artistId }
          },
          {
            action: "view-album",
            label: "View Album",
            iconHTML: Popups.icons.album(16),
            data: { artistId: song.artistId, albumId: song.albumId }
          }
        ]
      ],
      itemExtraData: dataAttr,
      onAction: (action, item) => {
        if (action === "add-fav" && this.ui && this.ui.favorites) {
          this.ui.favorites.toggleFavoriteSong(song);
        } else if (action === "add-playlist") {
          if (
            window.favoritesPlaylists &&
            typeof window.favoritesPlaylists.addToPlaylistModal === "function"
          ) {
            window.favoritesPlaylists.addToPlaylistModal(song);
          }
        } else if (action === "view-artist") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", song.artistId);
          }
        } else if (action === "view-album") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", song.artistId, song.albumId);
          }
        } else if (action === "copy-link") {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
              this.toast({ message: "Link copied to clipboard" });
            });
          }
        } else if (action === "offline-toggle") {
          if (!window.offlineCache) return;
          if (
            window.offlineCache.isCached &&
            window.offlineCache.isCached(song)
          ) {
            if (window.offlineCache.removeSong)
              window.offlineCache.removeSong(song);
          } else if (window.offlineCache.cacheSong) {
            window.offlineCache.cacheSong(song);
          }
        }
      }
    });
  }

  showArtistPopover(artistId, event) {
    const state = this.ui && this.ui.state;
    const artist =
      state &&
      typeof state.getArtistById === "function" &&
      state.getArtistById(artistId);
    if (!artist) return null;

    const albums =
      artist.albums && artist.albums.length ? artist.albums.length : 0;
    const listeners = artist.monthlyListeners || "24.5K";
    const topPlays =
      artist.topSong && artist.topSong.plays ? artist.topSong.plays : "12.3K";

    const content = `
      <div class="popover-gradient-border"></div>
      <div class="popover-content">
        <div class="popover-header">
          <div class="popover-avatar-wrapper">
            <img src="${Popups._escapeAttr(artist.imageUrl)}" class="popover-avatar" alt="${Popups._escapeAttr(artist.artist)}">
            <div class="popover-avatar-glow"></div>
          </div>
          <div class="popover-title-section">
            <h3 class="popover-artist-name">${Popups._escape(artist.artist)}</h3>
            <span class="popover-genre-badge">${Popups._escape(artist.genre || "Artist")}</span>
          </div>
        </div>
        <div class="popover-stats">
          <div class="popover-stat">
            <span class="popover-stat-value">${albums}</span>
            <span class="popover-stat-label">Albums</span>
          </div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat">
            <span class="popover-stat-value">${listeners}</span>
            <span class="popover-stat-label">Listeners</span>
          </div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat">
            <span class="popover-stat-value">${topPlays}</span>
            <span class="popover-stat-label">Plays</span>
          </div>
        </div>
        <div class="popups-popover-actions">
          <button class="popups-action-btn popups-action-primary" data-action="go-artist">
            ${Popups.icons.eye(18)}
            <span>View Profile</span>
          </button>
          <button class="popups-action-btn popups-action-secondary" data-action="play-top">
            ${Popups.icons.play(18)}
            <span>Play Top Hit</span>
          </button>
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
        if (navigator.vibrate && typeof navigator.vibrate === "function") {
          navigator.vibrate(20);
        }
        if (action === "go-artist") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", artistId);
          }
        } else if (action === "play-top") {
          if (artist.albums && artist.albums.length) {
            const queue =
              window.Utils &&
              typeof window.Utils.buildAlbumQueue === "function" &&
              window.Utils.buildAlbumQueue(
                state,
                artist.id,
                artist.albums[0].id
              );
            if (queue && queue.length && this.ui && this.ui.audioPlayer) {
              this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            }
          }
        }
      }
    });
  }
}

/* ============================================================
   Internal popup implementations
   ============================================================ */

class _PopupBase {
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
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.destroyed = true;
    this.manager.unregister(this);
    this.el = null;
  }

  attachEvents() {}
  detachEvents() {}
}

class _ModalPopup extends _PopupBase {
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
    const actions = Array.isArray(this.options.actions)
      ? this.options.actions
      : [];

    const actionButtons = actions
      .map((a, idx) => {
        const action = a.action !== undefined ? a.action : String(idx);
        return `
          <button
            class="popups-btn popups-btn-${a.type || "secondary"}"
            data-action="${Popups._escapeAttr(action)}"
            type="button"
          >
            ${Popups._escape(a.label || "")}
          </button>
        `;
      })
      .join("");

    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true">
        ${
          this.options.title
            ? `
              <div class="popups-modal-header">
                <h3 class="popups-modal-title">${Popups._escape(this.options.title)}</h3>
                ${
                  closable
                    ? `<button class="popups-close-btn" data-action="close" aria-label="Close">${Popups.icons.close(
                        18
                      )}</button>`
                    : ""
                }
              </div>
            `
            : closable
              ? `<button class="popups-close-btn popups-close-float" data-action="close" aria-label="Close">${Popups.icons.close(
                  18
                )}</button>`
              : ""
        }
        <div class="popups-modal-body"></div>
        ${actionButtons ? `<div class="popups-modal-footer">${actionButtons}</div>` : ""}
      </div>
    `;

    const body = overlay.querySelector(".popups-modal-body");
    const content = this.options.content;
    if (content instanceof HTMLElement) {
      body.appendChild(content);
    } else if (content != null) {
      body.innerHTML = String(content);
    }

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
      if (
        this.options.onAction &&
        typeof this.options.onAction === "function"
      ) {
        this.options.onAction(action, this);
      }
      if (this.options.autoClose !== false) {
        this.hide();
      }
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
    const inner =
      this.el && this.el.querySelector(".popups-modal, .popups-dialog");
    if (!inner) return;
    inner.classList.remove("popups-bounce");
    void inner.offsetWidth;
    inner.classList.add("popups-bounce");
    setTimeout(() => inner.classList.remove("popups-bounce"), 300);
  }
}

class _DropdownPopup extends _PopupBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "dropdown";
  }

  render() {
    const el = document.createElement("div");
    el.className = "song menu";              // two one-word classes
    el.setAttribute("role", "menu");
    el.setAttribute("data-popup", "dropdown");

    const header = this.options.header;
    const groups = Array.isArray(this.options.groups)
      ? this.options.groups
      : [];
    const extras = this.options.itemExtraData || (() => "");

    const html = [];
    if (header) {
      html.push(`
        <div class="header">
          <span class="title">${Popups._escape(header.title || "")}</span>
          <span class="subtitle">${Popups._escape(header.subtitle || "")}</span>
        </div>
        <div class="divider"></div>
      `);
    }

    let groupIndex = 0;
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      if (groupIndex > 0)
        html.push('<div class="divider"></div>'); // group divider
      groupIndex += 1;
      html.push('<div class="group">');
      group.forEach((item) => {
        const extra = typeof extras === "function" ? extras(item.data) : extras;
        html.push(`
          <button
            class="option"
            data-action="${Popups._escapeAttr(item.action)}"
            ${item.style ? `style="${Popups._escapeAttr(item.style)}"` : ""}
            ${extra}
            type="button"
          >
            ${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ""}
            <span class="label">${Popups._escape(item.label || item.action)}</span>
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
    if (e && typeof e.clientX === "number") {
      this.positionAt(e.clientX, e.clientY);
    } else if (this.options.rect) {
      this.positionAtRect(this.options.rect);
    }
  }

  positionAt(x, y) {
    const pad = 12;
    this.el.style.setProperty("--popups-x", `${x}px`);
    this.el.style.setProperty("--popups-y", `${y}px`);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x;
      let top = y;

      if (rect.right > window.innerWidth - pad) {
        left = window.innerWidth - rect.width - pad;
      }
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) {
        top = window.innerHeight - rect.height - pad;
      }
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
      if (
        this.options.onAction &&
        typeof this.options.onAction === "function"
      ) {
        this.options.onAction(action, item);
      } else if (item && typeof item.onClick === "function") {
        item.onClick(action, item);
      }
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
    const groups = Array.isArray(this.options.groups)
      ? this.options.groups
      : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }
}

class _PopoverPopup extends _PopupBase {
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
    if (e && typeof e.clientX === "number") {
      this.positionAt(e.clientX, e.clientY);
    } else if (this.options.x != null && this.options.y != null) {
      this.positionAt(this.options.x, this.options.y);
    }
  }

  positionAt(x, y) {
    const pad = 20;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      let left = x;
      let top = y;

      if (rect.right > window.innerWidth - pad) {
        left = window.innerWidth - rect.width - pad;
      }
      if (left < pad) left = pad;
      if (rect.bottom > window.innerHeight - pad) {
        top = window.innerHeight - rect.height - pad;
      }
      if (top < pad) top = pad;

      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }

attachEvents() {
    this._onClick = (e) => {
        e.stopPropagation();
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;

        if (this.options.onAction && typeof this.options.onAction === 'function') {
            this.options.onAction(action, btn.dataset, this);
        }

        // Only hide if this action is not marked as persistent
        if (
            !this.options.persistentActions ||
            !this.options.persistentActions.includes(action)
        ) {
            this.hide();
        }
    };

    this.el.addEventListener('click', this._onClick);

    setTimeout(() => {
        this._outsideClick = (e) => {
            if (!this.el.contains(e.target)) this.hide();
        };
        window.addEventListener('click', this._outsideClick, { once: true });
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

class _TooltipPopup extends _PopupBase {
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
    if (left + tipRect.width > window.innerWidth - pad) {
      left = window.innerWidth - tipRect.width - pad;
    }

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

class _ToastPopup extends _PopupBase {
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
    const type = ["info", "success", "warning", "error"].includes(
      this.options.type
    )
      ? this.options.type
      : "info";

    const iconMap = {
      info: "info",
      success: "success",
      warning: "warning",
      error: "error"
    };

    const el = document.createElement("div");
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    const hasUndo =
      this.options.onUndo && typeof this.options.onUndo === "function";

    el.innerHTML = `
            <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
            <button class="popups-toast-close" aria-label="Close">${Popups.icons.close(14)}</button>
            <div class="popups-toast-icon">${Popups.icons[iconMap[type]](18)}</div>
            <div class="popups-toast-body">
                ${this.options.title ? `<div class="popups-toast-title">${Popups._escape(this.options.title)}</div>` : ""}
                ${this.options.message ? `<div class="popups-toast-message">${Popups._escape(this.options.message)}</div>` : ""}
            </div>
            ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${Popups.icons.undo(14)}<span>Undo</span></button>` : ""}
        `;

    this._fill = el.querySelector(".popups-toast-progress-fill");
    return el;
  }

  show() {
    if (this.destroyed) return;
    this.el = this.render();
    const container = this.manager._ensureToastContainer();

    // prepend so newest toast is at the top (stack idx 0)
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

    if (direction === "left") {
      this.el.classList.add("popups-toast-out-left");
    } else if (direction === "right") {
      this.el.classList.add("popups-toast-out-right");
    } else {
      this.el.classList.add("popups-toast-fade-out");
    }

    if (this.options.onClose && typeof this.options.onClose === "function") {
      setTimeout(() => {
        try {
          this.options.onClose(this);
        } catch (e) {
          console.error(e);
        }
      }, 250);
    }

    // remove the toast after exit animation and update the stack
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

    // smooth swipe via pointer events
    this._onPointerDown = (e) => {
      if (e.target.closest(".popups-toast-close, .popups-toast-undo")) return;
      this.dragging = true;
      this.dragStartX = e.clientX;

      // disable CSS transitions for direct 1:1 movement
      this.el.classList.add("popups-toast-dragging");
      this.el.style.transition = "none";

      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    };

    this._onPointerMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      const scale = this._getStackScale();
      // Use translate3d for buttery smooth movement
      this.el.style.transform = `translate3d(${dx}px, 0, 0) scale(${scale})`;
    };

    this._onPointerUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;

      const dx = e.clientX - this.dragStartX;
      this.el.classList.remove("popups-toast-dragging");

      // Let CSS transitions take over again
      this.el.style.transition = "";
      this.el.style.transform = "";

      if (dx > 100) {
        // glide off to the right
        this.el.classList.add("popups-toast-out-right");
        setTimeout(() => this.destroy(), 350);
      } else if (dx < -100) {
        // glide off to the left
        this.el.classList.add("popups-toast-out-left");
        setTimeout(() => this.destroy(), 350);
      }
      // else the toast will bounce back to its stacked position (CSS handles it)
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

  /**
   * Returns the stack scale from the element's data-stack-idx attribute.
   * Matches the CSS rules:
   *   idx 0 -> 1.0, idx 1 -> 0.96, idx 2 -> 0.92, idx ≥3 -> 0.88
   */
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

/* expose one global helper for inline use */
window.Popups = Popups;
