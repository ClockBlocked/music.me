class Home {
  constructor(ui) {
    this.ui = ui;
    this.recentLimit = 15;
    this.mostPlayedLimit = 3;
    this.discoverArtistLimit = 5;
    this.discoverSongsPerArtist = 3;
    this.genreLimit = 14;
    this.discoverIndex = 0;
    this.discoverCache = null;
    this.focusedGenre = null;
    this.bindLiveUpdates();
  }

  collectSongs() {
    return window.pagesActions?.buildSongs() || [];
  }

  collectAlbums() {
    return window.pagesActions?.buildAlbums() || [];
  }

  collectGenres() {
    const index = window.MusicStore?.index || [];
    const map = new Map();
    index.forEach((entry) => {
      const name = (entry.genre || "").trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, count: 0, coverUrl: "" });
      map.get(name).count += 1;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  featuredRelease() {
    return this.featuredCache || null;
  }

  libraryCounts() {
    const index = window.MusicStore?.index || [];
    return {
      songs: window.MusicStore?.songCache?.size || 0,
      albums: Array.from(window.MusicStore?.albumCache?.values() || []).filter((a) => !a._discographyOnly).length,
      artists: index.length,
      playlists: (this.ui.state.playlists || []).length,
    };
  }

  discoverArtists() {
    return this.discoverCache || [];
  }

  recentSongs() {
    const state = this.ui.state;
    return (state.recentlyPlayed || [])
      .slice(0, this.recentLimit)
      .map((song) => state.getSongById(song.id) || song)
      .filter(Boolean);
  }

  mostPlayedSongs() {
    const state = this.ui.state;
    const songs =
      typeof state.getMostPlayed === "function" ? state.getMostPlayed(this.mostPlayedLimit) : [];
    return songs.map((song) => ({
      song,
      plays: state.getPlayCount ? state.getPlayCount(song.id) : 0,
    }));
  }

  favoritesSummary() {
    const state = this.ui.state;
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;

    let coverUrl = "";
    const latestSongId = [...(state.favoriteSongs || [])].pop();
    const latestSong = latestSongId != null ? state.getSongById(latestSongId) : null;

    if (latestSong?.coverUrl) {
      coverUrl = latestSong.coverUrl;
    } else {
      const latestAlbumId = [...(state.favoriteAlbums || [])].pop();
      const latestAlbum = latestAlbumId != null ? state.getAlbumById(latestAlbumId) : null;
      if (latestAlbum?.coverUrl) coverUrl = latestAlbum.coverUrl;
    }

    return { songCount, albumCount, artistCount, coverUrl };
  }

  async load() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        await Promise.all([
          this.loadFeaturedRelease(),
          this.loadDiscoverArtists(),
          this.prefetchRecentSongs(),
          this.prefetchMostPlayed(),
          this.prefetchFavorites(),
        ]);
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

    const pick = this.shuffle(index)[0];
    const artist = await window.MusicStore.loadArtist(pick.id).catch(() => null);
    if (!artist?.albums?.length) return;

    const albumStub = this.shuffle(artist.albums)[0];
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

  async loadDiscoverArtists() {
    if (Array.isArray(this.discoverCache) && this.discoverCache.length) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const picked = this.shuffle(index).slice(0, this.discoverArtistLimit);
    const artists = await Promise.all(
      picked.map((a) => window.MusicStore.loadArtist(a.id).catch(() => null))
    );

    const loaded = await Promise.all(
      artists.map(async (artist) => {
        if (!artist?.albums?.length) return null;
        const albumStub = this.shuffle(artist.albums)[0];
        const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
        if (!album?.songs?.length) return null;
        return {
          artistId: artist.id,
          artistName: artist.artist,
          genre: artist.genre,
          imageUrl: artist.imageUrl,
          songs: this.shuffle(album.songs).slice(0, this.discoverSongsPerArtist),
        };
      })
    );

    this.discoverCache = loaded.filter(Boolean);
    this.discoverIndex = 0;
  }

  async prefetchRecentSongs() {
    const recent = (this.ui.state.recentlyPlayed || []).slice(0, this.recentLimit);
    if (!recent.length) return;

    const toLoad = new Map();
    for (const ref of recent) {
      if (window.MusicStore.songCache.has(String(ref.id))) continue;
      if (ref.artistId && ref.albumId) {
        toLoad.set(`${ref.artistId}/${ref.albumId}`, { artistId: ref.artistId, albumId: ref.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ artistId, albumId }) =>
        window.MusicStore.loadAlbum(artistId, albumId).catch(() => null)
      )
    );
  }

  async prefetchMostPlayed() {
    const entries = this.mostPlayedSongs();
    if (!entries.length) return;

    const toLoad = new Map();
    for (const { song } of entries) {
      if (!song) continue;
      if (window.MusicStore.songCache.has(String(song.id))) continue;
      if (song.artistId && song.albumId) {
        toLoad.set(`${song.artistId}/${song.albumId}`, { artistId: song.artistId, albumId: song.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ artistId, albumId }) =>
        window.MusicStore.loadAlbum(artistId, albumId).catch(() => null)
      )
    );
  }

  async prefetchFavorites() {
    const state = this.ui.state;
    const toLoad = new Map();
    const scan = (arr) => {
      for (const f of arr || []) {
        if (
          typeof f === "object" &&
          f.artistId &&
          f.albumId &&
          !window.MusicStore.songCache.has(String(f.id))
        ) {
          toLoad.set(`${f.artistId}/${f.albumId}`, { artistId: f.artistId, albumId: f.albumId });
        }
      }
    };
    scan(state.favoriteSongs);
    scan(state.favoriteAlbums);
    if (!toLoad.size) return;

    await Promise.all(
      Array.from(toLoad.values()).map(({ artistId, albumId }) =>
        window.MusicStore.loadAlbum(artistId, albumId).catch(() => null)
      )
    );
  }

  refreshLoadedCards() {
    this.replaceCard("releases", this.renderFeaturedRelease(this.featuredRelease()));
    this.replaceCard("discover", this.renderDiscover(this.ui.state));
    this.replaceCard("recents", this.renderRecentlyPlayed(this.recentSongs()));
    this.replaceCard("most-played", this.renderMostPlayed(this.mostPlayedSongs()));
    this.replaceCard("favorites", this.renderFavoritesCard());
  }

  replaceCard(cardKey, html) {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;
    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;

    const existing = grid.querySelector(`[data-card="${cardKey}"]`);
    if (!html) {
      existing?.remove();
      return;
    }

    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;

    if (existing) {
      existing.replaceWith(fresh);
    } else {
      const order = ["releases", "recents", "most-played", "library", "favorites", "discover", "collections", "genres"];
      const idx = order.indexOf(cardKey);
      let inserted = false;
      for (const child of grid.children) {
        if (order.indexOf(child.dataset.card) > idx) {
          grid.insertBefore(fresh, child);
          inserted = true;
          break;
        }
      }
      if (!inserted) grid.appendChild(fresh);
    }
    this.syncNowPlaying();
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  esc(text) {
    return Utils.esc(text);
  }

  iconChevronLeft(size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  iconChevronRight(size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  iconShuffle(size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h2.2c1.1 0 2.1.55 2.7 1.47L10.1 10l2.2 3.53c.6.92 1.6 1.47 2.7 1.47H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15h2.2c1.1 0 2.1-.55 2.7-1.47l.9-1.43" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1 5H17M15.1 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.4 3.4 16.6 5l-2.2 1.6M14.4 13.4 16.6 15l-2.2 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  iconDiscover() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M12.9 7.1 11.4 11.4 7.1 12.9 8.6 8.6z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }

  iconCollections() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="6.5" width="11" height="11" rx="2.6" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M6 4.4h8.4A3.1 3.1 0 0 1 17.5 7.5V15" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  }

  iconGenres() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="2.5" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/></svg>`;
  }

  renderNote(type) {
    const color = "rgba(190,140,255,0.85)";
    if (type === 1) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><circle cx="17.9922" cy="15.75" r="3"></circle><circle cx="5.99219" cy="17.75" r="3"></circle><path d="M8.99219 17.75V9.66559M8.99219 9.66559V8.77944C8.99219 7.26371 8.99219 6.50585 9.41578 5.9576C9.83937 5.40936 10.5669 5.22555 12.022 4.85793L16.022 3.84738C18.3099 3.26938 19.4538 2.98038 20.223 3.58727C20.859 4.08907 20.9691 4.99061 20.9882 6.63495M8.99219 9.66559L20.9882 6.63495M20.9922 15.7289V7.76889C20.9922 7.35623 20.9922 6.9793 20.9882 6.63495M20.9882 6.63495L20.9922 6.63394" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    }
    if (type === 2) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><path d="M7 9.5C7 10.8807 5.88071 12 4.5 12C3.11929 12 2 10.8807 2 9.5C2 8.11929 3.11929 7 4.5 7C5.88071 7 7 8.11929 7 9.5ZM7 9.5V2C7.33333 2.5 7.6 4.6 10 5" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="10.5" cy="19.5" r="2.5"></circle><circle cx="20" cy="18" r="2"></circle><path d="M13 19.5L13 11C13 10.09 13 9.63502 13.2466 9.35248C13.4932 9.06993 13.9938 9.00163 14.9949 8.86504C18.0085 8.45385 20.2013 7.19797 21.3696 6.42937C21.6498 6.24509 21.7898 6.15295 21.8949 6.20961C22 6.26627 22 6.43179 22 6.76283V17.9259" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13 13C17.8 13 21 10.6667 22 10" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    }
    if (type === 3) {
      return `<svg width="24" height="19" viewBox="0 0 24 19" fill="none"><line x1="6" y1="3" x2="6" y2="14.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="1" x2="18" y2="13.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="6" y1="3" x2="18" y2="1" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="6.5" x2="18" y2="4.5" stroke="rgba(190,140,255,0.62)" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="3.4" cy="15" rx="3" ry="2" transform="rotate(-15 3.4 15)" fill="rgba(190,140,255,0.8)"/><ellipse cx="15.4" cy="14" rx="3" ry="2" transform="rotate(-15 15.4 14)" fill="rgba(190,140,255,0.8)"/></svg>`;
    }
    if (type === 4) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.49219" cy="17" r="4"></circle><path d="M13.4922 17V3C13.4922 5.76142 15.7308 8 18.4922 8"></path></svg>`;
    }
    return "";
  }

  renderSectionTitle({ icon, title, notes = [], action = "" }) {
    return `
      <div class="section-title-wrap">
        <span class="section-title-icon" aria-hidden="true">${icon}</span>
        <h2 class="section-title">${title}</h2>
        ${notes.length ? `<div class="section-title-notes" aria-hidden="true">${notes.join("")}</div>` : ""}
        ${action}
      </div>
    `;
  }

  renderActionButton(action, label) {
    return `<button type="button" class="cardAction" aria-label="${label}" data-action="${action}">${Icons.general.arrowRight(16)}</button>`;
  }

  renderEmpty(text) {
    return `<div class="hp-empty">${this.esc(text)}</div>`;
  }

  renderHeader() {
    return `
      <header class="pageHeader">
        <div class="pageHeaderContent">
          <span class="pageKicker">Your Music</span>
          <h1 class="pageTitle">Music Library</h1>
          <p class="pageDescription">Pick up where you left off, discover new releases, and explore your music collection.</p>
        </div>
        <button type="button" class="headerAction" data-nav="library">View Library</button>
      </header>
    `;
  }

  renderDiscoverSong(song, index) {
    const isPlaying = String(this.ui.state.currentSong?.id) === String(song.id);
    const title = this.esc(song.title || "Unknown Title");
    const album = this.esc(song.album || "");

    return `
      <button type="button" class="discoverSong${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId ?? "")}" data-album-id="${this.esc(song.albumId ?? "")}" aria-label="Play ${title}">
        <span class="discoverSongIndex" aria-hidden="true">${index + 1}</span>
        <span class="discoverSongArt" aria-hidden="true"><img src="${this.esc(song.coverUrl || "")}" alt="" loading="lazy"></span>
        <span class="discoverSongInfo"><span class="discoverSongTitle">${title}</span><span class="discoverSongAlbum">${album}</span></span>
        <span class="discoverSongPlay" aria-hidden="true">${Icons.player.play(14)}</span>
      </button>
    `;
  }

  renderDiscoverArtist(artist) {
    const name = this.esc(artist.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(artist.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(artist.imageUrl || "")}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta"><span class="discoverArtistName">${name}</span><span class="discoverArtistGenre">${this.esc(artist.genre || "Artist")}</span></div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(artist.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${artist.songs.map((s, i) => this.renderDiscoverSong(s, i)).join("")}</div>
      </div>
    `;
  }

  renderDiscoverNav(index, total) {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? "disabled" : ""}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? "disabled" : ""}>${this.iconChevronRight(16)}</button>
      </div>
    `;
  }

  renderDiscover() {
    const artists = this.discoverArtists();
    if (!artists.length) return "";

    let index = Number.isFinite(this.discoverIndex) ? this.discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this.discoverIndex = index;

    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.renderSectionTitle({
          icon: this.iconDiscover(),
          title: "Discover",
          notes: [this.renderNote(2)],
          action: this.renderDiscoverNav(index, artists.length),
        })}
        <div class="discoverViewport"><div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.renderDiscoverArtist(a)).join("")}</div></div>
      </article>
    `;
  }

  renderGenreTile(genre) {
    const name = this.esc(genre.name);
    const count = genre.count;
    return `
      <button type="button" class="genreTile" data-genre="${name}" aria-label="Genre ${name}">
        <span class="genreTileArt" aria-hidden="true">${genre.coverUrl ? `<img src="${this.esc(genre.coverUrl)}" alt="" loading="lazy">` : ""}</span>
        <span class="genreTileBody"><span class="genreTileName">${name}</span><span class="genreTileCount">${count} artist${count === 1 ? "" : "s"}</span></span>
      </button>
    `;
  }

  renderGenres() {
    const genres = this.collectGenres().slice(0, this.genreLimit);
    if (!genres.length) return "";

    const tiles = genres.map((g) => this.renderGenreTile(g)).join("");

    return `
      <section class="homeGenres" aria-label="Browse by genre">
        ${this.renderSectionTitle({
          icon: this.iconGenres(),
          title: "Genres",
          notes: [this.renderNote(2), this.renderNote(4)],
          action: this.renderActionButton("open-library", "Open library"),
        })}
        <div class="genreMarquee" data-genre-marquee><div class="genreMarqueeTrack">${tiles}${tiles}</div></div>
      </section>
    `;
  }

  renderCollectionCard(playlist) {
    const state = this.ui.state;
    const songs = (playlist.songs || [])
      .map((id) => (typeof state.getSongById === "function" ? state.getSongById(id) : null))
      .filter(Boolean);
    const covers = songs.map((song) => song.coverUrl).filter(Boolean);
    const uniqueCovers = [...new Set(covers)];

    let art = "";
    if (uniqueCovers.length >= 4) {
      art = `<div class="collectionMosaic">${uniqueCovers
        .slice(0, 4)
        .map((cover) => `<img src="${this.esc(cover)}" alt="" loading="lazy">`)
        .join("")}</div>`;
    } else if (uniqueCovers.length >= 1) {
      art = `<img src="${this.esc(uniqueCovers[0])}" alt="" loading="lazy">`;
    } else {
      art = `<div class="collectionEmpty">${Icons.general.playlistAdd(30)}</div>`;
    }

    const name = this.esc(playlist.name);
    const count = songs.length;

    return `
      <div class="collection-card" data-playlist-id="${this.esc(playlist.id)}" data-playlist-name="${name}" role="button" tabindex="0" aria-label="Open collection ${name}">
        <div class="imgBx">${art}</div>
        <div class="content">
          <div class="contentBx"><h3>${name}<br><span>${count} song${count === 1 ? "" : "s"}</span></h3></div>
          <ul class="sci">
            <li style="--i:1"><button type="button" class="icon-btn" data-playlist-play="${this.esc(playlist.id)}" aria-label="Play collection">${Icons.player.play(18)}</button></li>
            <li style="--i:2"><button type="button" class="icon-btn" data-playlist-shuffle="${this.esc(playlist.id)}" aria-label="Shuffle collection">${this.iconShuffle(18)}</button></li>
            <li style="--i:3"><button type="button" class="icon-btn" data-playlist-more="${this.esc(playlist.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button></li>
          </ul>
        </div>
      </div>
    `;
  }

  renderCollectionsInner() {
    const state = this.ui.state;
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length) {
      return this.renderEmpty("No collections yet - create a playlist and it will show up here.");
    }
    return `<div class="collectionGrid">${playlists.map((pl) => this.renderCollectionCard(pl)).join("")}</div>`;
  }

  renderCollections() {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.renderSectionTitle({
          icon: this.iconCollections(),
          title: "Collections",
          notes: [this.renderNote(4), this.renderNote(3)],
          action: this.renderActionButton("open-playlists", "Open all collections"),
        })}
        <div class="cardContent" id="homeCollectionsWrap">${this.renderCollectionsInner()}</div>
      </article>
    `;
  }

  renderSongRow(song) {
    const isFav = this.ui.favorites.isSong(song.id);
    const isPlaying = String(this.ui.state.currentSong?.id) === String(song.id);
    const title = this.esc(song.title || "Unknown Title");

    return `
      <article class="song${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId ?? "")}" data-album-id="${this.esc(song.albumId ?? "")}">
        <div class="songArtwork">
          <img src="${this.esc(song.coverUrl || "")}" alt="${title}" loading="lazy">
          <button type="button" class="songArtworkOverlay" aria-label="Play ${title}" data-action="play"><span class="playIcon" aria-hidden="true">${Icons.player.play(13)}</span></button>
        </div>
        <div class="songInformation">
          <span class="songArtist">${this.esc(song.artist || "Unknown Artist")}</span>
          <span class="songTitle">${title}</span>
          <div class="songMeta"><span class="songAlbum">${this.esc(song.album || "")}</span><span aria-hidden="true">&bull;</span><span class="songDuration">${this.esc(song.duration || "")}</span></div>
        </div>
        <div class="songActions">
          <button type="button" class="songAction favorite${isFav ? " is-favorite favorited" : ""}" aria-label="Favorite song" data-fav-song="${this.esc(song.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
          <button type="button" class="songAction" aria-label="More options" data-more-song="${this.esc(song.id)}">${Icons.general.moreVert(18)}</button>
        </div>
      </article>
    `;
  }

  renderRankRow(entry, index) {
    const song = entry.song;
    const isPlaying = String(this.ui.state.currentSong?.id) === String(song.id);
    const title = this.esc(song.title || "Unknown Title");
    const plays = entry.plays;

    return `
      <article class="rankItem${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId ?? "")}" data-album-id="${this.esc(song.albumId ?? "")}">
        <span class="rankNumber">${String(index + 1).padStart(2, "0")}</span>
        <div class="rankArtwork"><img src="${this.esc(song.coverUrl || "")}" alt="${title}" loading="lazy"></div>
        <div class="rankInformation"><span class="rankTitle">${title}</span><span class="rankSubtitle">${this.esc(song.artist || "Unknown Artist")}</span></div>
        <span class="rankCount">${plays} play${plays === 1 ? "" : "s"}</span>
      </article>
    `;
  }

  renderRecentlyPlayed(recent) {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        ${this.renderSectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><polygon points="8.5,7 8.5,13.5 14.5,10.25" fill="rgba(190,140,255,0.82)"/></svg>`,
          title: "Recently Played",
          notes: [this.renderNote(1), this.renderNote(2)],
          action: this.renderActionButton("view-recents", "View recently played"),
        })}
        <div class="cardContent"><div class="songList" id="recentSongs" aria-label="Recently played songs">${recent.length ? recent.map((s) => this.renderSongRow(s)).join("") : this.renderEmpty("Nothing here yet - play a song and it will appear at the top of this list.")}</div></div>
      </article>
    `;
  }

  renderFeaturedRelease(release) {
    if (!release) return "";

    const playData = this.esc(JSON.stringify({ artistId: release.artistId, albumId: release.albumId }));

    return `
      <article class="musicCard releasesCard" data-card="releases" data-artist-id="${this.esc(release.artistId)}" data-album-id="${this.esc(release.albumId)}">
        ${this.renderSectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          title: "New Release",
          notes: [this.renderNote(3)],
          action: this.renderActionButton("view-releases", "View all releases"),
        })}
        <div class="releaseFeature">
          <img class="releaseBackground" src="${this.esc(release.coverUrl)}" alt="${this.esc(release.albumName)}">
          <div class="releaseInfo">
            <span class="releaseLabel">Featured Album</span>
            <h3 class="releaseTitle">${this.esc(release.albumName)}</h3>
            <p class="releaseArtist">${this.esc(release.artistName)}</p>
            <div class="releaseControls">
              <button type="button" class="primaryPlay" aria-label="Play album" data-play-album='${playData}'>${Icons.player.play(18)}</button>
              <button type="button" class="secondaryControl" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.esc(release.albumId)}">${Icons.general.plus(18)}</button>
              <button type="button" class="secondaryControl" aria-label="More album options" data-release-more data-artist-id="${this.esc(release.artistId)}" data-album-id="${this.esc(release.albumId)}">${Icons.general.moreVert(18)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderMostPlayed(mostPlayed) {
    return `
      <article class="musicCard mostPlayed" data-card="most-played">
        ${this.renderSectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`,
          title: "Most Played",
          notes: [this.renderNote(1)],
          action: this.renderActionButton("view-most-played", "View most played"),
        })}
        <div class="cardContent"><div class="rankList" id="mostPlayedSongs">${mostPlayed.length ? mostPlayed.map((e, i) => this.renderRankRow(e, i)).join("") : this.renderEmpty("Your most played songs will show up here once you start listening.")}</div></div>
      </article>
    `;
  }

  renderLibraryCard(counts) {
    const items = [
      { key: "songs", label: "Songs", count: counts.songs, icon: Icons.general.musicNote(18) },
      { key: "albums", label: "Albums", count: counts.albums, icon: Icons.general.album(18) },
      { key: "artists", label: "Artists", count: counts.artists, icon: Icons.general.artist(18) },
      { key: "playlists", label: "Playlists", count: counts.playlists, icon: Icons.general.playlistAdd(18) },
    ];

    return `
      <article class="musicCard libraryCard" data-card="library">
        ${this.renderSectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          title: "Your Library",
          notes: [],
          action: this.renderActionButton("open-library", "Open library"),
        })}
        <div class="cardContent"><div class="libraryGrid">${items
          .map(
            (item) => `
          <button type="button" class="libraryItem" data-library="${item.key}">
            <span class="libraryIcon" aria-hidden="true">${item.icon}</span>
            <span class="libraryName">${item.label}</span>
            <span class="libraryCount">${item.count} ${item.label.toLowerCase()}</span>
          </button>`
          )
          .join("")}
        </div></div>
      </article>
    `;
  }

  renderFavoritesInner() {
    const favorites = this.favoritesSummary();
    const total = favorites.songCount + favorites.albumCount + favorites.artistCount;

    return `
      <div class="favoriteHero">
        ${favorites.coverUrl ? `<img class="favoriteArtwork" src="${this.esc(favorites.coverUrl)}" alt="Favorite album artwork">` : ""}
        <div class="favoriteInfo">
          <h3 class="favoriteTitle">Your Favorite Music</h3>
          <p class="favoriteSubtitle">${
            total
              ? `${favorites.songCount} song${favorites.songCount === 1 ? "" : "s"} &bull; ${favorites.albumCount} album${favorites.albumCount === 1 ? "" : "s"} &bull; ${favorites.artistCount} artist${favorites.artistCount === 1 ? "" : "s"}`
              : "Your most-loved songs and albums."
          }</p>
        </div>
      </div>
    `;
  }

  renderFavoritesCard() {
    return `
      <article class="musicCard favoritesCard" data-card="favorites">
        ${this.renderSectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`,
          title: "Favorites",
          notes: [this.renderNote(4), this.renderNote(3)],
          action: this.renderActionButton("view-favorites", "View favorites"),
        })}
        <div class="favoriteContent" id="homeFavoritesCard">${this.renderFavoritesInner()}</div>
      </article>
    `;
  }

  render() {
    this.focusedGenre = null;
    this.clearCardFocus();

    if (!Array.isArray(this.discoverCache)) this.discoverCache = null;

    const cards = [
      this.renderFeaturedRelease(this.featuredRelease()),
      this.renderRecentlyPlayed(this.recentSongs()),
      this.renderMostPlayed(this.mostPlayedSongs()),
      this.renderLibraryCard(this.libraryCounts()),
      this.renderFavoritesCard(),
      this.renderDiscover(),
      this.renderCollections(),
      this.renderGenres(),
    ].filter(Boolean);

    const html = `
      <div data-page="home" class="hp pageSection">
        <div class="container">
          ${this.renderHeader()}
          <section class="bentoGrid" aria-label="Music dashboard">${cards.join("")}</section>
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
    if (!root.homeCardFocusBound) {
      root.homeCardFocusBound = true;

      root.addEventListener("click", (e) => this.handleCardFocus(e), true);

      root.addEventListener("focusin", (e) => {
        const grid = root.querySelector(".bentoGrid");
        if (!grid) return;

        const card = e.target.closest(".musicCard[data-card]");
        if (!card || !grid.contains(card)) return;

        grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
        card.classList.add("is-card-focused");
        grid.classList.add("has-card-focus");
      });

      document.addEventListener(
        "click",
        (e) => {
          if (!root.isConnected) return;
          if (!root.contains(e.target)) this.clearCardFocus();
        },
        true
      );
    }

    if (root.homeDelegated) return;
    root.homeDelegated = true;

    root.addEventListener("click", (e) => this.handleRootClick(e));
    root.addEventListener("keydown", (e) => this.handleRootKeydown(e));
    this.load();
  }

  handleRootClick(e) {
    const ui = this.ui;
    const state = ui.state;

    if (this.focusedGenre && !e.target.closest(".genreTile[data-genre]")) {
      this.clearGenreFocus();
    }

    const overlay = e.target.closest(".songArtworkOverlay");
    if (overlay) {
      const row = overlay.closest("[data-song-id]");
      const song = row && state.getSongById(row.dataset.songId);
      if (song) {
        e.stopPropagation();
        ui.audioPlayer.playSong(song, null, true, "home");
      }
      return;
    }

    const moreBtn = e.target.closest("[data-more-song]");
    if (moreBtn) {
      e.stopPropagation();
      ui.events.showSongMenu(moreBtn.dataset.moreSong, e);
      return;
    }

    const albumMore = e.target.closest("[data-album-more]");
    if (albumMore) {
      e.stopPropagation();
      window.contextMenu?.show(e.clientX, e.clientY, {
        artistId: albumMore.dataset.artistId,
        albumId: albumMore.dataset.albumId,
      });
      return;
    }

    const artistPlay = e.target.closest("[data-artist-play]");
    if (artistPlay) {
      e.stopPropagation();
      ui.pages.library?.playArtist(artistPlay.dataset.artistPlay);
      return;
    }

    const artistOpen = e.target.closest("[data-artist-open]");
    if (artistOpen) {
      e.stopPropagation();
      ui.navigate("artist", artistOpen.dataset.artistOpen);
      return;
    }

    const refreshBtn = e.target.closest("[data-discover-refresh]");
    if (refreshBtn) {
      e.stopPropagation();
      this.discoverCache = null;
      this.discoverIndex = 0;
      this.rebuildDiscoverCard();
      return;
    }

    const prevBtn = e.target.closest("[data-discover-prev]");
    if (prevBtn) {
      e.stopPropagation();
      if (!prevBtn.disabled) this.moveDiscover(-1);
      return;
    }

    const nextBtn = e.target.closest("[data-discover-next]");
    if (nextBtn) {
      e.stopPropagation();
      if (!nextBtn.disabled) this.moveDiscover(1);
      return;
    }

    const discoverSong = e.target.closest(".discoverSong[data-song-id]");
    if (discoverSong) {
      e.stopPropagation();
      const song = state.getSongById(discoverSong.dataset.songId);
      if (song) ui.audioPlayer.playSong(song, null, true, "home");
      return;
    }

    const genreTile = e.target.closest(".genreTile[data-genre]");
    if (genreTile) {
      e.stopPropagation();
      const name = genreTile.dataset.genre;
      if (this.focusedGenre !== name) {
        this.focusedGenre = name;
        this.syncGenreFocus();
        return;
      }
      this.focusedGenre = null;
      this.syncGenreFocus();
      this.openGenre(name);
      return;
    }

    const releaseMore = e.target.closest("[data-release-more]");
    if (releaseMore) {
      e.stopPropagation();
      window.contextMenu?.show(e.clientX, e.clientY, {
        artistId: releaseMore.dataset.artistId,
        albumId: releaseMore.dataset.albumId,
      });
      return;
    }

    const playlistPlay = e.target.closest("[data-playlist-play]");
    if (playlistPlay) {
      e.stopPropagation();
      const id = playlistPlay.dataset.playlistPlay;
      const playlist = (state.playlists || []).find((p) => String(p.id) === String(id));
      const songs = playlist
        ? (playlist.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean)
        : [];
      if (songs.length) ui.audioPlayer.playSong(songs[0], songs, true, "home");
      return;
    }

    const playlistShuffle = e.target.closest("[data-playlist-shuffle]");
    if (playlistShuffle) {
      e.stopPropagation();
      const id = playlistShuffle.dataset.playlistShuffle;
      const playlist = (state.playlists || []).find((p) => String(p.id) === String(id));
      const songs = playlist
        ? (playlist.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean)
        : [];
      const shuffled = this.shuffle(songs);
      if (shuffled.length) ui.audioPlayer.playSong(shuffled[0], shuffled, true, "home");
      return;
    }

    const playlistMore = e.target.closest("[data-playlist-more]");
    if (playlistMore) {
      e.stopPropagation();
      const id = playlistMore.dataset.playlistMore;
      if (typeof ui.openMoreMenu === "function") ui.openMoreMenu(e, "playlist", id);
      else if (typeof ui.pages.playlists?.showMenu === "function") ui.pages.playlists.showMenu(e, id);
      else if (window.contextMenu?.show) window.contextMenu.show(e.clientX, e.clientY, { playlistId: id });
      return;
    }

    const navBtn = e.target.closest("[data-nav], .cardAction[data-action]");
    if (navBtn) {
      e.stopPropagation();
      const dest =
        navBtn.dataset.nav ||
        {
          "view-recents": "library",
          "view-releases": "library",
          "view-most-played": "library",
          "open-library": "library",
          "view-favorites": "favorites",
          "open-playlists": "playlists",
        }[navBtn.dataset.action];
      if (dest) ui.navigate(dest);
      return;
    }

    const libItem = e.target.closest(".libraryItem[data-library]");
    if (libItem) {
      e.stopPropagation();
      ui.navigate(libItem.dataset.library === "playlists" ? "playlists" : "library");
      return;
    }

    if (e.target.closest(".favoriteContent")) {
      e.stopPropagation();
      ui.navigate("favorites");
      return;
    }

    const collCard = e.target.closest(".collection-card[data-playlist-name]");
    if (collCard) {
      if (e.target.closest("button")) return;
      e.stopPropagation();
      collCard.classList.add("active");
      const name = collCard.dataset.playlistName;
      ui.navigate("playlists");
      setTimeout(() => {
        try {
          ui.pages.playlists?.viewPlaylist?.(name);
        } catch {}
      }, 60);
      return;
    }

    const row = e.target.closest(".song[data-song-id], .rankItem[data-song-id]");
    if (row) {
      if (e.target.closest("button")) return;
      e.stopPropagation();
      const song = state.getSongById(row.dataset.songId);
      if (song) ui.audioPlayer.playSong(song, null, true, "home");
      return;
    }
  }

  handleRootKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;

    const collCard = e.target.closest(".collection-card[data-playlist-name]");
    if (!collCard) return;
    if (e.target.closest("button")) return;

    e.preventDefault();
    e.stopPropagation();

    const name = collCard.dataset.playlistName;
    this.ui.navigate("playlists");
    setTimeout(() => {
      try {
        this.ui.pages.playlists?.viewPlaylist?.(name);
      } catch {}
    }, 60);
  }

  hydrateSongRow(row) {
    const songId = row.dataset.songId;

    const heart = row.querySelector("[data-fav-song]");
    if (heart) this.ui.events.bindHeartButton(heart, "song", heart.dataset.favSong);

    const more = row.querySelector("[data-more-song]");
    if (more && !more.homeMoreBound) {
      more.homeMoreBound = true;
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ui.events.showSongMenu(songId, e);
      });
    }
  }

  moveDiscover(delta) {
    const artists = this.discoverCache || [];
    if (!artists.length) return;

    const current = Math.max(0, Math.min(artists.length - 1, this.discoverIndex || 0));
    const next = Math.max(0, Math.min(artists.length - 1, current + delta));
    if (next === current) return;

    this.discoverIndex = next;
    this.syncDiscover();
  }

  syncDiscover() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const track = root.querySelector(".discoverTrack");
    if (!track) return;

    const total = track.children.length;
    if (!total) return;

    const index = Math.max(0, Math.min(total - 1, this.discoverIndex || 0));
    this.discoverIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;

    const prev = root.querySelector("[data-discover-prev]");
    const next = root.querySelector("[data-discover-next]");
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= total - 1;

    const counter = root.querySelector("[data-discover-counter]");
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }

  rebuildDiscoverCard() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const card = root.querySelector('[data-card="discover"]');
    const html = this.renderDiscover(this.ui.state);

    if (!card) {
      if (!html) return;
      const grid = root.querySelector(".bentoGrid");
      if (!grid) return;
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      if (fresh) grid.appendChild(fresh);
      this.syncNowPlaying();
      return;
    }

    if (!html) {
      card.remove();
      return;
    }

    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;
    card.replaceWith(fresh);
    this.syncNowPlaying();
  }

  syncGenreFocus() {
    const root = this.getRoot();
    if (!root) return;

    const marquee = root.querySelector("[data-genre-marquee]");
    if (!marquee) return;

    const focused = this.focusedGenre;
    marquee.classList.toggle("has-focus", !!focused);

    marquee.querySelectorAll(".genreTile").forEach((tile) => {
      const isFocus = !!focused && tile.dataset.genre === focused;
      tile.classList.toggle("is-focused", isFocus);
      tile.setAttribute("aria-pressed", isFocus ? "true" : "false");
    });
  }

  clearGenreFocus() {
    if (!this.focusedGenre) return;
    this.focusedGenre = null;
    this.syncGenreFocus();
  }

  openGenre(name) {
    if (!name) return;
    if (window.pagesActions?.openGenre) {
      window.pagesActions.openGenre(name);
      return;
    }
    if (window.pagesActions?.playGenre) {
      window.pagesActions.playGenre(name);
      return;
    }
    this.ui.navigate("library");
  }

  syncCollections() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const wrap = root.querySelector("#homeCollectionsWrap");
    if (!wrap) return;

    wrap.innerHTML = this.renderCollectionsInner();
    wrap.classList.remove("hp-swap");
    void wrap.offsetWidth;
    wrap.classList.add("hp-swap");
  }

  bindLiveUpdates() {
    if (Home.liveBound) return;
    Home.liveBound = true;

    window.addEventListener("mybeats:recently-played", (e) => this.onRecentlyPlayed(e.detail?.song));
    window.addEventListener("mybeats:playback-change", () => this.syncNowPlaying());
    window.addEventListener("mybeats:favorites-changed", () => this.syncFavorites());
    window.addEventListener("mybeats:play-counts", () => this.syncMostPlayed());
    window.addEventListener("mybeats:library-changed", () => {
      this.discoverCache = null;
      this.discoverIndex = 0;
      if (this.isActive()) this.rebuildDiscoverCard();
    });
    window.addEventListener("mybeats:playlists-changed", () => {
      if (this.isActive()) this.syncCollections();
    });
  }

  isActive() {
    return this.ui.state.currentPage === "home" && !!this.getRoot();
  }

  onRecentlyPlayed(song) {
    if (!song || !this.isActive()) return;

    const resolved = this.ui.state.getSongById(song.id) || song;
    const list = this.getRoot().querySelector("#recentSongs");
    if (!list) return;

    list.querySelector(".hp-empty")?.remove();

    const selector = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector(selector);
    const kids = [...list.querySelectorAll(".song")];
    const tops = new Map(kids.map((k) => [k, k.getBoundingClientRect().top]));

    const animateSiblings = () => {
      kids.forEach((k) => {
        const delta = (tops.get(k) ?? 0) - k.getBoundingClientRect().top;
        if (!delta) return;
        k.style.transition = "none";
        k.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          k.style.transition = "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)";
          k.style.transform = "";
        });
      });
    };

    if (existing) {
      if (list.firstElementChild !== existing) {
        list.prepend(existing);
        animateSiblings();
      }
      existing.classList.remove("song-bump");
      void existing.offsetWidth;
      existing.classList.add("song-bump");
      setTimeout(() => existing.classList.remove("song-bump"), 900);
    } else {
      const tpl = document.createElement("template");
      tpl.innerHTML = this.renderSongRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add("song-enter");
      list.prepend(row);
      animateSiblings();
      this.hydrateSongRow(row);
      row.addEventListener("animationend", () => row.classList.remove("song-enter"), { once: true });
    }

    this.syncNowPlaying();

    const rows = [...list.querySelectorAll(".song")];
    rows.slice(this.recentLimit).forEach((row) => {
      row.classList.add("song-exit");
      row.addEventListener("animationend", () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400);
    });
  }

  syncNowPlaying() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    const id = this.ui.state.currentSong?.id;

    root
      .querySelectorAll(".song.is-playing, .rankItem.is-playing, .discoverSong.is-playing")
      .forEach((el) => el.classList.remove("is-playing"));

    if (id == null) return;

    const selector = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root
      .querySelectorAll(`.song${selector}, .rankItem${selector}, .discoverSong${selector}`)
      .forEach((el) => el.classList.add("is-playing"));
  }

  syncFavorites() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    const card = root.querySelector("#homeFavoritesCard");
    if (!card) return;

    card.innerHTML = this.renderFavoritesInner();
    card.classList.remove("hp-swap");
    void card.offsetWidth;
    card.classList.add("hp-swap");
  }

  syncMostPlayed() {
    if (!this.isActive()) return;

    const list = this.getRoot().querySelector("#mostPlayedSongs");
    if (!list) return;

    const entries = this.mostPlayedSongs();
    list.innerHTML = entries.length
      ? entries.map((e, i) => this.renderRankRow(e, i)).join("")
      : this.renderEmpty("Your most played songs will show up here once you start listening.");

    list.classList.remove("hp-swap");
    void list.offsetWidth;
    list.classList.add("hp-swap");
    this.syncNowPlaying();
  }

  handleCardFocus(e) {
    const root = this.getRoot();
    if (!root) return;

    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;

    const card = e.target.closest(".musicCard[data-card]");
    if (!card || !grid.contains(card)) {
      this.clearCardFocus();
      return;
    }

    if (card.classList.contains("is-card-focused")) {
      this.clearCardFocus();
      return;
    }

    grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
    card.classList.add("is-card-focused");
    grid.classList.add("has-card-focus");
  }

  clearCardFocus() {
    const root = this.getRoot();
    if (!root) return;

    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;

    grid.classList.remove("has-card-focus");
    grid.querySelectorAll(".musicCard.is-card-focused").forEach((c) => c.classList.remove("is-card-focused"));
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
    this._loadedAll = false;
    this._loadingPromise = null;
  }

  allSongs() {
    if (!window.MusicStore) return [];
    return Array.from(window.MusicStore.songCache.values());
  }

  allAlbums() {
    if (!window.MusicStore) return [];
    const state = this.ui.state;
    const albums = [];
    for (const album of window.MusicStore.albumCache.values()) {
      if (album._discographyOnly) continue;
      const totalSeconds = (album.songs || []).reduce((sum, song) => {
        const parts = String(song.duration || "0:0").split(":");
        return sum + (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      }, 0);

      const plays = (album.songs || []).reduce(
        (sum, song) => sum + (state.getPlayCount ? state.getPlayCount(song.id) : 0),
        0
      );

      albums.push({
        artistId: album.artistId,
        artistName: album.artistName,
        albumId: album.id,
        albumName: album.album,
        coverUrl: album.coverUrl,
        genre: (state.getArtistById?.(album.artistId)?.genre) || "",
        year: album.year || "",
        songs: album.songs || [],
        songCount: (album.songs || []).length,
        totalSeconds,
        plays,
      });
    }
    return albums;
  }

  allArtists() {
    if (!window.MusicStore) return [];
    const state = this.ui.state;
    const index = window.MusicStore.index || [];
    return index.map((entry) => {
      const full = window.MusicStore.artists[String(entry.id)];
      const albumCount = (full?.albums && full.albums.length) || entry.albumCount || 0;
      let songCount = 0;
      if (full?.albums) {
        songCount = full.albums.reduce((n, a) => n + (a.songCount || 0), 0);
      }
      return {
        id: entry.id,
        name: entry.artist,
        imageUrl: full?.imageUrl || window.MusicStore.portraitUrl(full?.portrait) || "",
        genre: entry.genre || "",
        albumCount,
        songCount,
        plays: full?.albums
          ? full.albums.reduce((sum, a) => {
              const album = window.MusicStore.albumCache.get(String(a.id));
              if (!album || album._discographyOnly) return sum;
              return sum + (album.songs || []).reduce(
                (m, song) => m + (state.getPlayCount ? state.getPlayCount(song.id) : 0),
                0
              );
            }, 0)
          : 0,
      };
    });
  }

  allGenres() {
    const map = new Map();
    this.allSongs().forEach((song) => {
      if (!song.genre) return;
      map.set(song.genre, (map.get(song.genre) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  minutes(totalSeconds) {
    if (!totalSeconds) return "";
    const m = Math.round(totalSeconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
  }

  esc(text) {
    return Utils.esc(text == null ? "" : String(text));
  }

  pipeline(items) {
    let out = [...items];
    const filter = this.filter;

    if (filter.type !== "all" && filter.value != null) {
      out = out.filter((item) => {
        if (filter.type === "artist") return String(item.artistId ?? item.id) === String(filter.value);
        if (filter.type === "genre") return (item.genre || "").toLowerCase() === String(filter.value).toLowerCase();
        if (filter.type === "year") return String(item.year || "") === String(filter.value);
        if (filter.type === "decade") return item.year && Math.floor(Number(item.year) / 10) * 10 === Number(filter.value);
        return true;
      });
    }

    if (this.query.trim()) {
      const q = this.query.trim().toLowerCase();
      out = out.filter((item) =>
        [item.title, item.albumName, item.name, item.album, item.artist, item.artistName, item.genre]
          .filter(Boolean)
          .some((text) => String(text).toLowerCase().includes(q))
      );
    }

    const by = {
      title: (a, b) =>
        String(a.title ?? a.albumName ?? a.name ?? "").localeCompare(String(b.title ?? b.albumName ?? b.name ?? "")),
      artist: (a, b) =>
        String(a.artist ?? a.artistName ?? a.name ?? "").localeCompare(String(b.artist ?? b.artistName ?? b.name ?? "")),
      yearDesc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
      yearAsc: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
      mostPlayed: (a, b) => (b.plays || 0) - (a.plays || 0),
    }[this.sort];

    if (by) out.sort(by);
    return out;
  }

  renderAlbumCard(album) {
    const isFav = this.ui.favorites.isAlbum(album.albumId);
    const playData = this.esc(JSON.stringify({ artistId: album.artistId, albumId: album.albumId }));

    const meta = [
      `${album.songCount} song${album.songCount === 1 ? "" : "s"}`,
      this.minutes(album.totalSeconds),
      album.plays ? `${album.plays} play${album.plays === 1 ? "" : "s"}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    return `
      <article class="albumCard" data-artist-id="${this.esc(album.artistId)}" data-album-id="${this.esc(album.albumId)}" tabindex="0" aria-label="${this.esc(album.albumName)}">
        <div class="albumArtwork">
          <img src="${this.esc(album.coverUrl || "")}" alt="${this.esc(album.albumName)}" loading="lazy">
          <button class="albumPlay" type="button" aria-label="Play ${this.esc(album.albumName)}" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">${album.year ? `<span class="albumBadge">${this.esc(album.year)}</span>` : ""}${album.genre ? `<span class="albumBadge albumBadgeGenre">${this.esc(album.genre)}</span>` : ""}</div>
            <div class="albumHoverBody"><h3 class="albumHoverTitle">${this.esc(album.albumName)}</h3><p class="albumHoverArtist">${this.esc(album.artistName)}</p><p class="albumHoverMeta">${meta}</p></div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
              <button type="button" class="albumHoverBtn${isFav ? " favorited" : ""}" aria-label="Favorite album" title="${isFav ? "Remove from favorites" : "Add to favorites"}" data-action="toggle-favorite-album" data-album-id="${this.esc(album.albumId)}"><i class="fa-solid fa-heart ${isFav ? "liked-icon" : "not-liked-icon"}"></i></button>
              <button type="button" class="albumHoverBtn" aria-label="Add to queue" title="Add to queue" data-action="add-album-to-queue" data-album-id="${this.esc(album.albumId)}">${Icons.general.plus(16)}</button>
              <button type="button" class="albumHoverBtn" aria-label="More options" title="More options" data-album-more data-artist-id="${this.esc(album.artistId)}" data-album-id="${this.esc(album.albumId)}">${Icons.general.moreVert(16)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderAlbumRow(album) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(album.artistId)}" data-album-id="${this.esc(album.albumId)}">
        <div class="rowArtwork"><img src="${this.esc(album.coverUrl || "")}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(album.albumName)}</span>
        <span class="rowSecondary">${this.esc(album.artistName)}</span>
        <span class="rowMeta">${album.year ? this.esc(album.year) + " • " : ""}${album.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play" data-play-album='${this.esc(JSON.stringify({ artistId: album.artistId, albumId: album.albumId }))}'>${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="More options" data-album-more data-artist-id="${this.esc(album.artistId)}" data-album-id="${this.esc(album.albumId)}">${Icons.general.moreVert(16)}</button>
        </div>
      </div>
    `;
  }

  renderArtistCard(artist) {
    return `
      <article class="artistCard" data-artist-id="${this.esc(artist.id)}">
        <div class="artistPortrait"><img src="${this.esc(artist.imageUrl || "")}" alt="${this.esc(artist.name)}" loading="lazy"></div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(artist.name)}</span>
          <p class="artistDetails">${artist.albumCount} album${artist.albumCount === 1 ? "" : "s"} • ${artist.songCount} song${artist.songCount === 1 ? "" : "s"}</p>
          <div class="artistActions"><button type="button" class="artistButton primary" data-artist-open="${this.esc(artist.id)}">View Artist</button><button type="button" class="artistButton" data-artist-play="${this.esc(artist.id)}">Play</button></div>
        </div>
      </article>
    `;
  }

  renderArtistRow(artist) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(artist.id)}">
        <div class="rowArtwork round"><img src="${this.esc(artist.imageUrl || "")}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(artist.name)}</span>
        <span class="rowSecondary">${this.esc(artist.genre || "Artist")}</span>
        <span class="rowMeta">${artist.albumCount} albums • ${artist.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play artist" data-artist-play="${this.esc(artist.id)}">${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="View artist" data-artist-open="${this.esc(artist.id)}">${Icons.general.arrowRight(14)}</button>
        </div>
      </div>
    `;
  }

  renderPlaylistCard(playlist) {
    const state = this.ui.state;
    const covers = playlist.songs
      .map((id) => state.getSongById(id))
      .filter(Boolean)
      .map((song) => song.coverUrl)
      .filter(Boolean);

    while (covers.length < 4 && covers.length) {
      covers.push(covers[covers.length % Math.max(covers.length, 1)] || "");
    }

    const isPlFav = this.ui?.favorites?.isPlaylist?.(playlist.id) || false;

    return `
      <article class="playlistCard" data-playlist-id="${this.esc(playlist.id)}">
        <button type="button" class="heart playlistCardHeart${isPlFav ? " favorited is-favorite" : ""}" data-heart-playlist="${this.esc(playlist.id)}" aria-label="Favorite playlist"></button>
        <div class="playlistMosaic">${
          covers
            .slice(0, 4)
            .map((cover) => `<img src="${this.esc(cover)}" alt="" loading="lazy">`)
            .join("") || `<div class="playlistMosaicEmpty">${Icons.general.playlist(28)}</div>`
        }</div>
        <div class="playlistInformation">
          <span class="playlistType">Playlist</span>
          <h3 class="playlistName">${this.esc(playlist.name)}</h3>
          ${playlist.description ? `<p class="playlistDescription">${this.esc(playlist.description)}</p>` : ""}
          <span class="playlistCount">${playlist.songs.length} song${playlist.songs.length === 1 ? "" : "s"}</span>
        </div>
      </article>
    `;
  }

  renderGenreCard(genre) {
    return `<article class="genreCard" data-genre="${this.esc(genre.name)}"><h3 class="genreName">${this.esc(genre.name)}</h3><p class="genreCount">${genre.count} song${genre.count === 1 ? "" : "s"}</p></article>`;
  }

  renderSongRow(song, index) {
    const isFav = this.ui.favorites.isSong(song.id);

    return `
      <tr data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId)}" data-album-id="${this.esc(song.albumId)}" data-context='${this.esc(JSON.stringify({ artistId: song.artistId, albumId: song.albumId }))}'>
        <td class="tableNum">${index + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(song.coverUrl || "")}" alt="" loading="lazy"></div>
            <div class="tableSongInformation"><span class="tableSongTitle">${this.esc(song.title)}</span><span class="tableSongArtist">${this.esc(song.artist)}</span></div>
          </div>
        </td>
        <td>${this.esc(song.album)}</td>
        <td>${this.esc(song.year || "-")}</td>
        <td>${this.esc(song.duration || "")}</td>
        <td>
          <div class="rowActions">
            <button type="button" class="tableAction heart${isFav ? " favorited is-favorite" : ""}" aria-label="Favorite" data-fav-song="${this.esc(song.id)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
            <button type="button" class="tableAction" aria-label="More options" data-more-song="${this.esc(song.id)}">${Icons.general.moreVert(16)}</button>
          </div>
        </td>
      </tr>
    `;
  }

  renderEmpty(title, description) {
    return `<div class="emptyState"><div class="emptyIcon">${Icons.general.search(34)}</div><h3 class="emptyTitle">${this.esc(title)}</h3><p class="emptyDescription">${this.esc(description)}</p></div>`;
  }

  renderSectionHead(title, sub) {
    return `<div class="resultsHeader"><div><h2 class="resultsTitle">${this.esc(title)}</h2><p class="resultsSubtitle">${this.esc(sub)}</p></div></div>`;
  }

  renderViewContent(view) {
    const state = this.ui.state;

    if (view === "songs") {
      const songs = this.pipeline(this.allSongs());
      if (!songs.length) return this.renderEmpty("No songs match", "Try clearing your search or filters.");
      return `<div class="songTableWrapper"><table class="songTable"><thead><tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr></thead><tbody>${songs.map((song, i) => this.renderSongRow(song, i)).join("")}</tbody></table></div>`;
    }

    if (view === "albums") {
      const albums = this.pipeline(this.allAlbums());
      if (!albums.length) return this.renderEmpty("No albums match", "Try clearing your search or filters.");
      return this.mode === "grid"
        ? `<div class="albumGrid">${albums.map((album) => this.renderAlbumCard(album)).join("")}</div>`
        : `<div class="rowsList">${albums.map((album) => this.renderAlbumRow(album)).join("")}</div>`;
    }

    if (view === "artists") {
      const artists = this.pipeline(this.allArtists());
      if (!artists.length) return this.renderEmpty("No artists match", "Try clearing your search or filters.");
      return this.mode === "grid"
        ? `<div class="artistGrid">${artists.map((artist) => this.renderArtistCard(artist)).join("")}</div>`
        : `<div class="rowsList">${artists.map((artist) => this.renderArtistRow(artist)).join("")}</div>`;
    }

    if (view === "playlists") {
      const playlists = (state.playlists || []).filter(
        (playlist) => !this.query.trim() || playlist.name.toLowerCase().includes(this.query.trim().toLowerCase())
      );
      if (!playlists.length) return this.renderEmpty("No playlists yet", "Create a playlist and it will show up here.");
      return `<div class="playlistGrid">${playlists.map((playlist) => this.renderPlaylistCard(playlist)).join("")}</div>`;
    }

    if (view === "genres") {
      const genres = this.pipeline(this.allGenres());
      if (!genres.length) return this.renderEmpty("No genres found", "Your library genres will appear here.");
      return `<div class="genreGrid">${genres.map((genre) => this.renderGenreCard(genre)).join("")}</div>`;
    }

    const albums = this.allAlbums();
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists())
      .sort((a, b) => b.songCount - a.songCount)
      .slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres().slice(0, 8);

    return `
      ${recentAlbums.length ? `<section>${this.renderSectionHead("Recently Added", "New additions to your collection.")}<div class="albumGrid">${recentAlbums.map((album) => this.renderAlbumCard(album)).join("")}</div></section>` : ""}
      ${artists.length ? `<section style="margin-top: 3rem">${this.renderSectionHead("Popular Artists", "Artists with the most music in your collection.")}<div class="artistGrid">${artists.map((artist) => this.renderArtistCard(artist)).join("")}</div></section>` : ""}
      ${playlists.length ? `<section style="margin-top: 3rem">${this.renderSectionHead("Explore Playlists", "Curated collections ready to explore.")}<div class="playlistGrid">${playlists.map((playlist) => this.renderPlaylistCard(playlist)).join("")}</div></section>` : ""}
      ${genres.length ? `<section style="margin-top: 3rem">${this.renderSectionHead("Browse by Genre", "Find something based on the mood.")}<div class="genreGrid">${genres.map((genre) => this.renderGenreCard(genre)).join("")}</div></section>` : ""}
    `;
  }

  countForView(view) {
    const state = this.ui.state;
    const fmt = (n) => `${n.toLocaleString()} item${n === 1 ? "" : "s"}`;

    switch (view) {
      case "songs":
        return fmt(this.pipeline(this.allSongs()).length);
      case "albums":
        return fmt(this.pipeline(this.allAlbums()).length);
      case "artists":
        return fmt(this.pipeline(this.allArtists()).length);
      case "playlists":
        return fmt((state.playlists || []).length);
      case "genres":
        return fmt(this.pipeline(this.allGenres()).length);
      default: {
        const total =
          this.allAlbums().length +
          this.allArtists().length +
          (state.playlists || []).length +
          this.allGenres().length;
        return fmt(total);
      }
    }
  }

  viewMeta(view) {
    return (
      {
        overview: ["Explore Your Collection", "A curated overview of your music."],
        songs: ["All Songs", "Every track in your library."],
        albums: ["All Albums", "Hover an album for the full story."],
        artists: ["All Artists", "The people behind your music."],
        playlists: ["All Playlists", "Your curated collections."],
        genres: ["All Genres", "Browse by mood and style."],
      }[view] || ["", ""]
    );
  }

  sortLabel() {
    return {
      recent: "Recently Added",
      title: "Title A-Z",
      artist: "Artist A-Z",
      yearDesc: "Newest First",
      yearAsc: "Oldest First",
      mostPlayed: "Most Played",
    }[this.sort];
  }

  render() {
    const tabs = [
      ["overview", "Overview"],
      ["songs", "Songs"],
      ["albums", "Albums"],
      ["artists", "Artists"],
      ["playlists", "Playlists"],
      ["genres", "Genres"],
    ];

    const filter = this.filter;

    const filterBtn = (type, label) => {
      const active = filter.type === type;
      return `<button type="button" class="filterButton${active ? " has-filter is-active" : ""}" data-filter="${type}">${active ? this.esc(filter.label) : label}<span class="filterArrow">${Icons.general.chevronDown()}</span></button>`;
    };

    const [title, sub] = this.viewMeta(this.view);

    const html = `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div><span class="browseKicker">Explore</span><h1 class="browseTitle">Browse Music</h1><p class="browseDescription">Explore songs, albums, artists, playlists, genres, and everything else in your music collection.</p></div>
            <div class="searchWrapper"><span class="searchIcon" aria-hidden="true">${Icons.general.search(16)}</span><input type="search" class="librarySearch" id="librarySearch" placeholder="Search songs, artists, albums, playlists..." autocomplete="off" value="${this.esc(this.query)}"></div>
            <nav class="browseNavigation" aria-label="Browse categories">${tabs
              .map(
                ([key, label]) =>
                  `<button class="browseTab${this.view === key ? " is-active" : ""}" type="button" data-view="${key}">${label}</button>`
              )
              .join("")}</nav>
            <div class="filterToolbar">
              <div class="filterGroup">
                <button type="button" class="filterButton${filter.type === "all" ? " is-active" : ""}" data-filter="all">All</button>
                ${filterBtn("artist", "Artist")}${filterBtn("genre", "Genre")}${filterBtn("year", "Year")}${filterBtn("decade", "Decade")}
              </div>
              <div class="displayControls">
                <button type="button" class="sortButton" data-action="sort">${this.sortLabel()}<span>${Icons.general.chevronDown()}</span></button>
                <div class="viewToggle" aria-label="Display mode">
                  <button type="button" class="viewButton${this.mode === "grid" ? " is-active" : ""}" aria-label="Grid view" data-view-mode="grid">${Icons.general.grid(15)}</button>
                  <button type="button" class="viewButton${this.mode === "list" ? " is-active" : ""}" aria-label="List view" data-view-mode="list">${Icons.general.list(15)}</button>
                </div>
              </div>
            </div>
          </header>
          <div class="resultsHeader" id="browseResultsHeader"><div><h2 class="resultsTitle">${title}</h2><p class="resultsSubtitle">${sub}</p></div><span class="resultsCount" id="browseResultsCount">${this.countForView(this.view)}</span></div>
          <section class="dynamicContent" id="browseContent" aria-live="polite">
            <div class="loadingLayer" id="loadingLayer" aria-hidden="false"><div class="loadingContent"><div class="loadingSpinner" aria-hidden="true"></div><div><div class="loadingTitle">Loading library...</div><p class="loadingDescription">Fetching tracks from the server.</p></div></div></div>
            <div class="contentSection" data-content-view="${this.view}"></div>
          </section>
        </div>
      </div>
    `;

    this.bindWhenReady();
    return html;
  }

  bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="library"].bp');
    if (root) {
      this.bindEvents(root);
      this.hydrateAll(root);
    } else if (attempts < 60) {
      setTimeout(() => this.bindWhenReady(attempts + 1), 50);
    }
  }

  async hydrateAll(root) {
    if (!root) return;
    if (!this._loadingPromise) {
      this._loadingPromise = (async () => {
        if (!this._loadedAll) {
          await window.MusicStore.loadAllSongs();
          this._loadedAll = true;
        }
      })();
    }
    await this._loadingPromise;
    const layer = root.querySelector("#loadingLayer");
    layer?.classList.add("is-hidden");
    this.refreshContent(false);
  }

  getRoot() {
    return document.querySelector('[data-page="library"].bp');
  }

  refreshContent(withLoading = false) {
    const root = this.getRoot();
    if (!root) return;

    const swap = () => {
      const section = root.querySelector(".contentSection");
      if (section) {
        section.dataset.contentView = this.view;
        section.innerHTML = this.renderViewContent(this.view);
      }

      const [title, sub] = this.viewMeta(this.view);
      const head = root.querySelector("#browseResultsHeader");
      if (head) {
        head.querySelector(".resultsTitle").textContent = title;
        head.querySelector(".resultsSubtitle").textContent = sub;
      }

      const count = root.querySelector("#browseResultsCount");
      if (count) count.textContent = this.countForView(this.view);

      root.querySelectorAll(".browseTab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === this.view));

      this.hydrate(root.querySelector("#browseContent"));
    };

    if (withLoading) {
      const layer = root.querySelector("#loadingLayer");
      layer?.classList.remove("is-hidden");
      setTimeout(() => {
        swap();
        layer?.classList.add("is-hidden");
      }, 200);
    } else {
      swap();
    }
  }

  hydrate(scope) {
    if (!scope) return;

    window.heartManager?.bindAll(scope);

    scope.querySelectorAll("[data-more-song]").forEach((el) => {
      if (el.moreBound) return;
      el.moreBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ui.events.showSongMenu(el.dataset.moreSong, e);
      });
    });

    scope.querySelectorAll("[data-play-album]").forEach((el) => {
      if (el.paBound) return;
      el.paBound = true;
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = await Utils.albumQueue(data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });

    scope.querySelectorAll('[data-action="add-album-to-queue"]').forEach((el) => {
      if (el.aqBound) return;
      el.aqBound = true;
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const state = this.ui.state;
        const albumId = el.dataset.albumId;
        const stub = state.getAlbumById(albumId);
        if (!stub) return;
        const album = await window.MusicStore.loadAlbum(stub.artistId, albumId).catch(() => null);
        if (!album?.songs?.length) return;

        const queue = await Utils.albumQueue(stub.artistId, albumId);
        const currentQueue = state.queue || [];
        state.queue = [...currentQueue, ...queue];

        if (state.currentSong) {
          state.queueIndex = state.queue.findIndex((s) => s.id == state.currentSong.id);
        }
        state.showToast?.(`Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`);
      });
    });
  }

  closeMenus() {
    this.getRoot()?.querySelectorAll(".filterMenu").forEach((menu) => menu.remove());
  }

  openMenu(anchorBtn, items, current, onSelect) {
    this.closeMenus();

    const root = this.getRoot();
    if (!root) return;

    const menu = document.createElement("div");
    menu.className = "filterMenu";
    menu.innerHTML = items
      .map(
        (item) =>
          `<button type="button" class="filterMenuItem${String(item.value) === String(current) ? " is-active" : ""}" data-value="${this.esc(item.value)}"><span>${this.esc(item.label)}</span>${item.count != null ? `<span class="count">${item.count}</span>` : ""}</button>`
      )
      .join("");

    root.appendChild(menu);

    const rect = anchorBtn.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    menu.style.top = `${rect.bottom - rootRect.top + root.scrollTop + 6}px`;
    menu.style.left = `${Math.max(8, rect.left - rootRect.left)}px`;

    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".filterMenuItem");
      if (!item) return;
      e.stopPropagation();
      onSelect(item.dataset.value);
      this.closeMenus();
    });

    setTimeout(() => {
      this.menuCloser = (e) => {
        if (!menu.contains(e.target)) this.closeMenus();
      };
      document.addEventListener("click", this.menuCloser, { once: true });
    }, 0);
  }

  openFilterMenu(btn, type) {
    const state = this.ui.state;
    let items = [];

    if (type === "artist") {
      items = this.allArtists()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((artist) => ({ value: artist.id, label: artist.name, count: artist.songCount }));
    } else if (type === "genre") {
      items = this.allGenres().map((genre) => ({ value: genre.name, label: genre.name, count: genre.count }));
    } else if (type === "year") {
      const years = [...new Set(this.allAlbums().map((album) => album.year).filter(Boolean))].sort().reverse();
      items = years.map((year) => ({ value: year, label: year }));
    } else if (type === "decade") {
      const decades = [
        ...new Set(
          this.allAlbums()
            .map((album) => album.year)
            .filter(Boolean)
            .map((year) => Math.floor(Number(year) / 10) * 10)
        ),
      ].sort((a, b) => b - a);
      items = decades.map((decade) => ({ value: decade, label: `${decade}s` }));
    }

    if (!items.length) {
      state.showToast?.("Nothing to filter by yet");
      return;
    }

    this.openMenu(btn, items, this.filter.type === type ? this.filter.value : null, (value) => {
      const item = items.find((i) => String(i.value) === String(value));
      this.filter = { type, value, label: item ? item.label : value };
      this.ui.render();
    });
  }

  openSortMenu(btn) {
    const items = [
      { value: "recent", label: "Recently Added" },
      { value: "title", label: "Title A-Z" },
      { value: "artist", label: "Artist A-Z" },
      { value: "yearDesc", label: "Newest First" },
      { value: "yearAsc", label: "Oldest First" },
      { value: "mostPlayed", label: "Most Played" },
    ];

    this.openMenu(btn, items, this.sort, (value) => {
      this.sort = value;
      this.ui.render();
    });
  }

  async playArtist(artistId) {
    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) return;

    const queues = await Promise.all(
      (artist.albums || []).map((album) => Utils.albumQueue(artistId, album.id))
    );
    const queue = queues.flat();
    if (queue.length) {
      this.ui.audioPlayer.playSong(queue[0], queue, true, "artist");
      this.ui.state.showToast?.(`Playing ${artist.artist}`);
    }
  }

  bindEvents(root) {
    if (!root || root.browseDelegated) return;
    root.browseDelegated = true;

    const ui = this.ui;

    root.addEventListener("click", async (e) => {
      const tab = e.target.closest(".browseTab");
      if (tab) {
        e.stopPropagation();
        if (tab.dataset.view !== this.view) {
          this.view = tab.dataset.view;
          this.refreshContent(true);
        }
        return;
      }

      const filterBtn = e.target.closest(".filterButton");
      if (filterBtn) {
        e.stopPropagation();
        const type = filterBtn.dataset.filter;
        if (type === "all") {
          if (this.filter.type !== "all") {
            this.filter = { type: "all", value: null, label: "" };
            ui.render();
          }
          return;
        }
        this.openFilterMenu(filterBtn, type);
        return;
      }

      if (e.target.closest('[data-action="sort"]')) {
        e.stopPropagation();
        this.openSortMenu(e.target.closest('[data-action="sort"]'));
        return;
      }

      const viewBtn = e.target.closest(".viewButton[data-view-mode]");
      if (viewBtn) {
        e.stopPropagation();
        if (viewBtn.dataset.viewMode !== this.mode) {
          this.mode = viewBtn.dataset.viewMode;
          root.querySelectorAll(".viewButton").forEach((b) => b.classList.toggle("is-active", b === viewBtn));
          this.refreshContent(false);
        }
        return;
      }

      const albumMore = e.target.closest("[data-album-more]");
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId,
        });
        return;
      }

      const artistPlay = e.target.closest("[data-artist-play]");
      if (artistPlay) {
        e.stopPropagation();
        this.playArtist(artistPlay.dataset.artistPlay);
        return;
      }

      const artistOpen = e.target.closest("[data-artist-open]");
      if (artistOpen) {
        e.stopPropagation();
        ui.navigate("artist", artistOpen.dataset.artistOpen);
        return;
      }

      const genre = e.target.closest(".genreCard[data-genre]");
      if (genre) {
        e.stopPropagation();
        if (window.pagesActions?.playGenre) window.pagesActions.playGenre(genre.dataset.genre);
        return;
      }

      const playlistCard = e.target.closest(".playlistCard[data-playlist-id]");
      if (playlistCard) {
        e.stopPropagation();
        const playlist = ui.state.playlists.find((p) => String(p.id) === String(playlistCard.dataset.playlistId));
        if (playlist) {
          ui.state.selectedPlaylistName = playlist.name;
          ui.state.selectedPlaylistId = playlist.id;
          ui.navigate("playlists");
        }
        return;
      }

      const songRow = e.target.closest("tr[data-song-id]");
      if (songRow) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        let song = ui.state.getSongById(songRow.dataset.songId);
        if (!song) {
          await window.MusicStore.loadAlbum(songRow.dataset.artistId, songRow.dataset.albumId).catch(() => null);
          song = ui.state.getSongById(songRow.dataset.songId);
        }
        if (!song) return;

        const queue = [...root.querySelectorAll("tr[data-song-id]")]
          .map((row) => ui.state.getSongById(row.dataset.songId))
          .filter(Boolean);

        ui.audioPlayer.playSong(song, queue.length ? queue : null, true, "library");
        return;
      }

      const rowItem = e.target.closest(".rowItem[data-artist-id]");
      if (rowItem) {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        ui.navigate("artist", rowItem.dataset.artistId, rowItem.dataset.albumId || null);
        return;
      }
    });

    const searchInput = root.querySelector("#librarySearch");
    if (searchInput && !searchInput.browseSearchBound) {
      searchInput.browseSearchBound = true;

      let timer;
      searchInput.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.query = searchInput.value;
          this.refreshContent(false);
        }, 160);
      });
    }
  }

  destroy() {}
}

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
      ${similarIds.length ? this.renderSimilarMarquee(rows, artist.id) : ""}
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

  renderSimilarMarquee(rows, artistId) {
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
    this.ui.router.updateTitle();
    this.ui.events.attachContentEvents();
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

      const spinner = new Spinner({
        container: pill,
        blur: 8,
        dim: 0.4,
        size: 18,
        minDuration: 250,
        delay: 60,
      });
      spinner.show();

      setTimeout(() => {
        window.uiManager?.events?.showArtistPopover(artistId, e);
        spinner.hide();
        setTimeout(() => spinner.remove(), 300);
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
        window.uiManager?.router?.switchAlbum(artistId, albumId);
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

    const pinTop = 56;
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

    const pinTop = 56;

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

  getRoot() {
    return document.querySelector('[data-page="artist"]');
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
