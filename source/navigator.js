const SPINNER_DEFAULTS = {
  type: "area",
  container: null,
  label: "",
  blur: 14,
  dim: 0.55,
  size: 38,
  accent: "",
  delay: 0,
  minDuration: 0,
  autoHideAfter: 0,
  zIndex: 20,
};

const SPINNER_STYLES = `
.mb-spinner-static { position: relative !important; }
.mb-spinner-overlay {
  position: absolute; inset: 0; display: block; border-radius: inherit;
  opacity: 0; visibility: hidden; pointer-events: none;
  z-index: var(--mb-spinner-z, 20);
  transition: opacity .3s ease, visibility 0s linear .3s;
}
.mb-spinner-overlay[data-visible="true"] {
  opacity: 1; visibility: visible; pointer-events: auto;
  cursor: progress; transition: opacity .3s ease, visibility 0s;
}
.mb-spinner-overlay[data-mb-spinner="fullscreen"] { position: fixed; z-index: 9999; }
.mb-spinner-scrim {
  position: absolute; inset: 0; border-radius: inherit;
  background: rgba(10,11,15, var(--mb-spinner-dim, .55));
  -webkit-backdrop-filter: blur(var(--mb-spinner-blur, 14px)) saturate(120%);
  backdrop-filter: blur(var(--mb-spinner-blur, 14px)) saturate(120%);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mb-spinner-scrim { background: rgba(10,11,15, calc(var(--mb-spinner-dim, .55) + .35)); }
}
.mb-spinner-box {
  position: sticky; top: 50vh; transform: translateY(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  width: fit-content; margin: 0 auto; padding: 4px; pointer-events: none;
}
.mb-spinner-ring {
  width: var(--mb-spinner-size, 38px); height: var(--mb-spinner-size, 38px);
  border-radius: 50%; border: 3px solid rgba(255,255,255,.16);
  border-top-color: var(--mb-spinner-accent, var(--accent, #1db954));
  animation: mb-spinner-rotate .85s linear infinite;
}
.mb-spinner-label {
  font-size: .85rem; letter-spacing: .02em; opacity: .85;
  color: inherit; text-align: center; white-space: nowrap;
}
@keyframes mb-spinner-rotate { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) {
  .mb-spinner-overlay { transition: none; }
  .mb-spinner-ring { animation-duration: 1.8s; }
}
::view-transition-old(root) {
  animation: mb-page-out .35s cubic-bezier(.22,1,.36,1) both;
}
::view-transition-new(root) {
  animation: mb-page-in .45s cubic-bezier(.22,1,.36,1) both;
}
@keyframes mb-page-out {
  to { opacity: 0; transform: translateY(-8px) scale(.995); }
}
@keyframes mb-page-in {
  from { opacity: 0; transform: translateY(10px) scale(.995); }
  to   { opacity: 1; transform: none; }
}
[data-navbar="breadcrumbs"],
[data-navbar="top"],
.mb-context-menu,
#full-player-drawer {
  view-transition-name: none;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) { animation-duration: .01ms; }
}
`;

const ViewTransition = {
  isSupported() {
    return typeof document !== "undefined" && typeof document.startViewTransition === "function";
  },
  run(update) {
    if (this.isSupported() && !prefersReducedMotion()) {
      try {
        return document.startViewTransition(update);
      } catch {
        update();
        return null;
      }
    }
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        update();
        requestAnimationFrame(resolve);
      });
    });
  },
};

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

class Spinner {
  static registry = new Set();
  static stylesInjected = false;

  static injectStyles() {
    if (Spinner.stylesInjected || document.getElementById("mb-spinner-styles")) {
      Spinner.stylesInjected = true;
      return;
    }
    const tag = document.createElement("style");
    tag.id = "mb-spinner-styles";
    tag.textContent = SPINNER_STYLES;
    document.head.appendChild(tag);
    Spinner.stylesInjected = true;
  }

  constructor(options = {}) {
    Object.assign(this, SPINNER_DEFAULTS, options);
    this.element = null;
    this.hostElement = null;
    this.visible = false;
    this.showTimer = null;
    this.hideTimer = null;
    this.autoHideTimer = null;
    this.shownAt = 0;
    this.forcedFullscreen = false;
    this.addedStaticClass = false;
  }

