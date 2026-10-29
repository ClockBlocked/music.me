




class Home {
  constructor(ui) {
    this.ui = ui;
    this.recentLimit = 10;
    this.featuredCache = null;
    this.bindLiveUpdates();
  }

  async load() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        await this.loadFeaturedRelease();
      } catch (err) {
        console.error("[Home.load] error:", err);
      } finally {
        this.loadPromise = null;
      }
      this.refreshLoadedCards();
    })();

    return this.loadPromise;
  }

  async loadFeaturedRelease() {
    if (this.featuredCache) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const pick = index[Math.floor(Math.random() * index.length)];
    const artist = await window.MusicStore.loadArtist(pick.id).catch(() => null);
    if (!artist?.albums?.length) return;

    const albumStub = artist.albums[Math.floor(Math.random() * artist.albums.length)];
    const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
    if (!album) return;

    this.featuredCache = {
      artistId: artist.id,
      artistName: artist.artist,
      albumId: album.id,
      albumName: album.album,
      coverUrl: album.coverUrl,
    };
  }

  getStats() {
    return window.MusicStore?.getStats?.() || { songs: 0, albums: 0, artists: 0, playlists: 0 };
  }

  refreshLoadedCards() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;
    
    const featuredContainer = root.querySelector('[data-area="featured"]');
    if (featuredContainer) {
      featuredContainer.innerHTML = this.renderFeaturedAlbum();
      this.ui.events.bindAlbumActions(featuredContainer);
    }
  }

  esc(text) {
    return Utils.esc(text);
  }

  renderHeader() {
    return `
      <header class="home-header">
        <span class="home-kicker">YOUR MUSIC</span>
        <h1 class="home-title">Music, right where you left it.</h1>
        <p class="home-desc">Pick up where you left off, find something new, or settle back into your collection.</p>
        <button type="button" class="home-library-btn" data-nav="library">
          View your library <i class="fa-solid fa-arrow-right"></i>
        </button>
      </header>
    `;
  }

  renderFeaturedAlbum() {
    if (!this.featuredCache) return `<div class="featured-card skeleton"></div>`;

    const release = this.featuredCache;
    const isFav = this.ui.favorites.isAlbum(release.albumId);
    const playData = this.esc(JSON.stringify({ artistId: release.artistId, albumId: release.albumId }));

    return `
      <div class="featured-card" data-card="featured">
        <img src="${this.esc(release.coverUrl)}" alt="${this.esc(release.albumName)}" class="featured-bg" loading="eager">
        <div class="featured-overlay"></div>
        
        <div class="featured-top">
          <span class="featured-badge">FEATURED ALBUM</span>
          <button type="button" class="featured-heart ${isFav ? "favorited" : ""}" data-action="toggle-favorite-album" data-album-id="${this.esc(release.albumId)}">
            ${this.ui.likeStatus("album", isFav, false, null)}
          </button>
        </div>

        <div class="featured-content">
          <span class="featured-kicker">A FAMILIAR FAVORITE</span>
          <h2 class="featured-title">${this.esc(release.albumName)}</h2>
          <p class="featured-artist">${this.esc(release.artistName)} <span class="dot">·</span> Album</p>
          
          <div class="featured-actions">
            <button type="button" class="btn-primary" data-play-album='${playData}'>
              <i class="fa-solid fa-play"></i> Play album
            </button>
            <button type="button" class="btn-secondary" data-action="toggle-favorite-album" data-album-id="${this.esc(release.albumId)}">
              <i class="fa-solid fa-plus"></i> ${isFav ? "Remove" : "Add to favorites"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderRecentlyPlayed() {
    const recent = (this.ui.state.recentlyPlayed || [])
      .slice(0, this.recentLimit)
      .map((song) => this.ui.state.getSongById(song.id) || song)
      .filter(Boolean);

    if (!recent.length) {
      return `
        <div class="recent-card" data-card="recent">
          <div class="recent-header">
            <div class="recent-heading">
              <span class="recent-kicker">YOUR LISTENING</span>
              <h2 class="recent-title">Recently played</h2>
            </div>
          </div>
          <div class="recent-empty">
            <div class="recent-icon-wrap"><i class="fa-regular fa-clock"></i></div>
            <h3 class="recent-empty-title">Your next favorite starts here.</h3>
            <p class="recent-empty-desc">Play an album or track and it will appear in your listening history.</p>
          </div>
          <div class="recent-footer">
            <i class="fa-solid fa-music"></i> Listening history stays in your library
          </div>
        </div>
      `;
    }

    return `
      <div class="recent-card" data-card="recent">
        <div class="recent-header">
          <div class="recent-heading">
            <span class="recent-kicker">YOUR LISTENING</span>
            <h2 class="recent-title">Recently played</h2>
          </div>
          <button type="button" class="recent-history-btn" data-nav="library">History</button>
        </div>
        <div class="recent-list">
          ${recent.map(song => `
            <div class="recent-row" data-song-id="${this.esc(song.id)}">
              <div class="recent-art"><img src="${this.esc(song.coverUrl)}" alt="" loading="lazy"></div>
              <div class="recent-info">
                <span class="recent-song">${this.esc(song.title)}</span>
                <span class="recent-artist">${this.esc(song.artist)}</span>
              </div>
            </div>
          `).join("")}
        </div>
        <div class="recent-footer">
          <i class="fa-solid fa-music"></i> Listening history stays in your library
        </div>
      </div>
    `;
  }

  renderTopArtists() {
    const artists = window.MusicStore?.index || [];
    if (!artists.length) return "";
    
    const picks = artists.slice(0, 8).map(a => window.MusicStore.artists[String(a.id)] || a).filter(Boolean);

    return `
      <section class="home-section">
        <div class="section-head">
          <span class="section-kicker">EXPLORE</span>
          <h2 class="section-title">Top Artists</h2>
        </div>
        <div class="h-scroll">
          ${picks.map(a => `
            <div class="h-card artist-h-card" data-nav="artist" data-artist-id="${this.esc(a.id)}">
              <div class="h-card-img round"><img src="${this.esc(a.imageUrl || window.MusicStore.portraitUrl(a.portrait) || "")}" alt=""></div>
              <span class="h-card-title">${this.esc(a.artist)}</span>
              <span class="h-card-sub">${this.esc(a.genre || "Artist")}</span>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  renderCollections() {
    const playlists = (this.ui.state.playlists || []).slice(0, 8);
    if (!playlists.length) return "";

    return `
      <section class="home-section">
        <div class="section-head">
          <span class="section-kicker">MADE PERSONAL</span>
          <h2 class="section-title">Your Collections</h2>
          <button class="section-link" data-nav="playlists">See all</button>
        </div>
        <div class="h-scroll">
          ${playlists.map(pl => {
            const covers = pl.songs.map(id => this.ui.state.getSongById(id)).filter(Boolean).slice(0, 1).map(s => s.coverUrl);
            return `
              <div class="h-card playlist-h-card" data-playlist-view="${this.esc(pl.name)}">
                <div class="h-card-img">
                  ${covers.length ? `<img src="${this.esc(covers[0])}" alt="">` : `<div class="empty-cover"><i class="fa-solid fa-list-ul"></i></div>`}
                </div>
                <span class="h-card-title">${this.esc(pl.name)}</span>
                <span class="h-card-sub">${pl.songs.length} songs</span>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  renderGenres() {
    const genres = new Set();
    (window.MusicStore?.index || []).forEach(a => { if (a.genre) genres.add(a.genre); });
    if (!genres.size) return "";

    return `
      <section class="home-section">
        <div class="section-head">
          <span class="section-kicker">VIBES</span>
          <h2 class="section-title">Top Genre</h2>
        </div>
        <div class="genre-pills">
          ${[...genres].slice(0, 10).map(g => `<button class="genre-pill" data-genre="${this.esc(g)}">${this.esc(g)}</button>`).join("")}
        </div>
      </section>
    `;
  }

  render() {
    const html = `
      <div data-page="home" class="hp pageSection">
        <div class="home-container">
          ${this.renderHeader()}
          <div data-area="featured">${this.renderFeaturedAlbum()}</div>
          ${this.renderRecentlyPlayed()}
          ${this.renderTopArtists()}
          ${this.renderCollections()}
          ${this.renderGenres()}
        </div>
      </div>
    `;

    this.bindWhenReady();
    return html;
  }

  bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="home"].hp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
  }

  getRoot() {
    return document.querySelector('[data-page="home"].hp');
  }

  bindEvents(root) {
    if (root.homeBound) return;
    root.homeBound = true;

    root.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-nav]");
      if (navBtn) {
        e.stopPropagation();
        if (navBtn.dataset.nav === "artist") {
          this.ui.navigate("artist", navBtn.dataset.artistId);
        } else {
          this.ui.navigate(navBtn.dataset.nav);
        }
        return;
      }

      const plView = e.target.closest("[data-playlist-view]");
      if (plView) {
        e.stopPropagation();
        this.ui.navigate("playlists");
        setTimeout(() => this.ui.pages.playlists.viewPlaylist(plView.dataset.playlistView), 60);
        return;
      }

      const genre = e.target.closest("[data-genre]");
      if (genre) {
        e.stopPropagation();
        if (window.pagesActions?.openGenre) window.pagesActions.openGenre(genre.dataset.genre);
        return;
      }

      const row = e.target.closest(".recent-row[data-song-id]");
      if (row) {
        e.stopPropagation();
        const song = this.ui.state.getSongById(row.dataset.songId);
        if (song) this.ui.audioPlayer.playSong(song, null, true, "home");
        return;
      }
    });

    this.load();
  }

  bindLiveUpdates() {
    if (Home.liveBound) return;
    Home.liveBound = true;

    window.addEventListener("mybeats:recently-played", () => {
      if (!this.isActive()) return;
      const root = this.getRoot();
      if (!root) return;
      const recentContainer = root.querySelector('[data-card="recent"]');
      if (recentContainer) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = this.renderRecentlyPlayed();
        recentContainer.replaceWith(tempDiv.firstElementChild);
      }
    });
    
    window.addEventListener("mybeats:favorites-changed", () => {
      if (!this.isActive()) return;
      this.refreshLoadedCards();
    });
  }

  isActive() {
    return this.ui.state.currentPage === "home" && !!this.getRoot();
  }
}





class Library {
  constructor(ui) {
    this.ui = ui;
    this.view = "overview";
    this.filter = { type: "all", value: null, label: "" };
    this.sort = "recent";
    this.mode = "grid";
    this.query = "";
    
    this.page = 1;
    this.limit = 24;
    this.totalItems = 0;
  }

  getStats() {
    return window.MusicStore?.getStats?.() || { songs: 0, albums: 0, artists: 0, playlists: 0 };
  }

  getPaginatedItems() {
    if (!window.MusicStore) return [];
    
    let items = [];
    if (this.view === "songs") items = window.MusicStore.getSongsPaginated(this.page, this.limit, this.sort, this.query);
    else if (this.view === "albums") items = window.MusicStore.getAlbumsPaginated(this.page, this.limit, this.sort, this.query);
    else if (this.view === "artists") items = window.MusicStore.getArtistsPaginated(this.page, this.limit, this.sort, this.query);
    else if (this.view === "playlists") items = (this.ui.state.playlists || []).slice((this.page - 1) * this.limit, this.page * this.limit);
    
    return items;
  }

  updateTotals() {
    const stats = this.getStats();
    if (this.view === "songs") this.totalItems = stats.songs;
    else if (this.view === "albums") this.totalItems = stats.albums;
    else if (this.view === "artists") this.totalItems = stats.artists;
    else if (this.view === "playlists") this.totalItems = (this.ui.state.playlists || []).length;
    else this.totalItems = stats.songs + stats.albums + stats.artists;
  }

  esc(text) {
    return Utils.esc(text == null ? "" : String(text));
  }

  renderAlbumCard(album) {
    const isFav = this.ui.favorites.isAlbum(album.albumId);
    const playData = this.esc(JSON.stringify({ artistId: album.artistId, albumId: album.albumId }));
    return `
      <article class="albumCard" data-artist-id="${this.esc(album.artistId)}" data-album-id="${this.esc(album.albumId)}" tabindex="0">
        <div class="albumArtwork">
          <img src="${this.esc(album.coverUrl || "")}" alt="${this.esc(album.albumName)}" loading="lazy">
          <button class="albumPlay" type="button" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">${album.year ? `<span class="albumBadge">${this.esc(album.year)}</span>` : ""}</div>
            <div class="albumHoverBody"><h3 class="albumHoverTitle">${this.esc(album.albumName)}</h3><p class="albumHoverArtist">${this.esc(album.artistName)}</p></div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderArtistCard(artist) {
    return `
      <article class="artistCard" data-artist-id="${this.esc(artist.id)}">
        <div class="artistPortrait"><img src="${this.esc(artist.imageUrl || "")}" alt="${this.esc(artist.name)}" loading="lazy"></div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(artist.name)}</span>
          <p class="artistDetails">${this.esc(artist.genre || "Artist")}</p>
        </div>
      </article>
    `;
  }

  renderSongRow(song, index) {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <tr data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId)}" data-album-id="${this.esc(song.albumId)}" data-context='${this.esc(JSON.stringify({ artistId: song.artistId, albumId: song.albumId }))}'>
        <td class="tableNum">${(this.page - 1) * this.limit + index + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(song.coverUrl || "")}" alt="" loading="lazy"></div>
            <div class="tableSongInformation"><span class="tableSongTitle">${this.esc(song.title)}</span><span class="tableSongArtist">${this.esc(song.artist)}</span></div>
          </div>
        </td>
        <td>${this.esc(song.album)}</td>
        <td>${this.esc(song.duration || "")}</td>
        <td>
          <div class="rowActions">
            <button type="button" class="tableAction heart${isFav ? " favorited" : ""}" data-fav-song="${this.esc(song.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
          </div>
        </td>
      </tr>
    `;
  }

  renderPagination() {
    const totalPages = Math.ceil(this.totalItems / this.limit) || 1;
    if (totalPages <= 1) return "";

    return `
      <div class="pagination-controls">
        <button class="pag-btn" data-page-action="prev" ${this.page === 1 ? "disabled" : ""}>Prev</button>
        <span class="pag-info">Page ${this.page} of ${totalPages}</span>
        <button class="pag-btn" data-page-action="next" ${this.page === totalPages ? "disabled" : ""}>Next</button>
      </div>
    `;
  }

  renderContent() {
    const items = this.getPaginatedItems();
    if (!items.length) return `<div class="emptyState"><h3 class="emptyTitle">No items found</h3></div>`;

    let html = "";
    if (this.view === "songs") {
      html = `<div class="songTableWrapper"><table class="songTable"><tbody>${items.map((s, i) => this.renderSongRow(s, i)).join("")}</tbody></table></div>`;
    } else if (this.view === "albums") {
      html = `<div class="albumGrid">${items.map(a => this.renderAlbumCard(a)).join("")}</div>`;
    } else if (this.view === "artists") {
      html = `<div class="artistGrid">${items.map(a => this.renderArtistCard(a)).join("")}</div>`;
    }
    
    return html + this.renderPagination();
  }

  render() {
    this.updateTotals();
    const tabs = [["songs", "Songs"], ["albums", "Albums"], ["artists", "Artists"], ["playlists", "Playlists"]];

    return `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div><h1 class="browseTitle">Browse Music</h1></div>
            <div class="searchWrapper"><input type="search" class="librarySearch" id="librarySearch" placeholder="Search..." value="${this.esc(this.query)}"></div>
            <nav class="browseNavigation">${tabs.map(([k, l]) => `<button class="browseTab${this.view === k ? " is-active" : ""}" data-view="${k}">${l}</button>`).join("")}</nav>
          </header>
          <div class="resultsHeader" id="browseResultsHeader">
            <h2 class="resultsTitle">${this.view.charAt(0).toUpperCase() + this.view.slice(1)}</h2>
            <span class="resultsCount">${this.totalItems.toLocaleString()} items</span>
          </div>
          <section class="dynamicContent" id="browseContent">
            <div class="contentSection">
              ${this.renderContent()}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="library"].bp');
    if (root) this.bindEvents(root);
    else if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
  }

  getRoot() {
    return document.querySelector('[data-page="library"].bp');
  }

  refreshContent() {
    this.updateTotals();
    const root = this.getRoot();
    if (!root) return;
    
    root.querySelector(".resultsTitle").textContent = this.view.charAt(0).toUpperCase() + this.view.slice(1);
    root.querySelector(".resultsCount").textContent = `${this.totalItems.toLocaleString()} items`;
    root.querySelectorAll(".browseTab").forEach(t => t.classList.toggle("is-active", t.dataset.view === this.view));
    
    const container = root.querySelector(".contentSection");
    container.innerHTML = this.renderContent();
    this.hydrate(container);
  }

  hydrate(scope) {
    if (!scope) return;
    window.heartManager?.bindAll(scope);
  }

  bindEvents(root) {
    if (root.browseDelegated) return;
    root.browseDelegated = true;

    root.addEventListener("click", (e) => {
      const tab = e.target.closest(".browseTab");
      if (tab) {
        e.stopPropagation();
        this.view = tab.dataset.view;
        this.page = 1;
        this.refreshContent();
        return;
      }

      const pagBtn = e.target.closest("[data-page-action]");
      if (pagBtn) {
        e.stopPropagation();
        if (pagBtn.dataset.pageAction === "prev") this.page = Math.max(1, this.page - 1);
        if (pagBtn.dataset.pageAction === "next") this.page += 1;
        this.refreshContent();
        return;
      }
    });

    const searchInput = root.querySelector("#librarySearch");
    if (searchInput) {
      let timer;
      searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.query = searchInput.value;
          this.page = 1;
          this.refreshContent();
        }, 300);
      });
    }
  }
}

