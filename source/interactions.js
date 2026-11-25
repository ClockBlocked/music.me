

//////////////////////////////  S E T U P  ///////
//////////////////////////////////////////////////
class PopupsManager {
  static cached = null;

  static iconGlossary() {
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

  static get icons() {
    if (!this.cached) this.cached = this.iconGlossary();
    return this.cached;
  }

  static escapeText(text = "") {
    return Utils.esc(text);
  }

  static escapeAttr(text = "") {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  constructor({ ui = null, container = document.body, tooltips = true } = {}) {
    this.ui = ui;
    this.container =
      typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) this.container = document.body;

    this.active = new Set();
    this.stack = [];
    this.destroyed = false;
    this.tooltipsEnabled = false;
    this.notificationHistory = [];

    this.keyHandler = (e) => this.onKeyDown(e);
    this.resizeHandler = () => this.repositionPopups();
    this.scrollHandler = () => this._scheduleReposition();
    this.tooltipEnterHandler = (e) => this.onTooltipEnter(e);

    document.addEventListener("keydown", this.keyHandler, true);
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("scroll", this.scrollHandler, true);

    this.ensureToastContainer();

    if (tooltips) this.enableTooltips();
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
    [...this.stack].reverse().forEach((popup) => {
      if (popup.type === type && popup.isOpen) popup.hide();
    });
  }

  closeAll() {
    [...this.stack].reverse().forEach((popup) => {
      if (popup.isOpen) popup.hide();
    });
  }

  cleanup() {
    this.closeAll();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Force-destroy every popup synchronously so nothing is left in the DOM.
    for (const popup of [...this.stack]) {
      try { popup.destroy(); } catch (e) { console.error(e); }
    }
    this.stack.length = 0;
    this.active.clear();

    if (this._scrollRaf) {
      cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = null;
    }

    document.removeEventListener("keydown", this.keyHandler, true);
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("scroll", this.scrollHandler, true);

    if (this.tooltipsEnabled) {
      document.removeEventListener("mouseenter", this.tooltipEnterHandler, true);
      this.tooltipsEnabled = false;
    }

    if (this.toastContainer) {
      if (this._onToastEnter) this.toastContainer.removeEventListener("mouseenter", this._onToastEnter);
      if (this._onToastLeave) this.toastContainer.removeEventListener("mouseleave", this._onToastLeave);
    }
  }

  // ----------------------------------------------
  // Keyboard / reposition
  // ----------------------------------------------
  onKeyDown(e) {
    if (e.key !== "Escape") return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const popup = this.stack[i];
      if (!popup.isOpen) continue;
      if (popup.type === "toast") continue;     // toasts handle their own Esc
      if (popup.escClosable === false) continue;
      e.preventDefault();
      e.stopPropagation();
      popup.hide();
      break;
    }
  }

  _scheduleReposition() {
    if (this._scrollRaf) return;
    this._scrollRaf = requestAnimationFrame(() => {
      this._scrollRaf = null;
      this.repositionPopups();
    });
  }

  repositionPopups() {
    this.active.forEach((popup) => {
      if (popup.isOpen && typeof popup.reposition === "function") {
        try { popup.reposition(); } catch (e) { console.error(e); }
      }
    });
  }

  // ----------------------------------------------
  // Toast container
  // ----------------------------------------------
  updateToastStack() {
    if (!this.toastContainer) return;
    const toasts = this.toastContainer.querySelectorAll(".popups-toast");
    toasts.forEach((toast, idx) => toast.setAttribute("data-stack-idx", idx));
  }

  ensureToastContainer() {
    if (this.toastContainer) return this.toastContainer;
    let el = document.getElementById("popups-toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "popups-toast-container";
      el.className = "popups-toast-container";
      document.body.appendChild(el);
    }
    this.toastContainer = el;
    this._onToastEnter = () => el.classList.add("popups-stack-expanded");
    this._onToastLeave = () => el.classList.remove("popups-stack-expanded");
    el.addEventListener("mouseenter", this._onToastEnter);
    el.addEventListener("mouseleave", this._onToastLeave);
    return el;
  }

  // ----------------------------------------------
  // Factories
  // ----------------------------------------------
  modal(options) {
    const popup = new PopupsModal(this, options);
    popup.show();
    return popup;
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

    let resolved = false;

    const popup = new PopupsModal(this, {
      title,
      size,
      closable: false,       // no × button — dialogs are explicit
      escClosable: true,     // Esc = cancel
      content: `<p class="popups-dialog-message">${PopupsManager.escapeText(message)}</p>`,
      actions: [
        { label: cancelLabel, action: "cancel", type: "secondary" },
        { label: confirmLabel, action: "confirm", type: dangerous ? "danger" : "primary" },
      ],
      onAction: (action) => {
        if (action === "confirm") {
          resolved = true;
          if (typeof onConfirm === "function") onConfirm();
        } else if (action === "cancel") {
          resolved = true;
          if (typeof onCancel === "function") onCancel();
        }
      },
      onClose: () => {
        if (!resolved && typeof onCancel === "function") onCancel();
      },
    });

    popup.show();
    return popup;
  }

  dropdown(options) {
    const popup = new PopupsDropdown(this, options);
    popup.show();
    return popup;
  }

  popover(options) {
    const popup = new PopupsPopover(this, options);
    popup.show();
    return popup;
  }

  tooltip(target, text) {
    const options = target instanceof HTMLElement ? { target, text } : target;
    const popup = new PopupsTooltip(this, options);
    popup.show();
    return popup;
  }

  enableTooltips(selector = "[data-tooltip]") {
    if (this.tooltipsEnabled) return;
    this.tooltipSelector = selector;
    document.addEventListener("mouseenter", this.tooltipEnterHandler, true);
    this.tooltipsEnabled = true;
  }

  onTooltipEnter(e) {
    const target = e.target.closest && e.target.closest(this.tooltipSelector);
    if (!target || target.popupsTooltip) return;

    const text = target.dataset.tooltip;
    if (!text || !text.trim()) return;

    const tip = new PopupsTooltip(this, { target, text });
    target.popupsTooltip = tip;

    tip.enterTimer = setTimeout(() => {
      tip.enterTimer = null;
      tip.show();
    }, 250);

    const onLeave = () => {
      clearTimeout(tip.enterTimer);
      tip.enterTimer = null;
      tip.hide();
      target.removeEventListener("mouseleave", onLeave);
      target.removeEventListener("mousedown", onLeave);
      target.removeEventListener("blur", onLeave);
      target.popupsTooltip = null;
    };

    target.addEventListener("mouseleave", onLeave, { once: true });
    target.addEventListener("mousedown", onLeave, { once: true });
    target.addEventListener("blur", onLeave, { once: true });
  }

  // ----------------------------------------------
  // Toast
  // ----------------------------------------------
  toast(options) {
    this.notificationHistory.unshift({
      id: Date.now() + Math.random(),
      type: options.type || "info",
      title: options.title || "",
      message: options.message || "",
      timestamp: new Date().toISOString(),
    });
    if (this.notificationHistory.length > 50) this.notificationHistory.length = 50;

    const popup = new PopupsToast(this, options);
    popup.show();
    return popup;
  }

