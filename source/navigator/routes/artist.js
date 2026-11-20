// /////////////////////////////////////////////////
// Artist Pages
// /////////////////////////////////////////////////
class Artists {
  constructor(ui) {
    this.ui = ui;
    this.tabsScrollHandler = null;
    this.tabsRaf = null;
    this.pinned = false;
  }

  render() {
    this.bindWhenReady();
    return `
      <div class="artist-page" data-page="artist">
        <div class="artist-shell">
          <div class="artist-loading" style="padding: 4rem 1rem; text-align: center; opacity: 0.7;">Loading artist…</div>
        </div>
      </div>
    `;
  }

  renderFull(artist, activeAlbum) {
    const state = this.ui.state;
    const similarIds = artist.similar || [];
    const rows = [similarIds.slice(0, 4), similarIds.slice(4, 8), similarIds.slice(8, 12)];

    return `
      ${this.renderHeader(artist)}
      <div class="albumTabsSentinel" aria-hidden="true"></div>
      ${this.renderAlbumTabs(artist, activeAlbum)}
      <div class="artist-heroBody">
        <div class="hero-stage">
          <div class="hero-left">${this.renderHeroCover(artist, activeAlbum)}${this.renderMetaSummary(artist, activeAlbum)}</div>
          <div class="hero-right">${this.renderSongsList(artist, activeAlbum)}</div>
        </div>
      </div>
      ${similarIds.length ? this.similarMarquee(rows, artist.id) : ""}
    `;
  }

  renderHeader(artist) {
    const isFav = this.ui.favorites.isArtist(artist.id);

    return `
      <header class="artist-header">
        <div class="artist-header-left"><span class="artist-header-kicker">Artist</span><h1 class="artist-name">${Utils.esc(artist.artist)}</h1></div>
        <button type="button" class="artist-heart ${isFav ? "favorited" : ""}" data-artist-heart="${Utils.esc(artist.id)}" aria-label="Favorite artist">${this.ui.likeStatus("artist", isFav, false, null)}</button>
      </header>
    `;
  }

  renderAlbumTabs(artist, activeAlbum) {
    return `
      <nav class="albumTabsBar" data-area="albums" aria-label="Albums">
        <div class="albumTabs-scroll">
          ${(artist.albums || [])
            .map(
              (album) =>
                `<button type="button" class="albumTab ${album.id === activeAlbum.id ? "active" : ""}" data-artist-id="${Utils.esc(artist.id)}" data-album-id="${Utils.esc(album.id)}" aria-pressed="${album.id === activeAlbum.id}">${Utils.esc(album.title || album.album)}</button>`
            )
            .join("")}
        </div>
      </nav>
    `;
  }

  renderHeroCover(artist, activeAlbum) {
    return `
      <div class="hero-cover">
        <img src="${Utils.esc(activeAlbum.coverUrl)}" alt="${Utils.esc(activeAlbum.album)}" loading="eager">
        <div class="hero-scrim"></div>
        <div class="hero-overlay">
          <div class="album-meta"><h2 class="album-title">${Utils.esc(activeAlbum.album)}</h2><span class="track-count">${activeAlbum.songs.length} track${activeAlbum.songs.length === 1 ? "" : "s"}</span></div>
          <button type="button" class="play-all" data-play-album='${JSON.stringify({ artistId: artist.id, albumId: activeAlbum.id })}' aria-label="Shuffle album">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg>
            <span class="shuffle-text">Shuffle</span>
          </button>
        </div>
      </div>
    `;
  }