class Artists {
  constructor(ui) {
    this.ui = ui;
    this.page = 1;
    this.limit = 20;
  }

  render() {
    this.bindWhenReady();
    return `<div class="artist-page" data-page="artist"><div class="artist-shell"><div class="artist-loading">Loading...</div></div></div>`;
  }

  async bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="artist"]');
    if (!root) {
      if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
      return;
    }
    const shell = root.querySelector(".artist-shell");
    if (!shell) return;

    const artistId = this.ui.state.artistId;
    if (!artistId) { shell.innerHTML = `<div class="artist-missing">Artist not found</div>`; return; }

    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) { shell.innerHTML = `<div class="artist-missing">Artist not found</div>`; return; }

    let albumId = this.ui.state.selectedAlbumId;
    if (!albumId && artist.albums?.length) albumId = artist.albums[0].id;
    
    const album = albumId ? await window.MusicStore.loadAlbum(artistId, albumId).catch(() => null) : null;
    if (!album) { shell.innerHTML = `<div class="artist-missing">Album not found</div>`; return; }

    shell.innerHTML = this.renderFull(artist, album);
    this.afterRender();
    this.ui.events.attachContentEvents();
  }

  renderFull(artist, album) {
    return `
      <header class="artist-header">
        <h1 class="artist-name">${Utils.esc(artist.artist)}</h1>
      </header>
      <div class="artist-heroBody">
        <div class="hero-stage">
          <div class="hero-left">
            <div class="hero-cover">
              <img src="${Utils.esc(album.coverUrl)}" alt="">
              <h2 class="album-title">${Utils.esc(album.album)}</h2>
            </div>
          </div>
          <div class="hero-right">
            <div data-list="songs" class="hero-songs">
              <div class="body">
                ${album.songs.map((song, i) => this.createSongRow(song, i, artist, album)).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createSongRow(song, index, artist, album) {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <div class="songItem" data-song-id="${Utils.esc(song.id)}" data-context='${JSON.stringify({ artistId: artist.id, albumId: album.id })}'>
        <div class="left"><div class="trackNum">${index + 1}</div></div>
        <div class="center"><div class="title"><span>${Utils.esc(song.title)}</span></div></div>
        <div class="right">
          <div class="time">${Utils.esc(song.duration || "")}</div>
          <button type="button" class="heart ${isFav ? "favorited" : ""}" data-fav-song="${Utils.esc(song.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.ui.router.updateTitle();
  }
}





class Favorites {
  constructor(ui) {
    this.ui = ui;
  }

  renderEmpty(emoji, title, description) {
    return `
      <div class="emptyState animate-fadeInUp" style="text-align: center; padding: 4rem 0;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: rgb(var(--textPrimary));">${title}</h3>
        <p style="color: rgba(var(--textSecondary)/1);">${description}</p>
      </div>
    `;
  }

  renderSongCards(songs) {
    if (!songs.length) return "";

    const groups = {};
    songs.forEach((song) => {
      const genre = song.genre || "Unknown Genre";
      if (!groups[genre]) groups[genre] = [];
      groups[genre].push(song);
    });

    return `
      <div class="song-list animate-fadeInUp">
        ${Object.entries(groups)
          .map(
            ([genre, genreSongs]) => `
          <section class="song-genre-group">
            <h2 class="song-genre-title">${genre}</h2>
            <div class="song-rows">
              ${genreSongs
                .map(
                  (song, i) => `
                <div class="song-row" style="--d: ${i * 30}ms">
                  <div class="song-row-art" data-action="play-song" data-play-song="${song.id}" data-play-source="favorites">
                    <img src="${song.coverUrl}" loading="lazy" alt="">
                    <div class="song-row-play">${Icons.player.play(16)}</div>
                  </div>
                  <div class="song-row-info">
                    <span class="song-row-title">${song.title}</span>
                    <span class="song-row-artist">${song.artist}</span>
                  </div>
                  <button class="heart ${this.ui.favorites.isSong(song.id) ? "favorited" : ""}" data-fav-song="${song.id}">${this.ui.likeStatus("song", this.ui.favorites.isSong(song.id), false, null)}</button>
                </div>
              `
                )
                .join("")}
            </div>
          </section>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderAlbumCards(albums) {
    return `
      <div class="ui-grid album-grid animate-fadeInUp">
        ${albums
          .map(
            (album, i) => `
          <div class="ui-card album-card" style="--d: ${i * 40}ms" data-album-id="${album.id}" data-artist-id="${album.artistId}">
            <div class="imgBx" data-action="open-album" data-album-id="${album.id}" data-artist-id="${album.artistId}"><img src="${album.coverUrl}" loading="lazy" alt=""></div>
            <div class="content">
              <div class="contentBx"><h3>${album.album}<br><span>${album.artistName}</span></h3></div>
              <ul class="sci">
                <li style="--i:1"><button class="icon-btn" data-action="play-album" data-artist-id="${album.artistId}" data-album-id="${album.id}" title="Play">${Icons.player.play(18)}</button></li>
                <li style="--i:2"><button class="icon-btn" data-action="shuffle-album" data-artist-id="${album.artistId}" data-album-id="${album.id}" title="Shuffle Play">${Icons.player.shuffle ? Icons.player.shuffle(18) : ""}</button></li>
                <li style="--i:3"><button class="icon-btn" data-action="album-more" data-album-id="${album.id}" title="More">${Icons.general.moreHoriz(18)}</button></li>
              </ul>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderArtistCards(artists) {
    return `
      <div class="ui-grid animate-fadeInUp">
        ${artists
          .map(
            (artist, i) => `
          <div class="ui-card" data-artist-id="${artist.id}" style="--d: ${i * 40}ms" data-action="open-artist">
            <div class="ui-art-wrap" style="border-radius: 50%;"><img src="${artist.imageUrl || ""}" loading="lazy" alt=""></div>
            <div class="ui-info" style="justify-content: center; text-align: center;">
              <div class="ui-text"><span class="ui-title">${artist.artist}</span><span class="ui-sub">${artist.genre || "Artist"}</span></div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderPlaylistCards(playlists) {
    const state = this.ui.state;

    return `
      <div class="ui-grid animate-fadeInUp">
        ${playlists
          .map((playlist, i) => {
            const covers = playlist.songs
              .map((id) => state.getSongById(id))
              .filter(Boolean)
              .slice(0, 4)
              .map((song) => song.coverUrl);

            return `
          <div class="ui-card" data-playlist-view="${Utils.esc(playlist.name)}" data-playlist-name="${Utils.esc(playlist.name)}" style="--d: ${i * 40}ms" data-action="open-playlist">
            <div class="ui-art-wrap mosaic-wrap">
              ${covers.length ? covers.map((cover) => `<img src="${cover}" alt="">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
              <button class="ui-play-btn" data-playlist-play="${playlist.id}">${Icons.player.play(18)}</button>
            </div>
            <div class="ui-info">
              <div class="ui-text"><span class="ui-title">${Utils.esc(playlist.name)}</span><span class="ui-sub">${playlist.songs.length} songs</span></div>
            </div>
          </div>
        `;
          })
          .join("")}
      </div>
    `;
  }

  render() {
    const state = this.ui.state;

    const tabs = [
      { key: "songs", label: "Songs" },
      { key: "albums", label: "Albums" },
      { key: "artists", label: "Artist" },
      { key: "playlists", label: "Playlists" },
    ];

    this.bindWhenReady();

    return `
      <div data-page="favorites" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">Favorites</h1>
          <nav class="tabs">${tabs
            .map(
              ({ key, label }) =>
                `<button class="tab-btn ${key === state.favoritesTab ? "active" : ""}" data-tab="${key}">${label}</button>`
            )
            .join("")}</nav>
        </header>
        <div id="favorites-content"><div style="padding: 4rem 0; text-align: center; opacity: 0.7;">Loading favorites…</div></div>
      </div>
    `;
  }

  async bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="favorites"]');
    if (!root) {
      if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
      return;
    }
    const container = root.querySelector("#favorites-content");
    if (!container) return;
    container.innerHTML = await this.tabContent(this.ui.state.favoritesTab);
    this.bindInteractions(container);
    this.ui.events.attachContentEvents();
  }

  bindInteractions(container) {
    if (!container || container.favBound) return;
    container.favBound = true;

    container.addEventListener("click", (e) => {
      if (e.target.closest("[data-fav-song]")) return;

      const playSong = e.target.closest('[data-action="play-song"]');
      if (playSong) {
        e.stopPropagation();
        window.pagesActions?.playSong?.(playSong.dataset.playSong, playSong.dataset.playSource || "favorites");
        return;
      }

      const openAlbum = e.target.closest('[data-action="open-album"]');
      if (openAlbum) {
        e.stopPropagation();
        this.ui.navigate("artist", openAlbum.dataset.artistId, openAlbum.dataset.albumId);
        return;
      }

      const playAlbum = e.target.closest('[data-action="play-album"]');
      if (playAlbum) {
        e.stopPropagation();
        window.pagesActions?.playAlbum?.(playAlbum.dataset.artistId, playAlbum.dataset.albumId);
        return;
      }

      const shuffleAlbum = e.target.closest('[data-action="shuffle-album"]');
      if (shuffleAlbum) {
        e.stopPropagation();
        window.pagesActions?.shuffleAlbum?.(shuffleAlbum.dataset.artistId, shuffleAlbum.dataset.albumId);
        return;
      }

      const albumMore = e.target.closest('[data-action="album-more"]');
      if (albumMore) {
        e.stopPropagation();
        this.ui.openMoreMenu?.(e, "album", albumMore.dataset.albumId);
        return;
      }

      const openArtist = e.target.closest('[data-action="open-artist"]');
      if (openArtist) {
        e.stopPropagation();
        this.ui.navigate("artist", openArtist.dataset.artistId);
        return;
      }

      const openPlaylist = e.target.closest('[data-action="open-playlist"]');
      if (openPlaylist) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        const name = openPlaylist.dataset.playlistName;
        this.ui.navigate("playlists");
        setTimeout(() => {
          try {
            this.ui.pages.playlists?.viewPlaylist?.(name);
          } catch {}
        }, 60);
        return;
      }
    });
  }

  async tabContent(tab) {
    const state = this.ui.state;

    if (tab === "songs") {
      const ids = state.favoriteSongs;
      if (!ids.length) return this.renderEmpty("<i class='fad fa-hearts'></i>", "No favorite songs yet", "Tap the heart on any track to save it.");
      const toLoad = new Set();
      for (const id of ids) {
        const song = state.getSongById(id);
        if (!song) continue;
        if (song.artistId && song.albumId) toLoad.add(`${song.artistId}/${song.albumId}`);
      }
      const missing = ids.filter((id) => !state.getSongById(id));
      const hints = window.MusicStore?.index || [];
      if (missing.length) {
        await Promise.all(
          hints.map((entry) => window.MusicStore.loadArtist(entry.id).catch(() => null))
        );
      }
      const songs = ids.map((id) => state.getSongById(id)).filter(Boolean);
      return this.renderSongCards(songs);
    }

    if (tab === "artists") {
      const ids = state.favoriteArtists;
      if (!ids.length) return this.renderEmpty("🎤", "No favorite artists yet", "Save the artists you love most.");
      await Promise.all(ids.map((id) => window.MusicStore.loadArtist(id).catch(() => null)));
      const artists = ids.map((id) => state.getArtistById(id)).filter(Boolean);
      return this.renderArtistCards(artists);
    }

    if (tab === "albums") {
      const ids = state.favoriteAlbums;
      if (!ids.length) return this.renderEmpty("💿", "No favorite albums yet", "Mark standout albums to keep them close.");
      const albumCache = window.MusicStore.albumCache;
      for (const id of ids) {
        const cached = albumCache.get(String(id));
        if (cached && cached._discographyOnly) {
          await window.MusicStore.loadAlbum(cached.artistId, id).catch(() => null);
        }
      }
      const albums = ids.map((id) => state.getAlbumById(id)).filter(Boolean);
      return this.renderAlbumCards(albums);
    }

    if (tab === "playlists") {
      return state.playlists.length
        ? this.renderPlaylistCards(state.playlists)
        : this.renderEmpty("📚", "No playlists yet", "Create a playlist to curate your mood.");
    }

    return "";
  }
}

class Playlists {
  constructor(ui) {
    this.ui = ui;
  }

  viewPlaylist(name) {
    this.ui.state.selectedPlaylistName = name;
    this.ui.render();
  }

  render() {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;

    this.bindWhenReady();

    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || "Playlists"}</h1>
          ${
            !viewing
              ? `<button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" data-action="create-playlist">+ New</button>`
              : `<button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" data-action="back-to-playlists">&larr; Back</button>`
          }
        </header>
        ${viewing ? this.renderPlaylistViewer(viewing) : this.renderPlaylistsGrid()}
      </div>
    `;
  }

  bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="playlists"]');
    if (!root) {
      if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
      return;
    }
    if (root.bound) return;
    root.bound = true;
    this.bindInteractions(root);
  }

  bindInteractions(root) {
    root.addEventListener("click", (e) => {
      const createBtn = e.target.closest('[data-action="create-playlist"]');
      if (createBtn) {
        e.stopPropagation();
        this.openCreateModal();
        return;
      }

      const backBtn = e.target.closest('[data-action="back-to-playlists"]');
      if (backBtn) {
        e.stopPropagation();
        this.viewPlaylist(null);
        return;
      }

      const openPlaylist = e.target.closest('[data-action="open-playlist"]');
      if (openPlaylist) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        this.viewPlaylist(openPlaylist.dataset.playlistName);
        return;
      }

      const manageBtn = e.target.closest('[data-action="manage-playlists"]');
      if (manageBtn) {
        e.stopPropagation();
        window.favoritesPlaylists?.openModal?.();
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-playlist"]');
      if (editBtn) {
        e.stopPropagation();
        this.ui.editPlaylist(editBtn.dataset.playlistId);
        return;
      }

      const shareBtn = e.target.closest('[data-action="share-playlist"]');
      if (shareBtn) {
        e.stopPropagation();
        const playlist = this.ui.state.playlists.find(
          (p) => String(p.id) === String(shareBtn.dataset.playlistId)
        );
        if (!playlist) return;
        const text = `Playlist: ${playlist.name}\n${playlist.songs.length} songs\n${playlist.description || ""}`;
        if (navigator.share) navigator.share({ title: playlist.name, text });
        else navigator.clipboard?.writeText(text).then(() => this.ui.state.showToast?.("Playlist copied to clipboard"));
        return;
      }

      const playRow = e.target.closest('[data-action="play-song"][data-play-song]');
      if (playRow) {
        e.stopPropagation();
        window.pagesActions?.playSong?.(playRow.dataset.playSong, playRow.dataset.playSource || "playlist");
        return;
      }
    });
  }

  openCreateModal() {
    const btn = document.querySelector('[data-page="playlists"] [data-action="create-playlist"]');
    const spinner = new Spinner({
      container: btn || document.querySelector('[data-page="playlists"]'),
      blur: 8,
      dim: 0.4,
      size: 20,
      minDuration: 400,
      delay: 80,
    });
    spinner.show();

    setTimeout(() => {
      const modal = document.getElementById("create-playlist-modal");
      modal?.classList.remove("hidden");
      spinner.hide();
      setTimeout(() => spinner.remove(), 400);
    }, this.ui.fragmentLoadDelay || 800);
  }

  renderPlaylistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length) {
      return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    }

    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists
          .map((playlist) => {
            const covers = playlist.songs
              .map((id) => state.getSongById(id))
              .filter(Boolean)
              .slice(0, 4)
              .map((song) => song.coverUrl);

            return `
            <div class="playlist-card" data-action="open-playlist" data-playlist-name="${Utils.esc(playlist.name)}">
              <div class="mosaic-wrap">
                ${covers.length ? covers.map((cover) => `<img src="${cover}">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                <button class="playlist-play-btn" data-playlist-play="${playlist.id}">${Icons.player.play(20)}</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="min-width: 0;">
                  <span style="font-weight: 700; font-size: 1rem; color: rgb(var(--textPrimary)); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.esc(playlist.name)}</span>
                  <span style="font-size: 0.8rem; color: rgba(var(--textSecondary)/1); display: block;">by You</span>
                </div>
                <button class="ui-more-btn" data-action="manage-playlists">${Icons.general.moreVert(18)}</button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  renderPlaylistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;

    const songs = playlist.songs.map((id) => state.getSongById(id)).filter(Boolean);

    return `
      <div class="animate-fadeInUp">
        <div class="viewer-header">
          <p style="color: rgba(var(--textSecondary)/1); font-size: 0.9rem;">Experience this playlist curated by you.<br>${songs.length} Songs</p>
          <div class="action-bar">
            <button class="action-btn" title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" data-action="edit-playlist" data-playlist-id="${playlist.id}" title="Edit"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="action-btn primary" data-playlist-play="${playlist.id}" style="width: 50px; height: 50px;" title="Play">${Icons.player.play(24)}</button>
            <button class="action-btn share-playlist-btn" data-action="share-playlist" data-playlist-id="${playlist.id}" title="Share"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="action-btn" title="More">${Icons.general.moreHoriz(18)}</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${songs
            .map(
              (song, i) => `
            <div class="list-row" data-song-id="${song.id}" data-playlist-id="${playlist.id}" data-play-source="playlist" style="cursor: pointer;" data-action="play-song" data-play-song="${song.id}">
              <span style="color: rgba(var(--textOthers)/1); font-size: 0.85rem; font-weight: 600; text-align: center;">${i + 1}</span>
              <img src="${song.coverUrl}" class="row-thumb">
              <div style="min-width: 0;"><span class="row-title">${Utils.esc(song.title)}</span><span class="row-sub">${Utils.esc(song.artist)} • ${Utils.esc(song.album)}</span></div>
              <button class="ui-more-btn" data-more-song="${song.id}">${Icons.general.moreHoriz(20)}</button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
}





class CreatePlaylist {
  constructor(ui) {
    this.ui = ui;
  }

  reset() {
    const count = (this.ui.state.playlists?.length || 0) + 1;
    this.ui.state.draftPlaylist = {
      name: `My Playlist #${count}`,
      description: "",
      tags: [],
      songs: [],
    };
    return this.ui.state.draftPlaylist;
  }

  render() {
    const state = this.ui.state;
    const draft = state.draftPlaylist || this.reset();

    const songs = draft.songs.map((id) => state.getSongById(id)).filter(Boolean);

    const totalDuration = songs.reduce((sum, song) => {
      const parts = song?.duration?.split(":") || ["0", "0"];
      if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return sum;
    }, 0);
    const durationText = Utils.fmtTime(totalDuration);

    const canCreate = draft.name.trim().length > 0;

    return `
      <div data-page="create-playlist" class="page animate-fadeInUp">
        <div class="edit-playlist-header">
          <button class="edit-playlist-back" data-action="back" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="edit-playlist-title">New Playlist</h1>
          <button class="edit-playlist-done" data-action="create" ${canCreate ? "" : "disabled"}>Create</button>
        </div>
        <div class="edit-playlist-hero">
          <div class="edit-playlist-cover">
            ${this.renderCoverPreview(draft)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field">
              <label for="create-pl-name">Name</label>
              <input type="text" id="create-pl-name" class="edit-playlist-input" value="${Utils.esc(draft.name)}" placeholder="Playlist name" maxlength="80" data-draft-field="name">
            </div>
            <div class="edit-playlist-field">
              <label for="create-pl-desc">Description</label>
              <textarea id="create-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" placeholder="Add an optional description" data-draft-field="description">${Utils.esc(draft.description || "")}</textarea>
            </div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="create-pl-tags">
                ${(draft.tags || [])
                  .map((tag) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(tag)}">${Utils.esc(tag)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(tag)}">×</button></span>`)
                  .join("")}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${songs.length} songs • ${durationText}</p>
          </div>
        </div>
        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="add-songs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Songs</button>
        </div>
        <div class="edit-playlist-songs" id="create-playlist-songs">
          ${songs
            .map(
              (song, i) => `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <img src="${song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info"><p class="edit-playlist-song-title">${Utils.esc(song.title)}</p><p class="edit-playlist-song-artist">${Utils.esc(song.artist || "")} • ${Utils.esc(song.album || "")}</p></div>
              <span class="edit-playlist-song-time">${song.duration || ""}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          `
            )
            .join("")}
        </div>
        ${!songs.length ? `<div class="edit-playlist-empty"><div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div><h3 class="edit-playlist-empty-title">No songs yet</h3><p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p></div>` : ""}
      </div>
    `;
  }

  renderCoverPreview(draft) {
    const state = this.ui.state;
    const songs = draft.songs
      .map((songId) => state.getSongById(songId))
      .filter(Boolean)
      .slice(0, 4);

    if (!songs.length) return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1) return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((song) => `<img src="${song.coverUrl}" class="edit-cover-quarter" alt="">`).join("")}</div>`;
  }
}





class EditPlaylist {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const playlist = state.playlists.find((p) => String(p.id) === String(id));
    if (!playlist) return `<div class="page animate-fadeInUp"><div class="missing">Playlist not found</div></div>`;

    const songs = playlist.songs.map((songId, i) => {
      const song = state.getSongById(songId);
      return { song, index: i, songId: String(songId) };
    });

    const totalDuration = songs.reduce((sum, item) => {
      const parts = item.song?.duration?.split(":") || ["0", "0"];
      if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return sum;
    }, 0);
    const durationText = Utils.fmtTime(totalDuration);

    return `
      <div data-page="edit-playlist" class="page animate-fadeInUp">
        <div class="edit-playlist-header">
          <button class="edit-playlist-back" data-action="back" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="edit-playlist-title">Edit Playlist</h1>
          <button class="edit-playlist-done" data-action="done">Done</button>
        </div>
        <div class="edit-playlist-hero">
          <div class="edit-playlist-cover">
            ${this.renderCoverPreview(playlist)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field"><label for="edit-pl-name">Name</label><input type="text" id="edit-pl-name" class="edit-playlist-input" value="${Utils.esc(playlist.name)}" maxlength="80" data-playlist-id="${Utils.esc(playlist.id)}"></div>
            <div class="edit-playlist-field"><label for="edit-pl-desc">Description</label><textarea id="edit-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" data-playlist-id="${Utils.esc(playlist.id)}">${Utils.esc(playlist.description || "")}</textarea></div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="edit-pl-tags">
                ${(playlist.tags || [])
                  .map((tag) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(tag)}">${Utils.esc(tag)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(tag)}">×</button></span>`)
                  .join("")}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${playlist.songs.length} songs • ${durationText}</p>
          </div>
        </div>
        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="shuffle-play"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> Shuffle Play</button>
          <button class="edit-playlist-tool" data-action="add-songs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Songs</button>
          <button class="edit-playlist-tool edit-playlist-tool-danger" data-action="delete-playlist"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>
        </div>
        <div class="edit-playlist-songs" id="edit-playlist-songs" data-playlist-id="${Utils.esc(playlist.id)}">
          ${songs
            .map((item, i) =>
              item.song
                ? `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${item.song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <img src="${item.song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info"><p class="edit-playlist-song-title">${Utils.esc(item.song.title)}</p><p class="edit-playlist-song-artist">${Utils.esc(item.song.artist || "")} • ${Utils.esc(item.song.album || "")}</p></div>
              <span class="edit-playlist-song-time">${item.song.duration || ""}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          `
                : `
            <div class="edit-playlist-song-row edit-playlist-song-missing" data-index="${i}">
              <div class="edit-playlist-drag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <p class="edit-playlist-song-title">Unknown song</p>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}">Remove</button>
            </div>
          `
            )
            .join("")}
        </div>
        ${!playlist.songs.length ? `<div class="edit-playlist-empty"><div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div><h3 class="edit-playlist-empty-title">No songs yet</h3><p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p></div>` : ""}
      </div>
    `;
  }

  renderCoverPreview(playlist) {
    const state = this.ui.state;
    const songs = playlist.songs
      .map((songId) => state.getSongById(songId))
      .filter(Boolean)
      .slice(0, 4);

    if (!songs.length) return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1) return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((song) => `<img src="${song.coverUrl}" class="edit-cover-quarter" alt="">`).join("")}</div>`;
  }
}





class Error404 {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    return `
      <div data-page="404" class="page animate-fadeInUp">
        <div class="wrap">
          <div class="code">404</div>
          <h1 class="title">Page Not Found</h1>
          <p class="desc">The page you're looking for doesn't exist or may have been moved.</p>
          <div class="actions">
            <button onclick="window.pagesActions.goHome()" class="home">🏠 Take me Home</button>
            <button onclick="window.history.back()" class="back">↩ Go Back</button>
          </div>
          <div class="note"><p>Error 404 - The requested resource could not be found.</p></div>
        </div>
      </div>
    `;
  }
}





window.Home = Home;
window.Library = Library;
window.Artists = Artists;
window.Favorites = Favorites;
window.Playlists = Playlists;
window.CreatePlaylist = CreatePlaylist;
window.EditPlaylist = EditPlaylist;
window.Error404 = Error404;

























//    William Cole Hanson
//   Chevrolay@Outlook.com
//      m.me/Chevrolay