  resolveHost() {
    if (this.type === "fullscreen") return document.body;
    if (this.type === "page") {
      const main = document.getElementById("main-content");
      const parent = main?.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) return parent;
      this.forcedFullscreen = true;
      return document.body;
    }
    let host = this.container;
    if (typeof host === "string") host = document.querySelector(host);
    return host || document.body;
  }

  mount() {
    if (this.element && this.element.isConnected) return this.element;
    const host = this.resolveHost();
    if (!host) return null;
    Spinner.injectStyles();

    if (window.getComputedStyle(host).position === "static") {
      host.classList.add("mb-spinner-static");
      this.addedStaticClass = true;
    }

    const overlay = document.createElement("div");
    overlay.className = "mb-spinner-overlay";
    overlay.dataset.mbSpinner = this.forcedFullscreen ? "fullscreen" : this.type;
    overlay.dataset.visible = "false";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-busy", "false");
    overlay.style.setProperty("--mb-spinner-blur", `${this.blur}px`);
    overlay.style.setProperty("--mb-spinner-dim", String(this.dim));
    overlay.style.setProperty("--mb-spinner-size", `${this.size}px`);
    if (this.accent) overlay.style.setProperty("--mb-spinner-accent", this.accent);
    overlay.style.zIndex = String(this.zIndex);

    const scrim = document.createElement("div");
    scrim.className = "mb-spinner-scrim";

    const box = document.createElement("div");
    box.className = "mb-spinner-box";

    const ring = document.createElement("div");
    ring.className = "mb-spinner-ring";
    ring.setAttribute("aria-hidden", "true");
    box.appendChild(ring);

    if (this.label) {
      const label = document.createElement("span");
      label.className = "mb-spinner-label";
      label.textContent = this.label;
      box.appendChild(label);
    }

    overlay.append(scrim, box);
    host.appendChild(overlay);
    this.element = overlay;
    this.hostElement = host;
    return overlay;
  }

  show() {
    Spinner.registry.add(this);
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.visible || this.showTimer) return this;

    const reveal = () => {
      this.showTimer = null;
      const el = this.mount();
      if (!el) return;
      this.visible = true;
      this.shownAt = performance.now();
      requestAnimationFrame(() => {
        el.dataset.visible = "true";
        el.setAttribute("aria-busy", "true");
      });
      if (this.autoHideAfter > 0) {
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = setTimeout(() => this.hide(), this.autoHideAfter);
      }
    };

    if (this.delay > 0) this.showTimer = setTimeout(reveal, this.delay);
    else reveal();
    return this;
  }

  hide(options = {}) {
    const immediate = options.immediate === true;
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    if (!this.visible) return this;

    const elapsed = performance.now() - this.shownAt;
    const wait = immediate ? 0 : Math.max(0, this.minDuration - elapsed);

    const conceal = () => {
      this.hideTimer = null;
      this.visible = false;
      if (!this.element) return;
      this.element.dataset.visible = "false";
      this.element.setAttribute("aria-busy", "false");
    };

    if (wait > 0) this.hideTimer = setTimeout(conceal, wait);
    else conceal();
    return this;
  }

  remove() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    this.visible = false;
    const el = this.element;
    this.element = null;
    if (el) {
      el.dataset.visible = "false";
      el.setAttribute("aria-busy", "false");
      setTimeout(() => el.remove(), 320);
    }
    if (this.addedStaticClass && this.hostElement) {
      this.hostElement.classList.remove("mb-spinner-static");
    }
    this.addedStaticClass = false;
    this.hostElement = null;
    Spinner.registry.delete(this);
    return this;
  }

  destroy() {
    return this.remove();
  }

  setLabel(text) {
    this.label = text || "";
    if (!this.element) return this;
    let label = this.element.querySelector(".mb-spinner-label");
    const box = this.element.querySelector(".mb-spinner-box");
    if (!this.label) {
      label?.remove();
      return this;
    }
    if (!label) {
      label = document.createElement("span");
      label.className = "mb-spinner-label";
      box?.appendChild(label);
    }
    label.textContent = this.label;
    return this;
  }

  static showIn(containers, options = {}) {
    const list = (Array.isArray(containers) ? containers : [containers])
      .filter(Boolean)
      .map((c) => (typeof c === "string" ? document.querySelector(c) : c))
      .filter(Boolean);
    const spinners = list.map((c) => new Spinner({ ...options, container: c }).show());
    return {
      spinners,
      get visible() {
        return spinners.some((s) => s.visible);
      },
      hide(opts) {
        spinners.forEach((s) => s.hide(opts));
        return this;
      },
      remove() {
        spinners.forEach((s) => s.remove());
        return this;
      },
      setLabel(text) {
        spinners.forEach((s) => s.setLabel(text));
        return this;
      },
    };
  }

  static hideAll(options) {
    [...Spinner.registry].forEach((s) => s.hide(options));
  }

  static removeAll() {
    [...Spinner.registry].forEach((s) => s.remove());
    Spinner.registry.clear();
  }

  static pruneDetached() {
    [...Spinner.registry].forEach((s) => {
      if (s.element && !s.element.isConnected) s.remove();
    });
  }
}

