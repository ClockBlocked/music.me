const UI_DEFAULTS = {
  fragmentDelay: 1500,
  popoverDelay: 400,
};

class UIManager {
  constructor(state, audioPlayer, favorites) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.favorites = favorites;

    this.isBreadcrumbHidden = false;
    this.skipProgress = false;
    this.fragmentLoadDelay = UI_DEFAULTS.fragmentDelay;
    this.popoverDelay = UI_DEFAULTS.popoverDelay;
    this.favoritesTabLoading = false;
    this.artistTabLoading = false;

    this.state.favoritesTab = "songs";
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;

    this.router = new Router(this);
    this.player = new PlayerManager(this);
    this.search = new Search(this);
    this.events = new PageEvents(this);

    this.pages = {
      home: new Home(this),
      library: new Library(this),
      favorites: new Favorites(this),
      playlists: new Playlists(this),
      editPlaylist: new EditPlaylist(this),
      createPlaylist: new CreatePlaylist(this),
      artist: new Artists(this),
      error: new Error404(this),
    };

    this.init();

    window.NProgress?.configure({
      showSpinner: true,
      speed: 300,
      trickleSpeed: 600,
    });
  }

  get navigator() { return this.router; }
  get contentEvents() { return this.events; }
  get homePage() { return this.pages.home; }
  get libraryPage() { return this.pages.library; }
  get favoritesPage() { return this.pages.favorites; }
  get playlistsPage() { return this.pages.playlists; }
  get editPlaylistPage() { return this.pages.editPlaylist; }
  get createPlaylistPage() { return this.pages.createPlaylist; }
  get artistPage() { return this.pages.artist; }
  get errorPage() { return this.pages.error; }

  init() {
    this.render = this.render.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handlePopState = this.handlePopState.bind(this);

    GlobalListeners.bindAll(this);
    this.router.syncFromUrl();
    window.addEventListener("popstate", this.handlePopState);
  }

  navigate(page, artistId = null, albumId = null) {
    if (!this.skipProgress && window.NProgress) NProgress.start();
    this.skipProgress = false;
    return this.router.navigateTo(page, { artistId, albumId });
  }

  handlePopState() {
    this.router.onPopState();
  }

  editPlaylist(playlistId) {
    const playlist = this.state.playlists.find((p) => String(p.id) === String(playlistId));
    this.state.editingPlaylistId = playlistId;
    this.state.selectedPlaylistName = playlist?.name || null;
    return this.router.navigateEditPlaylist(playlistId);
  }

  createPlaylist() {
    this.pages.createPlaylist.reset();
    this.state.selectedPlaylistName = null;
    return this.router.navigateCreatePlaylist();
  }

  render() {
    this.main = document.getElementById("main-content");
    if (!this.main) return;

    this.scrollToTop();
    this.mountCurrentPage();

    this.player.renderMiniPlayer();
  }

  mountCurrentPage() {
    this.main.innerHTML = this.pageHtml(this.state.currentPage);
    this.events.attachContentEvents();
    Spinner.pruneDetached();
    if (window.NProgress && NProgress.status !== null) NProgress.done();
    this.autoPlayDeepLink();
  }

  pageHtml(pageKey) {
    const renderer = this.pageRenderers()[pageKey];
    return renderer ? renderer() : "<div>Not found</div>";
  }

  pageRenderers() {
    return {
      home: () => this.pages.home.render(),
      library: () => this.pages.library.render(),
      favorites: () => this.pages.favorites.render(),
      playlists: () => this.pages.playlists.render(),
      editPlaylist: () => this.pages.editPlaylist.render(),
      createPlaylist: () => this.pages.createPlaylist.render(),
      artist: () => this.pages.artist.render(),
      404: () => this.pages.error.render(),
    };
  }

  artistNameTooltip(artistId, displayText = null) {
    const artist = this.state.getArtistById(artistId);
    if (!artist) return displayText || "Unknown";
    const name = artist.artist;
    const text = displayText || name;
    return `
    <div class="tooltip-wrapper" tabindex="0" role="button">
      <span class="text">${text}
        <span class="popup" role="tooltip" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}')">View Artist</span>
      </span>
    </div>
    `;
  }

  renderScrollSection(title, cards) {
    return `<section data-area="scroll" class="section container"><h2 class="section-header">${title}</h2><div class="scroll-row">${cards.join("")}</div></section>`;
  }

  renderAlbumCard(artistId, artistName, albumId, albumName, coverUrl, index = 0) {
    const album = this.state.getAlbumById(albumId);
    const isFav = albumId && this.favorites.isAlbum(albumId);
    const songCount = (album?.songs && album.songs.length) || album?.songCount || 0;

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 50}ms" data-artist-id="${artistId}" data-album-id="${albumId}">
  <div class="imgBx"><img src="${coverUrl}" alt="${Utils.esc(albumName)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx"><h3>${albumName}<br><span>${artistName} • ${songCount} song${songCount === 1 ? "" : "s"}</span></h3></div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="play-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Play"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm128-88c0-8.7 4.7-16.7 12.3-20.9s16.8-4.1 24.3 .5l144 88c7.1 4.4 11.5 12.1 11.5 20.5s-4.4 16.1-11.5 20.5l-144 88c-7.4 4.5-16.7 4.7-24.3 .5S176 352.7 176 344l0-176z"/><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/></svg></a></li>
      <li style="--i:2"><a href="#" data-hover-action="shuffle-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Shuffle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M425 31l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-15.1 0-29.3 7.1-38.4 19.2l-33.6 44.8-30-40 25.2-33.6C297.3 118.2 325.8 104 356 104l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0zM194 336l-25.2 33.6C150.7 393.8 122.2 408 92 408l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c15.1 0 29.3-7.1 38.4-19.2L164 296 194 336zm197-49c9.4-9.4 24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-30.2 0-58.7-14.2-76.8-38.4L130.4 171.2C121.3 159.1 107.1 152 92 152l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c30.2 0 58.7 14.2 76.8 38.4L317.6 340.8c9.1 12.1 23.3 19.2 38.4 19.2l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9z"/></svg></a></li>
      <li style="--i:3"><a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-album" data-album-id="${albumId}" title="Favorite"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm96-21.3c0-32.4 26.3-58.7 58.7-58.7 18.5 0 35.9 8.7 46.9 23.5l6.4 8.5 6.4-8.5c11.1-14.8 28.5-23.5 46.9-23.5 32.4 0 58.7 26.3 58.7 58.7l0 5.3c0 49.1-65.8 98.1-96.5 118.3-9.5 6.2-21.5 6.2-30.9 0-30.7-20.2-96.5-69.3-96.5-118.3l0-5.3z"/><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-6.4-312.5c-11.1-14.8-28.5-23.5-46.9-23.5-32.4 0-58.7 26.3-58.7 58.7l0 5.3c0 49.1 65.8 98.1 96.5 118.3 9.5 6.2 21.5 6.2 30.9 0 30.7-20.2 96.5-69.3 96.5-118.3l0-5.3c0-32.4-26.3-58.7-58.7-58.7-18.5 0-35.9 8.7-46.9 23.5l-6.4 8.5-6.4-8.5z"/></svg></a></li>
      <li style="--i:4"><a href="#" data-hover-action="album-playlist" data-artist-id="${artistId}" data-album-id="${albumId}" title="Add to playlist"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path opacity=".4" fill="currentColor" d="M64 240l261.8 0c-14.7 9.8-28 21.5-39.4 34.9-9.7-1.9-19.9-2.9-30.4-2.9-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5 1.8 11.2 4.7 22.1 8.4 32.5L96 464 64 240z"/><path fill="currentColor" d="M152 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l208 0c13.3 0 24-10.7 24-24S373.3 0 360 0L152 0zM104 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l304 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L104 96zM484.3 208.6C475.1 198 461.9 192 448 192L64 192c-13.9 0-27.1 6-36.3 16.6S14.5 233 16.5 246.8l32 224C51.9 494.4 72.1 512 96 512l180 0c-10.5-14.6-19-30.7-25.1-48L96 464 64 240 325.8 240c30.4-20.2 66.9-32 106.2-32 20.3 0 39.8 3.1 58.1 8.9-1.6-3-3.6-5.8-5.8-8.4zM256 272c-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5-1.7-10.2-2.6-20.7-2.6-31.5 0-9.5 .7-18.8 2-27.8-10.7-3.6-18-11.3-18-20.2 0-11.7 12.9-21.4 29.3-22.3 7.9-20.2 19.2-38.7 33.1-54.8-9.7-1.9-19.9-2.9-30.4-2.9zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm16-208l0 48 48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48-48 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16z"/></svg></a></li>
    </ul>
  </div>