  // ----------------------------------------------
  // Notification panel
  // ----------------------------------------------
  showNotificationPanel(anchorEl) {
    if (!anchorEl || !this.notificationHistory.length) return;

    const pageSize = 8;
    let currentOffset = 0;
    let loadMoreTimer = null;

    const buildList = (notifications) => {
      if (!notifications.length) {
        return `<div class="notifications-empty">No notifications yet</div>`;
      }
      return notifications
        .map((n) => {
          const safeType = ["info", "success", "warning", "error"].includes(n.type)
            ? n.type
            : "info";
          return `
            <div class="notification-item notification-${safeType}">
              <span class="notification-icon">${PopupsManager.icons[safeType](16)}</span>
              <div class="notification-content">
                ${n.title ? `<div class="notification-title">${PopupsManager.escapeText(n.title)}</div>` : ""}
                <div class="notification-message">${PopupsManager.escapeText(n.message)}</div>
              </div>
              <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
            </div>
          `;
        })
        .join("");
    };

    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;

    const renderContent = (notifications, showMore) => `
      <div class="notifications-popover-wrapper">
        <div class="notifications-header"><h3>Notifications</h3></div>
        <div class="notifications-list">${buildList(notifications)}</div>
        ${
          showMore
            ? `
            <div class="notifications-load-more">
              <button class="load-more-btn" data-action="load-more">
              Load earlier
              </button>
              
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

    const popover = this.popover({
      content: renderContent(initialSlice, hasMore),
      persistentActions: ["load-more"],
      onAction: (action) => {
        if (action !== "load-more") return;
        if (!popover.el) return;

        const loadMoreBtn = popover.el.querySelector(".load-more-btn");
        const spinner = popover.el.querySelector(".load-more-spinner");
        if (!loadMoreBtn || !spinner) return;

        loadMoreBtn.style.display = "none";
        spinner.style.display = "flex";

        loadMoreTimer = setTimeout(() => {
          loadMoreTimer = null;
          if (!popover.el) return; // Guard against close during spinner

          currentOffset += pageSize;
          const allCurrent = this.notificationHistory.slice(0, currentOffset + pageSize);
          const stillHasMore = this.notificationHistory.length > currentOffset + pageSize;

          const listEl = popover.el.querySelector(".notifications-list");
          if (listEl) listEl.innerHTML = buildList(allCurrent);

          const loadMoreSection = popover.el.querySelector(".notifications-load-more");
          if (loadMoreSection) {
            if (stillHasMore) {
              loadMoreSection.innerHTML = `<button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div>`;
            } else {
              loadMoreSection.remove();
            }
          }
        }, 1500);
      },
    });

    const originalBeforeDestroy = popover.beforeDestroy;
    popover.beforeDestroy = () => {
      if (loadMoreTimer) {
        clearTimeout(loadMoreTimer);
        loadMoreTimer = null;
      }
      if (typeof originalBeforeDestroy === "function") originalBeforeDestroy();
    };

    const rect = anchorEl.getBoundingClientRect();
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const offsetLeft = 7 * rootFontSize;
    let left = rect.left + rect.width / 2 - offsetLeft;

    const popoverWidth = popover.el.offsetWidth;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - popoverWidth;
    }
    if (left < 12) left = 12;