  renderMetaSummary(artist, activeAlbum) {
    const isAlbumFav = this.ui.favorites.isAlbum(activeAlbum.id);

    return `
      <div data-area="meta-summary" class="hero-meta">
        <div data-list="editorial-brief" class="bento-meta-node">
          <div class="brief-wrapper"><span class="brief-mono">${Utils.esc(activeAlbum.year || "2024")}</span><span class="brief-heading">${Utils.esc(activeAlbum.sold || "Double Platinum")}</span></div>
          <a href="#" class="brief-anchor" id="bento-album-share" data-album-title="${Utils.esc(activeAlbum.album)}">Share this album</a>
        </div>
        <div data-list="utility-hub" class="bento-meta-node">
          <button type="button" class="hub-pill-btn" id="bento-offline-toggle" data-album-id="${Utils.esc(activeAlbum.id)}"><span class="hub-btn-txt">Listen Offline</span></button>
          <div class="hub-group">
            <h5 class="hub-group-title">Add to library</h5>
            <div class="hub-links">
              <a href="#" class="hub-link-item" data-action="add-album-to-playlist" data-album-id="${Utils.esc(activeAlbum.id)}">Playlist</a>
              <a href="#" class="hub-link-item" data-action="add-album-to-queue" data-album-id="${Utils.esc(activeAlbum.id)}">Queue</a>
              <a href="#" class="hub-link-item" data-action="toggle-favorite-album" data-album-id="${Utils.esc(activeAlbum.id)}">${isAlbumFav ? "Remove Favorite" : "Favorites"}</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSongsList(artist, activeAlbum) {
    return `<div data-list="songs" data-type="album" class="hero-songs"><div id="songsList" class="body">${activeAlbum.songs.map((song, i) => this.createSongRow(song, i, artist, activeAlbum)).join("")}</div></div>`;
  }

  createSongRow(song, index, artist, album) {
    const isFav = this.ui.favorites.isSong(song.id);
    const isPlaying = this.ui.state.currentSong?.id == song.id;

    return `
      <div class="songItem ${isPlaying ? "playing" : ""}" data-song-id="${Utils.esc(song.id)}" data-context='${JSON.stringify({ artistId: artist.id, albumId: album.id })}'>
        <div class="left">
          <div class="trackNum">${index + 1}</div>
          <div class="play"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/><polygon points="10,7 17,12 10,17" fill="currentColor"/></svg></div>
        </div>
        <div class="center"><div class="title"><span>${Utils.esc(song.title)}</span></div></div>
        <div class="right">
          <div class="time">${Utils.esc(song.duration || "")}</div>
          <button type="button" class="heart ${isFav ? "favorited" : ""}" data-fav-song="${Utils.esc(song.id)}" aria-label="Favorite song">${this.ui.likeStatus("song", isFav, false, null)}</button>
          <button type="button" class="downloadBtn" data-action="download-song" data-song-id="${Utils.esc(song.id)}" data-song-title="${Utils.esc(song.title)}" data-song-thumbnail="${Utils.esc(album.coverUrl)}" aria-label="Download song"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          <button type="button" class="moreMenu" data-more-song="${Utils.esc(song.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button>
        </div>
      </div>
    `;
  }

  similarMarquee(rows, artistId) {
    const configs = [
      ["left", 40],
      ["right", 45],
      ["left", 35],
    ];

    const renderPill = (entry) => {
      const value = typeof entry === "string" ? entry : String(entry);
      const label = Utils.esc(value);
      return `
        <span class="artist-name-pill animate-fadeIn"
              data-artist-id="${Utils.esc(value)}"
              data-artist-name="${label}">
              ${label}
        </span>`;
    };

    const marquee = (artists, direction, duration) => `
      <div class="marquee-container">
        <div class="marquee-track marquee-${direction}" style="animation-duration: ${duration}s;">
          ${[...artists, ...artists].map(renderPill).join("")}
        </div>
      </div>
    `;

    return `
      <div data-area="similar" class="similar-artists-section">
        <h5 class="similar-artists-title">Listen to similar Artists</h5>
        ${rows.map((row, i) => (row.length ? marquee(row, ...configs[i]) : "")).join("")}
      </div>
    `;
  }

  async bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="artist"]');
    if (!root) {
      if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
      return;
    }

    const shell = root.querySelector(".artist-shell");
    if (!shell) return;

    const state = this.ui.state;
    const artistId = state.artistId;
    if (!artistId) {
      shell.innerHTML = `<div class="artist-missing">Artist not found</div>`;
      return;
    }

    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) {
      shell.innerHTML = `<div class="artist-missing">Artist not found</div>`;
      return;
    }

    let albumId = state.selectedAlbumId;
    if (!albumId && artist.albums?.length) albumId = artist.albums[0].id;
    if (!albumId) {
      shell.innerHTML = `<div class="artist-missing">Album not found</div>`;
      return;
    }

    const album = await window.MusicStore.loadAlbum(artistId, albumId).catch(() => null);
    if (!album) {
      shell.innerHTML = `<div class="artist-missing">Album not found</div>`;
      return;
    }

    state.selectedAlbumId = albumId;
    state.selectedAlbumName = album.album;

    shell.innerHTML = this.renderFull(artist, album);
    this.afterRender();
    this.ui.navigator.updateTitle();
    this.ui.contentEvents?.attachContentEvents?.();
  }

  afterRender() {
    this.watchAlbumTabsPin();
    this.bindAlbumTabsClick();
    this.bindSimilarPills();
  }

  bindSimilarPills() {
    const root = this.getRoot();
    if (!root || root.similarBound) return;
    root.similarBound = true;

    root.addEventListener("click", (e) => {
      const pill = e.target.closest(".artist-name-pill[data-artist-id]");
      if (!pill) return;
      const artistId = pill.dataset.artistId;
      if (!artistId) return;

      const sp = new Spinner({
        container: pill,
        blur: 8,
        dim: 0.4,
        size: 18,
        minDuration: 250,
        delay: 60,
      });
      sp.show();

      setTimeout(() => {
        window.uiManager?.contentEvents?.showArtistPopover(artistId, e);
        sp.hide();
        setTimeout(() => sp.remove(), 300);
      }, window.uiManager?.popoverDelay || 400);
    });
  }

  bindAlbumTabsClick() {
    const root = this.getRoot();
    if (!root) return;

    const bar = root.querySelector(".albumTabsBar");
    if (!bar || bar.bound) return;
    bar.bound = true;

    bar.addEventListener("click", (e) => {
      const tab = e.target.closest(".albumTab");
      if (!tab) return;

      const artistId = tab.dataset.artistId;
      const albumId = tab.dataset.albumId;
      if (!artistId || !albumId) return;

      bar.querySelectorAll(".albumTab.active").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");

      try {
        window.uiManager?.navigator?.switchAlbum(artistId, albumId);
      } catch (err) {
        console.warn("[Artists] Album switch failed:", err);
        return;
      }

      setTimeout(() => {
        this.watchAlbumTabsPin();
        this.scrollHeroIntoView();
      }, 40);
    });
  }

  scrollHeroIntoView() {
    const root = this.getRoot();
    if (!root) return;

    const sentinel = root.querySelector(".albumTabsSentinel");
    if (!sentinel) return;

    const pinTop = this.pinTop();
    const rect = sentinel.getBoundingClientRect();
    const sentinelBottomPage = rect.bottom + window.scrollY;
    const targetY = Math.max(0, sentinelBottomPage - pinTop + 2);

    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  watchAlbumTabsPin() {
    const root = this.getRoot();
    if (!root) return;

    if (this.tabsScrollHandler) {
      window.removeEventListener("scroll", this.tabsScrollHandler, true);
      this.tabsScrollHandler = null;
    }
    if (this.tabsRaf) {
      cancelAnimationFrame(this.tabsRaf);
      this.tabsRaf = null;
    }

    const bar = root.querySelector(".albumTabsBar");
    const sentinel = root.querySelector(".albumTabsSentinel");
    if (!bar || !sentinel) return;

    const pinTop = this.pinTop();

    const compute = () => {
      this.tabsRaf = null;
      if (!bar.isConnected || !sentinel.isConnected) return;

      const sRect = sentinel.getBoundingClientRect();
      const pinned = sRect.bottom <= pinTop + 0.5;
      if (pinned !== this.pinned) {
        this.pinned = pinned;
        bar.classList.toggle("is-pinned", pinned);
      }
    };

    this.tabsScrollHandler = () => {
      if (this.tabsRaf) return;
      this.tabsRaf = requestAnimationFrame(compute);
    };

    this.pinned = false;
    bar.classList.remove("is-pinned");
    compute();

    window.addEventListener("scroll", this.tabsScrollHandler, { passive: true, capture: true });
  }

  // Sticky offset shared with the breadcrumbs bar (--crumbStickTop on
  // #app-shell) so the album-tabs bar pins exactly where the breadcrumbs
  // sit, keeping the "albums push breadcrumbs out of the way" handoff
  // pixel-perfect at every breakpoint (58px mobile, 64px tablet/desktop).
  pinTop() {
    const shell = document.getElementById("app-shell");
    const raw = shell ? getComputedStyle(shell).getPropertyValue("--crumbStickTop") : "";
    const px = parseFloat(raw);
    return Number.isFinite(px) ? px : 56;
  }

  getRoot() {
    return document.querySelector('[data-page="artist"]');
  }
}

window.Artists = Artists;