</div>
    `;
  }

  renderArtistCard(artist, index = 0) {
    const isFav = this.favorites.isArtist(artist.id);
    const albumCount = (artist.albums && artist.albums.length) || artist.albumCount || 0;
    const imageUrl = artist.imageUrl || window.MusicStore?.portraitUrl(artist.portrait) || "";

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 60}ms" data-artist-id="${artist.id}">
  <div class="imgBx"><img src="${imageUrl}" alt="${Utils.esc(artist.artist)}" loading="lazy"></div>
  <div class="content">
    <div class="contentBx"><h3>${artist.artist}<br><span>${artist.genre || "Artist"} • ${albumCount} album${albumCount === 1 ? "" : "s"}</span></h3></div>
    <ul class="sci">
      <li style="--i:1"><a href="#" data-hover-action="view-artist" data-artist-id="${artist.id}" title="View">${Icons.general.eye(16)}</a></li>
      <li style="--i:2"><a href="#" data-hover-action="play-artist" data-artist-id="${artist.id}" title="Play top">${Icons.player.play(16)}</a></li>
      <li style="--i:3"><a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-artist" data-artist-id="${artist.id}" title="Favorite">${Icons.general.heart(16, isFav)}</a></li>
    </ul>
  </div>
</div>
    `;
  }

  renderRecentCard(song, index = 0) {
    return `
      <div data-card="album" class="card animate-fadeInUp" style="--w: 140px; --d: ${index * 50}ms">
        <div class="art-wrap" data-song-id="${song.id}" data-play-source="home">
          <img src="${song.coverUrl}" alt="${Utils.esc(song.title)}" loading="lazy">
          <div class="art-overlay"><span class="play-glyph">${Icons.player.play(16)}</span></div>
        </div>
        <div class="card-info"><p class="primary">${song.title}</p><p class="secondary">${song.artist}</p></div>
      </div>
    `;
  }

  renderSongRow(song, index, showDuration = true) {
    const artistId = song.artistId;
    const albumId = song.albumId;
    return `
      <div class="song-row animate-fadeInUp" style="--d: ${index * 25}ms">
        <button class="main" data-song-id="${song.id}">
          <img src="${song.coverUrl}" class="cover">
          <div class="info">
            <p class="title">${song.title}</p>
            <p class="sub">${this.artistNameTooltip(artistId)} • <span class="album-link" data-artist-id="${artistId}" data-album-id="${albumId}" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}', '${albumId}')">${song.album}</span></p>
          </div>
        </button>
        <button class="downloadBtn" data-action="download-song" data-song-id="${song.id}" data-song-title="${song.title}" data-song-thumbnail="${song.coverUrl}" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        ${showDuration ? `<span class="time">${song.duration}</span>` : ""}
        <button class="heart ${this.favorites.isSong(song.id) ? "favorited" : ""}" data-fav-song="${song.id}">${this.likeStatus("song", this.favorites.isSong(song.id), false, null)}</button>
      </div>
    `;
  }

  async autoPlayDeepLink() {
    const songId = this.state.pendingDeepLinkSong;
    if (!songId) return;
    this.state.pendingDeepLinkSong = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("song");
    history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);

    if (this.state.currentPage !== "artist") return;

    let song = this.state.getSongById(songId);
    if (!song && this.state.artistId) {
      const albumId = this.state.selectedAlbumId;
      if (albumId) {
        await window.MusicStore.loadAlbum(this.state.artistId, albumId).catch(() => null);
      }
      song = this.state.getSongById(songId);
    }
    if (!song) return;

    const queue = await Utils.albumQueue(song.artistId, song.albumId);
    const startSong = queue.find((s) => Utils.id(s.id) === Utils.id(songId)) || song;
    this.audioPlayer.playSong(startSong, queue.length ? queue : null, true, "album");
  }

  toggleTheme() {
    Prefs.applyTheme(Prefs.nextToggle());
  }

  showSettingsModal() {
    const popups = window.popups;
    if (!popups) return;

    const currentTheme = Prefs.theme();
    const darkThemes = Prefs.listThemes().filter((t) => t.dark);
    const lightThemes = Prefs.listThemes().filter((t) => !t.dark);

    const themeCard = ({ key, label, preview }) => `
      <button type="button" class="popups-theme-card ${key === currentTheme ? "active" : ""}"
              data-theme-option="${key}" role="radio" aria-checked="${key === currentTheme}" aria-label="${label} theme">
        <span class="popups-theme-preview" style="--preview-bg:${preview.bg};--preview-card:${preview.card};--preview-text:${preview.text};--preview-accent:${preview.accent};">
          <span class="popups-theme-preview-bar"></span>
          <span class="popups-theme-preview-body"><span class="popups-theme-preview-chip"></span><span class="popups-theme-preview-line"></span></span>
          <span class="popups-theme-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        </span>
        <span class="popups-theme-name">${label}</span>
      </button>
    `;

    const content = document.createElement("div");
    content.className = "popups-settings";
    content.innerHTML = `
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Dark</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Dark color schemes">${darkThemes.map(themeCard).join("")}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Light</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Light color schemes">${lightThemes.map(themeCard).join("")}</div>
      </section>
      <section class="popups-settings-section">
        <p class="popups-settings-label">Playback</p>
        <label class="popups-toggle"><input type="checkbox" id="pref-fade" ${Prefs.get("fadeTransitions") ? "checked" : ""}><span>Fade transitions between tracks</span></label>
        <label class="popups-toggle"><input type="checkbox" id="pref-radio" ${Prefs.get("radioAutoplay") ? "checked" : ""}><span>Radio autoplay when queue ends</span></label>
      </section>
    `;

    popups.modal({
      title: "Settings",
      size: "md",
      content,
      closable: true,
      autoClose: false,
      onClose: () => {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
      },
    });

    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");

    const setActiveCard = (activeEl) => {
      content.querySelectorAll(".popups-theme-card").forEach((el) => {
        const on = el === activeEl;
        el.classList.toggle("active", on);
        el.setAttribute("aria-checked", String(on));
      });
    };

    content.querySelectorAll(".popups-theme-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.themeOption;
        if (!next || !Prefs.isValidTheme(next)) return;
        Prefs.applyTheme(next);
        setActiveCard(btn);
        popups.toast({ message: `Theme: ${Prefs.THEMES[next].label}` });
      });
    });

    content.querySelector("#pref-fade")?.addEventListener("change", (e) => {
      Prefs.set("fadeTransitions", e.target.checked);
      popups.toast({ message: e.target.checked ? "Fade transitions on" : "Fade transitions off" });
    });

    content.querySelector("#pref-radio")?.addEventListener("change", (e) => {
      Prefs.set("radioAutoplay", e.target.checked);
      popups.toast({ message: e.target.checked ? "Radio autoplay on" : "Radio autoplay off" });
    });

    setTimeout(() => {
      content.querySelector(".popups-theme-card.active, .popups-theme-card, input, button")?.focus();
    }, 50);
  }

  openSearch() { this.search.open(); }
  closeSearch() { this.search.close(); }
  showArtistPopover(artistId, event) { this.events.showArtistPopover(artistId, event); }
  closePlayerDrawer() { this.player.closeDrawer(); }
  openPlayerDrawer() { this.player.openDrawer(); }
  updateMiniPlayer() { this.player.renderMiniPlayer(); }
  updateProgressOnly() { this.player.updateProgressOnly(); }

  updateFullPlayer() {
    const drawer = document.getElementById("full-player-drawer");
    if (drawer) this.player.softUpdateDrawer(drawer);
    else if (this.state.isDrawerOpen) this.player.renderFullPlayer();
  }

  showShortcutsHelp() {
    const shortcuts = [
      ["Space", "Play / Pause"],
      ["←", "Previous track"],
      ["→", "Next track"],
      ["↑", "Volume up"],
      ["↓", "Volume down"],
      ["M", "Mute"],
      ["L", "Favorite current song"],
      ["S", "Shuffle"],
      ["R", "Cycle repeat mode"],
      ["Q", "Up Next queue"],
      ["Ctrl/⌘ + K", "Search"],
      ["?", "This help"],
      ["Esc", "Close dialogs"],
    ];
    this.state.modalOpen(`
      <div data-modal="shortcuts" class="shortcuts-help">
        <div class="head">
          <h2 class="title">Keyboard Shortcuts</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div data-list="shortcuts" class="grid">
          ${shortcuts.map(([key, description]) => `
            <div class="row"><span class="desc">${description}</span><kbd class="kbd">${key}</kbd></div>
          `).join("")}
        </div>
      </div>
    `);
  }

  scrollToTop(duration = 500) {
    const startY = window.scrollY;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  refreshArtistContent(artistId, albumId) {
    return this.router.navigateArtist(artistId, albumId);
  }

  refreshFavoritesContent(tab) {
    if (this.favoritesTabLoading) return;
    const container = document.getElementById("favorites-content");
    if (!container) return;

    this.favoritesTabLoading = true;
    const spinner = new Spinner({ container, delay: 120, minDuration: 300 });
    spinner.show();

    this.state.favoritesTab = tab;
    history.pushState(null, "", `/favorites/${tab}`);
    this.router.updateBreadcrumbs();

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    setTimeout(async () => {
      container.innerHTML = await this.pages.favorites.tabContent(tab);
      this.events.attachContentEvents();
      spinner.hide();
      setTimeout(() => spinner.remove(), 400);
      this.favoritesTabLoading = false;
    }, 200);
  }

  async toggleFavAndReRender(songId) {
    await window.heartManager?.toggle("song", songId);
  }

  likeStatus(type, isFavorite, isHovered, tempState) {
    if (tempState === "error" || tempState === "exclamation") return `<i class="fa-solid fa-heart-circle-exclamation error-icon"></i>`;
    if (tempState === "check" || tempState === "confirm") return `<i class="fa-solid fa-heart-circle-check confirm-icon"></i>`;
    if (isFavorite) return isHovered ? `<i class="fa-solid fa-heart-circle-minus hover-liked-icon"></i>` : `<i class="fa-solid fa-heart liked-icon"></i>`;
    return isHovered ? `<i class="fa-solid fa-heart-circle-plus hover-not-liked-icon"></i>` : `<i class="fa-solid fa-heart not-liked-icon"></i>`;
  }
}