    popover.el.style.left = `${left}px`;
    popover.el.style.top = `${rect.bottom + 8}px`;
  }

  // ----------------------------------------------
  // Fallback clipboard
  // ----------------------------------------------
  _fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) this.toast({ message: "Link copied to clipboard" });
      else this.toast({ type: "error", message: "Could not copy link" });
    } catch (e) {
      this.toast({ type: "error", message: "Could not copy link" });
    }
  }

  // ----------------------------------------------
  // Song menu
  // ----------------------------------------------
  showSongMenu(songId, event) {
    const state = this.ui && this.ui.state;
    const song =
      state && typeof state.getSongById === "function" && state.getSongById(songId);
    if (!song) return null;

    const getIsFav = () =>
      Boolean(
        this.ui &&
          this.ui.favorites &&
          typeof this.ui.favorites.isSong === "function" &&
          this.ui.favorites.isSong(songId)
      );

    const isFav = getIsFav();

    const isCached =
      window.offlineCache &&
      typeof window.offlineCache.isCached === "function" &&
      window.offlineCache.isCached(song);

    const dataAttr = (data) => {
      if (!data) return "";
      return Object.entries(data)
        .map(([key, value]) => `data-${key}="${PopupsManager.escapeAttr(value)}"`)
        .join(" ");
    };

    const dropdown = this.dropdown({
      triggerEvent: event,
      header: { title: song.title, subtitle: song.artist || "" },
      persistentActions: ["add-fav"], // ← keeps menu open on favorite toggle
      groups: [
        [
          {
            action: "add-fav",
            label: isFav ? "Remove from Favorites" : "Add to Favorites",
            iconHTML: PopupsManager.icons.heart(16, isFav),
            style: isFav ? "color:rgb(var(--colorPink))" : "",
          },
          {
            action: "add-playlist",
            label: "Add to Playlist",
            iconHTML: PopupsManager.icons.playlistAdd(16),
          },
        ],
        [
          {
            action: "copy-link",
            label: "Copy link",
            iconHTML: PopupsManager.icons.link(16),
          },
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
      onAction: async (action, item) => {
        if (action === "add-fav" && this.ui && this.ui.favorites) {
          this.ui.favorites.toggleSong(song);
        } else if (action === "add-playlist") {
          if (
            window.favoritesPlaylists &&
            typeof window.favoritesPlaylists.addToPlaylistModal === "function"
          ) {
            window.favoritesPlaylists.addToPlaylistModal(song);
          }
        } else if (action === "view-artist") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", item?.data?.artistId || song.artistId);
          }
        } else if (action === "view-album") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate(
              "artist",
              item?.data?.artistId || song.artistId,
              item?.data?.albumId || song.albumId
            );
          }
        } else if (action === "copy-link") {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
              await navigator.clipboard.writeText(url);
              this.toast({ message: "Link copied to clipboard" });
            } catch {
              this._fallbackCopy(url);
            }
          } else {
            this._fallbackCopy(url);
          }
        } else if (action === "offline-toggle") {
          if (!window.offlineCache) return;
          if (window.offlineCache.isCached && window.offlineCache.isCached(song)) {
            if (window.offlineCache.removeSong) window.offlineCache.removeSong(song);
          } else if (window.offlineCache.cacheSong) {
            window.offlineCache.cacheSong(song);
          }
        }
      },
    });

    const updateFavoriteOption = () => {
      if (!dropdown.el || !dropdown.isOpen) return;
      const favoriteButton = dropdown.el.querySelector('[data-action="add-fav"]');
      if (!favoriteButton) return;

      const isFavorite = getIsFav();
      const label = favoriteButton.querySelector(".label");
      const icon = favoriteButton.querySelector(".icon");

      if (label) {
        label.textContent = isFavorite
          ? "Remove from Favorites"
          : "Add to Favorites";
      }
      if (icon) icon.innerHTML = PopupsManager.icons.heart(16, isFavorite);
      favoriteButton.style.color = isFavorite ? "rgb(var(--colorPink))" : "";
      favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    };

    const onFavoritesChanged = (ev) => {
      const detail = ev.detail || {};
      if (
        String(detail.type) === "song" &&
        String(detail.id) === String(songId)
      ) {
        updateFavoriteOption();
      }
    };

    window.addEventListener("mybeats:favorites-changed", onFavoritesChanged);
    dropdown.beforeDestroy = () => {
      window.removeEventListener("mybeats:favorites-changed", onFavoritesChanged);
    };

    return dropdown;
  }

  // ----------------------------------------------
  // Artist popover
  // ----------------------------------------------
  async showArtistPopover(artistId, event) {
    const state = this.ui && this.ui.state;
    if (!state) return null;
    if (!window.MusicStore || typeof window.MusicStore.loadArtist !== "function") {
      return null;
    }

    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) return null;

    const albumCount = (artist.albums || []).length;
    const listeners = artist.monthlyListeners || "24.5K";
    const topPlays =
      artist.topSong && artist.topSong.plays ? artist.topSong.plays : "12.3K";

    const content = `
      <div class="popover-gradient-border"></div>
      <div class="popover-content">
        <div class="popover-header">
          <div class="popover-avatar-wrapper">
            <img src="${PopupsManager.escapeAttr(artist.imageUrl || "")}" class="popover-avatar" alt="${PopupsManager.escapeAttr(artist.artist || "")}">
            <div class="popover-avatar-glow"></div>
          </div>
          <div class="popover-title-section">
            <h3 class="popover-artist-name">${PopupsManager.escapeText(artist.artist || "")}</h3>
            <span class="popover-genre-badge">${PopupsManager.escapeText(artist.genre || "Artist")}</span>
          </div>
        </div>
        <div class="popover-stats">
          <div class="popover-stat"><span class="popover-stat-value">${PopupsManager.escapeText(String(albumCount))}</span><span class="popover-stat-label">Albums</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${PopupsManager.escapeText(String(listeners))}</span><span class="popover-stat-label">Listeners</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${PopupsManager.escapeText(String(topPlays))}</span><span class="popover-stat-label">Plays</span></div>
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
      onAction: async (action) => {
        if (navigator.vibrate && typeof navigator.vibrate === "function") {
          navigator.vibrate(20);
        }

        if (action === "go-artist") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", artistId);
          }
        } else if (action === "play-top") {
          const firstAlbum = (artist.albums || [])[0];
          if (!firstAlbum) return;
          const queue = await Utils.albumQueue(artist.id, firstAlbum.id);
          if (queue.length && this.ui && this.ui.audioPlayer) {
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
    this.closable = options.closable !== false;
    this.escClosable = options.escClosable !== false;
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

    requestAnimationFrame(() => {
      if (this.el) this.el.classList.add("popups-open");
    });
  }

  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;

    if (typeof this.options.onClose === "function") {
      try { this.options.onClose(this); } catch (e) { console.error(e); }
    }

    if (this.el) this.el.classList.remove("popups-open");
    setTimeout(() => this.destroy(), 220);
  }

  destroy() {
    if (this.destroyed) return;

    this.beforeDestroy();
    this.detachEvents();

    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);

    this.destroyed = true;
    this.manager.unregister(this);
    this.el = null;
  }

  /* hooks subclasses override */
  attachEvents() {}
  detachEvents() {}
  beforeDestroy() {}
  reposition() {}
}
//---------------------------------------------------------------------





// ───────────  Modal  ────────── • • •
class PopupsModal extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "modal";
    this.closable = options.closable !== false;
    this.escClosable = options.escClosable !== false;
    this._previousFocus = null;
    this._bounceTimer = null;
  }

  render() {
    const overlay = document.createElement("div");
    overlay.className = "popups-overlay";
    overlay.setAttribute("role", "presentation");

    const size = this.options.size || "md";
    const closable = this.closable;
    const actions = Array.isArray(this.options.actions) ? this.options.actions : [];
    const titleId = `popups-modal-title-${Math.random().toString(36).slice(2, 9)}`;

    const actionButtons = actions
      .map((action, idx) => {
        const actionName = action.action !== undefined ? action.action : String(idx);
        return `<button class="popups-btn popups-btn-${action.type || "secondary"}" data-action="${PopupsManager.escapeAttr(actionName)}" type="button">${PopupsManager.escapeText(action.label || "")}</button>`;
      })
      .join("");

    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true" ${this.options.title ? `aria-labelledby="${titleId}"` : ""} tabindex="-1">
        ${
          this.options.title
            ? `<div class="popups-modal-header"><h3 class="popups-modal-title" id="${titleId}">${PopupsManager.escapeText(this.options.title)}</h3>${closable ? `<button class="popups-close-btn" data-action="__close" aria-label="Close">${PopupsManager.icons.close(18)}</button>` : ""}</div>`
            : closable
              ? `<button class="popups-close-btn popups-close-float" data-action="__close" aria-label="Close">${PopupsManager.icons.close(18)}</button>`
              : ""
        }
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
    this.onClick = (e) => {
      // Backdrop click → bounce, never close
      if (e.target === this.el) {
        e.preventDefault();
        e.stopPropagation();
        this.bounce();
        return;
      }

      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;

      // Internal close action (× button). Never forwarded to user's onAction.
      if (action === "__close" || action === "close") {
        this.hide();
        return;
      }

      const item = this.findItem(action);
      const persistentActions = Array.isArray(this.options.persistentActions)
        ? this.options.persistentActions
        : [];

      if (typeof this.options.onAction === "function") {
        this.options.onAction(action, item, this);
      } else if (item && typeof item.onClick === "function") {
        item.onClick(action, item);
      }

      if (!persistentActions.includes(action)) this.hide();
    };

    this.el.addEventListener("click", this.onClick);
    this.attachFocusTrap();
    // NOTE: deliberately NO document-level outside-click listener.
    // Modals close only via ×, Esc, or an action button.
  }

  attachFocusTrap() {
    this._previousFocus = document.activeElement;

    const focusFirst = () => {
      if (!this.el) return;
      const focusable = this.el.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const modal = this.el.querySelector(".popups-modal");
      (focusable || modal)?.focus?.();
    };
    requestAnimationFrame(focusFirst);

    this._trapFocus = (e) => {
      if (e.key !== "Tab" || !this.el) return;
      const focusables = Array.from(
        this.el.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this._trapFocus);
  }

  detachFocusTrap() {
    if (this._trapFocus) {
      document.removeEventListener("keydown", this._trapFocus);
      this._trapFocus = null;
    }
    if (
      this._previousFocus &&
      this._previousFocus.isConnected &&
      typeof this._previousFocus.focus === "function"
    ) {
      try { this._previousFocus.focus(); } catch { /* noop */ }
    }
    this._previousFocus = null;
  }

  detachEvents() {
    if (this.el && this.onClick) {
      this.el.removeEventListener("click", this.onClick);
    }
    this.detachFocusTrap();
  }

  bounce() {
    const inner = this.el && this.el.querySelector(".popups-modal, .popups-dialog");
    if (!inner) return;

    inner.classList.remove("popups-bounce");
    void inner.offsetWidth;
    inner.classList.add("popups-bounce");

    clearTimeout(this._bounceTimer);
    this._bounceTimer = setTimeout(
      () => inner.classList.remove("popups-bounce"),
      300
    );
  }

  findItem(action) {
    // Look in actions first (so action buttons get their definition object)
    const actions = Array.isArray(this.options.actions) ? this.options.actions : [];
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const name = a.action !== undefined ? a.action : String(i);
      if (String(name) === String(action)) return a;
    }
    // Then search groups (for reuse)
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }

  destroy() {
    clearTimeout(this._bounceTimer);
    this._bounceTimer = null;
    super.destroy();
  }
}



// ───────────  DropDown  ────────── • • •
class PopupsDropdown extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "dropdown";
    this._outsideHandler = null;
    this._outsideTimer = null;
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
      html.push(`
        <div class="header">
          <span class="title">${PopupsManager.escapeText(header.title || "")}</span>
          <span class="subtitle">${PopupsManager.escapeText(header.subtitle || "")}</span>
        </div>
        <div class="divider"></div>
      `);
    }

    let groupIndex = 0;
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      if (groupIndex > 0) html.push('<div class="divider"></div>');
      groupIndex += 1;

      html.push('<div class="group" role="group">');
      group.forEach((item) => {
        const extra = typeof extras === "function" ? extras(item.data) : extras;
        const styleAttr = item.style
          ? ` style="${PopupsManager.escapeAttr(item.style)}"`
          : "";
        html.push(`
          <button class="option"
                  role="menuitem"
                  data-action="${PopupsManager.escapeAttr(item.action)}"${styleAttr} ${extra} type="button">
            ${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ""}
            <span class="label">${PopupsManager.escapeText(item.label || item.action)}</span>
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

    // Focus first item once the element is positioned
    requestAnimationFrame(() => {
      if (!this.el) return;
      const first = this.el.querySelector(".option");
      first?.focus?.();
    });
  }

  positionAt(x, y) {
    if (!this.el) return;
    const pad = 12;

    this.el.style.setProperty("--popups-x", `${x}px`);
    this.el.style.setProperty("--popups-y", `${y}px`);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    // Synchronous measure — offsetWidth/Height are layout values,
    // unaffected by transforms (no jump).
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;

    let left = x;
    let top = y;
    if (left + width > window.innerWidth - pad) left = window.innerWidth - width - pad;
    if (left < pad) left = pad;
    if (top + height > window.innerHeight - pad) top = window.innerHeight - height - pad;
    if (top < pad) top = pad;

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  positionAtRect(rect) {
    this.positionAt(rect.left, rect.bottom + 6);
  }

  attachEvents() {
    this.onItemClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      const item = this.findItem(action);
      const persistentActions = Array.isArray(this.options.persistentActions)
        ? this.options.persistentActions
        : [];

      if (typeof this.options.onAction === "function") {
        this.options.onAction(action, item, this);
      } else if (item && typeof item.onClick === "function") {
        item.onClick(action, item);
      }

      if (!persistentActions.includes(action)) this.hide();
    };

    this.onKeyDown = (e) => {
      if (e.key === "Tab") {
        // Tab closes the menu (standard behaviour)
        this.hide();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        this._navigateMenu(e.key);
      } else if (e.key === "Enter" || e.key === " ") {
        const current = document.activeElement;
        if (current && this.el && this.el.contains(current) && current.matches(".option")) {
          e.preventDefault();
          current.click();
        }
      }
    };

    this.el.addEventListener("click", this.onItemClick);
    this.el.addEventListener("keydown", this.onKeyDown);

    this._outsideHandler = (e) => {
      if (!this.el || this.el.contains(e.target)) return;
      this.hide();
    };
    this._outsideTimer = setTimeout(() => {
      this._outsideTimer = null;
      if (!this.destroyed) document.addEventListener("click", this._outsideHandler);
    }, 0);
  }

  _navigateMenu(key) {
    if (!this.el) return;
    const items = Array.from(this.el.querySelectorAll(".option"));
    if (!items.length) return;
    const current = document.activeElement;
    const idx = items.indexOf(current);
    let next = 0;
    if (key === "ArrowDown") next = (idx + 1) % items.length;
    else if (key === "ArrowUp") next = (idx - 1 + items.length) % items.length;
    else if (key === "Home") next = 0;
    else if (key === "End") next = items.length - 1;
    items[next].focus();
  }

  detachEvents() {
    if (this.el && this.onItemClick) {
      this.el.removeEventListener("click", this.onItemClick);
    }
    if (this.el && this.onKeyDown) {
      this.el.removeEventListener("keydown", this.onKeyDown);
    }
    if (this._outsideHandler) {
      document.removeEventListener("click", this._outsideHandler);
      this._outsideHandler = null;
    }
    if (this._outsideTimer) {
      clearTimeout(this._outsideTimer);
      this._outsideTimer = null;
    }
  }

  findItem(action) {
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }

  reposition() {
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.rect) this.positionAtRect(this.options.rect);
  }
}