class Router {
  static ALBUM_SPINNER_OPTIONS = {
    blur: 16,
    dim: 0.55,
    minDuration: 500,
    delay: 80,
    size: 34,
  };

  static ALBUM_SWAP_DELAY = 900;

  constructor(ui) {
    this.ui = ui;
    this.state = ui.state;
    this.activeGroup = null;
    this.navigating = false;
    this.breadcrumbHidden = false;
  }

  pathFor(page, opts = {}) {
    switch (page) {
      case "home":
        return "/home/";
      case "library":
        return this.libraryPathFor(opts);
      case "favorites": {
        const tab = opts.tab || this.state.favoritesTab || "songs";
        return `/favorites/${tab}/`;
      }
      case "playlists":
        return "/playlists/";
      case "playlist": {
        const id = opts.id || this.state.selectedPlaylistId;
        return id ? `/playlist/${id}/` : "/playlists/";
      }
      case "editPlaylist": {
        const id = opts.id || this.state.editingPlaylistId;
        return id ? `/playlist/${id}/edit/` : "/playlists/";
      }
      case "createPlaylist":
        return "/playlists/new/";
      case "artist": {
        const artistId = opts.artistId;
        if (!artistId) return "/home/";
        const albumId = opts.albumId;
        return albumId ? `/artist/${artistId}/album/${albumId}/` : `/artist/${artistId}/`;
      }
      default:
        return "/home/";
    }
  }

  libraryPathFor(opts = {}) {
    const library = this.ui.libraryPage;
    const view = opts.view || library?.view || "overview";
    const sort = opts.sort || library?.sort || "recent";
    const filter = opts.filter || library?.filter || { type: "all", value: null, label: "" };
    if (sort === "mostPlayed" && view === "albums") return "/library/top/albums/";
    if (sort === "mostPlayed" && view === "artists") return "/library/top/artists/";
    if (sort === "mostPlayed") return "/library/mostplayed/";
    if (view === "artists" && filter.type === "all" && filter.value === null) return "/library/artists/all/";
    if (view && view !== "overview") return `/library/${view}/`;
    return "/library/";
  }

  navigateHome() {
    return this.navigateTo("home");
  }

  navigateLibrary(opts = {}) {
    return this.navigateTo("library", opts);
  }

  navigateFavorites(tab) {
    return this.navigateTo("favorites", { tab });
  }

  navigatePlaylists() {
    return this.navigateTo("playlists");
  }

  navigatePlaylist(id) {
    return this.navigateTo("playlist", { id });
  }

  navigateEditPlaylist(id) {
    return this.navigateTo("editPlaylist", { id });
  }

  navigateCreatePlaylist() {
    return this.navigateTo("createPlaylist");
  }

  navigateArtist(artistId, albumId) {
    return this.navigateTo("artist", { artistId, albumId });
  }