class GlobalListeners {
  static globalHandlers(ui) {
    return [
      {
        el: document.getElementById("modal-overlay"),
        type: "click",
        handler: () => ui.state.modalClose(),
      },
      {
        el: document,
        type: "contextmenu",
        handler: (e) => {
          e.preventDefault();
          const target = e.target.closest("[data-artist-id], [data-album-id], [data-song-id], [data-playlist-id]");
          if (!target) return;
          const { artistId, albumId, songId, playlistId } = target.dataset;
          if (window.contextMenu?.show) window.contextMenu.show(e.clientX, e.clientY, { artistId, albumId, songId, playlistId });
        },
      },
      {
        el: window,
        type: "keydown",
        handler: (e) => {
          const tag = e.target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

          if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            ui.showShortcutsHelp();
            return;
          }
          if (e.ctrlKey || e.metaKey || e.altKey) return;

          switch (e.code) {
            case "Space":
              e.preventDefault();
              ui.audioPlayer.togglePlay();
              break;
            case "ArrowLeft":
              e.preventDefault();
              ui.audioPlayer.skipBack();
              break;
            case "ArrowRight":
              e.preventDefault();
              ui.audioPlayer.skipForward();
              break;
            case "ArrowUp":
              e.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume + 0.05);
              break;
            case "ArrowDown":
              e.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume - 0.05);
              break;
            case "KeyM":
              ui.audioPlayer.toggleMute();
              break;
            case "KeyL":
              if (ui.state.currentSong) ui.toggleFavAndReRender(ui.state.currentSong.id);
              break;
            case "KeyS":
              ui.audioPlayer.toggleShuffle();
              break;
            case "KeyR":
              ui.audioPlayer.cycleRepeat();
              break;
            case "KeyQ":
              if (!ui.state.isDrawerOpen) {
                ui.openPlayerDrawer();
                ui.player.openQueue();
              } else ui.player.toggleQueue();
              break;
            case "Escape":
              if (ui.state.isDrawerOpen) ui.closePlayerDrawer();
              if (document.querySelector(".modal.active")) ui.state.modalClose();
              break;
          }
        },
      },
    ];
  }

  static staticHandlers(ui) {
    return Array.from(document.querySelectorAll("nav .link[data-nav]")).map((btn) => ({
      el: btn,
      type: "click",
      handler: () => ui.navigate(btn.dataset.nav),
    }));
  }

  static initHandlers(ui) {
    return [
      {
        el: window,
        type: "popstate",
        handler: () => ui.router.onPopState(),
      },
      {
        el: document.getElementById("breadcrumb-toggle"),
        type: "click",
        handler: () => ui.router.toggleBreadcrumb(),
      },
      {
        el: document.getElementById("open-search"),
        type: "click",
        handler: () => ui.openSearch(),
      },
      {
        el: document.getElementById("close-search"),
        type: "click",
        handler: () => ui.closeSearch(),
      },
      {
        el: document.getElementById("search-overlay"),
        type: "click",
        handler: () => ui.closeSearch(),
      },
      {
        el: document.querySelector('[data-action="settings"]'),
        type: "click",
        handler: () => ui.showSettingsModal(),
      },
      {
        el: document.querySelector('[data-dash="notifications"]'),
        type: "click",
        handler: (e) => window.popups.showNotificationPanel(e.currentTarget),
      },
      {
        setup: (bind) => {
          const input = document.getElementById("search-input");
          if (!input) return;
          let timer;
          const handler = (e) => {
            clearTimeout(timer);
            ui.state.searchQuery = e.target.value;
            timer = setTimeout(() => ui.search.refresh(), 200);
          };
          input.addEventListener("input", handler);
          bind.push({ el: input, type: "input", handler });
        },
      },
      {
        setup: (bind) => {
          const handler = (e) => {
            if (e.key === "Escape" && ui.state.isSearchOpen) ui.closeSearch();
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
              e.preventDefault();
              ui.openSearch();
            }
          };
          document.addEventListener("keydown", handler);
          bind.push({ el: document, type: "keydown", handler });
        },
      },
      {
        immediate: () => Prefs.applyTheme(Prefs.theme(), { persist: false }),
      },
    ];
  }

  static additionalHandlers() { return []; }
  static removedHandlers() { return []; }

  static bindAll(ui) {
    const bound = [];
    const attach = (list) => {
      list.forEach((entry) => {
        if (entry.setup) entry.setup(bound);
        else if (entry.immediate) entry.immediate();
        else if (entry.el && entry.type && entry.handler) {
          entry.el.addEventListener(entry.type, entry.handler);
          bound.push(entry);
        }
      });
    };
    attach(GlobalListeners.globalHandlers(ui));
    attach(GlobalListeners.staticHandlers(ui));
    attach(GlobalListeners.initHandlers(ui));
    attach(GlobalListeners.additionalHandlers(ui));
    return bound;
  }
}

class PageEvents {
  constructor(ui) {
    this.ui = ui;
    this.popups = window.popups || new PopupsManager({ ui });
    this.popups.ui = ui;
  }

  bindHeartButton(btn, type, id) {
    window.heartManager?.bindAll(btn?.parentElement || document);
  }

  setupHeartButton(btn, type, id) {
    return this.bindHeartButton(btn, type, id);
  }

  bindAllHearts() {
    window.heartManager?.bindAll(document);
  }

  attachHeartEvents() {
    return this.bindAllHearts();
  }

  showArtistPopover(artistId, event) {
    return this.popups.showArtistPopover(artistId, event);
  }

  showSongMenu(songId, event) {
    return this.popups.showSongMenu(songId, event);
  }

  attachContentEvents() {
    window.heartManager?.prune();
    window.heartManager?.bindAll(document);

    this.bindArtistNavigation();
    this.bindAlbumActions();
    this.bindSongInteractions();
    this.bindPlaybackButtons();
    this.bindPlaylistPage();
    this.bindPlaylistEditor();
    this.bindHoverActions();
    this.bindTabButtons();
    this.refreshSavedBadges();
  }