// ───────────  PopOver  ────────── • • •
class PopupsPopover extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "popover";
    this._outsideHandler = null;
    this._outsideTimer = null;
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
    else if (this.options.x != null && this.options.y != null) {
      this.positionAt(this.options.x, this.options.y);
    }
  }

  positionAt(x, y) {
    if (!this.el) return;
    const pad = 20;

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    // Synchronous layout measure — avoids the 1-frame jump
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;

    let left = x;
    let top = y;
    if (left + width > window.innerWidth - pad) left = window.innerWidth - width - pad;
    if (left < pad) left = pad;
    if (top + height > window.innerHeight - pad) top = window.innerHeight - height - pad;
    if (top < pad) top = pad;

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  attachEvents() {
    this.onClick = (e) => {
      e.stopPropagation();

      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const persistentActions = Array.isArray(this.options.persistentActions)
        ? this.options.persistentActions
        : [];

      if (typeof this.options.onAction === "function") {
        this.options.onAction(action, btn.dataset, this);
      }

      if (!persistentActions.includes(action)) this.hide();
    };

    this.el.addEventListener("click", this.onClick);

    this._outsideHandler = (e) => {
      if (!this.el || this.el.contains(e.target)) return;
      this.hide();
    };
    this._outsideTimer = setTimeout(() => {
      this._outsideTimer = null;
      if (!this.destroyed) window.addEventListener("click", this._outsideHandler);
    }, 10);
  }

  detachEvents() {
    if (this.el && this.onClick) {
      this.el.removeEventListener("click", this.onClick);
    }
    if (this._outsideHandler) {
      window.removeEventListener("click", this._outsideHandler);
      this._outsideHandler = null;
    }
    if (this._outsideTimer) {
      clearTimeout(this._outsideTimer);
      this._outsideTimer = null;
    }
  }

  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;

    if (typeof this.options.onClose === "function") {
      try { this.options.onClose(this); } catch (e) { console.error(e); }
    }

    if (this.el) this.el.style.animation = "popoverFadeOut 0.2s ease forwards";
    setTimeout(() => this.destroy(), 200);
  }

  reposition() {
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.x != null && this.options.y != null) {
      this.positionAt(this.options.x, this.options.y);
    }
  }
}



