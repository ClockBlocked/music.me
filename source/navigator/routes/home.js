// /////////////////////////////////////////////////
// Home Page
// /////////////////////////////////////////////////
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

  buildSongs(state) {
    return window.pagesActions?.buildSongs() || [];
  }

  buildAlbums(state) {
    return window.pagesActions?.buildAlbums() || [];
  }

  buildGenres(state) {
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

  pickFeatured(state) {
    return this._featuredRelease || null;
  }

  getCounts(state) {
    const index = window.MusicStore?.index || [];
    return {
      songs: window.MusicStore?.songCache?.size || 0,
      albums: Array.from(window.MusicStore?.albumCache?.values() || []).filter((a) => !a._discographyOnly).length,
      artists: index.length,
      playlists: (state.playlists || []).length,
    };
  }

  getDiscoverArtists(state) {
    return this.discoverCache || [];
  }

  genreTile(genre) {
    const name = this.esc(genre.name);
    const count = genre.count;
    return `
      <button type="button" class="genreTile" data-genre="${name}" aria-label="Genre ${name}">
        <span class="genreTileArt" aria-hidden="true">${genre.coverUrl ? `<img src="${this.esc(genre.coverUrl)}" alt="" loading="lazy">` : ""}</span>
        <span class="genreTileBody"><span class="genreTileName">${name}</span><span class="genreTileCount">${count} artist${count === 1 ? "" : "s"}</span></span>
      </button>
    `;
  }

  async bootstrap() {
    if (this._bootstrapPromise) return this._bootstrapPromise;

    this._bootstrapPromise = (async () => {
      try {
        await Promise.all([
          this.bootstrapNewRelease(),
          this.bootstrapDiscover(),
          this.bootstrapRecent(),
          this.bootstrapMostPlayed(),
          this.bootstrapFavorites(),
        ]);
      } catch (e) {
        console.error("[Home.bootstrap] error:", e);
      } finally {
        this._bootstrapPromise = null;
      }
      this.refreshLoadedCards();
    })();

    return this._bootstrapPromise;
  }

  refreshLoadedCards() {
    this.patchCard("releases",     this.renderNewRelease(this._featuredRelease));
    this.patchCard("discover",     this.renderDiscover(this.ui.state));
    this.patchCard("recents",      this.renderRecentlyPlayed(this.getRecent(this.ui.state)));
    this.patchCard("most-played",  this.renderMostPlayed(this.getMostPlayed(this.ui.state)));
    this.patchCard("favorites",    this.renderFavoritesCard());
  }

  async bootstrapNewRelease() {
    if (this._featuredRelease) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const pick = this.shuffle(index)[0];
    const artist = await window.MusicStore.loadArtist(pick.id).catch(() => null);
    if (!artist?.albums?.length) return;

    const albumStub = this.shuffle(artist.albums)[0];
    const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
    if (!album) return;

    this._featuredRelease = {
      artistId: artist.id,
      artistName: artist.artist,
      albumId: album.id,
      albumName: album.album,
      coverUrl: album.coverUrl,
    };
  }

  async bootstrapDiscover() {
    if (Array.isArray(this.discoverCache) && this.discoverCache.length) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const picked = this.shuffle(index).slice(0, this.discoverArtistLimit);
    const artists = await Promise.all(
      picked.map((a) => window.MusicStore.loadArtist(a.id).catch(() => null))
    );

    const loaded = await Promise.all(artists.map(async (artist) => {
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
    }));

    this.discoverCache = loaded.filter(Boolean);
    this.discoverIndex = 0;
  }

  async bootstrapRecent() {
    const recent = (this.ui.state.recentlyPlayed || []).slice(0, this.recentLimit);
    if (!recent.length) return;

    const toLoad = new Map();
    for (const ref of recent) {
      if (window.MusicStore.songCache.has(String(ref.id))) continue;
      if (ref.artistId && ref.albumId) {
        toLoad.set(`${ref.artistId}/${ref.albumId}`, { a: ref.artistId, al: ref.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  async bootstrapMostPlayed() {
    const entries = this.getMostPlayed(this.ui.state);
    if (!entries.length) return;

    const toLoad = new Map();
    for (const { song } of entries) {
      if (!song) continue;
      if (window.MusicStore.songCache.has(String(song.id))) continue;
      if (song.artistId && song.albumId) {
        toLoad.set(`${song.artistId}/${song.albumId}`, { a: song.artistId, al: song.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  async bootstrapFavorites() {
    const state = this.ui.state;
    const toLoad = new Map();
    const scan = (arr) => {
      for (const f of arr || []) {
        if (typeof f === "object" && f.artistId && f.albumId &&
            !window.MusicStore.songCache.has(String(f.id))) {
          toLoad.set(`${f.artistId}/${f.albumId}`, { a: f.artistId, al: f.albumId });
        }
      }
    };
    scan(state.favoriteSongs);
    scan(state.favoriteAlbums);
    if (!toLoad.size) return;

    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  patchCard(cardKey, html) {
    if (!this.isActive()) {
      return;
    }
    const root = this.getRoot();
    if (!root) return;
    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;

    const existing = grid.querySelector(`[data-card="${cardKey}"]`);
    if (!html) { existing?.remove(); return; }

    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;

    fresh.classList.add("card-patched");
    fresh.addEventListener("animationend", () => fresh.classList.remove("card-patched"), { once: true });

    if (existing) {
      existing.replaceWith(fresh);
    } else {
      const ORDER = ["releases", "recents", "library", "most-played", "favorites", "discover", "collections", "genres"];
      const idx = ORDER.indexOf(cardKey);
      let inserted = false;
      for (const child of grid.children) {
        if (ORDER.indexOf(child.dataset.card) > idx) {
          grid.insertBefore(fresh, child);
          inserted = true;
          break;
        }
      }
      if (!inserted) grid.appendChild(fresh);
    }
    this.syncNowPlaying();
    window.heartManager?.bindAll(fresh);
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  getRecent(state) {
    return (state.recentlyPlayed || [])
      .slice(0, this.recentLimit)
      .map((song) => state.getSongById(song.id) || song)
      .filter(Boolean);
  }
  getMostPlayed(state) {
    const songs =
      typeof state.getMostPlayed === "function" ? state.getMostPlayed(this.mostPlayedLimit) : [];
    return songs.map((song) => ({
      song,
      plays: state.getPlayCount ? state.getPlayCount(song.id) : 0,
    }));
  }

  getFavSummary(state) {
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
  sectionIconDiscover() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M12.9 7.1 11.4 11.4 7.1 12.9 8.6 8.6z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }
  sectionIconCollections() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="6.5" width="11" height="11" rx="2.6" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><path d="M6 4.4h8.4A3.1 3.1 0 0 1 17.5 7.5V15" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  }
  sectionIconGenres() {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="2.5" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="2.5" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><rect x="11.1" y="11.1" width="6.4" height="6.4" rx="2" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/></svg>`;
  }
  musicNoteSvg(type) {
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

  sectionTitle({ icon, title, notes = [], action = "" }) {
    return `
      <div class="section-title-wrap">
        <span class="section-title-icon" aria-hidden="true">${icon}</span>
        <h2 class="section-title">${title}</h2>
        ${notes.length ? `<div class="section-title-notes" aria-hidden="true">${notes.join("")}</div>` : ""}
        ${action}
      </div>
    `;
  }

  actionButton(action, label) {
    return `<button type="button" class="cardAction" aria-label="${label}" data-action="${action}">${Icons.general.arrowRight(16)}</button>`;
  }
  emptyNote(text) {
    return `<div class="hp-empty">${this.esc(text)}</div>`;
  }

  renderHeader() {
    return `
      <header class="pageHeader heroIntro" style="--i:0">
        <div class="pageHeaderContent">
          <span class="pageKicker heroKicker"><span class="heroKickerDot" aria-hidden="true"></span>Your Music</span>
          <h1 class="pageTitle heroTitle">Music, right where you left it.</h1>
          <p class="pageDescription heroSub">Pick up where you left off, find something new, or settle back into your collection.</p>
          <div class="heroCtas">
            <button type="button" class="heroCta" data-nav="library">
              <span>View your library</span>
              ${Icons.general.arrowRight(16)}
            </button>
          </div>
        </div>
      </header>
    `;
  }

  async playFeatured() {
    const release = this._featuredRelease;
    if (!release) return;
    const album = await window.MusicStore.loadAlbum(release.artistId, release.albumId).catch(() => null);
    const songs = (album?.songs || [])
      .map((s) => window.MusicStore.songCache.get(String(s.id)) || s)
      .filter(Boolean);
    if (songs.length) this.ui.audioPlayer.playSong(songs[0], songs, true, "home");
  }

  // ----------------------------------------------
  // Discover
  // ----------------------------------------------

  discoverSongRow(song, index) {
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
  discoverArtistCard(artist) {
    const name = this.esc(artist.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(artist.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(artist.imageUrl || "")}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta"><span class="discoverArtistName">${name}</span><span class="discoverArtistGenre">${this.esc(artist.genre || "Artist")}</span></div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(artist.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${artist.songs.map((s, i) => this.discoverSongRow(s, i)).join("")}</div>
      </div>
    `;
  }
  discoverNav(index, total) {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? "disabled" : ""}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? "disabled" : ""}>${this.iconChevronRight(16)}</button>
      </div>
    `;
  }

  renderDiscover(state) {
    const artists = this.getDiscoverArtists(state);
    if (!artists.length) return "";

    let index = Number.isFinite(this.discoverIndex) ? this.discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this.discoverIndex = index;

    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.sectionTitle({
          icon: this.sectionIconDiscover(),
          title: "Discover",
          notes: [this.musicNoteSvg(2)],
          action: this.discoverNav(index, artists.length),
        })}
        <div class="discoverViewport"><div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.discoverArtistCard(a)).join("")}</div></div>
      </article>
    `;
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

  // ----------------------------------------------
  // Genres
  // ----------------------------------------------

  renderGenres(state) {
    const genres = this.buildGenres(state).slice(0, this.genreLimit);
    if (!genres.length) return "";

    const tiles = genres.map((g) => this.genreTile(g)).join("");

    return `
      <section class="homeGenres" aria-label="Browse by genre">
        ${this.sectionTitle({
          icon: this.sectionIconGenres(),
          title: "Genres",
          notes: [this.musicNoteSvg(2), this.musicNoteSvg(4)],
          action: this.actionButton("open-library", "Open library"),
        })}
        <div class="genreMarquee" data-genre-marquee><div class="genreMarqueeTrack">${tiles}${tiles}</div></div>
      </section>
    `;
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

  // ----------------------------------------------
  // Collections
  // ----------------------------------------------
  collectionCard(playlist, index, state) {
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
  collectionsInner(state) {
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length) {
      return this.emptyNote("No collections yet - create a playlist and it will show up here.");
    }
    return `<div class="collectionGrid">${playlists.map((pl, i) => this.collectionCard(pl, i, state)).join("")}</div>`;
  }
  renderCollections(state) {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.sectionTitle({
          icon: this.sectionIconCollections(),
          title: "Collections",
          notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)],
          action: this.actionButton("open-playlists", "Open all collections"),
        })}
        <div class="cardContent" id="homeCollectionsWrap">${this.collectionsInner(state)}</div>
      </article>
    `;
  }
  syncCollections() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const wrap = root.querySelector("#homeCollectionsWrap");
    if (!wrap) return;

    wrap.innerHTML = this.collectionsInner(this.ui.state);
    wrap.classList.remove("hp-swap");
    void wrap.offsetWidth;
    wrap.classList.add("hp-swap");
  }

  // ----------------------------------------------
  // Rows / cards
  // ----------------------------------------------
  songRow(song) {
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
  rankRow(entry, index) {
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

  // ----------------------------------------------
  // Section renderers
  // ----------------------------------------------
  renderRecentlyPlayed(recent) {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        <div class="rpHeader">
          <div class="rpHeaderText">
            <span class="rpKicker">Your Listening</span>
            <h2 class="rpTitle">Recently played</h2>
          </div>
          <button type="button" class="rpHistoryChip" data-action="view-recents" aria-label="View listening history">History</button>
        </div>
        <div class="cardContent"><div class="songList" id="recentSongs" aria-label="Recently played songs">${recent.length ? recent.map((s) => this.songRow(s)).join("") : this.recentsEmptyState()}</div></div>
        <div class="rpFoot">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>Listening history stays in your library</span>
        </div>
      </article>
    `;
  }

  recentsEmptyState() {
    return `
      <div class="recentsEmpty">
        <span class="recentsEmptyIcon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/></svg>
        </span>
        <p class="recentsEmptyTitle">Your next favorite starts here.</p>
        <p class="recentsEmptySub">Play an album or track and it will appear in your listening history.</p>
        ${this._featuredRelease ? `<button type="button" class="heroGhostBtn recentsEmptyCta" data-action="play-featured">Play featured album</button>` : ""}
      </div>
    `;
  }
  renderNewRelease(release) {
    if (!release) return "";

    const playData = this.esc(JSON.stringify({ artistId: release.artistId, albumId: release.albumId }));
    const isFav = this.ui.favorites?.isAlbum?.(release.albumId) ?? false;

    return `
      <article class="musicCard releasesCard heroCard" data-card="releases" data-artist-id="${this.esc(release.artistId)}" data-album-id="${this.esc(release.albumId)}">
        <div class="heroMedia">
          <img class="heroBg" src="${this.esc(release.coverUrl)}" alt="${this.esc(release.albumName)}" loading="lazy">
          <span class="heroShade" aria-hidden="true"></span>

          <span class="heroPill">Featured Album</span>
          <button type="button" class="heroHeart${isFav ? " is-favorite" : ""}" aria-label="Favorite album" data-action="toggle-favorite-album" data-album-id="${this.esc(release.albumId)}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>

          <div class="heroOverlay">
            <span class="heroKicker2">A Familiar Favorite</span>
            <h3 class="heroTitle2">${this.esc(release.albumName)}</h3>
            <p class="heroSub2">${this.esc(release.artistName)}<span class="heroDotSep" aria-hidden="true">·</span>Album</p>
            <div class="heroActions">
              <button type="button" class="heroPlayBtn" aria-label="Play album" data-play-album='${playData}'>
                ${Icons.player.play(15)}
                <span>Play album</span>
              </button>
              <button type="button" class="heroGhostBtn" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.esc(release.albumId)}">
                ${Icons.general.plus(15)}
                <span>Add to queue</span>
              </button>
              <button type="button" class="heroMoreBtn" aria-label="More album options" data-release-more data-artist-id="${this.esc(release.artistId)}" data-album-id="${this.esc(release.albumId)}">${Icons.general.moreVert(18)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }
  renderMostPlayed(mostPlayed) {
    return `
      <article class="musicCard mostPlayed" data-card="most-played">
        ${this.sectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`,
          title: "Most Played",
          notes: [this.musicNoteSvg(1)],
          action: this.actionButton("view-most-played", "View most played"),
        })}
        <div class="cardContent"><div class="rankList" id="mostPlayedSongs">${mostPlayed.length ? mostPlayed.map((e, i) => this.rankRow(e, i)).join("") : this.emptyNote("Your most played songs will show up here once you start listening.")}</div></div>
      </article>
    `;
  }
  renderLibraryCard(counts) {
    const rows = [
      {
        key: "albums",
        name: "Albums",
        desc: "Your saved records",
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>`,
      },
      {
        key: "playlists",
        name: "Playlists",
        desc: "Soundtracks for every mood",
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>`,
      },
      {
        key: "artists",
        name: "Favorite artists",
        desc: "The voices you keep close",
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
      },
    ];

    return `
      <section class="musicCard madePersonal" data-card="library" aria-label="Your collection">
        <div class="mpHeader">
          <span class="mpKicker">Made Personal</span>
          <h2 class="mpTitle">Your collection, in good company.</h2>
          <p class="mpSub">The albums, playlists, and artists you return to—easy to find, ready when you are.</p>
        </div>
        <div class="mpRows">
          ${rows
            .map(
              (row) => `
            <button type="button" class="mpRow" data-library="${row.key}" aria-label="Open ${row.name}">
              <span class="mpIcon" aria-hidden="true">${row.icon}</span>
              <span class="mpMeta">
                <span class="mpName">${row.name}</span>
                <span class="mpDesc">${row.desc}</span>
              </span>
              <span class="mpChevron" aria-hidden="true">${this.iconChevronRight(18)}</span>
            </button>`
            )
            .join("")}
        </div>
      </section>
    `;
  }

  // ----------------------------------------------
  // Favorites card
  // ----------------------------------------------
  favoritesCardInner() {
    const favorites = this.getFavSummary(this.ui.state);
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
        ${this.sectionTitle({
          icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`,
          title: "Favorites",
          notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)],
          action: this.actionButton("view-favorites", "View favorites"),
        })}
        <div class="favoriteContent" id="homeFavoritesCard">${this.favoritesCardInner()}</div>
      </article>
    `;
  }

  // ----------------------------------------------
  // Main render
  // ----------------------------------------------
  render() {
    const state = this.ui.state;
    this.focusedGenre = null;
    this.clearCardFocus();

    if (!Array.isArray(this.discoverCache)) this.discoverCache = null;

    const cards = [
      this.renderNewRelease(this.pickFeatured(state)),
      this.renderRecentlyPlayed(this.getRecent(state)),
      this.renderLibraryCard(this.getCounts(state)),
      this.renderMostPlayed(this.getMostPlayed(state)),
      this.renderFavoritesCard(),
      this.renderDiscover(state),
      this.renderCollections(state),
      this.renderGenres(state),
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

  // ----------------------------------------------
  // Binding
  // ----------------------------------------------
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

    if (!root || root.homeDelegated) return;
    root.homeDelegated = true;

    root.addEventListener("click", (e) => {
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
        ui.contentEvents.showSongMenu(moreBtn.dataset.moreSong, e);
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
        this.ui.libraryPage?.playArtist(artistPlay.dataset.artistPlay);
        return;
      }

      const artistOpen = e.target.closest("[data-artist-open]");
      if (artistOpen) {
        e.stopPropagation();
        this.ui.navigate("artist", artistOpen.dataset.artistOpen);
        return;
      }

      const dRefresh = e.target.closest("[data-discover-refresh]");
      if (dRefresh) {
        e.stopPropagation();
        this.discoverCache = null;
        this.discoverIndex = 0;
        this.rebuildDiscoverCard();
        return;
      }

      const dPrev = e.target.closest("[data-discover-prev]");
      if (dPrev) {
        e.stopPropagation();
        if (!dPrev.disabled) this.moveDiscover(-1);
        return;
      }

      const dNext = e.target.closest("[data-discover-next]");
      if (dNext) {
        e.stopPropagation();
        if (!dNext.disabled) this.moveDiscover(1);
        return;
      }

      const dSong = e.target.closest(".discoverSong[data-song-id]");
      if (dSong) {
        e.stopPropagation();
        const song = state.getSongById(dSong.dataset.songId);
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

      const plPlay = e.target.closest("[data-playlist-play]");
      if (plPlay) {
        e.stopPropagation();
        const id = plPlay.dataset.playlistPlay;
        const playlist = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = playlist
          ? (playlist.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean)
          : [];
        if (songs.length) ui.audioPlayer.playSong(songs[0], songs, true, "home");
        return;
      }

      const plShuffle = e.target.closest("[data-playlist-shuffle]");
      if (plShuffle) {
        e.stopPropagation();
        const id = plShuffle.dataset.playlistShuffle;
        const playlist = (state.playlists || []).find((p) => String(p.id) === String(id));
        const songs = playlist
          ? (playlist.songs || []).map((sid) => state.getSongById(sid)).filter(Boolean)
          : [];
        const shuffled = this.shuffle(songs);
        if (shuffled.length) ui.audioPlayer.playSong(shuffled[0], shuffled, true, "home");
        return;
      }

      const plMore = e.target.closest("[data-playlist-more]");
      if (plMore) {
        e.stopPropagation();
        const id = plMore.dataset.playlistMore;
        if (typeof ui.openMoreMenu === "function") ui.openMoreMenu(e, "playlist", id);
        else if (typeof ui.playlistsPage?.showMenu === "function") ui.playlistsPage.showMenu(e, id);
        else if (window.contextMenu?.show) window.contextMenu.show(e.clientX, e.clientY, { playlistId: id });
        return;
      }

      const playFeaturedBtn = e.target.closest('[data-action="play-featured"]');
      if (playFeaturedBtn) {
        e.stopPropagation();
        this.playFeatured();
        return;
      }

      const playAlbumBtn = e.target.closest("[data-play-album]");
      if (playAlbumBtn) {
        e.stopPropagation();
        try {
          const data = JSON.parse(playAlbumBtn.dataset.playAlbum);
          Utils.albumQueue(data.artistId, data.albumId).then((queue) => {
            if (queue.length) ui.audioPlayer.playSong(queue[0], queue, true, "album");
          });
        } catch {}
        return;
      }

      const navBtn = e.target.closest("[data-nav], .cardAction[data-action], .rpHistoryChip[data-action]");
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

      const libItem = e.target.closest(".libraryItem[data-library], .mpRow[data-library]");
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
            ui.playlistsPage?.viewPlaylist?.(name);
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
    });

    root.addEventListener("keydown", (e) => {
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
          this.ui.playlistsPage?.viewPlaylist?.(name);
        } catch {}
      }, 60);
    });

    this.bootstrap();
  }
  hydrateRow(row) {
    const songId = row.dataset.songId;

    const heart = row.querySelector("[data-fav-song]");
    if (heart) this.ui.contentEvents.setupHeartButton(heart, "song", heart.dataset.favSong);

    const more = row.querySelector("[data-more-song]");
    if (more && !more.homeMoreBound) {
      more.homeMoreBound = true;
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(songId, e);
      });
    }
  }

  // ----------------------------------------------
  // Live updates
  // ----------------------------------------------
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
    list.querySelector(".recentsEmpty")?.remove();

    const sel = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector(sel);
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
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add("song-enter");
      list.prepend(row);
      animateSiblings();
      this.hydrateRow(row);
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

    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root
      .querySelectorAll(`.song${sel}, .rankItem${sel}, .discoverSong${sel}`)
      .forEach((el) => el.classList.add("is-playing"));
  }
  syncFavorites() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    const card = root.querySelector("#homeFavoritesCard");
    if (!card) return;

    card.innerHTML = this.favoritesCardInner();
    card.classList.remove("hp-swap");
    void card.offsetWidth;
    card.classList.add("hp-swap");
  }
  syncMostPlayed() {
    if (!this.isActive()) return;

    const list = this.getRoot().querySelector("#mostPlayedSongs");
    if (!list) return;

    const entries = this.getMostPlayed(this.ui.state);
    list.innerHTML = entries.length
      ? entries.map((e, i) => this.rankRow(e, i)).join("")
      : this.emptyNote("Your most played songs will show up here once you start listening.");

    list.classList.remove("hp-swap");
    void list.offsetWidth;
    list.classList.add("hp-swap");
    this.syncNowPlaying();
  }

  // ----------------------------------------------
  // Card focus
  // ----------------------------------------------
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

window.Home = Home;