  bindArtistNavigation() {
    const main = document.getElementById("main-content");
    if (!main || main.artistClicksBound) return;
    main.artistClicksBound = true;

    main.addEventListener("click", (e) => {
      const el = e.target.closest("[data-artist-id]");
      if (!el) return;
      const artistId = el.dataset.artistId;
      const albumId = el.dataset.albumId || null;
      e.stopPropagation();
      this.ui.navigate("artist", artistId, albumId);
    });

    main.addEventListener("dblclick", (e) => {
      const el = e.target.closest(".album-cover-wrap[data-artist-id][data-album-id]");
      if (!el) return;
      const { artistId, albumId } = el.dataset;
      if (!artistId || !albumId) return;
      Utils.albumQueue(artistId, albumId).then((queue) => {
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });
  }

  bindAlbumActions() {
    document.querySelectorAll('[data-action="add-album-to-playlist"]').forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const album = this.ui.state.getAlbumById(el.dataset.albumId);
        if (album && album._discographyOnly) {
          await window.MusicStore.loadAlbum(album.artistId, album.id).catch(() => null);
        }
        const fresh = this.ui.state.getAlbumById(el.dataset.albumId);
        if (!fresh?.songs?.length) return;
        window.favoritesPlaylists?.addToPlaylistModal?.(fresh.songs[0]);
      });
    });

    document.querySelectorAll('[data-action="add-album-to-queue"]').forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        const stub = this.ui.state.getAlbumById(albumId);
        if (!stub) return;
        const album = await window.MusicStore.loadAlbum(stub.artistId, albumId).catch(() => null);
        if (!album?.songs?.length) return;
        const queue = await Utils.albumQueue(album.artistId, albumId);
        const existing = this.ui.state.queue || [];
        this.ui.state.queue = [...existing, ...queue];
        if (this.ui.state.currentSong) {
          this.ui.state.queueIndex = this.ui.state.queue.findIndex(
            (s) => s.id == this.ui.state.currentSong.id
          );
        }
        this.ui.state.showToast?.(`Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`);
      });
    });

    document.querySelectorAll("[data-play-album]").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (e.detail > 1) return;
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = await Utils.albumQueue(data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });
  }

  bindSongInteractions() {
    document.querySelectorAll("[data-song-id]").forEach((el) => {
      el.addEventListener("dblclick", async (e) => {
        if (e.target.closest(".downloadBtn")) return;
        const songId = el.dataset.songId;
        let song = this.ui.state.getSongById(songId);

        if (!song && el.dataset.context) {
          const ctx = JSON.parse(el.dataset.context);
          await window.MusicStore.loadAlbum(ctx.artistId, ctx.albumId).catch(() => null);
          song = this.ui.state.getSongById(songId);
        }
        if (!song) return;

        if (el.dataset.context) {
          const ctx = JSON.parse(el.dataset.context);
          const queue = await Utils.albumQueue(ctx.artistId, ctx.albumId);
          if (queue.length) {
            const start = queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0];
            this.ui.audioPlayer.playSong(start, queue, true, "album");
            return;
          }
        }
        if (el.dataset.playlistId) {
          const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistId);
          if (queue.length) {
            const start = queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0];
            this.ui.audioPlayer.playSong(start, queue, true, "playlist");
            return;
          }
        }
        this.ui.audioPlayer.playSong(song, null, true, el.dataset.playSource || null);
      });
    });

    document.querySelectorAll("[data-more-song]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showSongMenu(el.dataset.moreSong, e);
      });
    });

    document.querySelectorAll(".add-to-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const song = this.ui.state.getSongById(btn.dataset.songId);
        if (song) this.ui.favorites.addToPlaylistModal(song);
      });
    });
  }

  bindPlaybackButtons() {
    document.querySelectorAll("[data-playlist-play]").forEach((el) => {
      if (el.playBound) return;
      el.playBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistPlay);
        if (queue.length) {
          this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist");
          this.ui.state.showToast?.("Playing playlist");
        } else {
          this.ui.state.showToast?.("Playlist is empty");
        }
      });
    });

    document.querySelectorAll("[data-playlist-view]").forEach((el) => {
      if (el.viewBound) return;
      el.viewBound = true;
      el.addEventListener("click", () => {
        const playlist = this.ui.state.playlists.find((p) => p.name === el.dataset.playlistView);
        if (!playlist) return;
        this.ui.router.navigatePlaylist(playlist.id);
      });
    });

    document.querySelectorAll("[data-playlist-shuffle]").forEach((el) => {
      if (el.shuffleBound) return;
      el.shuffleBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistShuffle);
        if (queue.length) {
          const shuffled = Utils.shuffle(queue);
          this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
          this.ui.state.showToast?.("Shuffling playlist");
        } else {
          this.ui.state.showToast?.("Playlist is empty");
        }
      });
    });

    document.querySelectorAll(".artist-name-pill").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistId = el.dataset.artistId;
        if (artistId) this.showArtistPopover(artistId, e);
      });
    });

    document.querySelectorAll('[data-album-id][data-dynamic="true"]').forEach((el) => {
      el.addEventListener("click", () => {
        const artistId = IdUtils.norm(el.dataset.artistId);
        const albumId = IdUtils.norm(el.dataset.albumId);
        if (artistId && albumId) this.ui.navigate("artist", artistId, albumId);
      });
    });
  }

  bindPlaylistPage() {
    if (this.ui.state.currentPage !== "playlists") return;

    const createBtn = document.getElementById("create-playlist-btn");
    if (createBtn && !createBtn.bound) {
      createBtn.bound = true;
      createBtn.addEventListener("click", () => this.ui.createPlaylist());
    }

    document.querySelectorAll(".playlist-name-input, .playlist-description-input").forEach((el) => {
      el.addEventListener("input", (e) => {
        const playlist = this.ui.state.playlists.find((p) => p.id === e.target.dataset.playlistId);
        if (playlist) {
          playlist[e.target.dataset.field] = e.target.value;
          this.ui.state.persist();
        }
      });
    });

    document.querySelectorAll(".tag-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || !e.target.value.trim()) return;
        e.preventDefault();
        const playlist = this.ui.state.playlists.find((p) => p.id === e.target.dataset.playlistId);
        if (!playlist) return;
        const newTag = e.target.value.trim();
        if (!playlist.tags) playlist.tags = [];
        if (playlist.tags.includes(newTag)) return;
        playlist.tags.push(newTag);
        this.ui.state.persist();

        const chip = document.createElement("span");
        chip.className = "tag-chip animate-fadeIn";
        chip.style.background = "rgba(var(--bg-interactive))";
        const safe = newTag.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        chip.innerHTML = `${safe} <button class="remove-tag-btn" data-tag="${safe}">×</button>`;
        e.target.closest(".tags-container").insertBefore(chip, e.target);
        chip.querySelector(".remove-tag-btn").addEventListener("click", (ce) => {
          ce.stopPropagation();
          playlist.tags = playlist.tags.filter((t) => t !== ce.target.dataset.tag);
          this.ui.state.persist();
          chip.remove();
        });
        e.target.value = "";
      });
    });

    document.querySelectorAll(".remove-tag-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const plId = e.target.closest(".tags-container").dataset.playlistId;
        const playlist = this.ui.state.playlists.find((p) => p.id === plId);
        if (playlist?.tags) {
          playlist.tags = playlist.tags.filter((t) => t !== e.target.dataset.tag);
          this.ui.state.persist();
          e.target.closest(".tag-chip").remove();
        }
      });
    });

    document.querySelectorAll(".remove-from-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlist = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
        if (playlist) {
          playlist.songs = playlist.songs.filter((sid) => String(sid) !== String(btn.dataset.songId));
          this.ui.state.persist();
          btn.closest(".song-row").remove();
        }
      });
    });

    document.querySelectorAll(".share-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlist = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
        if (!playlist) return;
        const text = `Playlist: ${playlist.name}\n${playlist.songs.length} songs\n${playlist.description || ""}`;
        if (navigator.share) navigator.share({ title: playlist.name, text });
        else navigator.clipboard?.writeText(text).then(() => this.ui.state.showToast?.("Playlist copied to clipboard"));
      });
    });
  }

  bindPlaylistEditor() {
    const page = this.ui.state.currentPage;
    if (page === "editPlaylist") this.bindEditorFor("editPlaylist");
    else if (page === "createPlaylist") this.bindEditorFor("createPlaylist");
  }

  bindEditorFor(pageKey) {
    const state = this.ui.state;
    const isCreate = pageKey === "createPlaylist";
    const playlist = isCreate
      ? state.draftPlaylist
      : state.playlists.find((p) => String(p.id) === String(state.editingPlaylistId));
    if (!playlist) return;

    const id = isCreate ? null : state.editingPlaylistId;
    const root = document.querySelector(`[data-page="${isCreate ? "create-playlist" : "edit-playlist"}"]`);
    if (!root) return;

    const commitField = (field, value) => {
      if (isCreate) {
        playlist[field] = value;
        return;
      }
      if (field === "name") window.favoritesPlaylists.renamePlaylist(id, value);
      else if (field === "description") window.favoritesPlaylists.updateDesc(id, value);
      else playlist[field] = value;
    };

    const commitTags = (tags) => {
      if (isCreate) {
        playlist.tags = tags;
        return;
      }
      window.favoritesPlaylists.updateTags(id, tags);
    };

    const commitOrder = (songs) => {
      if (isCreate) {
        playlist.songs = songs;
        this.ui.render();
        return;
      }
      window.favoritesPlaylists.reorderSongs(id, songs);
      this.ui.render();
    };

    const removeAt = (index) => {
      const songId = playlist.songs[index];
      const song = state.getSongById(songId);
      if (isCreate) {
        const next = [...playlist.songs];
        next.splice(index, 1);
        playlist.songs = next;
        this.ui.render();
        return;
      }
      if (song) {
        window.favoritesPlaylists.removeSongFromPlaylist(id, songId);
      } else {
        const next = [...playlist.songs];
        next.splice(index, 1);
        window.favoritesPlaylists.reorderSongs(id, next);
        this.ui.render();
      }
    };

    const nameInput = root.querySelector("#edit-pl-name, #create-pl-name");
    const descInput = root.querySelector("#edit-pl-desc, #create-pl-desc");
    const tagWrap = root.querySelector("#edit-pl-tags, #create-pl-tags");
    const list = root.querySelector("#edit-playlist-songs, #create-playlist-songs");

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        playlist.name = nameInput.value;
        if (isCreate) {
          const doneBtn = root.querySelector(".edit-playlist-done");
          if (doneBtn) doneBtn.disabled = !nameInput.value.trim();
        }
      });
      nameInput.addEventListener("change", () => commitField("name", nameInput.value));
    }

    if (descInput) {
      descInput.addEventListener("input", () => {
        playlist.description = descInput.value;
      });
      descInput.addEventListener("change", () => commitField("description", descInput.value));
    }

    if (tagWrap) {
      const input = tagWrap.querySelector(".edit-playlist-tag-input");
      input?.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const values = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        const tags = [...(playlist.tags || [])];
        values.forEach((value) => {
          if (!tags.includes(value) && tags.length < 8) tags.push(value);
        });
        input.value = "";
        commitTags(tags);
        this.ui.render();
      });
      tagWrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".edit-playlist-tag-remove");
        if (!btn) return;
        const tags = (playlist.tags || []).filter((t) => t !== btn.dataset.tag);
        commitTags(tags);
        this.ui.render();
      });
    }

    root.querySelectorAll("[data-action]").forEach((btn) => {
      if (btn.dataset.action === "remove-song") return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        switch (btn.dataset.action) {
          case "back":
            state.draftPlaylist = null;
            this.ui.navigate("playlists");
            break;

          case "done":
            this.ui.navigate("playlists");
            break;

          case "create": {
            const draft = state.draftPlaylist;
            if (!draft || !draft.name.trim()) return;
            const newId = crypto?.randomUUID?.() ?? `pl_${Date.now()}`;
            state.playlists.unshift({
              id: newId,
              name: draft.name.trim(),
              description: (draft.description || "").trim(),
              tags: [...(draft.tags || [])],
              songs: [...draft.songs],
              coverUrl: draft.coverUrl || null,
            });
            state.persist?.();
            state.draftPlaylist = null;
            state.selectedPlaylistName = null;
            state.showToast?.("Playlist created");
            this.ui.navigate("playlists");
            break;
          }

          case "delete-playlist":
            window.favoritesPlaylists._confirmDelete(id);
            break;

          case "shuffle-play": {
            const queue = isCreate
              ? (playlist.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean)
              : state.buildPlaylistQueue(id);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
            }
            break;
          }

          case "add-songs":
            this.ui.navigate("library");
            break;

          case "change-cover":
            break;
        }
      });
    });

    if (!list) return;

    let dragIdx = null;
    list.querySelectorAll(".edit-playlist-song-row").forEach((row) => {
      row.addEventListener("dragstart", (e) => {
        dragIdx = parseInt(row.dataset.index, 10);
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(dragIdx));
        } catch {}
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        list.querySelectorAll(".edit-playlist-song-row").forEach((r) => r.classList.remove("drop-target"));
        dragIdx = null;
      });

      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        list.querySelectorAll(".edit-playlist-song-row").forEach((r) => r.classList.remove("drop-target"));
        row.classList.add("drop-target");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetIdx = parseInt(row.dataset.index, 10);
        if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;
        const next = [...playlist.songs];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        commitOrder(next);
      });
    });

    list.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="remove-song"]');
      if (!btn) return;
      e.stopPropagation();
      removeAt(parseInt(btn.dataset.index, 10));
    });
  }

  bindHoverActions() {
    document.querySelectorAll("[data-hover-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.dataset.hoverAction;
        const { artistId, albumId, playlistId } = btn.dataset;
        const state = this.ui.state;

        switch (action) {
          case "play-album": {
            const queue = await Utils.albumQueue(artistId, albumId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            break;
          }
          case "shuffle-album": {
            const queue = await Utils.albumQueue(artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
            }
            break;
          }
          case "favorite-album":
            await window.heartManager?.toggle("album", albumId);
            break;
          case "album-playlist": {
            const stub = state.getAlbumById(albumId);
            if (!stub) break;
            const album = await window.MusicStore.loadAlbum(stub.artistId, albumId).catch(() => null);
            if (album?.songs?.length) window.favoritesPlaylists?.addToPlaylistModal?.(album.songs[0]);
            break;
          }
          case "view-artist":
            this.ui.navigate("artist", artistId);
            break;
          case "play-artist": {
            const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
            if (artist?.albums?.length) {
              const queue = await Utils.albumQueue(artistId, artist.albums[0].id);
              if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            }
            break;
          }
          case "favorite-artist":
            await window.heartManager?.toggle("artist", artistId);
            break;
          case "play-playlist": {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist");
            break;
          }
          case "shuffle-playlist": {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
            }
            break;
          }
          case "edit-playlist":
            this.ui.editPlaylist(playlistId);
            break;
          case "share-playlist": {
            const playlist = state.playlists.find((p) => String(p.id) === String(playlistId));
            if (!playlist) return;
            const text = `Playlist: ${playlist.name}\n${playlist.songs.length} songs\n${playlist.description || ""}`;
            if (navigator.share) navigator.share({ title: playlist.name, text });
            else if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).then(() => state.showToast?.("Playlist copied to clipboard"));
            }
            break;
          }
        }
      });
    });
  }

  bindTabButtons() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn.tabBound) return;
      btn.tabBound = true;
      btn.addEventListener("click", () => this.ui.refreshFavoritesContent(btn.dataset.tab));
    });
  }

  refreshSavedBadges() {
    window.saveToLibraryDrawer?.refreshSavedBadges?.();
    window.offlineCache?.badgeRows?.();
  }
}

