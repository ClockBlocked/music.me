




class Spinner {
  static defaults = {
    type: "area",       // "area" | "page" | "fullscreen"
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

  static registry = new Set();
  static _stylesInjected = false;

  static injectStyles() {
    if (Spinner._stylesInjected || document.getElementById("mb-spinner-styles")) {
      Spinner._stylesInjected = true;
      return;
    }
    const style = document.createElement("style");
    style.id = "mb-spinner-styles";
    style.textContent = `
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
    `;
    document.head.appendChild(style);
    Spinner._stylesInjected = true;
  }

  constructor(options = {}) {
    const o = { ...Spinner.defaults, ...options };
    this.type = o.type;
    this.container = o.container;
    this.label = o.label;
    this.blur = o.blur;
    this.dim = o.dim;
    this.size = o.size;
    this.accent = o.accent;
    this.delay = o.delay;
    this.minDuration = o.minDuration;
    this.autoHideAfter = o.autoHideAfter;
    this.zIndex = o.zIndex;

    this.el = null;
    this.host = null;
    this.visible = false;
    this._showTimer = null;
    this._hideTimer = null;
    this._autoTimer = null;
    this._shownAt = 0;
    this._forcedFullscreen = false;
    this._addedStaticClass = false;
  }
  resolveHost() {
    if (this.type === "fullscreen") return document.body;
    if (this.type === "page") {
      const main = document.getElementById("main-content");
      const parent = main?.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) return parent;
      this._forcedFullscreen = true;
      return document.body;
    }
    let host = this.container;
    if (typeof host === "string") host = document.querySelector(host);
    return host || document.body;
  }

  mount() {
    if (this.el && this.el.isConnected) return this.el;
    const host = this.resolveHost();
    if (!host) return null;
    Spinner.injectStyles();

    const computed = window.getComputedStyle(host);
    if (computed.position === "static") {
      host.classList.add("mb-spinner-static");
      this._addedStaticClass = true;
    }

    const overlay = document.createElement("div");
    overlay.className = "mb-spinner-overlay";
    overlay.dataset.mbSpinner = this._forcedFullscreen ? "fullscreen" : this.type;
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
    this.el = overlay;
    this.host = host;
    return overlay;
  }
  show() {
    Spinner.registry.add(this);
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    if (this.visible || this._showTimer) return this;

    const reveal = () => {
      this._showTimer = null;
      const el = this.mount();
      if (!el) return;
      this.visible = true;
      this._shownAt = performance.now();
      requestAnimationFrame(() => {
        el.dataset.visible = "true";
        el.setAttribute("aria-busy", "true");
      });
      if (this.autoHideAfter > 0) {
        clearTimeout(this._autoTimer);
        this._autoTimer = setTimeout(() => this.hide(), this.autoHideAfter);
      }
    };

    if (this.delay > 0) this._showTimer = setTimeout(reveal, this.delay);
    else reveal();
    return this;
  }
  hide(options = {}) {
    const immediate = options.immediate === true;
    if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null; }
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; }
    if (!this.visible) return this;

    const elapsed = performance.now() - this._shownAt;
    const wait = immediate ? 0 : Math.max(0, this.minDuration - elapsed);

    const conceal = () => {
      this._hideTimer = null;
      this.visible = false;
      if (!this.el) return;
      this.el.dataset.visible = "false";
      this.el.setAttribute("aria-busy", "false");
    };

    if (wait > 0) this._hideTimer = setTimeout(conceal, wait);
    else conceal();
    return this;
  }

  remove() {
    if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null; }
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; }
    this.visible = false;
    const el = this.el;
    this.el = null;
    if (el) {
      el.dataset.visible = "false";
      el.setAttribute("aria-busy", "false");
      setTimeout(() => el.remove(), 320);
    }
    if (this._addedStaticClass && this.host) this.host.classList.remove("mb-spinner-static");
    this._addedStaticClass = false;
    this.host = null;
    Spinner.registry.delete(this);
    return this;
  }
  destroy() { return this.remove(); }

  setLabel(text) {
    this.label = text || "";
    if (!this.el) return this;
    const box = this.el.querySelector(".mb-spinner-box");
    let label = this.el.querySelector(".mb-spinner-label");
    if (!this.label) { label?.remove(); return this; }
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
      get visible() { return spinners.some((s) => s.visible); },
      hide(opts) { spinners.forEach((s) => s.hide(opts)); return this; },
      remove() { spinners.forEach((s) => s.remove()); return this; },
      setLabel(text) { spinners.forEach((s) => s.setLabel(text)); return this; },
    };
  }

  static hideAll(options) { [...Spinner.registry].forEach((s) => s.hide(options)); }
  static removeAll() { [...Spinner.registry].forEach((s) => s.remove()); Spinner.registry.clear(); }
  static pruneDetached() {
    [...Spinner.registry].forEach((s) => { if (s.el && !s.el.isConnected) s.remove(); });
  }
}