  navigateTo(page, opts = {}) {
    if (
      page === "artist" &&
      this.state.currentPage === "artist" &&
      opts.artistId &&
      String(this.state.artistId) === String(opts.artistId)
    ) {
      return this.switchAlbum(opts.artistId, opts.albumId);
    }
    return this.performNavigation(page, opts);
  }

  async switchAlbum(artistId, albumId) {
    const state = this.state;
    const ui = this.ui;

    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) return;

    const album = await window.MusicStore.loadAlbum(artistId, albumId).catch(() => null);
    if (!album) return;

    this.pushHistory(this.pathFor("artist", { artistId, albumId }), {
      page: "artist",
      artistId,
      albumId,
    });
    state.selectedAlbumId = albumId;
    state.selectedAlbumName = album.album;

    this.updateTitle();
    this.updateBreadcrumbs();

    const coverEl = document.querySelector(".hero-cover");
    const songsEl = document.querySelector('[data-list="songs"]');
    const aboutEl = document.querySelector('[data-page="artist"] [data-area="about"]');

    const group = Spinner.showIn([coverEl, songsEl, aboutEl].filter(Boolean), {
      ...Router.ALBUM_SPINNER_OPTIONS,
      label: "Loading album…",
    });
    this.activeGroup = group;

    setTimeout(() => {
      this.swapArtistSections(artist, album);
      group.hide();
      setTimeout(() => group.remove(), 400);
      if (this.activeGroup === group) this.activeGroup = null;
    }, 60);
  }

  swapArtistSections(artist, album) {
    const ui = this.ui;
    const artistPage = ui.artistPage;

    const coverEl = document.querySelector(".hero-cover");
    if (coverEl && album.coverUrl) {
      const img = coverEl.querySelector("img");
      if (img) {
        const preload = new Image();
        preload.onload = () => {
          img.src = album.coverUrl;
        };
        preload.src = album.coverUrl;
      }
    }

    const songsEl = document.querySelector('[data-list="songs"]');
    if (songsEl && artistPage?.createSongRow) {
      songsEl.innerHTML = `
      <div class="header">
        <div class="left">
          <span class="badge">${album.sold || "Double Platinum"}</span>
          <span class="year">${album.year || "2024"}</span>
        </div>
        <span class="hint">Double-click</span>
      </div>
      <div class="body">
        ${album.songs.map((song, i) => artistPage.createSongRow(song, i, artist, album)).join("")}
      </div>
    `;
    }

    const aboutEl = document.querySelector('[data-page="artist"] [data-area="about"]');
    if (aboutEl && artistPage?.aboutSection) {
      aboutEl.innerHTML = artistPage.aboutSection(artist, album);
      aboutEl.querySelectorAll(".tab").forEach((btn) => {
        btn.classList.toggle("active", IdUtils.norm(btn.dataset.albumId) === IdUtils.norm(album.id));
      });
    }

    const heroTitle = document.querySelector(".hero-overlay .album-title");
    if (heroTitle) heroTitle.textContent = album.album;

    const trackCount = document.querySelector(".hero-overlay .track-count");
    if (trackCount) {
      trackCount.textContent = `${album.songs.length} track${album.songs.length === 1 ? "" : "s"}`;
    }

    ui.contentEvents?.attachContentEvents?.();
    window.dispatchEvent(
      new CustomEvent("mybeats:album-swapped", {
        detail: { artistId: artist.id, albumId: album.id },
      })
    );
  }

  async performNavigation(page, opts = {}) {
    const state = this.state;
    const ui = this.ui;

    if (state.isDrawerOpen) ui.closePlayerDrawer?.();

    let resolvedArtistId = opts.artistId || null;
    let artist = null;
    if (resolvedArtistId) {
      artist = state.getArtistById(resolvedArtistId);
      if (!artist) {
        const fallback = (window.MusicStore?.index || []).find(
          (a) => String(a.artist) === String(resolvedArtistId)
        );
        if (fallback) {
          artist = fallback;
          resolvedArtistId = fallback.id;
        }
      }
    }

    let resolvedAlbumId = opts.albumId || null;
    let album = null;
    if (resolvedAlbumId) {
      album = state.getAlbumById(resolvedAlbumId);
      if (album && artist && String(album.artistId) !== String(resolvedArtistId)) album = null;
    }

    if (state.currentPage === "createPlaylist" && page !== "createPlaylist") state.draftPlaylist = null;
    if (page === "createPlaylist" && !state.draftPlaylist) ui.createPlaylistPage?.reset?.();

    state.currentPage = page;
    state.artistId = resolvedArtistId;
    state.artistPageName = artist?.artist || null;
    state.selectedAlbumId = resolvedAlbumId;
    state.selectedAlbumName = album?.album || null;
    state.isSearchOpen = false;
    state.isCreatingPlaylist = page === "createPlaylist";

    if (page !== "playlists" && page !== "editPlaylist") state.selectedPlaylistName = null;
    if (page !== "editPlaylist") state.editingPlaylistId = null;

    const url = this.pathFor(page, {
      ...opts,
      artistId: resolvedArtistId,
      albumId: resolvedAlbumId,
      id: opts.id || state.editingPlaylistId,
    });
    this.pushHistory(url, {
      page,
      artistId: resolvedArtistId,
      albumId: resolvedAlbumId,
      id: opts.id || state.editingPlaylistId || null,
    });

    this.updateTitle();
    this.updateActiveNav();
    this.updateBreadcrumbs();

    await ViewTransition.run(() => ui.render());
  }

  normalizePath(path) {
    if (!path) return "/";
    const stripped = path.replace(/\/+$/, "");
    return stripped === "" ? "/" : stripped;
  }

  pushHistory(url, stateObj = {}) {
    const current = this.normalizePath(window.location.pathname);
    const target = this.normalizePath(url);
    const hasSearch = !!window.location.search;
    if (current === target && !hasSearch) return;
    history.pushState(stateObj, "", url);
  }

  async syncFromUrl() {
    const parts = window.location.pathname.split("/").filter((p) => p);
    const params = new URLSearchParams(window.location.search);
    const deepLinkSong = params.get("song");
    const state = this.state;

    state.pendingDeepLinkSong = null;
    state.editingPlaylistId = null;
    state.selectedPlaylistName = null;
    state.selectedPlaylistId = null;
    state.isCreatingPlaylist = false;
    state.artistId = null;
    state.artistPageName = null;
    state.selectedAlbumId = null;
    state.selectedAlbumName = null;

    if (!parts.length || parts[0] === "home") {
      state.currentPage = "home";
    } else {
      const page = parts[0];
      switch (page) {
        case "library":
          state.currentPage = "library";
          this.applyLibraryRoute(parts.slice(1));
          break;
        case "discover":
          state.currentPage = "library";
          this.applyDiscoverRoute(parts.slice(1));
          break;
        case "favorites":
          state.currentPage = "favorites";
          state.favoritesTab = parts[1] || "songs";
          break;
        case "playlist":
          this.applyPlaylistRoute(parts, deepLinkSong);
          break;
        case "playlists":
          if (parts[1] === "new") {
            state.currentPage = "createPlaylist";
            state.isCreatingPlaylist = true;
            this.ui.createPlaylistPage?.reset?.();
          } else {
            state.currentPage = "playlists";
          }
          break;
        case "artist":
          await this.applyArtistRoute(parts, deepLinkSong);
          break;
        default:
          state.currentPage = "404";
      }
    }

    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    await ViewTransition.run(() => this.ui.render());
  }

  applyPlaylistRoute(parts, deepLinkSong) {
    const state = this.state;
    if (!parts[1]) {
      state.currentPage = "404";
      return;
    }
    const playlistId = parts[1];
    const norm = IdUtils.norm(playlistId);
    const playlist = state.playlists.find((p) => IdUtils.norm(p.id) === norm);

    if (parts[2] === "edit" && playlist) {
      state.currentPage = "editPlaylist";
      state.editingPlaylistId = playlistId;
      state.selectedPlaylistName = playlist.name;
      state.selectedPlaylistId = playlistId;
    } else if (parts[2] === "edit") {
      state.currentPage = "404";
    } else {
      state.currentPage = "playlists";
      state.selectedPlaylistName = playlist?.name || null;
      state.selectedPlaylistId = playlist ? playlistId : null;
    }
    if (deepLinkSong) state.pendingDeepLinkSong = deepLinkSong;
  }

  async applyArtistRoute(parts, deepLinkSong) {
    const state = this.state;
    if (!parts[1]) {
      state.currentPage = "404";
      return;
    }
    const artistId = parts[1];
    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) {
      state.currentPage = "404";
      return;
    }
    state.currentPage = "artist";
    state.artistId = artistId;
    state.artistPageName = artist.artist;

    if (parts[2] === "album" && parts[3]) {
      const albumId = parts[3];
      const album = artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
      state.selectedAlbumId = album ? albumId : null;
      state.selectedAlbumName = album?.title || album?.album || null;
    }
    if (deepLinkSong) state.pendingDeepLinkSong = deepLinkSong;
  }

  applyLibraryRoute(parts) {
    const library = this.ui.libraryPage;
    if (!library) return;

    library.view = "overview";
    library.filter = { type: "all", value: null, label: "" };
    library.sort = "recent";
    library.mode = "grid";
    library.query = "";

    if (!parts.length) return;

    const a = parts[0];
    const b = parts[1];
    const views = ["overview", "songs", "albums", "artists", "playlists", "genres"];

    if (a === "top" && b && views.includes(b)) {
      library.view = b;
      library.sort = "mostPlayed";
      return;
    }
    if (a === "mostplayed") {
      library.view = "songs";
      library.sort = "mostPlayed";
      return;
    }
    if (a === "artists" && b === "all") {
      library.view = "artists";
      library.filter = { type: "all", value: null, label: "" };
      return;
    }
    if (a === "artists" && b) {
      library.view = "artists";
      library.filter = { type: "artist", value: b, label: b };
      return;
    }
    if (a === "genres" && b) {
      library.view = "genres";
      library.filter = { type: "genre", value: b, label: b };
      return;
    }
    if (a === "year" && b) {
      library.view = "albums";
      library.filter = { type: "year", value: b, label: b };
      return;
    }
    if (a === "decade" && b) {
      library.view = "albums";
      library.filter = { type: "decade", value: b, label: b + "s" };
      return;
    }
    if (views.includes(a)) library.view = a;
  }

  applyDiscoverRoute(parts) {
    const library = this.ui.libraryPage;
    if (!library) return;

    library.view = "overview";
    library.filter = { type: "all", value: null, label: "" };
    library.sort = "recent";
    library.mode = "grid";
    library.query = "";

    if (!parts.length) return;
    const a = parts[0];
    if (a === "artists") library.view = "artists";
    else if (a === "albums") library.view = "albums";
    else if (a === "songs") library.view = "songs";
    else if (a === "genres") library.view = "genres";
  }

  onPopState() {
    this.syncFromUrl();
  }

  updateActiveNav() {
    document.querySelectorAll("nav .link[data-nav]").forEach((link) => {
      const playlistsArea =
        this.state.currentPage === "createPlaylist" ||
        this.state.currentPage === "editPlaylist" ||
        this.state.currentPage === "playlist";
      const target = playlistsArea ? "playlists" : this.state.currentPage;
      link.classList.toggle("active", link.dataset.nav === target);
    });
  }

  updateTitle() {
    const state = this.state;
    const page = state.currentPage;
    const tab = state.favoritesTab || "songs";
    const artist = state.artistId ? state.getArtistById(state.artistId) : null;
    const album = state.selectedAlbumId ? state.getAlbumById(state.selectedAlbumId) : null;
    const titles = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: state.selectedPlaylistName
        ? `MyBeats — Playlist: ${state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      editPlaylist: state.selectedPlaylistName
        ? `MyBeats — Edit: ${state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      createPlaylist: "MyBeats — New Playlist",
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : "MyBeats",
    };
    document.title = titles[page] ?? "MyBeats";
  }

  updateBreadcrumbs() {
    const container = document.getElementById("breadcrumb-items");
    if (!container) return;

    const crumbs = this.getBreadcrumbs();
    const existing = container.querySelectorAll(".item, .sep");

    if (existing.length > 0) {
      existing.forEach((item) => item.classList.add("removing"));
      setTimeout(() => this.renderCrumbs(container, crumbs), 350);
    } else {
      this.renderCrumbs(container, crumbs);
    }
  }

  renderCrumbs(container, crumbs) {
    if (!crumbs.length) {
      container.innerHTML = '<span class="item active">Home</span>';
      return;
    }
    container.innerHTML = crumbs
      .map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return `
          <span class="item ${isLast ? "active" : ""}" style="--i: ${i};">
            ${crumb}
          </span>
          ${!isLast ? `<span class="sep" style="--i: ${i};">›</span>` : ""}
        `;
      })
      .join("");
  }

  getBreadcrumbs() {
    const crumbs = [];
    const state = this.state;
    const page = state.currentPage;
    const library = this.ui.libraryPage;

    if (page === "home") {
      crumbs.push("Home");
    } else if (page === "library") {
      crumbs.push("Library");
      if (library) {
        const view = library.view || "overview";
        const sort = library.sort || "recent";
        const filter = library.filter || { type: "all", value: null, label: "" };
        if (sort === "mostPlayed" && view === "albums") crumbs.push("Top", "Albums");
        else if (sort === "mostPlayed" && view === "artists") crumbs.push("Top", "Artists");
        else if (sort === "mostPlayed") crumbs.push("Most Played");
        else if (view && view !== "overview") {
          crumbs.push(view.charAt(0).toUpperCase() + view.slice(1));
          if (view === "artists" && filter.type === "all" && filter.value === null) crumbs.push("All");
          else if (filter.type !== "all" && filter.label) crumbs.push(filter.label);
        }
      }
    } else if (page === "favorites") {
      const tab = state.favoritesTab || "songs";
      crumbs.push("Library", "Favorites", tab.charAt(0).toUpperCase() + tab.slice(1));
    } else if (page === "playlists") {
      crumbs.push("Library", "Playlists");
      if (state.selectedPlaylistName) crumbs.push(state.selectedPlaylistName);
    } else if (page === "createPlaylist") {
      crumbs.push("Library", "Playlists", "New");
    } else if (page === "editPlaylist") {
      crumbs.push("Library", "Playlists");
      if (state.selectedPlaylistName) crumbs.push(state.selectedPlaylistName);
      crumbs.push("Edit");
    } else if (page === "artist") {
      crumbs.push("Artists");
      if (state.artistPageName) crumbs.push(state.artistPageName);
      if (state.selectedAlbumName) crumbs.push(state.selectedAlbumName);
    }
    return crumbs;
  }

  toggleBreadcrumb() {
    const nav = document.querySelector('[data-navbar="breadcrumbs"]');
    if (!nav) return;
    this.breadcrumbHidden = !this.breadcrumbHidden;
    nav.classList.toggle("hide", this.breadcrumbHidden);
  }

  setUrl(page, artistId, albumId) {
    this.pushHistory(this.pathFor(page, { artistId, albumId }));
  }

  handlePopState() {
    return this.onPopState();
  }

  syncWithUrl() {
    return this.syncFromUrl();
  }

  goTo(page, artistId, albumId) {
    return this.navigateTo(page, { artistId, albumId });
  }

  get go() {
    return this.navigateTo.bind(this);
  }
  get goHome() {
    return this.navigateHome.bind(this);
  }
  get goLibrary() {
    return this.navigateLibrary.bind(this);
  }
  get goFavorites() {
    return this.navigateFavorites.bind(this);
  }
  get goPlaylists() {
    return this.navigatePlaylists.bind(this);
  }
  get goPlaylist() {
    return this.navigatePlaylist.bind(this);
  }
  get goEditPlaylist() {
    return this.navigateEditPlaylist.bind(this);
  }
  get goCreatePlaylist() {
    return this.navigateCreatePlaylist.bind(this);
  }
  get goArtist() {
    return this.navigateArtist.bind(this);
  }
}

window.Spinner = Spinner;
window.Router = Router;
window.AppNavigator = Router;
window.ViewTransition = ViewTransition;