class OfflineCache {
  constructor(state) {
    this.state = state;
    this.cachedUrls = new Set();
    this.listening = false;
    this.bootstrap();
  }

  resolveUrl(song) {
    if (!song?.downloadPath) return "";
    try {
      return new URL(song.downloadPath, window.location.origin).href;
    } catch {
      return song.downloadPath;
    }
  }

  isCached(song) {
    const absolute = this.resolveUrl(song);
    return this.cachedUrls.has(absolute) || this.cachedUrls.has(song?.downloadPath);
  }

  bootstrap() {
    if (!("serviceWorker" in navigator)) return;
    if (!this.listening) {
      this.listening = true;
      navigator.serviceWorker.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || !data.type) return;
        if (data.type === "CACHE_STATUS_RESULT") {
          this.cachedUrls = new Set(data.songs?.urls || []);
          this.badgeRows();
        }
        if (data.type === "SONG_CACHED" && data.url) {
          this.cachedUrls.add(data.url);
          this.badgeRows();
          this.state.showToast?.("Song available offline");
        }
      });
    }
    this.queryStatus();
    window.addEventListener("sw:controller-change", () => this.queryStatus());
    window.addEventListener("sw:ready", () => this.queryStatus());
  }

  queryStatus() {
    const send = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "GET_CACHE_STATUS" });
      }
    };
    if (navigator.serviceWorker?.controller) send();
    else if (navigator.serviceWorker?.ready) navigator.serviceWorker.ready.then(send).catch(() => {});
  }

  cacheSong(song) {
    if (!song?.downloadPath) return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      this.state.showToast?.("Offline caching unavailable");
      return;
    }
    if (this.isCached(song)) {
      this.state.showToast?.("Already available offline");
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_SONG",
      url: this.resolveUrl(song),
    });
    this.state.showToast?.("Caching song for offline…");
  }

  removeSong(song) {
    if (!song?.downloadPath) return;
    const absolute = this.resolveUrl(song);
    this.cachedUrls.delete(absolute);
    this.cachedUrls.delete(song.downloadPath);
    this.deleteRecord(absolute);
    this.deleteRecord(song.downloadPath);
    this.badgeRows();
    this.state.showToast?.("Offline copy removed");
  }

  deleteRecord(url) {
    try {
      const request = indexedDB.open("mybeats-cache", 1);
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains("songs")) {
            db.close();
            return;
          }
          const tx = db.transaction("songs", "readwrite");
          tx.objectStore("songs").delete(url);
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        } catch {}
      };
    } catch {}
  }

  badgeRows() {
    document.querySelectorAll("[data-song-id]").forEach((row) => {
      const song = this.state.getSongById(row.dataset.songId);
      if (!song) return;
      const has = this.isCached(song);
      const existing = row.querySelector(".offline-badge");
      if (has && !existing) {
        const badge = document.createElement("span");
        badge.className = "offline-badge";
        badge.title = "Available offline";
        badge.innerHTML = Icons.general.checkBadge(12);
        const host = row.querySelector(".time") || row;
        host.appendChild(badge);
      } else if (!has && existing) {
        existing.remove();
      }
    });
  }
}