// ───────────  ToolTip  ────────── • • •
class PopupsTooltip extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "tooltip";
    this.target = options.target;
    this.text = options.text || "";
    this.closable = false;
    this.escClosable = false;
  }

  render() {
    const el = document.createElement("div");
    el.className = "popups-tooltip";
    el.textContent = this.text;
    el.setAttribute("role", "tooltip");

    if (this.target) {
      if (!this.target.id) {
        this.target.id = `popups-tt-${Math.random().toString(36).slice(2, 9)}`;
      }
      el.id = `${this.target.id}-tooltip`;
      this.target.setAttribute("aria-describedby", el.id);
    }
    return el;
  }

  show() {
    if (this.destroyed || !this.target || !this.target.isConnected) return;

    this.el = this.render();
    this.manager.container.appendChild(this.el);
    this.position();

    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => {
      if (this.el) this.el.classList.add("popups-open");
    });
  }

  position() {
    if (!this.target || !this.el || !this.target.isConnected) return;

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

  reposition() {
    this.position();
  }

  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;

    if (this.el) this.el.classList.remove("popups-open");
    if (this.target) this.target.removeAttribute("aria-describedby");
    setTimeout(() => this.destroy(), 160);
  }

  destroy() {
    if (this.target) this.target.removeAttribute("aria-describedby");
    super.destroy();
  }
}