class AppNavigator {
  static PAGE_SPINNER = {
    type: "page",
    blur: 22,
    dim: 0.6,
    minDuration: 900,
    delay: 60,
    size: 40,
  };

  static ALBUM_SPINNER = {
    blur: 16,
    dim: 0.55,
    minDuration: 500,
    delay: 80,
    size: 34,
  };

  static ALBUM_SWAP_MS = 900;
  static ARTIST_SWAP_MS = 1200;

  constructor(ui) {
    this.ui = ui;
    this.state = ui.state;

    this._activeSpinner = null;
    this._activeGroup = null;
    this._navigating = false;
    this._breadcrumbHidden = false;
  }

  pathFor(page, opts = {}) {
    switch (page) {
      case "home":
        return "/home/";

      case "library":
        return this._libraryPath(opts);

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

      case "artist": {
        const artistId = opts.artistId;
        if (!artistId) return "/home/";
        const albumId = opts.albumId;
        return albumId
          ? `/artist/${artistId}/album/${albumId}/`
          : `/artist/${artistId}/`;
      }

      default:
        return "/home/";
    }
  }

  _libraryPath(opts = {}) {
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

  
  goHome()              { return this.go("home"); }
  goLibrary(opts = {})  { return this.go("library", opts); }
  goFavorites(tab)      { return this.go("favorites", { tab }); }
  goPlaylists()         { return this.go("playlists"); }
  goPlaylist(id)        { return this.go("playlist", { id }); }
  goEditPlaylist(id)    { return this.go("editPlaylist", { id }); }
  goArtist(artistId, albumId) { return this.go("artist", { artistId, albumId }); }

  go(page, opts = {}) {
    // Click on an album tab while already on that artist's page → targeted swap
    if (
      page === "artist" &&
      this.state.currentPage === "artist" &&
      opts.artistId &&
      String(this.state.artistId) === String(opts.artistId)
    ) {
      return this.switchAlbum(opts.artistId, opts.albumId);
    }

    // All other transitions are whole-page
    return this._pageTransition(page, opts);
  }

  switchAlbum(artistId, albumId) {
    const state = this.state;
    const ui = this.ui;

    const artist = state.getArtistById(artistId);
    if (!artist) return;

    const album = artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
    if (!album) return;

    // Update URL + state silently
    this._push(this.pathFor("artist", { artistId, albumId }), {
      page: "artist", artistId, albumId,
    });
    state.selectedAlbumId = albumId;
    state.selectedAlbumName = album.album;

    // Update chrome immediately
    this.updateTitle();
    this.updateBreadcrumbs();

    // Targeted spinners on just the sections we're about to replace
    const coverEl = document.querySelector(".hero-cover");
    const songsEl = document.querySelector('[data-list="songs"]');
    const aboutEl = document.querySelector('[data-page="artist"] [data-area="about"]');

    const group = Spinner.showIn([coverEl, songsEl, aboutEl].filter(Boolean), {
      ...AppNavigator.ALBUM_SPINNER,
      label: "Loading album…",
    });
    this._activeGroup = group;

    // Swap content after the spinner has been visible
    setTimeout(() => {
      this._swapArtistSections(artist, album);
      group.hide();
      setTimeout(() => group.remove(), 400);
      if (this._activeGroup === group) this._activeGroup = null;
    }, AppNavigator.ALBUM_SWAP_MS);
  }

  _swapArtistSections(artist, album) {
    const ui = this.ui;
    const artistPage = ui.artistPage;

    // Cover
    const coverEl = document.querySelector(".hero-cover");
    if (coverEl && album.coverUrl) {
      const img = coverEl.querySelector("img");
      if (img) img.src = album.coverUrl;
    }

    // Songs list
    const songsEl = document.querySelector('[data-list="songs"]');
    if (songsEl && artistPage?.createSongRow) {
      songsEl.innerHTML = `
        <div class="header">
          <div class="left">
            <span class="badge">${album.certification || "Double Platinum"}</span>
            <span class="year">${album.year || "2024"}</span>
          </div>
          <span class="hint">Double-click</span>
        </div>
        <div class="body">
          ${album.songs.map((song, i) => artistPage.createSongRow(song, i, artist, album)).join("")}
        </div>
      `;
    }

    // About section (if it exists)
    const aboutEl = document.querySelector('[data-page="artist"] [data-area="about"]');
    if (aboutEl && artistPage?.aboutSection) {
      aboutEl.innerHTML = artistPage.aboutSection(artist, album);
      aboutEl.querySelectorAll(".tab").forEach((btn) => {
        btn.classList.toggle("active", IdUtils.norm(btn.dataset.albumId) === IdUtils.norm(album.id));
      });
    }

    ui.contentEvents?.attachContentEvents?.();
    window.dispatchEvent(new CustomEvent("mybeats:album-swapped", {
      detail: { artistId: artist.id, albumId: album.id },
    }));
  }

  _pageTransition(page, opts = {}) {
    if (this._navigating) return;

    // Per-page-type spinner timing
    const isArtistNav = page === "artist";
    const config = { ...AppNavigator.PAGE_SPINNER };
    const delay = isArtistNav ? AppNavigator.ARTIST_SWAP_MS : 0;

    // For instant transitions (home, library, favorites, etc.), no spinner
    if (!isArtistNav) {
      return this._commit(page, opts);
    }

    this._navigating = true;
    const sp = new Spinner({
      ...config,
      label: "Loading artist…",
    });
    this._activeSpinner = sp;
    sp.show();

    setTimeout(() => {
      this._commit(page, opts);
      sp.hide();
      setTimeout(() => sp.remove(), 400);
      if (this._activeSpinner === sp) this._activeSpinner = null;
      this._navigating = false;
    }, delay);
  }

  _commit(page, opts = {}) {
    const state = this.state;
    const ui = this.ui;

    // Drawer cleanup
    if (state.isDrawerOpen) ui.closePlayerDrawer?.();

    // Resolve artist / album for title
    let artist = null;
    let resolvedArtistId = opts.artistId || null;
    if (resolvedArtistId) {
      artist = state.getArtistById(resolvedArtistId);
      if (!artist) {
        artist = state.enrichedLibrary.find((a) => a.artist === resolvedArtistId);
        if (artist) resolvedArtistId = artist.id;
      }
    }
    const album = opts.albumId ? state.getAlbumById(opts.albumId) : null;

    // State mutations
    state.currentPage = page;
    state.artistId = resolvedArtistId;
    state.artistPageName = artist?.artist || null;
    state.selectedAlbumId = opts.albumId || null;
    state.selectedAlbumName = album?.album || null;
    state.isSearchOpen = false;
    state.isCreatingPlaylist = false;

    // Page-specific state
    if (page !== "playlists" && page !== "editPlaylist") {
      state.selectedPlaylistName = null;
    }

    // URL
    const url = this.pathFor(page, {
      ...opts,
      artistId: resolvedArtistId,
      albumId: opts.albumId || null,
    });
    this._push(url, {
      page,
      artistId: resolvedArtistId,
      albumId: opts.albumId || null,
    });

    // Chrome
    this.updateTitle();
    this.updateActiveNav();
    this.updateBreadcrumbs();

    // Render
    ui.render();
  }

  
  _normalize(path) {
    if (!path) return "/";
    const stripped = path.replace(/\/+$/, "");
    return stripped === "" ? "/" : stripped;
  }

  _push(url, stateObj = {}) {
    const current = this._normalize(window.location.pathname);
    const target = this._normalize(url);
    const hasSearch = !!window.location.search;
    if (current === target && !hasSearch) return;
    history.pushState(stateObj, "", url);
  } 
  syncFromUrl() {
    const parts = window.location.pathname.split("/").filter((p) => p);
    const params = new URLSearchParams(window.location.search);
    const deepLinkSong = params.get("song");

    const state = this.state;
    state.pendingDeepLinkSong = null;
    state.editingPlaylistId = null;

    // Reset to safe defaults
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
          this._parseLibrary(parts.slice(1));
          break;

        case "discover":
          state.currentPage = "library";
          this._parseDiscover(parts.slice(1));
          break;

        case "favorites":
          state.currentPage = "favorites";
          state.favoritesTab = parts[1] || "songs";
          break;

        case "playlist":
          this._parsePlaylist(parts, deepLinkSong);
          break;

        case "playlists":
          state.currentPage = "playlists";
          break;

        case "artist":
          this._parseArtist(parts, deepLinkSong);
          break;

        default:
          state.currentPage = "404";
      }
    }

    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    this.ui.render();
  }

  _parsePlaylist(parts, deepLinkSong) {
    const state = this.state;
    if (!parts[1]) { state.currentPage = "404"; return; }

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
  _parseArtist(parts, deepLinkSong) {
    const state = this.state;
    if (!parts[1]) { state.currentPage = "404"; return; }

    const artistId = parts[1];
    const artist = state.getArtistById(artistId);
    if (!artist) { state.currentPage = "404"; return; }

    state.currentPage = "artist";
    state.artistId = artistId;
    state.artistPageName = artist.artist;

    if (parts[2] === "album" && parts[3]) {
      const albumId = parts[3];
      const album = artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
      state.selectedAlbumId = album ? albumId : null;
      state.selectedAlbumName = album?.album || null;
    }

    if (deepLinkSong) state.pendingDeepLinkSong = deepLinkSong;
  }
  _parseLibrary(parts) {
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
    if (views.includes(a)) {
      library.view = a;
    }
  }
  _parseDiscover(parts) {
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
      link.classList.toggle("active", link.dataset.nav === this.state.currentPage);
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
      setTimeout(() => this._renderCrumbs(container, crumbs), 350);
    } else {
      this._renderCrumbs(container, crumbs);
    }
  }

  _renderCrumbs(container, crumbs) {
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
      if (state.isCreatingPlaylist) crumbs.push("Create");
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
    this._breadcrumbHidden = !this._breadcrumbHidden;
    nav.classList.toggle("hide", this._breadcrumbHidden);
  }


  
  setUrl(page, artistId, albumId) {
    this._push(this.pathFor(page, { artistId, albumId }));
  }
  normalizePath(path) { return this._normalize(path); }
  handlePopState()    { return this.onPopState(); }
  syncWithUrl()       { return this.syncFromUrl(); }
  goTo(page, artistId, albumId) {
    return this.go(page, { artistId, albumId });
  }
}

window.Spinner = Spinner;
window.AppNavigator = AppNavigator;