class Search {
  constructor(ui) {
    this.ui = ui;
    this.activeIndex = -1;
    this.keyboardBound = false;
    this.lastQueue = null;
    this.allSongsPromise = null;
  }

  open() {
    this.ui.state.isSearchOpen = true;
    this.ui.state.searchQuery = "";
    document.querySelector(".breadcrumb-wrapper")?.classList.add("search-active");

    const bar = document.getElementById("search-bar");
    if (bar) {
      bar.classList.remove("hidden");
      bar.style.opacity = "0";
      requestAnimationFrame(() => {
        bar.style.opacity = "1";
      });
      if (window.innerWidth > 768) {
        setTimeout(() => document.getElementById("search-input")?.focus(), 150);
      }
    }
    this.clear();
    this.bindKeyboardNav();
  }

  close() {
    this.ui.state.isSearchOpen = false;
    this.ui.state.searchQuery = "";
    document.querySelector(".breadcrumb-wrapper")?.classList.remove("search-active");
    const bar = document.getElementById("search-bar");
    if (bar) {
      bar.style.opacity = "0";
      setTimeout(() => {
        bar.classList.add("hidden");
        bar.style.opacity = "";
      }, 300);
    }
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    this.clear();
  }

  resultsHost() {
    let host = document.getElementById("search-results-container");
    if (!host) {
      host = document.createElement("div");
      host.id = "search-results-container";
      const parent = document.querySelector("#search-bar .panel") || document.getElementById("search-bar");
      parent?.appendChild(host);
    }
    return host;
  }

  clear() {
    const el = document.getElementById("search-results-container");
    if (el) {
      el.className = "results hidden";
      el.innerHTML = "";
    }
    this.activeIndex = -1;
    this.lastQueue = null;
  }

async refresh() {
  if (!this.ui.state.isSearchOpen) return;
  const query = (this.ui.state.searchQuery || "").trim();
  const el = this.resultsHost();
  if (!el) return;
  if (!query) {
    this.clear();
    return;
  }

  el.className = "srResults";
  el.innerHTML = `<div class="srEmpty"><span class="srEmptyIcon">${Icons.general.search(26)}</span><p class="srEmptyTitle">Searching…</p></div>`;

  // REMOVED: window.MusicStore.loadAllSongs()
  // Removed globally for a more efficient approach
  
  if (!this.ui.state.isSearchOpen) return;
  if (!(this.ui.state.searchQuery || "").trim()) {
    this.clear();
    return;
  }

  el.innerHTML = this.renderResults();
  this.activeIndex = -1;
  this.bindResults(el);
}
  escape(text) {
    return Utils.esc(text == null ? "" : String(text));
  }

  highlight(text, query) {
    const escaped = this.escape(text);
    const needle = this.escape((query || "").trim());
    if (!needle) return escaped;
    const rx = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return escaped.replace(rx, '<mark class="sr-hl">$1</mark>');
  }