// ───────────  Toast  ────────── • • •
class PopupsToast extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "toast";
    this.duration = Number(options.duration) || 5000;
    this.remaining = this.duration;
    this.paused = false;
    this.dragStartX = 0;
    this.dragging = false;
    this.closable = false;
    this.escClosable = false; // toast manages its own Esc
  }

  render() {
    const type = ["info", "success", "warning", "error"].includes(this.options.type)
      ? this.options.type
      : "info";
    const iconMap = { info: "info", success: "success", warning: "warning", error: "error" };

    const el = document.createElement("div");
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    el.setAttribute("aria-atomic", "true");
    el.tabIndex = 0;

    const hasUndo = this.options.onUndo && typeof this.options.onUndo === "function";

    el.innerHTML = `
      <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
      <button class="popups-toast-close" aria-label="Close notification">${PopupsManager.icons.close(14)}</button>
      <div class="popups-toast-icon">${PopupsManager.icons[iconMap[type]](18)}</div>
      <div class="popups-toast-body">
        ${this.options.title ? `<div class="popups-toast-title">${PopupsManager.escapeText(this.options.title)}</div>` : ""}
        ${this.options.message ? `<div class="popups-toast-message">${PopupsManager.escapeText(this.options.message)}</div>` : ""}
      </div>
      ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${PopupsManager.icons.undo(14)}<span>Undo</span></button>` : ""}
    `;

    this.fill = el.querySelector(".popups-toast-progress-fill");
    return el;
  }

  show() {
    if (this.destroyed) return;

    this.el = this.render();
    const container = this.manager.ensureToastContainer();
    container.insertBefore(this.el, container.firstChild);

    this.manager.updateToastStack();
    this.attachEvents();

    this.isOpen = true;
    this.manager.register(this);

    requestAnimationFrame(() => {
      if (this.el) this.el.classList.add("popups-open");
    });

    this.lastTick = performance.now();
    this.tick();
  }

  hide(direction = null) {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;

    cancelAnimationFrame(this.raf);

    if (direction === "left") this.el.classList.add("popups-toast-out-left");
    else if (direction === "right") this.el.classList.add("popups-toast-out-right");
    else this.el.classList.add("popups-toast-fade-out");

    if (typeof this.options.onClose === "function") {
      const cb = this.options.onClose;
      setTimeout(() => {
        try { cb(this); } catch (e) { console.error(e); }
      }, 250);
    }

    setTimeout(() => {
      this.destroy();
      this.manager.updateToastStack();
    }, 350);
  }

  attachEvents() {
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");

    this._onCloseClick = () => this.hide();
    if (closeBtn) closeBtn.addEventListener("click", this._onCloseClick);

    if (undoBtn) {
      this._onUndoClick = (e) => {
        e.stopPropagation();
        if (this.options.onUndo) this.options.onUndo(this);
        this.hide();
      };
      undoBtn.addEventListener("click", this._onUndoClick);
    }

    this._onEnter = () => { this.paused = true; };
    this._onLeave = () => {
      if (this.dragging) return;
      this.paused = false;
      this.lastTick = performance.now();
    };
    this._onFocusIn = () => { this.paused = true; };
    this._onFocusOut = (e) => {
      if (this.el && this.el.contains(e.relatedTarget)) return;
      if (this.dragging) return;
      this.paused = false;
      this.lastTick = performance.now();
    };
    this._onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      }
    };
    this._onVisibility = () => {
      if (document.hidden) {
        this._wasPaused = this.paused;
        this.paused = true;
      } else {
        this.paused = this._wasPaused || false;
        this.lastTick = performance.now();
      }
    };

    this.el.addEventListener("mouseenter", this._onEnter);
    this.el.addEventListener("mouseleave", this._onLeave);
    this.el.addEventListener("focusin", this._onFocusIn);
    this.el.addEventListener("focusout", this._onFocusOut);
    this.el.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("visibilitychange", this._onVisibility);

    this._onPointerDown = (e) => {
      if (e.target.closest(".popups-toast-close, .popups-toast-undo")) return;
      this.dragging = true;
      this.paused = true;
      this.dragStartX = e.clientX;
      this.el.classList.add("popups-toast-dragging");
      this.el.style.transition = "none";
      if (e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };
    this._onPointerMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      const scale = this.getStackScale();
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
        this.hide("right");
      } else if (dx < -100) {
        this.hide("left");
      } else {
        this.paused = false;
        this.lastTick = performance.now();
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

    if (closeBtn && this._onCloseClick) closeBtn.removeEventListener("click", this._onCloseClick);
    if (undoBtn && this._onUndoClick) undoBtn.removeEventListener("click", this._onUndoClick);

    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("focusin", this._onFocusIn);
    this.el.removeEventListener("focusout", this._onFocusOut);
    this.el.removeEventListener("keydown", this._onKeyDown);
    this.el.removeEventListener("pointerdown", this._onPointerDown);
    this.el.removeEventListener("pointermove", this._onPointerMove);
    this.el.removeEventListener("pointerup", this._onPointerUp);
    this.el.removeEventListener("pointercancel", this._onPointerUp);
    document.removeEventListener("visibilitychange", this._onVisibility);
  }

  getStackScale() {
    const idx = Number(this.el.getAttribute("data-stack-idx")) || 0;
    if (idx === 0) return 1;
    if (idx === 1) return 0.96;
    if (idx === 2) return 0.92;
    return 0.88;
  }

  tick() {
    if (this.destroyed || !this.isOpen) return;

    const now = performance.now();
    if (!this.paused) {
      const dt = now - this.lastTick;
      this.remaining -= dt;

      const pct = Math.max(0, (this.remaining / this.duration) * 100);
      if (this.fill) this.fill.style.width = `${pct}%`;

      if (this.remaining <= 0) {
        this.hide();
        return;
      }
    }

    this.lastTick = now;
    this.raf = requestAnimationFrame(() => this.tick());
  }
}






// ───────────  Favorites  ────────── • • •
class HeartStore {
  constructor(favoritesPlaylists, state) {
    this.fav = favoritesPlaylists;
    this.state = state;
    this.localOverrides = new Map();
  }

  makeKey(type, id) {
    return `${type}:${id}`;
  }

  is(type, id) {
    const override = this.localOverrides.get(this.makeKey(type, id));
    if (override !== undefined) return override;

    const fav = this.fav;
    switch (type) {
      case "song":     return fav.isSong(id);
      case "artist":   return fav.isArtist(id);
      case "album":    return fav.isAlbum(id);
      case "playlist": return typeof fav.isPlaylist === "function" ? fav.isPlaylist(id) : false;
      default:         return false;
    }
  }

  setOverride(type, id, value) {
    this.localOverrides.set(this.makeKey(type, id), value);
  }

  clearOverride(type, id) {
    this.localOverrides.delete(this.makeKey(type, id));
  }

  async set(type, id, value) {
    if (this.is(type, id) === value) return;
    this.clearOverride(type, id);

    const fav = this.fav;
    switch (type) {
      case "song": {
        const song = this.state.getSongById(id);
        if (song) await Promise.resolve(fav.toggleSong(song));
        break;
      }
      case "artist":
        await Promise.resolve(fav.toggleArtist(id));
        break;
      case "album":
        await Promise.resolve(fav.toggleAlbum(id));
        break;
      case "playlist":
        if (typeof fav.togglePlaylist === "function") await Promise.resolve(fav.togglePlaylist(id));
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
    this.timer = null;

    this.onEnter = () => { this.isHovering = true; this.render(); };
    this.onLeave = () => { this.isHovering = false; this.render(); };
    this.onClick = (e) => this.handleClick(e);

    el.addEventListener("mouseenter", this.onEnter);
    el.addEventListener("mouseleave", this.onLeave);
    el.addEventListener("click", this.onClick);
    el.classList.add("heart-bound");

    this.render();
  }

  get liked() {
    return this.manager.store.is(this.type, this.id);
  }

  getIcon() {
    if (this.phase === "error") return PopupsManager.icons.heart(18, this.liked);
    if (this.phase === "confirm") return PopupsManager.icons.heart(20, true);
    if (this.liked) {
      return this.isHovering ? PopupsManager.icons.heart(20, true) : PopupsManager.icons.heart(18, true);
    }
    return this.isHovering ? PopupsManager.icons.heart(20, false) : PopupsManager.icons.heart(18, false);
  }

  render() {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }

    this.el.innerHTML = this.getIcon();

    const liked = this.liked;
    this.el.classList.toggle("favorited", liked);
    this.el.classList.toggle("is-favorite", liked);
    this.el.classList.toggle("heart-busy", this.phase !== null);
    this.el.classList.toggle("heart-confirm", this.phase === "confirm");
    this.el.classList.toggle("heart-error", this.phase === "error");
    this.el.setAttribute("aria-pressed", String(liked));
    this.el.setAttribute("aria-label", liked ? "Remove from favorites" : "Add to favorites");
    this.el.setAttribute("title", liked ? "Remove from favorites" : "Add to favorites");

    // Minimal inline fallback for the confirm/error states so the user
    // gets visual feedback even without dedicated CSS rules for the classes.
    if (this.phase === "confirm") {
      this.el.style.transition = "transform 0.18s ease";
      this.el.style.transform = "scale(1.18)";
      setTimeout(() => {
        if (this.el && this.phase === "confirm") this.el.style.transform = "";
      }, 200);
    } else if (this.phase === "error") {
      this.el.style.transition = "none";
      let n = 0;
      const shake = () => {
        if (!this.el || this.phase !== "error") return;
        this.el.style.transform =
          n % 2 === 0 ? "translateX(-2px)" : "translateX(2px)";
        n += 1;
        if (n < 6) setTimeout(shake, 40);
        else this.el.style.transform = "";
      };
      shake();
    } else if (this.el.style.transform) {
      this.el.style.transform = "";
    }
  }

  async handleClick(e) {
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
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.phase = null;
          this.render();
        }, 3000);
      }
    } catch (err) {
      this.manager.store.setOverride(this.type, this.id, wasLiked);
      this.phase = "error";
      this.render();

      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
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
    clearTimeout(this.timer);
    this.timer = null;

    this.el.removeEventListener("mouseenter", this.onEnter);
    this.el.removeEventListener("mouseleave", this.onLeave);
    this.el.removeEventListener("click", this.onClick);
    this.el.classList.remove("heart-bound");

    this.manager.instances.delete(this.el);
  }
}
class HeartButtonManager {
  constructor(favoritesPlaylists, state) {
    this.store = new HeartStore(favoritesPlaylists, state);
    this.instances = new Map();
    this._pending = new Set();
    this._rafScheduled = false;

    this._onFavoritesChanged = (e) => {
      const { type, id } = e.detail || {};
      if (type && id != null) this.syncEntity(type, String(id));
      else this.syncAll();
    };
    window.addEventListener("mybeats:favorites-changed", this._onFavoritesChanged);

    this._observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          // Cheap pre-check: does this subtree contain any heart markers?
          if (
            node.matches?.(HeartButtonManager.SELECTOR) ||
            node.querySelector?.(HeartButtonManager.SELECTOR)
          ) {
            this._pending.add(node);
          }
        }
      }
      if (this._pending.size && !this._rafScheduled) {
        this._rafScheduled = true;
        requestAnimationFrame(() => {
          this._rafScheduled = false;
          const nodes = [...this._pending];
          this._pending.clear();
          for (const node of nodes) {
            if (node.isConnected) this.bindAll(node);
          }
        });
      }
    });

    const startObserving = () => {
      this._observer.observe(document.body, { childList: true, subtree: true });
      // Also bind any heart markers that were present in initial HTML
      this.bindAll();
    };

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
    if (root instanceof HTMLElement && root.matches?.(HeartButtonManager.SELECTOR)) {
      this.bindOne(root);
    }
    const els = root.querySelectorAll ? root.querySelectorAll(HeartButtonManager.SELECTOR) : [];
    els.forEach((el) => this.bindOne(el));
  }

  bindOne(el) {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === "") return;

    const existing = this.instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) {
        existing.sync();
        return;
      }
      existing.destroy();
    }

    this.instances.set(el, new HeartButton(el, info.type, info.id, this));
  }

  syncEntity(type, id) {
    for (const hb of this.instances.values()) {
      if (hb.type === type && hb.id === id) hb.sync();
    }
  }

  syncAll() {
    for (const hb of this.instances.values()) hb.sync();
  }

  async toggle(type, id) {
    const sid = String(id);
    const next = !this.store.is(type, sid);
    await this.store.set(type, sid, next);
  }

  notify(type, id) {
    window.dispatchEvent(
      new CustomEvent("mybeats:favorites-changed", { detail: { type, id: String(id) } })
    );
  }

  prune() {
    for (const hb of [...this.instances.values()]) {
      if (!hb.el.isConnected) hb.destroy();
    }
  }

  destroy() {
    this._observer.disconnect();
    window.removeEventListener("mybeats:favorites-changed", this._onFavoritesChanged);
    for (const hb of [...this.instances.values()]) hb.destroy();
    this.instances.clear();
    this._pending.clear();
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

  toast(options) {
    const popups = this.popups;
    if (!popups) return;
    popups.toast({
      type: options.type || "info",
      message: options.message,
      duration: 6000,
      onUndo: options.onUndo,
    });
  }

  // ----------------------------------------------
  // Change notification + targeted refresh helpers
  // ----------------------------------------------
  _notify(type, id) {
    window.dispatchEvent(
      new CustomEvent("mybeats:favorites-changed", { detail: { type, id: String(id) } })
    );
  }

  /**
   * Return true when `type` is a favorites-oriented page so we can do
   * a full-list render. Everywhere else, hearts sync via the
   * `mybeats:favorites-changed` event and we don't touch the DOM.
   * Extend these lists if your UI uses different page names.
   */
  _pagesShowingFavorites(type) {
    const map = {
      song:     ["favorites", "liked", "likedSongs", "favoriteSongs"],
      artist:   ["favorites", "favoriteArtists"],
      album:    ["favorites", "favoriteAlbums"],
      playlist: ["favorites", "favoritePlaylists"],
    };
    return map[type] || [];
  }

  _refreshFavoritesViewIfVisible(type) {
    const page = this.state && this.state.currentPage;
    if (!page) return;
    if (this._pagesShowingFavorites(type).includes(page)) {
      this.ui?.render?.();
    }
  }

  _refreshPlaylistsListIfVisible() {
    const page = this.state && this.state.currentPage;
    if (page === "playlists") this.ui?.render?.();
  }

  _refreshPlaylistIfEditing(playlistId) {
    const page = this.state && this.state.currentPage;
    const ui = this.ui;
    if (!ui) return;
    if (
      page === "editPlaylist" &&
      String(this.state.editingPlaylistId) === String(playlistId)
    ) {
      ui.render();
    } else if (
      page === "playlist" &&
      String(this.state.selectedPlaylistId) === String(playlistId)
    ) {
      ui.render();
    }
  }

  // ----------------------------------------------
  // Songs
  // ----------------------------------------------
  isSong(id) {
    return this.state.favoriteSongs.some((sid) => String(sid) === String(id));
  }

  toggleSong(song) {
    const id = String(song.id);
    const idx = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
    const added = idx < 0;

    if (added) this.state.favoriteSongs.push(id);
    else this.state.favoriteSongs.splice(idx, 1);

    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
    this._notify("song", id);
    this._refreshFavoritesViewIfVisible("song");

    this.toast({
      message: added
        ? `Added "${song.title}" to favorites`
        : `Removed "${song.title}" from favorites`,
      onUndo: () => {
        if (added) {
          const i = this.state.favoriteSongs.findIndex((sid) => String(sid) === id);
          if (i >= 0) this.state.favoriteSongs.splice(i, 1);
        } else if (!this.isSong(id)) {
          this.state.favoriteSongs.push(id);
        }
        this.state.persist();
        if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
        this._notify("song", id);            // ← keeps hearts in sync
        this._refreshFavoritesViewIfVisible("song");
      },
    });
  }

  // ----------------------------------------------
  // Artists
  // ----------------------------------------------
  isArtist(id) {
    return this.state.favoriteArtists.some((aid) => String(aid) === String(id));
  }

  toggleArtist(id) {
    const sid = String(id);
    const idx = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
    const artist = this.state.getArtistById(id);
    const name = artist?.artist || "Artist";
    const added = idx < 0;

    if (added) this.state.favoriteArtists.push(sid);
    else this.state.favoriteArtists.splice(idx, 1);

    this.state.persist();
    this._notify("artist", sid);
    this._refreshFavoritesViewIfVisible("artist");

    this.toast({
      message: added
        ? `Added ${name} to favorite artists`
        : `Removed ${name} from favorite artists`,
      onUndo: () => {
        if (added) {
          const i = this.state.favoriteArtists.findIndex((aid) => String(aid) === sid);
          if (i >= 0) this.state.favoriteArtists.splice(i, 1);
        } else if (!this.isArtist(id)) {
          this.state.favoriteArtists.push(sid);
        }
        this.state.persist();
        this._notify("artist", sid);
        this._refreshFavoritesViewIfVisible("artist");
      },
    });
  }

  // ----------------------------------------------
  // Albums
  // ----------------------------------------------
  isAlbum(id) {
    return this.state.favoriteAlbums.some((aid) => String(aid) === String(id));
  }

  toggleAlbum(id) {
    const sid = String(id);
    const idx = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
    const album = this.state.getAlbumById(id);
    const name = album?.album || "Album";
    const added = idx < 0;

    if (added) this.state.favoriteAlbums.push(sid);
    else this.state.favoriteAlbums.splice(idx, 1);

    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
    this._notify("album", sid);
    this._refreshFavoritesViewIfVisible("album");

    this.toast({
      message: added
        ? `Added ${name} to favorite albums`
        : `Removed ${name} from favorite albums`,
      onUndo: () => {
        if (added) {
          const i = this.state.favoriteAlbums.findIndex((aid) => String(aid) === sid);
          if (i >= 0) this.state.favoriteAlbums.splice(i, 1);
        } else if (!this.isAlbum(id)) {
          this.state.favoriteAlbums.push(sid);
        }
        this.state.persist();
        if (this.state.isDrawerOpen) this.ui?.updateFullPlayer?.();
        this._notify("album", sid);
        this._refreshFavoritesViewIfVisible("album");
      },
    });
  }

  // ----------------------------------------------
  // Playlists — favorites
  // ----------------------------------------------
  isPlaylist(id) {
    return (this.state.favoritePlaylists || []).some((pid) => String(pid) === String(id));
  }

  togglePlaylist(id) {
    const pid = String(id);
    this.state.favoritePlaylists = this.state.favoritePlaylists || [];
    const idx = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
    const playlist = this.getPlaylist(pid);
    const name = playlist?.name || "Playlist";
    const added = idx < 0;

    if (added) this.state.favoritePlaylists.push(pid);
    else this.state.favoritePlaylists.splice(idx, 1);

    this.state.persist();
    this._notify("playlist", pid);
    this._refreshFavoritesViewIfVisible("playlist");
    // NOTE: playlists list page shows heart via sync; no extra render needed

    this.toast({
      message: added
        ? `Added ${name} to favorites`
        : `Removed ${name} from favorites`,
      onUndo: () => {
        if (added) {
          const i = this.state.favoritePlaylists.findIndex((x) => String(x) === pid);
          if (i >= 0) this.state.favoritePlaylists.splice(i, 1);
        } else if (!this.isPlaylist(pid)) {
          this.state.favoritePlaylists.push(pid);
        }
        this.state.persist();
        this._notify("playlist", pid);
        this._refreshFavoritesViewIfVisible("playlist");
      },
    });
  }

  // ----------------------------------------------
  // Playlists — CRUD
  // ----------------------------------------------
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
    this._refreshPlaylistsListIfVisible();
    return playlist;
  }

  renamePlaylist(id, newName) {
    const playlist = this.getPlaylist(id);
    if (!playlist || !newName.trim()) return false;
    playlist.name = newName.trim();
    this.state.persist();
    this._refreshPlaylistIfEditing(id);
    this._refreshPlaylistsListIfVisible();
    return true;
  }

  updateDesc(id, description) {
    const playlist = this.getPlaylist(id);
    if (!playlist) return false;
    playlist.description = description;
    this.state.persist();
    this._refreshPlaylistIfEditing(id);
    return true;
  }

  updateTags(id, tags) {
    const playlist = this.getPlaylist(id);
    if (!playlist) return false;
    playlist.tags = Array.isArray(tags) ? tags : [];
    this.state.persist();
    this._refreshPlaylistIfEditing(id);
    return true;
  }

  deletePlaylist(id) {
    const playlist = this.getPlaylist(id);
    if (!playlist) return false;

    const name = playlist.name;
    this.state.playlists = this.state.playlists.filter((p) => String(p.id) !== String(id));
    this.state.persist();

    if (this.popups) {
      this.popups.toast({ type: "success", message: `Playlist "${name}" deleted` });
    }
    this._refreshPlaylistsListIfVisible();
    return true;
  }

  reorderSongs(id, newOrder) {
    const playlist = this.getPlaylist(id);
    if (!playlist || !Array.isArray(newOrder)) return false;
    playlist.songs = newOrder.map((sid) => String(sid));
    this.state.persist();
    this._refreshPlaylistIfEditing(id);
    return true;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const playlist = this.getPlaylist(playlistId);
    if (!playlist) return false;

    const sid = String(songId);
    const before = [...playlist.songs];
    const song = this.state.getSongById(sid);

    playlist.songs = playlist.songs.filter((id) => String(id) !== sid);
    this.state.persist();
    this._refreshPlaylistIfEditing(playlistId);

    if (song) {
      this.toast({
        message: `Removed "${song.title}" from ${playlist.name}`,
        onUndo: () => {
          playlist.songs = before;
          this.state.persist();
          this._refreshPlaylistIfEditing(playlistId);
        },
      });
    }
    return true;
  }

  addSongToPlaylist(playlistId, songId) {
    const playlist = this.getPlaylist(playlistId);
    const sid = String(songId);
    if (!playlist || playlist.songs.some((id) => String(id) === sid)) return false;

    const song = this.state.getSongById(sid);
    playlist.songs.push(sid);
    this.state.persist();
    this._refreshPlaylistIfEditing(playlistId);

    if (song) {
      this.toast({
        message: `Added "${song.title}" to ${playlist.name}`,
        onUndo: () => {
          playlist.songs = playlist.songs.filter((id) => String(id) !== sid);
          this.state.persist();
          this._refreshPlaylistIfEditing(playlistId);
        },
      });
    }
    return true;
  }

  // ----------------------------------------------
  // Playlist UI helpers
  // ----------------------------------------------
  openModal() {
    const popups = this.popups;
    if (!popups) return;

    const content = document.createElement("div");
    content.className = "popups-playlist-list";

    content.innerHTML = this.state.playlists.length
      ? this.state.playlists
          .map(
            (playlist) => `
      <div class="popups-playlist-row" data-action="view" data-id="${Utils.esc(playlist.id)}">
        <div class="popups-playlist-cover">${this.coverPreview(playlist, 40)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(playlist.name)}</p>
          <p class="popups-playlist-meta">${playlist.songs.length} songs</p>
        </div>
        <div class="popups-playlist-actions">
          <button class="popups-icon-btn" data-action="edit" data-id="${Utils.esc(playlist.id)}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="popups-icon-btn popups-danger" data-action="delete" data-id="${Utils.esc(playlist.id)}" title="Delete">
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
        this.ui?.navigate?.("playlists");
        this.state.selectedPlaylistName = this.getPlaylist(id)?.name || null;
        this.ui?.render?.();
      } else if (action === "edit") {
        modal.hide();
        this.editPlaylist(id);
      } else if (action === "delete") {
        modal.hide();
        this.confirmDelete(id);
      }
    });
  }

  coverPreview(playlist, size = 40) {
    const state = this.state;
    const songs = playlist.songs
      .map((sid) => state.getSongById(sid))
      .filter(Boolean)
      .slice(0, 4);

    if (!songs.length) {
      return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${this.playlistIcon(Math.round(size * 0.5))}</div>`;
    }
    if (songs.length === 1) {
      return `<img src="${PopupsManager.escapeAttr(songs[0].coverUrl || "")}" width="${size}" height="${size}" class="popups-cover-img" alt="">`;
    }

    return `
      <div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">
        ${Array.from({ length: 4 })
          .map((_, i) =>
            songs[i]
              ? `<img src="${PopupsManager.escapeAttr(songs[i].coverUrl || "")}" class="popups-cover-quarter" alt="">`
              : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`
          )
          .join("")}
      </div>
    `;
  }

  playlistIcon(size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 9-10 9-10-9 10-9z"/></svg>`;
  }

  confirmDelete(id) {
    const playlist = this.getPlaylist(id);
    if (!playlist) return;

    this.popups.dialog({
      title: "Delete Playlist?",
      message: `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: () => {
        this.deletePlaylist(id);
        if (this.state.selectedPlaylistName === playlist.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
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

      const vals = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      vals.forEach((value) => {
        if (!tags.includes(value) && tags.length < 8) tags.push(value);
      });

      tagInput.value = "";
      renderTags();
    });

    tagList.addEventListener("click", (e) => {
      const btn = e.target.closest(".popups-tag-remove");
      if (!btn) return;

      const tag = btn.dataset.tag;
      const i = tags.indexOf(tag);
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
      onAction: (action, _item, popup) => {
        if (action !== "create") return;

        const name = nameInput.value.trim();
        if (!name) {
          popups.toast({ type: "warning", message: "Please enter a playlist name" });
          return;
        }

        const description = wrap.querySelector("#new-pl-desc").value.trim();
        this.createPlaylist({ name, description, tags: [...tags] });
        popups.toast({ type: "success", message: `Playlist "${name}" created` });
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
    try { history.pushState(null, "", `/playlist/${id}/edit`); } catch { /* noop */ }
  }

  addToPlaylistModal(song) {
    const popups = this.popups;
    if (!popups) return;

    if (!this.state.playlists.length) {
      const modal = popups.modal({
        title: "Add to Playlist",
        size: "sm",
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [{ label: "Create Playlist", action: "create", type: "primary" }],
        onAction: (action, _item, popup) => {
          if (action === "create") {
            popup.hide();
            this.createNewPlaylist();
          }
        },
      });
      return;
    }

    const content = document.createElement("div");
    content.className = "popups-add-to-playlist";

    const songHeader = song
      ? `
      <div class="popups-song-context">
        <img src="${PopupsManager.escapeAttr(song.coverUrl || Config.DEFAULT_COVER || "")}" class="popups-song-context-thumb" alt="">
        <div class="popups-song-context-info">
          <p class="popups-song-context-title">${Utils.esc(song.title)}</p>
          <p class="popups-song-context-sub">${Utils.esc(song.artist || "")}</p>
        </div>
      </div>
    `
      : "";

    const list = this.state.playlists
      .map(
        (playlist) => `
      <button class="popups-playlist-row" data-action="add" data-id="${Utils.esc(playlist.id)}">
        <div class="popups-playlist-cover">${this.coverPreview(playlist, 44)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.esc(playlist.name)}</p>
          <p class="popups-playlist-meta">${playlist.songs.length} songs</p>
        </div>
        ${playlist.songs.some((sid) => String(sid) === String(song?.id)) ? `<span class="popups-in-list-badge">In playlist</span>` : ""}
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
      onAction: (action, _item, popup) => {
        if (action === "create") {
          popup.hide();
          this.createNewPlaylist();
        }
      },
    });

    content.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();

      const plId = btn.dataset.id;
      const playlist = this.getPlaylist(plId);
      if (!playlist || !song) return;

      if (playlist.songs.some((sid) => String(sid) === String(song.id))) {
        popups.toast({
          type: "warning",
          message: `"${song.title}" is already in ${playlist.name}`,
        });
        return;
      }

      this.addSongToPlaylist(plId, song.id);
      modal.hide();
    });
  }
}




// ┌─────────── Globalizing ───────────┐
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