  collect(query) {
    const state = this.ui.state;
    const lower = query.toLowerCase();
    const score = (text) => {
      const t = (text || "").toLowerCase();
      if (!t || !lower) return 0;
      if (t === lower) return 3;
      if (t.startsWith(lower)) return 2;
      return t.includes(lower) ? 1 : 0;
    };

    const songHits = Array.from(window.MusicStore.songCache.values())
      .map((song) => ({
        kind: "song",
        ref: song,
        sc: Math.max(score(song.title), score(song.artist) * 0.65, score(song.album) * 0.65),
      }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const artistRecords = (window.MusicStore.index || []).map((entry) => {
      const full = window.MusicStore.artists[String(entry.id)];
      return (
        full || {
          id: entry.id,
          artist: entry.artist,
          genre: entry.genre,
          imageUrl: "",
          albums: [],
        }
      );
    });

    const artistHits = artistRecords
      .map((a) => ({ kind: "artist", ref: a, sc: score(a.artist) * 1.25 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const albumHits = [];
    for (const album of window.MusicStore.albumCache.values()) {
      const sc = score(album.album) * 1.15;
      if (sc > 0) {
        albumHits.push({
          kind: "album",
          ref: {
            artistId: album.artistId,
            albumId: album.id,
            artistName: album.artistName,
            albumName: album.album,
            coverUrl: album.coverUrl,
            year: album.year || "",
            songCount: album.songCount || album.songs?.length || 0,
          },
          sc,
        });
      }
    }
    albumHits.sort((a, b) => b.sc - a.sc);

    const playlistHits = (state.playlists || [])
      .map((p) => ({ kind: "playlist", ref: p, sc: score(p.name) * 1.1 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const top = [artistHits[0], songHits[0], albumHits[0], playlistHits[0]]
      .filter(Boolean)
      .sort((a, b) => b.sc - a.sc)[0] || null;
    const without = (list) => list.filter((h) => !top || h.ref !== top.ref);

    return {
      top,
      songs: (top?.kind === "song" ? without(songHits) : songHits).slice(0, 5),
      artists: (top?.kind === "artist" ? without(artistHits) : artistHits).slice(0, 6),
      albums: (top?.kind === "album" ? without(albumHits) : albumHits).slice(0, 6),
      playlists: (top?.kind === "playlist" ? without(playlistHits) : playlistHits).slice(0, 3),
    };
  }

  renderTop(top, query) {
    const kindLabel = { song: "Song", artist: "Artist", album: "Album", playlist: "Playlist" };
    let art = "";
    let title = "";
    let sub = "";
    let attrs = "";
    let playBtn = "";

    if (top.kind === "song") {
      const s = top.ref;
      attrs = `data-sr-song="${this.escape(s.id)}"`;
      art = `<img src="${this.escape(s.coverUrl || "")}" alt="" loading="lazy">`;
      title = this.highlight(s.title, query);
      sub = `${kindLabel.song} · ${this.highlight(s.artist || "", query)}${s.album ? ` · ${this.highlight(s.album, query)}` : ""}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-song="${this.escape(s.id)}" aria-label="Play ${this.escape(s.title)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "artist") {
      const a = top.ref;
      const albums = a.albums ? a.albums.length : 0;
      const songs = a.albums ? a.albums.reduce((n, alb) => n + (alb.songCount || 0), 0) : 0;
      attrs = `data-sr-artist="${this.escape(a.id)}"`;
      art = `<img src="${this.escape(a.imageUrl || "")}" alt="" loading="lazy">`;
      title = this.highlight(a.artist, query);
      sub = `${kindLabel.artist}${a.genre ? ` · ${this.highlight(a.genre, query)}` : ""} · ${albums} album${albums === 1 ? "" : "s"} · ${songs} song${songs === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-artist="${this.escape(a.id)}" aria-label="Play ${this.escape(a.artist)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "album") {
      const al = top.ref;
      attrs = `data-sr-album="${this.escape(al.albumId)}" data-artist-id="${this.escape(al.artistId)}"`;
      art = `<img src="${this.escape(al.coverUrl || "")}" alt="" loading="lazy">`;
      title = this.highlight(al.albumName, query);
      sub = `${kindLabel.album}${al.year ? ` · ${this.escape(al.year)}` : ""} · ${this.highlight(al.artistName, query)} · ${al.songCount} song${al.songCount === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-album="${this.escape(al.albumId)}" data-artist-id="${this.escape(al.artistId)}" aria-label="Play ${this.escape(al.albumName)}">${Icons.player.play(16)}</button>`;
    } else {
      const p = top.ref;
      attrs = `data-sr-playlist="${this.escape(p.id)}"`;
      art = `<span class="srHeroArtFallback">${Icons.general.playlist(30)}</span>`;
      title = this.highlight(p.name, query);
      sub = `${kindLabel.playlist} · ${p.songs.length} song${p.songs.length === 1 ? "" : "s"}`;
    }

    return `
      <div class="srHero" data-sr-item ${attrs} role="button" tabindex="-1">
        <span class="srHeroArt${top.kind === "artist" ? " round" : ""}">
          ${art}${playBtn}
        </span>
        <span class="srHeroBody">
          <span class="srHeroBadge">${Icons.general.sparkles(12)} Top result</span>
          <span class="srHeroTitle">${title}</span>
          <span class="srHeroSub">${sub}</span>
        </span>
      </div>
    `;
  }

  renderSongRow(song, index, query) {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <div class="srRow" data-sr-item data-sr-song="${this.escape(song.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srRowNum">${index + 1}</span>
        <span class="srRowArt"><img src="${this.escape(song.coverUrl || "")}" alt="" loading="lazy"><span class="srRowPlay">${Icons.player.play(11)}</span></span>
        <span class="srRowText"><span class="srRowTitle">${this.highlight(song.title, query)}</span><span class="srRowSub">${this.highlight(song.artist || "", query)}${song.album ? ` · ${this.highlight(song.album, query)}` : ""}</span></span>
        <button type="button" class="srIconBtn heart${isFav ? " favorited is-favorite" : ""}" data-fav-song="${this.escape(song.id)}" aria-label="Favorite ${this.escape(song.title)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
        <button type="button" class="srIconBtn" data-more-song="${this.escape(song.id)}" aria-label="More options">${Icons.general.moreVert(15)}</button>
        <span class="srRowTime">${this.escape(song.duration || "")}</span>
      </div>
    `;
  }

  renderAlbumCard(album, index, query) {
    return `
      <div class="srCard" data-sr-item data-sr-album="${this.escape(album.albumId)}" data-artist-id="${this.escape(album.artistId)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srCardArt"><img src="${this.escape(album.coverUrl || "")}" alt="" loading="lazy"><button type="button" class="srCardPlay" data-sr-play data-sr-album="${this.escape(album.albumId)}" data-artist-id="${this.escape(album.artistId)}" aria-label="Play ${this.escape(album.albumName)}">${Icons.player.play(13)}</button></span>
        <span class="srCardTitle">${this.highlight(album.albumName, query)}</span>
        <span class="srCardSub">${album.year ? `${this.escape(album.year)} · ` : ""}${this.highlight(album.artistName, query)}</span>
      </div>
    `;
  }

  renderArtistCard(artist, index, query) {
    const albums = artist.albums ? artist.albums.length : 0;
    return `
      <div class="srCard srCardArtist" data-sr-item data-sr-artist="${this.escape(artist.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srCardArt round"><img src="${this.escape(artist.imageUrl || "")}" alt="" loading="lazy"></span>
        <span class="srCardTitle">${this.highlight(artist.artist, query)}</span>
        <span class="srCardSub">Artist · ${albums} album${albums === 1 ? "" : "s"}</span>
      </div>
    `;
  }

  renderPlaylistRow(playlist, index, query) {
    return `
      <div class="srRow" data-sr-item data-sr-playlist="${this.escape(playlist.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srRowArt srRowArtPl">${Icons.general.playlist(20)}</span>
        <span class="srRowText"><span class="srRowTitle">${this.highlight(playlist.name, query)}</span><span class="srRowSub">Playlist · ${playlist.songs.length} song${playlist.songs.length === 1 ? "" : "s"}</span></span>
        <span class="srRowGo">${Icons.general.arrowRight(15)}</span>
      </div>
    `;
  }

  renderResults() {
    const query = (this.ui.state.searchQuery || "").trim();
    if (!query) return "";
    const { top, songs, artists, albums, playlists } = this.collect(query);
    this.lastQueue = songs.map((s) => s.ref);

    if (!top && !songs.length && !artists.length && !albums.length && !playlists.length) {
      return `
        <div class="srEmpty">
          <span class="srEmptyIcon">${Icons.general.search(26)}</span>
          <p class="srEmptyTitle">No results for &ldquo;${this.escape(query)}&rdquo;</p>
          <p class="srEmptySub">Check the spelling, or try a different song, artist, album or playlist.</p>
        </div>
      `;
    }

    const section = (label, inner) => `<section class="srSection"><h4 class="srLabel">${label}</h4>${inner}</section>`;

    let html = "";
    if (top) html += this.renderTop(top, query);
    if (songs.length) html += section("Songs", `<div class="srRows">${songs.map((h, i) => this.renderSongRow(h.ref, i, query)).join("")}</div>`);
    if (albums.length) html += section("Albums", `<div class="srCards">${albums.map((h, i) => this.renderAlbumCard(h.ref, i, query)).join("")}</div>`);
    if (artists.length) html += section("Artists", `<div class="srCards">${artists.map((h, i) => this.renderArtistCard(h.ref, i, query)).join("")}</div>`);
    if (playlists.length) html += section("Playlists", `<div class="srRows">${playlists.map((h, i) => this.renderPlaylistRow(h.ref, i, query)).join("")}</div>`);

    html += `
      <div class="srFoot">
        <span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>
        <span><kbd>&#8629;</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    `;
    return html;
  }

  async select(el, forcePlay = false) {
    if (!el) return;
    const d = el.dataset;
    const ui = this.ui;

    if (d.srSong) {
      const song = ui.state.getSongById(d.srSong);
      if (song) {
        ui.audioPlayer.playSong(song, this.lastQueue && this.lastQueue.length ? this.lastQueue : null, true, "search");
      }
      this.close();
      return;
    }
    if (d.srAlbum) {
      if (forcePlay) {
        const queue = await Utils.albumQueue(d.artistId, d.srAlbum);
        if (queue.length) ui.audioPlayer.playSong(queue[0], queue, true, "album");
      } else {
        ui.navigate("artist", d.artistId, d.srAlbum);
      }
      this.close();
      return;
    }
    if (d.srArtist) {
      if (forcePlay && ui.pages.library?.playArtist) ui.pages.library.playArtist(d.srArtist);
      else ui.navigate("artist", d.srArtist);
      this.close();
      return;
    }
    if (d.srPlaylist) {
      const playlist = (ui.state.playlists || []).find((p) => String(p.id) === String(d.srPlaylist));
      if (playlist) ui.router.navigatePlaylist(playlist.id);
      this.close();
    }
  }

  bindResults(container) {
    if (!container) return;
    if (!container.resultsBound) {
      container.resultsBound = true;
      container.addEventListener("click", (e) => {
        const more = e.target.closest("[data-more-song]");
        if (more) {
          e.stopPropagation();
          this.ui.events.showSongMenu(more.dataset.moreSong, e);
          return;
        }
        const play = e.target.closest("[data-sr-play]");
        if (play) {
          e.stopPropagation();
          this.select(play, true);
          return;
        }
        const item = e.target.closest("[data-sr-item]");
        if (item) {
          if (e.target.closest("[data-fav-song]")) return;
          this.select(item, false);
        }
      });
    }
    container.querySelectorAll("[data-fav-song]").forEach((btn) =>
      this.ui.events.bindHeartButton(btn, "song", btn.dataset.favSong)
    );
  }

  bindKeyboardNav() {
    if (this.keyboardBound) return;
    const input = document.getElementById("search-input");
    if (!input) return;
    this.keyboardBound = true;

    input.addEventListener("keydown", (e) => {
      if (!this.ui.state.isSearchOpen) return;
      const items = [...document.querySelectorAll("#search-results-container [data-sr-item]")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        this.activeIndex =
          e.key === "ArrowDown"
            ? (this.activeIndex + 1) % items.length
            : (this.activeIndex - 1 + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle("sr-active", i === this.activeIndex));
        items[this.activeIndex].scrollIntoView?.({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (!items.length) return;
        e.preventDefault();
        this.select(items[this.activeIndex] || items[0], false);
      }
    });
  }

  attachCategoryCollapse() {}
  attachSearchDropdownEvents() {}
}

class ContextMenu {
  constructor() {
    this.element = null;
    this.bindGlobal();
  }

  bindGlobal() {
    document.addEventListener("click", () => this.hide());
    document.addEventListener(
      "scroll",
      (e) => {
        if (this.element && this.element.contains(e.target)) return;
        this.hide();
      },
      true
    );
    window.addEventListener("resize", () => this.hide());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
  }

  show(x, y, data) {
    this.hide();

    const menu = document.createElement("div");
    menu.id = "mybeats-context-menu";
    menu.className = "mb-context-menu";

    let items = "";
    if (data.songId) {
      const song = window.uiManager?.state?.getSongById(data.songId);
      if (song) {
        const isFav = window.uiManager.favorites.isSong(data.songId);
        items += `
        <span class="dropdownHeader">Song Options</span>
        <div class="mb-ctx-divider"></div>
        <button class="mb-ctx-item" data-ctx="play-song" data-id="${data.songId}"><i class='faudsb fa-circle-play'></i> Play</button>
        <button class="mb-ctx-item" data-ctx="fav-song" data-id="${data.songId}"><i class="fa-solid fa-heart ${isFav ? "liked-icon" : "not-liked-icon"}"></i> ${isFav ? "Remove from Favorites" : "Add to Favorites"}</button>
        <button class="mb-ctx-item" data-ctx="add-playlist" data-id="${data.songId}"><i class='faudsb fa-album-collection-circle-plus'></i> Add to Playlist</button>
        `;
      }
    }
    if (data.albumId && data.artistId) {
      items += `
        <span class="dropdownHeader">Album Options</span>
        <div class="mb-ctx-divider"></div>
        <button class="mb-ctx-item" data-ctx="play-album" data-artist="${data.artistId}" data-album="${data.albumId}"><i class='faudsb fa-circle-play'></i> Play Album</button>
        <button class="mb-ctx-item" data-ctx="shuffle-album" data-artist="${data.artistId}" data-album="${data.albumId}"><i class='faudsb fa-shuffle'></i> Shuffle Album</button>
        <button class="mb-ctx-item" data-ctx="view-album" data-artist="${data.artistId}" data-album="${data.albumId}"><i class='faudsb fa-album-circle-user'></i> View Album</button>
      `;
    }
    if (data.artistId && !data.albumId) {
      items += `
        <span class="dropdownHeader">Artist Options</span>
        <div class="mb-ctx-divider"></div>
        <button class="mb-ctx-item" data-ctx="view-artist" data-artist="${data.artistId}"><i class='faudsb fa-square-user'></i> View Artist</button>
        <button class="mb-ctx-item" data-ctx="play-artist" data-artist="${data.artistId}"><i class='faudsb fa-circle-play'></i> Play Artist</button>
        <button class="mb-ctx-item" data-ctx="fav-artist" data-artist="${data.artistId}"><i class="fa-solid fa-heart not-liked-icon"></i> Favorite Artist</button>
      `;
    }
    if (data.playlistId) {
      items += `
        <span class="dropdownHeader">Playlist Options</span>
        <div class="mb-ctx-divider"></div>
        <button class="mb-ctx-item" data-ctx="play-playlist" data-playlist="${data.playlistId}"><i class='faudsb fa-circle-play'></i> Play Playlist</button>
        <button class="mb-ctx-item" data-ctx="shuffle-playlist" data-playlist="${data.playlistId}"><i class='faudsb fa-shuffle'></i> Shuffle Playlist</button>
        <button class="mb-ctx-item" data-ctx="edit-playlist" data-playlist="${data.playlistId}"><i class='faudsb fa-file-pen'></i> Edit Playlist</button>
      `;
    }
    if (!items) return;

    menu.innerHTML = items;
    document.body.appendChild(menu);
    this.element = menu;

    const margin = 8;
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    let posX = x;
    let posY = y;
    if (posX + w > window.innerWidth - margin) posX = window.innerWidth - w - margin;
    if (posY + h > window.innerHeight - margin) posY = window.innerHeight - h - margin;
    if (posX < margin) posX = margin;
    if (posY < margin) posY = margin;
    menu.style.left = posX + "px";
    menu.style.top = posY + "px";

    requestAnimationFrame(() => {
      if (this.element === menu) menu.classList.add("mb-context-menu-visible");
    });

    menu.querySelectorAll(".mb-ctx-item").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.dataset.ctx;
        const id = btn.dataset.id;
        const artistId = btn.dataset.artist;
        const albumId = btn.dataset.album;
        const playlistId = btn.dataset.playlist;
        const state = window.uiManager?.state;

        switch (action) {
          case "play-song": {
            const song = state?.getSongById(id);
            if (song) window.uiManager.audioPlayer.playSong(song, null, true, "context");
            break;
          }
          case "fav-song": {
            const song = state?.getSongById(id);
            if (song) window.uiManager.favorites.toggleSong(song);
            break;
          }
          case "add-playlist": {
            const song = state?.getSongById(id);
            if (song) window.favoritesPlaylists?.addToPlaylistModal?.(song);
            break;
          }
          case "play-album": {
            const q = await Utils.albumQueue(artistId, albumId);
            if (q.length) window.uiManager.audioPlayer.playSong(q[0], q, true, "album");
            break;
          }
          case "shuffle-album": {
            const q = await Utils.albumQueue(artistId, albumId);
            if (q.length) {
              const shuffled = Utils.shuffle(q);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
            }
            break;
          }
          case "view-album":
            window.uiManager.navigate("artist", artistId, albumId);
            break;
          case "view-artist":
            window.uiManager.navigate("artist", artistId);
            break;
          case "play-artist": {
            const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
            if (artist?.albums?.length) {
              const q = await Utils.albumQueue(artistId, artist.albums[0].id);
              if (q.length) window.uiManager.audioPlayer.playSong(q[0], q, true, "album");
            }
            break;
          }
          case "fav-artist":
            window.favoritesPlaylists?.toggleArtist?.(artistId);
            break;
          case "play-playlist": {
            const q = state?.buildPlaylistQueue(playlistId);
            if (q?.length) window.uiManager.audioPlayer.playSong(q[0], q, true, "playlist");
            break;
          }
          case "shuffle-playlist": {
            const q = state?.buildPlaylistQueue(playlistId);
            if (q?.length) {
              const shuffled = Utils.shuffle(q);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
            }
            break;
          }
          case "edit-playlist":
            window.uiManager.editPlaylist(playlistId);
            break;
        }
        this.hide();
      });
    });
  }

  hide() {
    if (!this.element) return;
    const el = this.element;
    this.element = null;
    el.classList.remove("mb-context-menu-visible");
    const done = () => el.remove();
    el.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 250);
  }
}

window.UIManager = UIManager;
window.GlobalListeners = GlobalListeners;
window.AppListeners = GlobalListeners;
window.PageEvents = PageEvents;
window.ContentEvents = PageEvents;
window.ContextMenu = ContextMenu;
window.OfflineCache = OfflineCache;
window.Search = Search;
