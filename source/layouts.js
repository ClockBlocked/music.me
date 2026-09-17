




class Home {
  constructor(ui) {
    this.ui = ui;
    this.RECENT_LIMIT = 15;
    this.MOST_PLAYED_LIMIT = 3;
    this.DISCOVER_ARTIST_LIMIT = 5;
    this.DISCOVER_SONGS_PER_ARTIST = 3;
    this.GENRE_LIMIT = 14;
    this._discoverIndex = 0;
    this._discoverCache = null;
    this._focusedGenre = null;
    this._bindLiveUpdates();
  }

  buildSongs(state) {
    return state.enrichedLibrary.flatMap((artist) =>
      artist.albums.flatMap((album) =>
        album.songs.map((song) => ({
          ...song,
          artistId: artist.id,
          albumId: album.id,
          artist: artist.artist,
          album: album.album,
          coverUrl: album.coverUrl,
          artistImageUrl: artist.imageUrl,
          genre: artist.genre || '',
        })),
      ),
    );
  }

  buildAlbums(state) {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.map((alb) => ({
        artistId: a.id,
        artistName: a.artist,
        albumId: alb.id,
        albumName: alb.album,
        coverUrl: alb.coverUrl,
        genre: a.genre || '',
        year: alb.year || '2024',
        songCount: alb.songs.length,
        songs: alb.songs,
      })),
    );
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  pickFeatured(state) {
    const albums = this.buildAlbums(state).filter((a) => a.coverUrl);
    if (!albums.length) return null;
    return this.shuffle(albums)[0];
  }

  getRecent(state) {
    return (state.recentlyPlayed || [])
      .slice(0, this.RECENT_LIMIT)
      .map((s) => state.getSongById(s.id) || s)
      .filter(Boolean);
  }

  getMostPlayed(state) {
    const songs =
      typeof state.getMostPlayed === 'function'
        ? state.getMostPlayed(this.MOST_PLAYED_LIMIT)
        : [];
    return songs.map((s) => ({
      song: s,
      plays: state.getPlayCount ? state.getPlayCount(s.id) : 0,
    }));
  }

  getCounts(state) {
    return {
      songs: this.buildSongs(state).length,
      albums: this.buildAlbums(state).length,
      artists: state.enrichedLibrary.length,
      playlists: (state.playlists || []).length,
    };
  }

  getFavSummary(state) {
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;
    let coverUrl = '';
    const latestSongId = [...(state.favoriteSongs || [])].pop();
    const latestSong =
      latestSongId != null ? state.getSongById(latestSongId) : null;
    if (latestSong?.coverUrl) coverUrl = latestSong.coverUrl;
    else {
      const latestAlbumId = [...(state.favoriteAlbums || [])].pop();
      const latestAlbum =
        latestAlbumId != null ? state.getAlbumById(latestAlbumId) : null;
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

  _getDiscoverArtists(state) {
    if (this._discoverCache && this._discoverCache.length)
      return this._discoverCache;
    let songs = [];
    try {
      songs = this.buildSongs(state);
    } catch {
      songs = [];
    }
    const byArtist = new Map();
    songs.forEach((s) => {
      if (s == null || s.artistId == null) return;
      const key = String(s.artistId);
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key).push(s);
    });
    const pool = [...byArtist.values()].filter((list) => list.length > 0);
    if (!pool.length) {
      this._discoverCache = [];
      return this._discoverCache;
    }
    const picked = this.shuffle(pool).slice(0, this.DISCOVER_ARTIST_LIMIT);
    this._discoverCache = picked.map((list) => {
      const first = list[0];
      const sample = this.shuffle(list).slice(
        0,
        this.DISCOVER_SONGS_PER_ARTIST,
      );
      return {
        artistId: first.artistId,
        artistName: first.artist || 'Unknown Artist',
        genre: first.genre || '',
        imageUrl: first.artistImageUrl || first.coverUrl || '',
        songs: sample,
      };
    });
    return this._discoverCache;
  }

  discoverSongRow(s, i) {
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    const album = this.esc(s.album || '');
    return `
      <button type="button" class="discoverSong${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}" aria-label="Play ${title}">
        <span class="discoverSongIndex" aria-hidden="true">${i + 1}</span>
        <span class="discoverSongArt" aria-hidden="true"><img src="${this.esc(s.coverUrl || '')}" alt="" loading="lazy"></span>
        <span class="discoverSongInfo"><span class="discoverSongTitle">${title}</span><span class="discoverSongAlbum">${album}</span></span>
        <span class="discoverSongPlay" aria-hidden="true">${Icons.player.play(14)}</span>
      </button>
    `;
  }

  discoverArtistCard(a) {
    const name = this.esc(a.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(a.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(a.imageUrl || '')}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta"><span class="discoverArtistName">${name}</span><span class="discoverArtistGenre">${this.esc(a.genre || 'Artist')}</span></div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(a.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${a.songs.map((s, i) => this.discoverSongRow(s, i)).join('')}</div>
      </div>
    `;
  }

  discoverNav(index, total) {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? 'disabled' : ''}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? 'disabled' : ''}>${this.iconChevronRight(16)}</button>
      </div>
    `;
  }

  renderDiscover(state) {
    const artists = this._getDiscoverArtists(state);
    if (!artists.length) return '';
    let index = Number.isFinite(this._discoverIndex) ? this._discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this._discoverIndex = index;
    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.sectionTitle({
      icon: this.sectionIconDiscover(),
      title: 'Discover',
      notes: [this.musicNoteSvg(2)],
      action: this.discoverNav(index, artists.length)
    })}
        <div class="discoverViewport"><div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.discoverArtistCard(a)).join('')}</div></div>
      </article>
    `;
  }

  _moveDiscover(delta) {
    const artists = this._discoverCache || [];
    if (!artists.length) return;
    const current = Math.max(
      0,
      Math.min(artists.length - 1, this._discoverIndex || 0),
    );
    const next = Math.max(0, Math.min(artists.length - 1, current + delta));
    if (next === current) return;
    this._discoverIndex = next;
    this._syncDiscover();
  }

  _syncDiscover() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const track = root.querySelector('.discoverTrack');
    if (!track) return;
    const total = track.children.length;
    if (!total) return;
    const index = Math.max(0, Math.min(total - 1, this._discoverIndex || 0));
    this._discoverIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    const prev = root.querySelector('[data-discover-prev]');
    const next = root.querySelector('[data-discover-next]');
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= total - 1;
    const counter = root.querySelector('[data-discover-counter]');
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }

  _rebuildDiscoverCard() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const card = root.querySelector('[data-card="discover"]');
    const html = this.renderDiscover(this.ui.state);
    if (!card) {
      if (!html) return;
      const grid = root.querySelector('.bentoGrid');
      if (!grid) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      if (fresh) grid.appendChild(fresh);
      this._syncNowPlaying();
      return;
    }
    if (!html) {
      card.remove();
      return;
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;
    card.replaceWith(fresh);
    this._syncNowPlaying();
  }

  buildGenres(state) {
    let songs = [];
    try {
      songs = this.buildSongs(state);
    } catch {
      songs = [];
    }
    const map = new Map();
    songs.forEach((s) => {
      const name = (s.genre || '').trim();
      if (!name) return;
      if (!map.has(name))
        map.set(name, { name, count: 0, coverUrl: s.coverUrl || '' });
      const entry = map.get(name);
      entry.count += 1;
      if (!entry.coverUrl && s.coverUrl) entry.coverUrl = s.coverUrl;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  genreTile(g) {
    const name = this.esc(g.name);
    const count = g.count;
    return `
      <button type="button" class="genreTile" data-genre="${name}" aria-label="Genre ${name}">
        <span class="genreTileArt" aria-hidden="true">${g.coverUrl ? `<img src="${this.esc(g.coverUrl)}" alt="" loading="lazy">` : ''}</span>
        <span class="genreTileBody"><span class="genreTileName">${name}</span><span class="genreTileCount">${count} song${count === 1 ? '' : 's'}</span></span>
      </button>
    `;
  }

  renderGenres(state) {
    const genres = this.buildGenres(state).slice(0, this.GENRE_LIMIT);
    if (!genres.length) return '';
    const tiles = genres.map((g) => this.genreTile(g)).join('');
    return `
      <section class="homeGenres" aria-label="Browse by genre">
        ${this.sectionTitle({
      icon: this.sectionIconGenres(),
      title: 'Genres',
      notes: [this.musicNoteSvg(2), this.musicNoteSvg(4)],
      action: this.actionButton('open-library', 'Open library')
    })}
        <div class="genreMarquee" data-genre-marquee><div class="genreMarqueeTrack">${tiles}${tiles}</div></div>
      </section>
    `;
  }

  _syncGenreFocus() {
    const root = this._root();
    if (!root) return;
    const marquee = root.querySelector('[data-genre-marquee]');
    if (!marquee) return;
    const focused = this._focusedGenre;
    marquee.classList.toggle('has-focus', !!focused);
    marquee.querySelectorAll('.genreTile').forEach((tile) => {
      const isFocus = !!focused && tile.dataset.genre === focused;
      tile.classList.toggle('is-focused', isFocus);
      tile.setAttribute('aria-pressed', isFocus ? 'true' : 'false');
    });
  }

  _clearGenreFocus() {
    if (!this._focusedGenre) return;
    this._focusedGenre = null;
    this._syncGenreFocus();
  }

  _openGenre(name) {
    if (!name) return;
    if (window.pagesActions?.openGenre) {
      window.pagesActions.openGenre(name);
      return;
    }
    if (window.pagesActions?.playGenre) {
      window.pagesActions.playGenre(name);
      return;
    }
    this.ui.navigate('library');
  }

  collectionCard(pl, i, state) {
    const songs = (pl.songs || [])
      .map((id) =>
        typeof state.getSongById === 'function' ? state.getSongById(id) : null,
      )
      .filter(Boolean);
    const covers = songs.map((s) => s.coverUrl).filter(Boolean);
    const uniqueCovers = [...new Set(covers)];
    let art = '';
    if (uniqueCovers.length >= 4)
      art = `<div class="collectionMosaic">${uniqueCovers
        .slice(0, 4)
        .map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`)
        .join('')}</div>`;
    else if (uniqueCovers.length >= 1)
      art = `<img src="${this.esc(uniqueCovers[0])}" alt="" loading="lazy">`;
    else
      art = `<div class="collectionEmpty">${Icons.general.playlistAdd(30)}</div>`;
    const name = this.esc(pl.name);
    const count = songs.length;
    return `
      <div class="collection-card" data-playlist-id="${this.esc(pl.id)}" data-playlist-name="${name}" role="button" tabindex="0" aria-label="Open collection ${name}">
        <div class="imgBx">${art}</div>
        <div class="content">
          <div class="contentBx"><h3>${name}<br><span>${count} song${count === 1 ? '' : 's'}</span></h3></div>
          <ul class="sci">
            <li style="--i:1"><button type="button" class="icon-btn" data-playlist-play="${this.esc(pl.id)}" aria-label="Play collection">${Icons.player.play(18)}</button></li>
            <li style="--i:2"><button type="button" class="icon-btn" data-playlist-shuffle="${this.esc(pl.id)}" aria-label="Shuffle collection">${this.iconShuffle(18)}</button></li>
            <li style="--i:3"><button type="button" class="icon-btn" data-playlist-more="${this.esc(pl.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button></li>
          </ul>
        </div>
      </div>
    `;
  }

  collectionsInner(state) {
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length)
      return this.emptyNote(
        'No collections yet — create a playlist and it will show up here.',
      );
    return `<div class="collectionGrid">${playlists.map((pl, i) => this.collectionCard(pl, i, state)).join('')}</div>`;
  }

  renderCollections(state) {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.sectionTitle({
      icon: this.sectionIconCollections(),
      title: 'Collections',
      notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)],
      action: this.actionButton('open-playlists', 'Open all collections')
    })}
        <div class="cardContent" id="homeCollectionsWrap">${this.collectionsInner(state)}</div>
      </article>
    `;
  }

  _syncCollections() {
    if (!this._isActive()) return;
    const root = this._root();
    if (!root) return;
    const wrap = root.querySelector('#homeCollectionsWrap');
    if (!wrap) return;
    wrap.innerHTML = this.collectionsInner(this.ui.state);
    wrap.classList.remove('hp-swap');
    void wrap.offsetWidth;
    wrap.classList.add('hp-swap');
  }

  songRow(s) {
    const isFav = this.ui.favorites.isSong(s.id);
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    return `
      <article class="song${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}">
        <div class="songArtwork">
          <img src="${this.esc(s.coverUrl || '')}" alt="${title}" loading="lazy">
          <button type="button" class="songArtworkOverlay" aria-label="Play ${title}" data-action="play"><span class="playIcon" aria-hidden="true">${Icons.player.play(13)}</span></button>
        </div>
        <div class="songInformation">
          <span class="songArtist">${this.esc(s.artist || 'Unknown Artist')}</span>
          <span class="songTitle">${title}</span>
          <div class="songMeta"><span class="songAlbum">${this.esc(s.album || '')}</span><span aria-hidden="true">&bull;</span><span class="songDuration">${this.esc(s.duration || '')}</span></div>
        </div>
        <div class="songActions">
          <button type="button" class="songAction favorite${isFav ? ' is-favorite favorited' : ''}" aria-label="Favorite song" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus('song', isFav, false, null)}</button>
          <button type="button" class="songAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(18)}</button>
        </div>
      </article>
    `;
  }

  rankRow(entry, index) {
    const s = entry.song;
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.esc(s.title || 'Unknown Title');
    const plays = entry.plays;
    return `
      <article class="rankItem${isPlaying ? ' is-playing' : ''}" data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId ?? '')}" data-album-id="${this.esc(s.albumId ?? '')}">
        <span class="rankNumber">${String(index + 1).padStart(2, '0')}</span>
        <div class="rankArtwork"><img src="${this.esc(s.coverUrl || '')}" alt="${title}" loading="lazy"></div>
        <div class="rankInformation"><span class="rankTitle">${title}</span><span class="rankSubtitle">${this.esc(s.artist || 'Unknown Artist')}</span></div>
        <span class="rankCount">${plays} play${plays === 1 ? '' : 's'}</span>
      </article>
    `;
  }

  emptyNote(text) {
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

  sectionTitle({ icon, title, notes = [], action = '' }) {
    return `
      <div class="section-title-wrap">
        <span class="section-title-icon" aria-hidden="true">${icon}</span>
        <h2 class="section-title">${title}</h2>
        ${notes.length ? `<div class="section-title-notes" aria-hidden="true">${notes.join('')}</div>` : ''}
        ${action}
      </div>
    `;
  }

  actionButton(action, label) {
    return `<button type="button" class="cardAction" aria-label="${label}" data-action="${action}">${Icons.general.arrowRight(16)}</button>`;
  }

  musicNoteSvg(type) {
    const color = 'rgba(190,140,255,0.85)';
    if (type === 1)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><circle cx="17.9922" cy="15.75" r="3"></circle><circle cx="5.99219" cy="17.75" r="3"></circle><path d="M8.99219 17.75V9.66559M8.99219 9.66559V8.77944C8.99219 7.26371 8.99219 6.50585 9.41578 5.9576C9.83937 5.40936 10.5669 5.22555 12.022 4.85793L16.022 3.84738C18.3099 3.26938 19.4538 2.98038 20.223 3.58727C20.859 4.08907 20.9691 4.99061 20.9882 6.63495M8.99219 9.66559L20.9882 6.63495M20.9922 15.7289V7.76889C20.9922 7.35623 20.9922 6.9793 20.9882 6.63495M20.9882 6.63495L20.9922 6.63394" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 2)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5"><path d="M7 9.5C7 10.8807 5.88071 12 4.5 12C3.11929 12 2 10.8807 2 9.5C2 8.11929 3.11929 7 4.5 7C5.88071 7 7 8.11929 7 9.5ZM7 9.5V2C7.33333 2.5 7.6 4.6 10 5" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="10.5" cy="19.5" r="2.5"></circle><circle cx="20" cy="18" r="2"></circle><path d="M13 19.5L13 11C13 10.09 13 9.63502 13.2466 9.35248C13.4932 9.06993 13.9938 9.00163 14.9949 8.86504C18.0085 8.45385 20.2013 7.19797 21.3696 6.42937C21.6498 6.24509 21.7898 6.15295 21.8949 6.20961C22 6.26627 22 6.43179 22 6.76283V17.9259" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13 13C17.8 13 21 10.6667 22 10" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    if (type === 3)
      return `<svg width="24" height="19" viewBox="0 0 24 19" fill="none"><line x1="6" y1="3" x2="6" y2="14.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="18" y1="1" x2="18" y2="13.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/><line x1="6" y1="3" x2="18" y2="1" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="6.5" x2="18" y2="4.5" stroke="rgba(190,140,255,0.62)" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="3.4" cy="15" rx="3" ry="2" transform="rotate(-15 3.4 15)" fill="rgba(190,140,255,0.8)"/><ellipse cx="15.4" cy="14" rx="3" ry="2" transform="rotate(-15 15.4 14)" fill="rgba(190,140,255,0.8)"/></svg>`;
    if (type === 4)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="${color}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.49219" cy="17" r="4"></circle><path d="M13.4922 17V3C13.4922 5.76142 15.7308 8 18.4922 8"></path></svg>`;
    return '';
  }

  renderRecentlyPlayed(recent) {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        ${this.sectionTitle({
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><polygon points="8.5,7 8.5,13.5 14.5,10.25" fill="rgba(190,140,255,0.82)"/></svg>`,
      title: 'Recently Played',
      notes: [this.musicNoteSvg(1), this.musicNoteSvg(2)],
      action: this.actionButton('view-recents', 'View recently played')
    })}
        <div class="cardContent"><div class="songList" id="recentSongs" aria-label="Recently played songs">${recent.length ? recent.map((s) => this.songRow(s)).join('') : this.emptyNote('Nothing here yet — play a song and it will appear at the top of this list.')}</div></div>
      </article>
    `;
  }

  renderNewRelease(rel) {
    if (!rel) return '';
    const playData = this.esc(
      JSON.stringify({ artistId: rel.artistId, albumId: rel.albumId }),
    );
    return `
      <article class="musicCard releasesCard" data-card="releases" data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.albumId)}">
        ${this.sectionTitle({
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      title: 'New Release',
      notes: [this.musicNoteSvg(3)],
      action: this.actionButton('view-releases', 'View all releases')
    })}
        <div class="releaseFeature">
          <img class="releaseBackground" src="${this.esc(rel.coverUrl)}" alt="${this.esc(rel.albumName)}">
          <div class="releaseInfo">
            <span class="releaseLabel">Featured Album</span>
            <h3 class="releaseTitle">${this.esc(rel.albumName)}</h3>
            <p class="releaseArtist">${this.esc(rel.artistName)}</p>
            <div class="releaseControls">
              <button type="button" class="primaryPlay" aria-label="Play album" data-play-album='${playData}'>${Icons.player.play(18)}</button>
              <button type="button" class="secondaryControl" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.esc(rel.albumId)}">${Icons.general.plus(18)}</button>
              <button type="button" class="secondaryControl" aria-label="More album options" data-release-more data-artist-id="${this.esc(rel.artistId)}" data-album-id="${this.esc(rel.albumId)}">${Icons.general.moreVert(18)}</button>
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
      title: 'Most Played',
      notes: [this.musicNoteSvg(1)],
      action: this.actionButton('view-most-played', 'View most played')
    })}
        <div class="cardContent"><div class="rankList" id="mostPlayedSongs">${mostPlayed.length ? mostPlayed.map((e, i) => this.rankRow(e, i)).join('') : this.emptyNote('Your most played songs will show up here once you start listening.')}</div></div>
      </article>
    `;
  }

  renderLibraryCard(counts) {
    const items = [
      {
        key: 'songs',
        label: 'Songs',
        count: counts.songs,
        icon: Icons.general.musicNote(18),
      },
      {
        key: 'albums',
        label: 'Albums',
        count: counts.albums,
        icon: Icons.general.album(18),
      },
      {
        key: 'artists',
        label: 'Artists',
        count: counts.artists,
        icon: Icons.general.artist(18),
      },
      {
        key: 'playlists',
        label: 'Playlists',
        count: counts.playlists,
        icon: Icons.general.playlistAdd(18),
      },
    ];
    return `
      <article class="musicCard libraryCard" data-card="library">
        ${this.sectionTitle({
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.2"/><line x1="10" y1="6.5" x2="10" y2="13.5" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/><line x1="6.5" y1="10" x2="13.5" y2="10" stroke="rgba(190,140,255,0.82)" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      title: 'Your Library',
      notes: [],
      action: this.actionButton('open-library', 'Open library')
    })}
        <div class="cardContent"><div class="libraryGrid">${items
      .map(
        (it) => `
          <button type="button" class="libraryItem" data-library="${it.key}">
            <span class="libraryIcon" aria-hidden="true">${it.icon}</span>
            <span class="libraryName">${it.label}</span>
            <span class="libraryCount">${it.count} ${it.label.toLowerCase()}</span>
          </button>`,
      )
      .join('')}
        </div></div>
      </article>
    `;
  }

  favoritesCardInner() {
    const f = this.getFavSummary(this.ui.state);
    const total = f.songCount + f.albumCount + f.artistCount;
    return `
      <div class="favoriteHero">
        ${f.coverUrl ? `<img class="favoriteArtwork" src="${this.esc(f.coverUrl)}" alt="Favorite album artwork">` : ''}
        <div class="favoriteInfo">
          <h3 class="favoriteTitle">Your Favorite Music</h3>
          <p class="favoriteSubtitle">${total ? `${f.songCount} song${f.songCount === 1 ? '' : 's'} &bull; ${f.albumCount} album${f.albumCount === 1 ? '' : 's'} &bull; ${f.artistCount} artist${f.artistCount === 1 ? '' : 's'}` : 'Your most-loved songs and albums.'}</p>
        </div>
      </div>
    `;
  }

  renderFavoritesCard() {
    return `
      <article class="musicCard favoritesCard" data-card="favorites">
        ${this.sectionTitle({
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 16.5 C10 16.5 3 11.5 3 7 C3 4.8 4.8 3 7 3 C8.5 3 9.7 3.9 10 5 C10.3 3.9 11.5 3 13 3 C15.2 3 17 4.8 17 7 C17 11.5 10 16.5 10 16.5Z" stroke="rgba(190,140,255,0.82)" stroke-width="1.2" fill="rgba(190,140,255,0.1)"/></svg>`,
      title: 'Favorites',
      notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)],
      action: this.actionButton('view-favorites', 'View favorites')
    })}
        <div class="favoriteContent" id="homeFavoritesCard">${this.favoritesCardInner()}</div>
      </article>
    `;
  }

  render() {
    const state = this.ui.state;
    this._focusedGenre = null;
    this._clearCardFocus();
    if (!Array.isArray(this._discoverCache)) this._discoverCache = null;
    const cards = [
      this.renderNewRelease(this.pickFeatured(state)),
      this.renderRecentlyPlayed(this.getRecent(state)),
      this.renderMostPlayed(this.getMostPlayed(state)),
      this.renderLibraryCard(this.getCounts(state)),
      this.renderFavoritesCard(),
      this.renderDiscover(state),
      this.renderCollections(state),
      this.renderGenres(state),
    ].filter(Boolean);
    const html = `
      <div data-page="home" class="hp pageSection">
        <div class="container">
          ${this.renderHeader()}
          <section class="bentoGrid" aria-label="Music dashboard">${cards.join('')}</section>
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }

  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="home"].hp');
    if (root) this.bindEvents(root);
    else if (attempts < 60)
      setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  _root() {
    return document.querySelector('[data-page="home"].hp');
  }

  bindEvents(root) {
    if (!root._homeCardFocusBound) {
      root._homeCardFocusBound = true;
      root.addEventListener('click', (e) => this._handleCardFocus(e), true);
      root.addEventListener('focusin', (e) => {
        const grid = root.querySelector('.bentoGrid');
        if (!grid) return;
        const card = e.target.closest('.musicCard[data-card]');
        if (!card || !grid.contains(card)) return;
        grid
          .querySelectorAll('.musicCard.is-card-focused')
          .forEach((c) => c.classList.remove('is-card-focused'));
        card.classList.add('is-card-focused');
        grid.classList.add('has-card-focus');
      });
      document.addEventListener(
        'click',
        (e) => {
          if (!root.isConnected) return;
          if (!root.contains(e.target)) this._clearCardFocus();
        },
        true,
      );
    }
    if (!root || root._homeDelegated) return;
    root._homeDelegated = true;
    root.addEventListener('click', (e) => {
      const ui = this.ui;
      const state = ui.state;
      if (this._focusedGenre && !e.target.closest('.genreTile[data-genre]'))
        this._clearGenreFocus();
      const overlay = e.target.closest('.songArtworkOverlay');
      if (overlay) {
        const row = overlay.closest('[data-song-id]');
        const song = row && state.getSongById(row.dataset.songId);
        if (song) {
          e.stopPropagation();
          ui.audioPlayer.playSong(song, null, true, 'home');
        }
        return;
      }
      const moreBtn = e.target.closest('[data-more-song]');
      if (moreBtn) {
        e.stopPropagation();
        ui.contentEvents.showSongMenu(moreBtn.dataset.moreSong, e);
        return;
      }
      const albumMore = e.target.closest('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId,
        });
        return;
      }
      const artistPlay = e.target.closest('[data-artist-play]');
      if (artistPlay) {
        e.stopPropagation();
        this.ui.libraryPage?.playArtist(artistPlay.dataset.artistPlay);
        return;
      }
      const artistOpen = e.target.closest('[data-artist-open]');
      if (artistOpen) {
        e.stopPropagation();
        this.ui.navigate('artist', artistOpen.dataset.artistOpen);
        return;
      }
      const dRefresh = e.target.closest('[data-discover-refresh]');
      if (dRefresh) {
        e.stopPropagation();
        this._discoverCache = null;
        this._discoverIndex = 0;
        this._rebuildDiscoverCard();
        return;
      }
      const dPrev = e.target.closest('[data-discover-prev]');
      if (dPrev) {
        e.stopPropagation();
        if (!dPrev.disabled) this._moveDiscover(-1);
        return;
      }
      const dNext = e.target.closest('[data-discover-next]');
      if (dNext) {
        e.stopPropagation();
        if (!dNext.disabled) this._moveDiscover(1);
        return;
      }
      const dSong = e.target.closest('.discoverSong[data-song-id]');
      if (dSong) {
        e.stopPropagation();
        const song = state.getSongById(dSong.dataset.songId);
        if (song) ui.audioPlayer.playSong(song, null, true, 'home');
        return;
      }
      const genreTile = e.target.closest('.genreTile[data-genre]');
      if (genreTile) {
        e.stopPropagation();
        const name = genreTile.dataset.genre;
        if (this._focusedGenre !== name) {
          this._focusedGenre = name;
          this._syncGenreFocus();
          return;
        }
        this._focusedGenre = null;
        this._syncGenreFocus();
        this._openGenre(name);
        return;
      }
      const releaseMore = e.target.closest('[data-release-more]');
      if (releaseMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: releaseMore.dataset.artistId,
          albumId: releaseMore.dataset.albumId,
        });
        return;
      }
      const plPlay = e.target.closest('[data-playlist-play]');
      if (plPlay) {
        e.stopPropagation();
        const id = plPlay.dataset.playlistPlay;
        const pl = (state.playlists || []).find(
          (p) => String(p.id) === String(id),
        );
        const songs = pl
          ? (pl.songs || [])
            .map((sid) => state.getSongById(sid))
            .filter(Boolean)
          : [];
        if (songs.length)
          ui.audioPlayer.playSong(songs[0], songs, true, 'home');
        return;
      }
      const plShuffle = e.target.closest('[data-playlist-shuffle]');
      if (plShuffle) {
        e.stopPropagation();
        const id = plShuffle.dataset.playlistShuffle;
        const pl = (state.playlists || []).find(
          (p) => String(p.id) === String(id),
        );
        const songs = pl
          ? (pl.songs || [])
            .map((sid) => state.getSongById(sid))
            .filter(Boolean)
          : [];
        const shuffled = this.shuffle(songs);
        if (shuffled.length)
          ui.audioPlayer.playSong(shuffled[0], shuffled, true, 'home');
        return;
      }
      const plMore = e.target.closest('[data-playlist-more]');
      if (plMore) {
        e.stopPropagation();
        const id = plMore.dataset.playlistMore;
        if (typeof ui.openMoreMenu === 'function')
          ui.openMoreMenu(e, 'playlist', id);
        else if (typeof ui.playlistsPage?.showMenu === 'function')
          ui.playlistsPage.showMenu(e, id);
        else if (window.contextMenu?.show)
          window.contextMenu.show(e.clientX, e.clientY, { playlistId: id });
        return;
      }
      const navBtn = e.target.closest('[data-nav], .cardAction[data-action]');
      if (navBtn) {
        e.stopPropagation();
        const dest =
          navBtn.dataset.nav ||
          {
            'view-recents': 'library',
            'view-releases': 'library',
            'view-most-played': 'library',
            'open-library': 'library',
            'view-favorites': 'favorites',
            'open-playlists': 'playlists',
          }[navBtn.dataset.action];
        if (dest) ui.navigate(dest);
        return;
      }
      const libItem = e.target.closest('.libraryItem[data-library]');
      if (libItem) {
        e.stopPropagation();
        ui.navigate(
          libItem.dataset.library === 'playlists' ? 'playlists' : 'library',
        );
        return;
      }
      if (e.target.closest('.favoriteContent')) {
        e.stopPropagation();
        ui.navigate('favorites');
        return;
      }
      const collCard = e.target.closest('.collection-card[data-playlist-name]');
      if (collCard) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        collCard.classList.add('active');
        const name = collCard.dataset.playlistName;
        ui.navigate('playlists');
        setTimeout(() => {
          try {
            ui.playlistsPage?.viewPlaylist?.(name);
          } catch {
          }
        }, 60);
        return;
      }
      const row = e.target.closest(
        '.song[data-song-id], .rankItem[data-song-id]',
      );
      if (row) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        const song = state.getSongById(row.dataset.songId);
        if (song) ui.audioPlayer.playSong(song, null, true, 'home');
        return;
      }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const collCard = e.target.closest('.collection-card[data-playlist-name]');
      if (!collCard) return;
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      const name = collCard.dataset.playlistName;
      this.ui.navigate('playlists');
      setTimeout(() => {
        try {
          this.ui.playlistsPage?.viewPlaylist?.(name);
        } catch {
        }
      }, 60);
    });
  }

  _hydrateRow(row) {
    const songId = row.dataset.songId;
    const heart = row.querySelector('[data-fav-song]');
    if (heart)
      this.ui.contentEvents.setupHeartButton(
        heart,
        'song',
        heart.dataset.favSong,
      );
    const more = row.querySelector('[data-more-song]');
    if (more && !more._homeMoreBound) {
      more._homeMoreBound = true;
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(songId, e);
      });
    }
  }

  _bindLiveUpdates() {
    if (Home._liveBound) return;
    Home._liveBound = true;
    window.addEventListener('mybeats:recently-played', (e) =>
      this._onRecentlyPlayed(e.detail?.song),
    );
    window.addEventListener('mybeats:playback-change', () =>
      this._syncNowPlaying(),
    );
    window.addEventListener('mybeats:favorites-changed', () =>
      this._syncFavorites(),
    );
    window.addEventListener('mybeats:play-counts', () =>
      this._syncMostPlayed(),
    );
    window.addEventListener('mybeats:library-changed', () => {
      this._discoverCache = null;
      this._discoverIndex = 0;
      if (this._isActive()) this._rebuildDiscoverCard();
    });
    window.addEventListener('mybeats:playlists-changed', () => {
      if (this._isActive()) this._syncCollections();
    });
  }

  _isActive() {
    return this.ui.state.currentPage === 'home' && !!this._root();
  }

  _onRecentlyPlayed(song) {
    if (!song || !this._isActive()) return;
    const resolved = this.ui.state.getSongById(song.id) || song;
    const list = this._root().querySelector('#recentSongs');
    if (!list) return;
    list.querySelector('.hp-empty')?.remove();
    const sel = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector(sel);
    const kids = [...list.querySelectorAll('.song')];
    const tops = new Map(kids.map((k) => [k, k.getBoundingClientRect().top]));
    const animateSiblings = () => {
      kids.forEach((k) => {
        const delta = (tops.get(k) ?? 0) - k.getBoundingClientRect().top;
        if (!delta) return;
        k.style.transition = 'none';
        k.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          k.style.transition = 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)';
          k.style.transform = '';
        });
      });
    };
    if (existing) {
      if (list.firstElementChild !== existing) {
        list.prepend(existing);
        animateSiblings();
      }
      existing.classList.remove('song-bump');
      void existing.offsetWidth;
      existing.classList.add('song-bump');
      setTimeout(() => existing.classList.remove('song-bump'), 900);
    } else {
      const tpl = document.createElement('template');
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add('song-enter');
      list.prepend(row);
      animateSiblings();
      this._hydrateRow(row);
      row.addEventListener(
        'animationend',
        () => row.classList.remove('song-enter'),
        { once: true },
      );
    }
    this._syncNowPlaying();
    const rows = [...list.querySelectorAll('.song')];
    rows.slice(this.RECENT_LIMIT).forEach((row) => {
      row.classList.add('song-exit');
      row.addEventListener('animationend', () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400);
    });
  }

  _syncNowPlaying() {
    if (!this._isActive()) return;
    const root = this._root();
    const id = this.ui.state.currentSong?.id;
    root
      .querySelectorAll(
        '.song.is-playing, .rankItem.is-playing, .discoverSong.is-playing',
      )
      .forEach((el) => el.classList.remove('is-playing'));
    if (id == null) return;
    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root
      .querySelectorAll(`.song${sel}, .rankItem${sel}, .discoverSong${sel}`)
      .forEach((el) => el.classList.add('is-playing'));
  }

  _syncFavorites() {
    if (!this._isActive()) return;
    const root = this._root();
    const card = root.querySelector('#homeFavoritesCard');
    if (card) {
      card.innerHTML = this.favoritesCardInner();
      card.classList.remove('hp-swap');
      void card.offsetWidth;
      card.classList.add('hp-swap');
    }
  }

  _syncMostPlayed() {
    if (!this._isActive()) return;
    const list = this._root().querySelector('#mostPlayedSongs');
    if (!list) return;
    const entries = this.getMostPlayed(this.ui.state);
    list.innerHTML = entries.length
      ? entries.map((e, i) => this.rankRow(e, i)).join('')
      : this.emptyNote(
        'Your most played songs will show up here once you start listening.',
      );
    list.classList.remove('hp-swap');
    void list.offsetWidth;
    list.classList.add('hp-swap');
    this._syncNowPlaying();
  }

  _handleCardFocus(e) {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector('.bentoGrid');
    if (!grid) return;
    const card = e.target.closest('.musicCard[data-card]');
    if (!card || !grid.contains(card)) {
      this._clearCardFocus();
      return;
    }
    if (card.classList.contains('is-card-focused')) {
      this._clearCardFocus();
      return;
    }
    grid
      .querySelectorAll('.musicCard.is-card-focused')
      .forEach((c) => c.classList.remove('is-card-focused'));
    card.classList.add('is-card-focused');
    grid.classList.add('has-card-focus');
  }

  _clearCardFocus() {
    const root = this._root();
    if (!root) return;
    const grid = root.querySelector('.bentoGrid');
    if (!grid) return;
    grid.classList.remove('has-card-focus');
    grid
      .querySelectorAll('.musicCard.is-card-focused')
      .forEach((c) => c.classList.remove('is-card-focused'));
  }
}

class Library {
  constructor(ui) {
    this.ui = ui;
    this.view = 'overview';
    this.filter = { type: 'all', value: null, label: '' };
    this.sort = 'recent';
    this.mode = 'grid';
    this.query = '';
  }

  allSongs(state) {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.flatMap((alb) =>
        alb.songs.map((s) => ({
          ...s,
          artistId: a.id,
          albumId: alb.id,
          artist: a.artist,
          album: alb.album,
          coverUrl: alb.coverUrl,
          genre: a.genre || '',
          year: alb.year || '',
        })),
      ),
    );
  }

  allAlbums(state) {
    return state.enrichedLibrary.flatMap((a) =>
      a.albums.map((alb) => {
        const totalSeconds = alb.songs.reduce((sum, s) => {
          const p = String(s.duration || '0:0').split(':');
          return (
            sum + (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0)
          );
        }, 0);
        const plays = alb.songs.reduce(
          (sum, s) => sum + (state.getPlayCount ? state.getPlayCount(s.id) : 0),
          0,
        );
        return {
          artistId: a.id,
          artistName: a.artist,
          albumId: alb.id,
          albumName: alb.album,
          coverUrl: alb.coverUrl,
          genre: a.genre || '',
          year: alb.year || '',
          songs: alb.songs,
          songCount: alb.songs.length,
          totalSeconds,
          plays,
        };
      }),
    );
  }

  allArtists(state) {
    return state.enrichedLibrary.map((a) => ({
      id: a.id,
      name: a.artist,
      imageUrl: a.imageUrl,
      genre: a.genre || '',
      albumCount: a.albums.length,
      songCount: a.albums.reduce((n, alb) => n + alb.songs.length, 0),
      plays: a.albums.reduce(
        (n, alb) =>
          n +
          alb.songs.reduce(
            (m, s) => m + (state.getPlayCount ? state.getPlayCount(s.id) : 0),
            0,
          ),
        0,
      ),
    }));
  }

  allGenres(state) {
    const map = new Map();
    this.allSongs(state).forEach((s) => {
      if (!s.genre) return;
      map.set(s.genre, (map.get(s.genre) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  minutes(totalSeconds) {
    if (!totalSeconds) return '';
    const m = Math.round(totalSeconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
  }

  esc(text) {
    return Utils.esc(text == null ? '' : String(text));
  }

  pipeline(items) {
    let out = [...items];
    const f = this.filter;
    if (f.type !== 'all' && f.value != null) {
      out = out.filter((it) => {
        if (f.type === 'artist')
          return String(it.artistId ?? it.id) === String(f.value);
        if (f.type === 'genre')
          return (
            (it.genre || '').toLowerCase() === String(f.value).toLowerCase()
          );
        if (f.type === 'year') return String(it.year || '') === String(f.value);
        if (f.type === 'decade')
          return (
            it.year && Math.floor(Number(it.year) / 10) * 10 === Number(f.value)
          );
        return true;
      });
    }
    if (this.query.trim()) {
      const q = this.query.trim().toLowerCase();
      out = out.filter((it) =>
        [
          it.title,
          it.albumName,
          it.name,
          it.album,
          it.artist,
          it.artistName,
          it.genre,
        ]
          .filter(Boolean)
          .some((t) => String(t).toLowerCase().includes(q)),
      );
    }
    const by = {
      title: (a, b) =>
        String(a.title ?? a.albumName ?? a.name ?? '').localeCompare(
          String(b.title ?? b.albumName ?? b.name ?? ''),
        ),
      artist: (a, b) =>
        String(a.artist ?? a.artistName ?? a.name ?? '').localeCompare(
          String(b.artist ?? b.artistName ?? b.name ?? ''),
        ),
      yearDesc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
      yearAsc: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
      mostPlayed: (a, b) => (b.plays || 0) - (a.plays || 0),
    }[this.sort];
    if (by) out.sort(by);
    return out;
  }

  albumCard(alb) {
    const isFav = this.ui.favorites.isAlbum(alb.albumId);
    const playData = this.esc(
      JSON.stringify({ artistId: alb.artistId, albumId: alb.albumId }),
    );
    const meta = [
      `${alb.songCount} song${alb.songCount === 1 ? '' : 's'}`,
      this.minutes(alb.totalSeconds),
      alb.plays ? `${alb.plays} play${alb.plays === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' • ');
    return `
      <article class="albumCard" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}" tabindex="0" aria-label="${this.esc(alb.albumName)}">
        <div class="albumArtwork">
          <img src="${this.esc(alb.coverUrl || '')}" alt="${this.esc(alb.albumName)}" loading="lazy">
          <button class="albumPlay" type="button" aria-label="Play ${this.esc(alb.albumName)}" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">${alb.year ? `<span class="albumBadge">${this.esc(alb.year)}</span>` : ''}${alb.genre ? `<span class="albumBadge albumBadgeGenre">${this.esc(alb.genre)}</span>` : ''}</div>
            <div class="albumHoverBody"><h3 class="albumHoverTitle">${this.esc(alb.albumName)}</h3><p class="albumHoverArtist">${this.esc(alb.artistName)}</p><p class="albumHoverMeta">${meta}</p></div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
              <button type="button" class="albumHoverBtn${isFav ? ' favorited' : ''}" aria-label="Favorite album" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-action="toggle-favorite-album" data-album-id="${this.esc(alb.albumId)}"><i class="fa-solid fa-heart ${isFav ? 'liked-icon' : 'not-liked-icon'}"></i></button>
              <button type="button" class="albumHoverBtn" aria-label="Add to queue" title="Add to queue" data-action="add-album-to-queue" data-album-id="${this.esc(alb.albumId)}">${Icons.general.plus(16)}</button>
              <button type="button" class="albumHoverBtn" aria-label="More options" title="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">${Icons.general.moreVert(16)}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  albumRow(alb) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">
        <div class="rowArtwork"><img src="${this.esc(alb.coverUrl || '')}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(alb.albumName)}</span>
        <span class="rowSecondary">${this.esc(alb.artistName)}</span>
        <span class="rowMeta">${alb.year ? this.esc(alb.year) + ' • ' : ''}${alb.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play" data-play-album='${this.esc(JSON.stringify({
      artistId: alb.artistId,
      albumId: alb.albumId
    }))}'>${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">${Icons.general.moreVert(16)}</button>
        </div>
      </div>
    `;
  }

  artistCard(a) {
    return `
      <article class="artistCard" data-artist-id="${this.esc(a.id)}">
        <div class="artistPortrait"><img src="${this.esc(a.imageUrl || '')}" alt="${this.esc(a.name)}" loading="lazy"></div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(a.name)}</span>
          <p class="artistDetails">${a.albumCount} album${a.albumCount === 1 ? '' : 's'} • ${a.songCount} song${a.songCount === 1 ? '' : 's'}</p>
          <div class="artistActions"><button type="button" class="artistButton primary" data-artist-open="${this.esc(a.id)}">View Artist</button><button type="button" class="artistButton" data-artist-play="${this.esc(a.id)}">Play</button></div>
        </div>
      </article>
    `;
  }

  artistRow(a) {
    return `
      <div class="rowItem" data-artist-id="${this.esc(a.id)}">
        <div class="rowArtwork round"><img src="${this.esc(a.imageUrl || '')}" alt="" loading="lazy"></div>
        <span class="rowPrimary">${this.esc(a.name)}</span>
        <span class="rowSecondary">${this.esc(a.genre || 'Artist')}</span>
        <span class="rowMeta">${a.albumCount} albums • ${a.songCount} songs</span>
        <div class="rowActions">
          <button type="button" class="tableAction" aria-label="Play artist" data-artist-play="${this.esc(a.id)}">${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="View artist" data-artist-open="${this.esc(a.id)}">${Icons.general.arrowRight(14)}</button>
        </div>
      </div>
    `;
  }

  playlistCard(pl, state) {
    const covers = pl.songs
      .map((id) => state.getSongById(id))
      .filter(Boolean)
      .map((s) => s.coverUrl)
      .filter(Boolean);
    while (covers.length < 4 && covers.length)
      covers.push(covers[covers.length % Math.max(covers.length, 1)] || '');
    const isPlFav = this.ui?.favorites?.isPlaylist?.(pl.id) || false;
    return `
      <article class="playlistCard" data-playlist-id="${this.esc(pl.id)}">
        <button type="button" class="heart playlistCardHeart${isPlFav ? ' favorited is-favorite' : ''}" data-heart-playlist="${this.esc(pl.id)}" aria-label="Favorite playlist"></button>
        <div class="playlistMosaic">${
      covers
        .slice(0, 4)
        .map((c) => `<img src="${this.esc(c)}" alt="" loading="lazy">`)
        .join('') ||
      `<div class="playlistMosaicEmpty">${Icons.general.playlist(28)}</div>`
    }</div>
        <div class="playlistInformation">
          <span class="playlistType">Playlist</span>
          <h3 class="playlistName">${this.esc(pl.name)}</h3>
          ${pl.description ? `<p class="playlistDescription">${this.esc(pl.description)}</p>` : ''}
          <span class="playlistCount">${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}</span>
        </div>
      </article>
    `;
  }

  genreCard(g) {
    return `<article class="genreCard" data-genre="${this.esc(g.name)}"><h3 class="genreName">${this.esc(g.name)}</h3><p class="genreCount">${g.count} song${g.count === 1 ? '' : 's'}</p></article>`;
  }

  songRow(s, i, queue) {
    const isFav = this.ui.favorites.isSong(s.id);
    return `
      <tr data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId)}" data-album-id="${this.esc(s.albumId)}" data-context='${this.esc(JSON.stringify({
      artistId: s.artistId,
      albumId: s.albumId
    }))}'>
        <td class="tableNum">${i + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(s.coverUrl || '')}" alt="" loading="lazy"></div>
            <div class="tableSongInformation"><span class="tableSongTitle">${this.esc(s.title)}</span><span class="tableSongArtist">${this.esc(s.artist)}</span></div>
          </div>
        </td>
        <td>${this.esc(s.album)}</td>
        <td>${this.esc(s.year || '—')}</td>
        <td>${this.esc(s.duration || '')}</td>
        <td>
          <div class="rowActions">
            <button type="button" class="tableAction heart${isFav ? ' favorited is-favorite' : ''}" aria-label="Favorite" data-fav-song="${this.esc(s.id)}">${this.ui.likeStatus('song', isFav, false, null)}</button>
            <button type="button" class="tableAction" aria-label="More options" data-more-song="${this.esc(s.id)}">${Icons.general.moreVert(16)}</button>
          </div>
        </td>
      </tr>
    `;
  }

  emptyState(title, desc) {
    return `<div class="emptyState"><div class="emptyIcon">${Icons.general.search(34)}</div><h3 class="emptyTitle">${this.esc(title)}</h3><p class="emptyDescription">${this.esc(desc)}</p></div>`;
  }

  sectionHead(title, sub) {
    return `<div class="resultsHeader"><div><h2 class="resultsTitle">${this.esc(title)}</h2><p class="resultsSubtitle">${this.esc(sub)}</p></div></div>`;
  }

  contentFor(view) {
    const state = this.ui.state;
    if (view === 'songs') {
      const songs = this.pipeline(this.allSongs(state));
      if (!songs.length)
        return this.emptyState(
          'No songs match',
          'Try clearing your search or filters.',
        );
      return `<div class="songTableWrapper"><table class="songTable"><thead><tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr></thead><tbody>${songs.map((s, i) => this.songRow(s, i)).join('')}</tbody></table></div>`;
    }
    if (view === 'albums') {
      const albums = this.pipeline(this.allAlbums(state));
      if (!albums.length)
        return this.emptyState(
          'No albums match',
          'Try clearing your search or filters.',
        );
      return this.mode === 'grid'
        ? `<div class="albumGrid">${albums.map((a) => this.albumCard(a)).join('')}</div>`
        : `<div class="rowsList">${albums.map((a) => this.albumRow(a)).join('')}</div>`;
    }
    if (view === 'artists') {
      const artists = this.pipeline(this.allArtists(state));
      if (!artists.length)
        return this.emptyState(
          'No artists match',
          'Try clearing your search or filters.',
        );
      return this.mode === 'grid'
        ? `<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join('')}</div>`
        : `<div class="rowsList">${artists.map((a) => this.artistRow(a)).join('')}</div>`;
    }
    if (view === 'playlists') {
      const pls = (state.playlists || []).filter(
        (pl) =>
          !this.query.trim() ||
          pl.name.toLowerCase().includes(this.query.trim().toLowerCase()),
      );
      if (!pls.length)
        return this.emptyState(
          'No playlists yet',
          'Create a playlist and it will show up here.',
        );
      return `<div class="playlistGrid">${pls.map((pl) => this.playlistCard(pl, state)).join('')}</div>`;
    }
    if (view === 'genres') {
      const genres = this.pipeline(this.allGenres(state));
      if (!genres.length)
        return this.emptyState(
          'No genres found',
          'Your library genres will appear here.',
        );
      return `<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join('')}</div>`;
    }
    const albums = this.allAlbums(state);
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists(state))
      .sort((a, b) => b.songCount - a.songCount)
      .slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres(state).slice(0, 8);
    return `
      ${recentAlbums.length ? `<section>${this.sectionHead('Recently Added', 'New additions to your collection.')}<div class="albumGrid">${recentAlbums.map((a) => this.albumCard(a)).join('')}</div></section>` : ''}
      ${artists.length ? `<section style="margin-top: 3rem">${this.sectionHead('Popular Artists', 'Artists with the most music in your collection.')}<div class="artistGrid">${artists.map((a) => this.artistCard(a)).join('')}</div></section>` : ''}
      ${playlists.length ? `<section style="margin-top: 3rem">${this.sectionHead('Explore Playlists', 'Curated collections ready to explore.')}<div class="playlistGrid">${playlists.map((pl) => this.playlistCard(pl, state)).join('')}</div></section>` : ''}
      ${genres.length ? `<section style="margin-top: 3rem">${this.sectionHead('Browse by Genre', 'Find something based on the mood.')}<div class="genreGrid">${genres.map((g) => this.genreCard(g)).join('')}</div></section>` : ''}
    `;
  }

  countFor(view) {
    const state = this.ui.state;
    const fmt = (n) => `${n.toLocaleString()} item${n === 1 ? '' : 's'}`;
    switch (view) {
      case 'songs':
        return fmt(this.pipeline(this.allSongs(state)).length);
      case 'albums':
        return fmt(this.pipeline(this.allAlbums(state)).length);
      case 'artists':
        return fmt(this.pipeline(this.allArtists(state)).length);
      case 'playlists':
        return fmt((state.playlists || []).length);
      case 'genres':
        return fmt(this.pipeline(this.allGenres(state)).length);
      default: {
        const total =
          this.allAlbums(state).length +
          this.allArtists(state).length +
          (state.playlists || []).length +
          this.allGenres(state).length;
        return fmt(total);
      }
    }
  }

  viewMeta(view) {
    return (
      {
        overview: [
          'Explore Your Collection',
          'A curated overview of your music.',
        ],
        songs: ['All Songs', 'Every track in your library.'],
        albums: ['All Albums', 'Hover an album for the full story.'],
        artists: ['All Artists', 'The people behind your music.'],
        playlists: ['All Playlists', 'Your curated collections.'],
        genres: ['All Genres', 'Browse by mood and style.'],
      }[view] || ['', '']
    );
  }

  sortLabel() {
    return {
      recent: 'Recently Added',
      title: 'Title A–Z',
      artist: 'Artist A–Z',
      yearDesc: 'Newest First',
      yearAsc: 'Oldest First',
      mostPlayed: 'Most Played',
    }[this.sort];
  }

  render() {
    const tabs = [
      ['overview', 'Overview'],
      ['songs', 'Songs'],
      ['albums', 'Albums'],
      ['artists', 'Artists'],
      ['playlists', 'Playlists'],
      ['genres', 'Genres'],
    ];
    const f = this.filter;
    const filterBtn = (type, label) => {
      const active = f.type === type;
      return `<button type="button" class="filterButton${active ? ' has-filter is-active' : ''}" data-filter="${type}">${active ? this.esc(f.label) : label}<span class="filterArrow">${Icons.general.chevronDown()}</span></button>`;
    };
    const [title, sub] = this.viewMeta(this.view);
    const html = `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div><span class="browseKicker">Explore</span><h1 class="browseTitle">Browse Music</h1><p class="browseDescription">Explore songs, albums, artists, playlists, genres, and everything else in your music collection.</p></div>
            <div class="searchWrapper"><span class="searchIcon" aria-hidden="true">${Icons.general.search(16)}</span><input type="search" class="librarySearch" id="librarySearch" placeholder="Search songs, artists, albums, playlists..." autocomplete="off" value="${this.esc(this.query)}"></div>
            <nav class="browseNavigation" aria-label="Browse categories">${tabs.map(([key, label]) => `<button class="browseTab${this.view === key ? ' is-active' : ''}" type="button" data-view="${key}">${label}</button>`).join('')}</nav>
            <div class="filterToolbar">
              <div class="filterGroup">
                <button type="button" class="filterButton${f.type === 'all' ? ' is-active' : ''}" data-filter="all">All</button>
                ${filterBtn('artist', 'Artist')}${filterBtn('genre', 'Genre')}${filterBtn('year', 'Year')}${filterBtn('decade', 'Decade')}
              </div>
              <div class="displayControls">
                <button type="button" class="sortButton" data-action="sort">${this.sortLabel()}<span>${Icons.general.chevronDown()}</span></button>
                <div class="viewToggle" aria-label="Display mode">
                  <button type="button" class="viewButton${this.mode === 'grid' ? ' is-active' : ''}" aria-label="Grid view" data-view-mode="grid">${Icons.general.grid(15)}</button>
                  <button type="button" class="viewButton${this.mode === 'list' ? ' is-active' : ''}" aria-label="List view" data-view-mode="list">${Icons.general.list(15)}</button>
                </div>
              </div>
            </div>
          </header>
          <div class="resultsHeader" id="browseResultsHeader"><div><h2 class="resultsTitle">${title}</h2><p class="resultsSubtitle">${sub}</p></div><span class="resultsCount" id="browseResultsCount">${this.countFor(this.view)}</span></div>
          <section class="dynamicContent" id="browseContent" aria-live="polite">
            <div class="loadingLayer is-hidden" id="loadingLayer" aria-hidden="true"><div class="loadingContent"><div class="loadingSpinner" aria-hidden="true"></div><div><div class="loadingTitle">Searching your library…</div><p class="loadingDescription">Finding the music that matches your selection.</p></div></div></div>
            <div class="contentSection" data-content-view="${this.view}">${this.contentFor(this.view)}</div>
          </section>
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }

  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="library"].bp');
    if (root) this.bindEvents(root);
    else if (attempts < 60)
      setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  _root() {
    return document.querySelector('[data-page="library"].bp');
  }

  refreshContent(withLoading = false) {
    const root = this._root();
    if (!root) return;
    const swap = () => {
      const section = root.querySelector('.contentSection');
      if (section) {
        section.dataset.contentView = this.view;
        section.innerHTML = this.contentFor(this.view);
      }
      const [title, sub] = this.viewMeta(this.view);
      const head = root.querySelector('#browseResultsHeader');
      if (head) {
        head.querySelector('.resultsTitle').textContent = title;
        head.querySelector('.resultsSubtitle').textContent = sub;
      }
      const count = root.querySelector('#browseResultsCount');
      if (count) count.textContent = this.countFor(this.view);
      root
        .querySelectorAll('.browseTab')
        .forEach((t) =>
          t.classList.toggle('is-active', t.dataset.view === this.view),
        );
      this.hydrate(root.querySelector('#browseContent'));
    };
    if (withLoading) {
      const layer = root.querySelector('#loadingLayer');
      layer?.classList.remove('is-hidden');
      setTimeout(() => {
        swap();
        layer?.classList.add('is-hidden');
      }, 260);
    } else swap();
  }

  hydrate(scope) {
    if (!scope) return;
    window.heartManager?.bindAll(scope);
    scope.querySelectorAll('[data-more-song]').forEach((el) => {
      if (el._moreBound) return;
      el._moreBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(el.dataset.moreSong, e);
      });
    });
    scope.querySelectorAll('[data-play-album]').forEach((el) => {
      if (el._paBound) return;
      el._paBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.albumQueue(
          this.ui.state,
          data.artistId,
          data.albumId,
        );
        if (queue.length)
          this.ui.audioPlayer.playSong(queue[0], queue, true, 'album');
      });
    });
    scope
      .querySelectorAll('[data-action="add-album-to-queue"]')
      .forEach((el) => {
        if (el._aqBound) return;
        el._aqBound = true;
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const state = this.ui.state;
          const albumId = el.dataset.albumId;
          const album = state.getAlbumById(albumId);
          if (!album?.songs?.length) return;
          const queue = Utils.albumQueue(state, album.artistId, albumId);
          const currentQueue = state.queue || [];
          state.queue = [...currentQueue, ...queue];
          if (state.currentSong)
            state.queueIndex = state.queue.findIndex(
              (s) => s.id == state.currentSong.id,
            );
          state.showToast(
            `Added ${queue.length} song${queue.length === 1 ? '' : 's'} to queue`,
          );
        });
      });
  }

  closeMenus() {
    this._root()
      ?.querySelectorAll('.filterMenu')
      .forEach((m) => m.remove());
  }

  openMenu(anchorBtn, items, current, onSelect) {
    this.closeMenus();
    const root = this._root();
    if (!root) return;
    const menu = document.createElement('div');
    menu.className = 'filterMenu';
    menu.innerHTML = items
      .map(
        (it) =>
          `<button type="button" class="filterMenuItem${String(it.value) === String(current) ? ' is-active' : ''}" data-value="${this.esc(it.value)}"><span>${this.esc(it.label)}</span>${it.count != null ? `<span class="count">${it.count}</span>` : ''}</button>`,
      )
      .join('');
    root.appendChild(menu);
    const rect = anchorBtn.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    menu.style.top = `${rect.bottom - rootRect.top + root.scrollTop + 6}px`;
    menu.style.left = `${Math.max(8, rect.left - rootRect.left)}px`;
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.filterMenuItem');
      if (!item) return;
      e.stopPropagation();
      onSelect(item.dataset.value);
      this.closeMenus();
    });
    setTimeout(() => {
      this._menuCloser = (e) => {
        if (!menu.contains(e.target)) this.closeMenus();
      };
      document.addEventListener('click', this._menuCloser, { once: true });
    }, 0);
  }

  openFilterMenu(btn, type) {
    const state = this.ui.state;
    let items = [];
    if (type === 'artist')
      items = this.allArtists(state)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ value: a.id, label: a.name, count: a.songCount }));
    else if (type === 'genre')
      items = this.allGenres(state).map((g) => ({
        value: g.name,
        label: g.name,
        count: g.count,
      }));
    else if (type === 'year') {
      const years = [
        ...new Set(
          this.allAlbums(state)
            .map((a) => a.year)
            .filter(Boolean),
        ),
      ]
        .sort()
        .reverse();
      items = years.map((y) => ({ value: y, label: y }));
    } else if (type === 'decade') {
      const decades = [
        ...new Set(
          this.allAlbums(state)
            .map((a) => a.year)
            .filter(Boolean)
            .map((y) => Math.floor(Number(y) / 10) * 10),
        ),
      ].sort((a, b) => b - a);
      items = decades.map((d) => ({ value: d, label: `${d}s` }));
    }
    if (!items.length) {
      state.showToast?.('Nothing to filter by yet');
      return;
    }
    this.openMenu(
      btn,
      items,
      this.filter.type === type ? this.filter.value : null,
      (value) => {
        const it = items.find((i) => String(i.value) === String(value));
        this.filter = { type, value, label: it ? it.label : value };
        this.ui.render();
      },
    );
  }

  openSortMenu(btn) {
    const items = [
      { value: 'recent', label: 'Recently Added' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'artist', label: 'Artist A–Z' },
      { value: 'yearDesc', label: 'Newest First' },
      { value: 'yearAsc', label: 'Oldest First' },
      { value: 'mostPlayed', label: 'Most Played' },
    ];
    this.openMenu(btn, items, this.sort, (value) => {
      this.sort = value;
      this.ui.render();
    });
  }

  playArtist(artistId) {
    const state = this.ui.state;
    const artist = state.getArtistById(artistId);
    if (!artist) return;
    const queue = artist.albums.flatMap((alb) =>
      alb.songs.map((s) => state.getSongById(s.id)).filter(Boolean),
    );
    if (queue.length) {
      this.ui.audioPlayer.playSong(queue[0], queue, true, 'artist');
      state.showToast?.(`Playing ${artist.artist}`);
    }
  }

  bindEvents(root) {
    if (!root || root._browseDelegated) return;
    root._browseDelegated = true;
    const ui = this.ui;
    root.addEventListener('click', (e) => {
      const tab = e.target.closest('.browseTab');
      if (tab) {
        e.stopPropagation();
        if (tab.dataset.view !== this.view) {
          this.view = tab.dataset.view;
          this.refreshContent(true);
        }
        return;
      }
      const filterBtn = e.target.closest('.filterButton');
      if (filterBtn) {
        e.stopPropagation();
        const type = filterBtn.dataset.filter;
        if (type === 'all') {
          if (this.filter.type !== 'all') {
            this.filter = { type: 'all', value: null, label: '' };
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
      const viewBtn = e.target.closest('.viewButton[data-view-mode]');
      if (viewBtn) {
        e.stopPropagation();
        if (viewBtn.dataset.viewMode !== this.mode) {
          this.mode = viewBtn.dataset.viewMode;
          root
            .querySelectorAll('.viewButton')
            .forEach((b) => b.classList.toggle('is-active', b === viewBtn));
          this.refreshContent(false);
        }
        return;
      }
      const albumMore = e.target.closest('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId,
        });
        return;
      }
      const artistPlay = e.target.closest('[data-artist-play]');
      if (artistPlay) {
        e.stopPropagation();
        this.playArtist(artistPlay.dataset.artistPlay);
        return;
      }
      const artistOpen = e.target.closest('[data-artist-open]');
      if (artistOpen) {
        e.stopPropagation();
        ui.navigate('artist', artistOpen.dataset.artistOpen);
        return;
      }
      const genre = e.target.closest('.genreCard[data-genre]');
      if (genre) {
        e.stopPropagation();
        if (window.pagesActions?.playGenre)
          window.pagesActions.playGenre(genre.dataset.genre);
        return;
      }
      const plCard = e.target.closest('.playlistCard[data-playlist-id]');
      if (plCard) {
        e.stopPropagation();
        const pl = ui.state.playlists.find(
          (p) => String(p.id) === String(plCard.dataset.playlistId),
        );
        if (pl) {
          ui.state.selectedPlaylistName = pl.name;
          ui.state.selectedPlaylistId = pl.id;
          ui.navigate('playlists');
        }
        return;
      }
      const songRow = e.target.closest('tr[data-song-id]');
      if (songRow) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        const song = ui.state.getSongById(songRow.dataset.songId);
        if (!song) return;
        const queue = [...root.querySelectorAll('tr[data-song-id]')]
          .map((r) => ui.state.getSongById(r.dataset.songId))
          .filter(Boolean);
        ui.audioPlayer.playSong(
          song,
          queue.length ? queue : null,
          true,
          'library',
        );
        return;
      }
      const rowItem = e.target.closest('.rowItem[data-artist-id]');
      if (rowItem) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        ui.navigate(
          'artist',
          rowItem.dataset.artistId,
          rowItem.dataset.albumId || null,
        );
        return;
      }
    });
    const searchInput = root.querySelector('#librarySearch');
    if (searchInput && !searchInput._browseSearchBound) {
      searchInput._browseSearchBound = true;
      let t;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.query = searchInput.value;
          this.refreshContent(false);
        }, 160);
      });
    }
  }

  destroy() {
  }
}

class Favorites {
  constructor(ui) {
    this.ui = ui;
  }

  emptyState(emoji, title, desc) {
    return `
      <div class="emptyState animate-fadeInUp" style="text-align: center; padding: 4rem 0;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: rgb(var(--textPrimary));">${title}</h3>
        <p style="color: rgba(var(--textSecondary)/1);">${desc}</p>
      </div>
    `;
  }

  renderSongCards(songs) {
    if (!songs.length) return '';
    const groups = {};
    songs.forEach((song) => {
      const genre = song.genre || 'Unknown Genre';
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
            (s, i) => `
                <div class="song-row" style="--d: ${i * 30}ms">
                  <div class="song-row-art" onclick="event.stopPropagation(); window.pagesActions.playSong('${s.id}', 'favorites')">
                    <img src="${s.coverUrl}" loading="lazy" alt="">
                    <div class="song-row-play">${Icons.player.play(16)}</div>
                  </div>
                  <div class="song-row-info">
                    <span class="song-row-title">${s.title}</span>
                    <span class="song-row-artist">${s.artist}</span>
                  </div>
                  <button class="heart ${this.ui.favorites.isSong(s.id) ? 'favorited' : ''}" data-fav-song="${s.id}" onclick="event.stopPropagation();">${this.ui.likeStatus('song', this.ui.favorites.isSong(s.id), false, null)}</button>
                </div>
              `,
          )
          .join('')}
            </div>
          </section>
        `,
      )
      .join('')}
      </div>
    `;
  }

  renderAlbumCards(albums) {
    return `
      <div class="ui-grid album-grid animate-fadeInUp">
        ${albums
      .map(
        (alb, i) => `
          <div class="ui-card album-card" style="--d: ${i * 40}ms" data-album-id="${alb.id}">
            <div class="imgBx" onclick="window.uiManager.navigate('artist', '${alb.artistId}', '${alb.id}')"><img src="${alb.coverUrl}" loading="lazy" alt=""></div>
            <div class="content">
              <div class="contentBx"><h3>${alb.album}<br><span>${alb.artistName}</span></h3></div>
              <ul class="sci">
                <li style="--i:1"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.playAlbum('${alb.artistId}', '${alb.id}')" title="Play">${Icons.player.play(18)}</button></li>
                <li style="--i:2"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.shuffleAlbum('${alb.artistId}', '${alb.id}')" title="Shuffle Play">${Icons.player.shuffle ? Icons.player.shuffle(18) : ''}</button></li>
                <li style="--i:3"><button class="icon-btn" onclick="event.stopPropagation(); window.uiManager.openMoreMenu(event, 'album', '${alb.id}')" title="More">${Icons.general.moreHoriz(18)}</button></li>
              </ul>
            </div>
          </div>
        `,
      )
      .join('')}
      </div>
    `;
  }

  renderArtistCards(artists) {
    return `
      <div class="ui-grid animate-fadeInUp">
        ${artists
      .map(
        (a, i) => `
          <div class="ui-card" data-artist-id="${a.id}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('artist', '${a.id}')">
            <div class="ui-art-wrap" style="border-radius: 50%;"><img src="${a.imageUrl}" loading="lazy" alt=""></div>
            <div class="ui-info" style="justify-content: center; text-align: center;">
              <div class="ui-text"><span class="ui-title">${a.artist}</span><span class="ui-sub">${a.genre || 'Artist'}</span></div>
            </div>
          </div>
        `,
      )
      .join('')}
      </div>
    `;
  }

  renderPlaylistCards(playlists) {
    const state = this.ui.state;
    return `
      <div class="ui-grid animate-fadeInUp">
        ${playlists
      .map((pl, i) => {
        const covers = pl.songs
          .map((id) => state.getSongById(id))
          .filter(Boolean)
          .slice(0, 4)
          .map((s) => s.coverUrl);
        return `
          <div class="ui-card" data-playlist-view="${Utils.esc(pl.name)}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('playlists'); window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
            <div class="ui-art-wrap mosaic-wrap">
              ${covers.length ? covers.map((c) => `<img src="${c}" alt="">`).join('') : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
              <button class="ui-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(18)}</button>
            </div>
            <div class="ui-info">
              <div class="ui-text"><span class="ui-title">${Utils.esc(pl.name)}</span><span class="ui-sub">${pl.songs.length} songs</span></div>
            </div>
          </div>
        `;
      })
      .join('')}
      </div>
    `;
  }

  render() {
    const state = this.ui.state;
    const tabs = [
      { key: 'songs', label: 'Songs' },
      { key: 'albums', label: 'Albums' },
      { key: 'artists', label: 'Artist' },
      { key: 'playlists', label: 'Playlists' },
    ];
    return `
      <div data-page="favorites" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">Favorites</h1>
          <nav class="tabs">${tabs.map(({
                                                      key,
                                                      label
                                                    }) => `<button class="tab-btn ${key === state.favoritesTab ? 'active' : ''}" data-tab="${key}" onclick="window.uiManager.refreshFavoritesContent('${key}')">${label}</button>`).join('')}</nav>
        </header>
        <div id="favorites-content">${this.tabContent(state.favoritesTab)}</div>
      </div>
    `;
  }

  tabContent(tab) {
    const state = this.ui.state;
    if (tab === 'songs') {
      const songIds = state.favoriteSongs;
      if (!songIds.length)
        return this.emptyState(
          '🎵',
          'No favorite songs yet',
          'Tap the heart on any track to save it.',
        );
      return this.renderSongCards(
        songIds.map((id) => state.getSongById(id)).filter(Boolean),
      );
    }
    if (tab === 'artists') {
      const artistIds = state.favoriteArtists;
      if (!artistIds.length)
        return this.emptyState(
          '🎤',
          'No favorite artists yet',
          'Save the artists you love most.',
        );
      return this.renderArtistCards(
        artistIds.map((id) => state.getArtistById(id)).filter(Boolean),
      );
    }
    if (tab === 'albums') {
      const albumIds = state.favoriteAlbums;
      if (!albumIds.length)
        return this.emptyState(
          '💿',
          'No favorite albums yet',
          'Mark standout albums to keep them close.',
        );
      return this.renderAlbumCards(
        albumIds.map((id) => state.getAlbumById(id)).filter(Boolean),
      );
    }
    if (tab === 'playlists')
      return state.playlists.length
        ? this.renderPlaylistCards(state.playlists)
        : this.emptyState(
          '📚',
          'No playlists yet',
          'Create a playlist to curate your mood.',
        );
    return '';
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
    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || 'Playlists'}</h1>
          ${!viewing ? `<button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.showSpinner(); setTimeout(() => { document.getElementById('create-playlist-modal')?.classList.remove('hidden'); window.uiManager.hideSpinner(); }, window.uiManager.fragmentLoadDelay);">+ New</button>` : `<button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.viewPlaylist(null)">&larr; Back</button>`}
        </header>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>
    `;
  }

  playlistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length)
      return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists
      .map((pl) => {
        const covers = pl.songs
          .map((id) => state.getSongById(id))
          .filter(Boolean)
          .slice(0, 4)
          .map((s) => s.coverUrl);
        return `
            <div class="playlist-card" onclick="window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(pl.name)}')">
              <div class="mosaic-wrap">
                ${covers.length ? covers.map((c) => `<img src="${c}">`).join('') : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                <button class="playlist-play-btn" data-playlist-play="${pl.id}" onclick="event.stopPropagation();">${Icons.player.play(20)}</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="min-width: 0;">
                  <span style="font-weight: 700; font-size: 1rem; color: rgb(var(--textPrimary)); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.esc(pl.name)}</span>
                  <span style="font-size: 0.8rem; color: rgba(var(--textSecondary)/1); display: block;">by You</span>
                </div>
                <button class="ui-more-btn" onclick="event.stopPropagation(); window.favoritesPlaylists.openModal()">${Icons.general.moreVert(18)}</button>
              </div>
            </div>
          `;
      })
      .join('')}
      </div>
    `;
  }

  playlistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;
    const songs = playlist.songs
      .map((id) => state.getSongById(id))
      .filter(Boolean);
    return `
      <div class="animate-fadeInUp">
        <div class="viewer-header">
          <p style="color: rgba(var(--textSecondary)/1); font-size: 0.9rem;">Experience this playlist curated by you.<br>${songs.length} Songs</p>
          <div class="action-bar">
            <button class="action-btn" data-action="download-playlist" title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" onclick="window.uiManager.editPlaylist('${playlist.id}')" title="Edit"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="action-btn primary" data-playlist-play="${playlist.id}" style="width: 50px; height: 50px;" title="Play">${Icons.player.play(24)}</button>
            <button class="action-btn share-playlist-btn" data-playlist-id="${playlist.id}" title="Share"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="action-btn" title="More">${Icons.general.moreHoriz(18)}</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${songs
      .map(
        (s, i) => `
            <div class="list-row" data-song-id="${s.id}" data-playlist-id="${playlist.id}" data-play-source="playlist" style="cursor: pointer;" onclick="window.pagesActions.playSong(this.dataset.songId, 'playlist')">
              <span style="color: rgba(var(--textOthers)/1); font-size: 0.85rem; font-weight: 600; text-align: center;">${i + 1}</span>
              <img src="${s.coverUrl}" class="row-thumb">
              <div style="min-width: 0;"><span class="row-title">${Utils.esc(s.title)}</span><span class="row-sub">${Utils.esc(s.artist)} • ${Utils.esc(s.album)}</span></div>
              <button class="ui-more-btn" data-more-song="${s.id}" onclick="event.stopPropagation();">${Icons.general.moreHoriz(20)}</button>
            </div>
          `,
      )
      .join('')}
        </div>
      </div>
    `;
  }
}


class Artists {
  constructor(ui) {
    this.ui = ui;

    // Path is resolved relative to the document. Adjust if your
    // artist.html lives elsewhere relative to the HTML entry point.
    this.TEMPLATE_URL = './source/rendering/templates/artist.html';

    this.fragments = {};
    this.page = null;
  }

  // ----------------------------------------------------------
  // Public: full page build. Returns HTMLElement (async).
  // Caller: container.replaceChildren(await artistsPage.render());
  // ----------------------------------------------------------
  async render() {
    const state = this.ui.state;
    const artistId = state.artistId;

    if (!artistId) return this._missing('Artist not found');

    const artist = state.getArtistById(artistId);
    if (!artist) return this._missing('Artist not found');

    const album = this._resolveAlbum(artist, state.selectedAlbumId);
    if (!album) return this._missing('Album not found');

    await TemplateLoader.load(this.TEMPLATE_URL);

    const page = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-artist-page');
    this.page = page;

    this._mountFragments(page);
    await this._refreshAll(artist, album);

    return page;
  }

  // ----------------------------------------------------------
  // Public: partial refresh (same artist, different album).
  // Only the fragments that actually change are refreshed.
  // ----------------------------------------------------------
  async switchAlbum(albumId) {
    const state = this.ui.state;
    const artist = state.getArtistById(state.artistId);
    if (!artist) return;

    const album = this._resolveAlbum(artist, albumId);
    if (!album) return;

    await Promise.all([
      this.fragments.tabs.refresh({ artist, album }),
      this.fragments.cover.refresh({ artist, album }),
      this.fragments.meta.refresh({ artist, album }),
      this.fragments.songs.refresh({ artist, album }),
    ]);
  }

  // ----------------------------------------------------------
  // Public: partial refresh (different artist). Refreshes all.
  // ----------------------------------------------------------
  async switchArtist(artistId) {
    const state = this.ui.state;
    const artist = state.getArtistById(artistId);
    if (!artist) return;

    const album = this._resolveAlbum(artist, state.selectedAlbumId);
    if (!album) return;

    await this._refreshAll(artist, album);
  }

  // ----------------------------------------------------------
  // Teardown — aborts every fragment's listeners. Call on
  // navigation away from the artist page.
  // ----------------------------------------------------------
  destroy() {
    Object.values(this.fragments).forEach((f) => f.destroy());
    this.fragments = {};
    this.page = null;
  }

  // ==========================================================
  // Internal
  // ==========================================================
  _resolveAlbum(artist, albumId) {
    if (!albumId) return artist.albums[0];
    return (
      artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId)) ||
      artist.albums[0]
    );
  }

  _mountFragments(page) {
    const mounts = {
      header: page.querySelector('[data-mount="header"]'),
      tabs: page.querySelector('[data-mount="tabs"]'),
      cover: page.querySelector('[data-mount="cover"]'),
      meta: page.querySelector('[data-mount="meta"]'),
      songs: page.querySelector('[data-mount="songs"]'),
      similar: page.querySelector('[data-mount="similar"]'),
    };

    const make = (name, renderFn, bindFn) =>
      new Fragment({
        name,
        mount: mounts[name],
        render: (data) => renderFn.call(this, data),
        onBind: bindFn ? (el, signal) => bindFn.call(this, el, signal) : null,
      });

    this.fragments = {
      header: make('header', this._renderHeader, this._bindHeader),
      tabs: make('tabs', this._renderTabs, this._bindTabs),
      cover: make('cover', this._renderCover),
      meta: make('meta', this._renderMeta, this._bindMeta),
      songs: make('songs', this._renderSongs, this._bindSongs),
      similar: make('similar', this._renderSimilar, this._bindSimilar),
    };
  }

  async _refreshAll(artist, album) {
    const similarIds = artist.similar || [];

    await Promise.all([
      this.fragments.header.refresh({ artist }),
      this.fragments.tabs.refresh({ artist, album }),
      this.fragments.cover.refresh({ artist, album }),
      this.fragments.meta.refresh({ artist, album }),
      this.fragments.songs.refresh({ artist, album }),
      this.fragments.similar.refresh({ artist, similarIds }),
    ]);
  }

  // ==========================================================
  // Renderers — one per fragment
  // ==========================================================
  _renderHeader({ artist }) {
    const isFav = this.ui.favorites.isArtist(artist.id);

    const el = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-artist-header', {
      artistName: artist.artist,
      artistId: artist.id,
    });

    const heart = el.querySelector('.artist-heart');
    heart.classList.toggle('favorited', isFav);
    heart.innerHTML = this.ui.likeStatus('artist', isFav, false, null);

    return el;
  }

  _renderTabs({ artist, album }) {
    const el = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-album-tabs');
    const scroll = el.querySelector('.albumTabs-scroll');

    for (const a of artist.albums) {
      const tab = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-album-tab', {
        artistId: artist.id,
        albumId: a.id,
        albumTitle: a.album,
      });

      const active = a.id === album.id;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));

      scroll.appendChild(tab);
    }

    return el;
  }

  _renderCover({ artist, album }) {
    const count = album.songs.length;

    return TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-artist-cover', {
      coverUrl: album.coverUrl,
      albumTitle: album.album,
      trackCountText: `${count} track${count === 1 ? '' : 's'}`,
      playData: JSON.stringify({ artistId: artist.id, albumId: album.id }),
    });
  }

  _renderMeta({ album }) {
    const isFav = this.ui.favorites.isAlbum(album.id);

    return TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-artist-meta', {
      year: album.year || '2024',
      status: album.status || 'Double Platinum',
      albumTitle: album.album,
      albumId: album.id,
      favLabel: isFav ? 'Remove Favorite' : 'Favorites',
    });
  }

  _renderSongs({ artist, album }) {
    const el = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-artist-songs');
    const list = el.querySelector('#songsList');
    const context = JSON.stringify({ artistId: artist.id, albumId: album.id });

    album.songs.forEach((song, index) => {
      const isFav = this.ui.favorites.isSong(song.id);
      const isPlaying = this.ui.state.currentSong?.id == song.id;

      const row = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-song-row', {
        songId: song.id,
        context,
        stagger: Math.min(index, 12),
        index: index + 1,
        title: song.title,
        duration: song.duration || '',
        isFav: String(isFav),
        coverUrl: album.coverUrl,
      });

      row.classList.toggle('playing', isPlaying);

      const heart = row.querySelector('.heart');
      heart.classList.toggle('favorited', isFav);
      heart.innerHTML = this.ui.likeStatus('song', isFav, false, null);

      row.querySelector('.moreMenu').innerHTML = Icons.general.moreVert(18);

      list.appendChild(row);
    });

    return el;
  }

  _renderSimilar({ artist, similarIds }) {
    const el = TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-similar-section');
    if (!similarIds || !similarIds.length) return el;

    const state = this.ui.state;
    const similar = similarIds
      .map((id) => state.getArtistById(id))
      .filter(Boolean);

    const rows = [
      similar.slice(0, 4),
      similar.slice(4, 8),
      similar.slice(8, 12),
    ];
    const configs = [
      ['left', 40],
      ['right', 45],
      ['left', 35],
    ];

    rows.forEach((row, i) => {
      if (!row.length) return;
      const [direction, duration] = configs[i];

      const marquee = TemplateLoader.buildEl(
        this.TEMPLATE_URL,
        'tpl-similar-marquee',
        { duration },
      );
      const track = marquee.querySelector('.marquee-track');
      track.classList.add(`marquee-${direction}`);

      for (const a of [...row, ...row]) {
        track.appendChild(
          TemplateLoader.buildEl(this.TEMPLATE_URL, 'tpl-similar-pill', {
            artistId: a.id,
            artistName: a.artist,
          }),
        );
      }

      el.appendChild(marquee);
    });

    return el;
  }

  // ==========================================================
  // Binders — receive (element, signal). Every listener is
  // registered with { signal }; the Fragment that owns the
  // signal aborts them on the next refresh or on destroy().
  // ==========================================================
  _bindHeader(el, signal) {
    const heart = el.querySelector('.artist-heart');
    if (!heart) return;

    heart.addEventListener(
      'click',
      () => {
        const artistId = heart.dataset.artistHeart;
        const nowFav = !heart.classList.contains('favorited');

        this.ui.favorites.toggleArtist(artistId);
        heart.classList.toggle('favorited', nowFav);
        heart.innerHTML = this.ui.likeStatus('artist', nowFav, false, null);
      },
      { signal },
    );
  }

  _bindTabs(el, signal) {
    const bar = el.querySelector('.albumTabsBar');
    if (!bar) return;

    bar.addEventListener(
      'click',
      (event) => {
        const tab = event.target.closest('.albumTab');
        if (!tab) return;

        const { artistId, albumId } = tab.dataset;
        if (!artistId || !albumId) return;

        try {
          window.uiManager?.refreshArtistContent?.(artistId, albumId);
        } catch {
          return;
        }

        setTimeout(() => this.scrollHero(), 40);
      },
      { signal },
    );
  }

  _bindMeta(el, signal) {
    // Offline toggle, share, playlist/queue/favorite actions.
    // Reserved for the caller to wire up — nothing here yet.
  }

  _bindSongs(el, signal) {
    const list = el.querySelector('#songsList');
    if (!list) return;

    list.addEventListener(
      'click',
      (event) => {
        const heart = event.target.closest('[data-fav-song]');
        if (heart) {
          const songId = heart.dataset.favSong;
          const nowFav = !heart.classList.contains('favorited');

          this.ui.favorites.toggleSong(songId);
          heart.classList.toggle('favorited', nowFav);
          heart.setAttribute('aria-pressed', String(nowFav));
          heart.innerHTML = this.ui.likeStatus('song', nowFav, false, null);

          if (nowFav) {
            heart.classList.remove('just-favorited');
            void heart.offsetWidth;
            heart.classList.add('just-favorited');
            heart.addEventListener(
              'animationend',
              () => heart.classList.remove('just-favorited'),
              { once: true, signal },
            );
          }
          return;
        }

        if (event.target.closest('.moreMenu, .downloadBtn, .play')) return;

        const row = event.target.closest('.songItem');
        if (!row) return;

        list
          .querySelectorAll('.songItem.is-revealed')
          .forEach((r) => r.classList.remove('is-revealed'));
        row.classList.add('is-revealed');
      },
      { signal },
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        list
          .querySelectorAll('.songItem.is-revealed')
          .forEach((r) => r.classList.remove('is-revealed'));
      },
      { signal },
    );

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target.closest('#songsList')) return;
        list
          .querySelectorAll('.songItem.is-revealed')
          .forEach((r) => r.classList.remove('is-revealed'));
      },
      { signal },
    );
  }

  _bindSimilar(el, signal) {
    el.addEventListener(
      'click',
      (event) => {
        const pill = event.target.closest('.artist-name-pill');
        if (!pill) return;

        const artistId = pill.dataset.artistId;
        if (!artistId) return;

        window.uiManager.showSpinner();
        setTimeout(() => {
          window.uiManager.contentEvents.showArtistPopover(artistId, event);
          window.uiManager.hideSpinner();
        }, window.uiManager.popoverDelay);
      },
      { signal },
    );
  }

  // ==========================================================
  // Utilities
  // ==========================================================
  scrollHero() {
    if (!this.page) return;

    const sentinel = this.page.querySelector('.albumTabsSentinel');
    if (!sentinel) return;

    const PIN_TOP = 56;
    const rect = sentinel.getBoundingClientRect();
    const sentinelBottomPage = rect.bottom + window.scrollY;
    const targetY = Math.max(0, sentinelBottomPage - PIN_TOP + 2);

    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  root() {
    return this.page;
  }

  _missing(msg) {
    const el = document.createElement('div');
    el.className = 'artist-missing';
    el.textContent = msg;
    return el;
  }
}

class EditPlaylist {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find((p) => String(p.id) === String(id));
    if (!pl)
      return `<div class="page animate-fadeInUp"><div class="missing">Playlist not found</div></div>`;
    const songs = pl.songs.map((sid, i) => {
      const song = state.getSongById(sid);
      return { song, index: i, sid: String(sid) };
    });
    const totalDuration = songs.reduce((sum, item) => {
      const parts = item.song?.duration?.split(':') || ['0', '0'];
      if (parts.length === 2)
        return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
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
            ${this._coverPreview(pl)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field"><label for="edit-pl-name">Name</label><input type="text" id="edit-pl-name" class="edit-playlist-input" value="${Utils.esc(pl.name)}" maxlength="80" data-playlist-id="${Utils.esc(pl.id)}"></div>
            <div class="edit-playlist-field"><label for="edit-pl-desc">Description</label><textarea id="edit-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" data-playlist-id="${Utils.esc(pl.id)}">${Utils.esc(pl.description || '')}</textarea></div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="edit-pl-tags">
                ${(pl.tags || []).map((t) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(t)}">${Utils.esc(t)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(t)}">×</button></span>`).join('')}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${pl.songs.length} songs • ${durationText}</p>
          </div>
        </div>
        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="shuffle-play"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> Shuffle Play</button>
          <button class="edit-playlist-tool" data-action="add-songs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Songs</button>
          <button class="edit-playlist-tool edit-playlist-tool-danger" data-action="delete-playlist"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>
        </div>
        <div class="edit-playlist-songs" id="edit-playlist-songs" data-playlist-id="${Utils.esc(pl.id)}">
          ${songs
      .map((item, i) =>
        item.song
          ? `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${item.song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <img src="${item.song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info"><p class="edit-playlist-song-title">${Utils.esc(item.song.title)}</p><p class="edit-playlist-song-artist">${Utils.esc(item.song.artist || '')} • ${Utils.esc(item.song.album || '')}</p></div>
              <span class="edit-playlist-song-time">${item.song.duration || ''}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          `
          : `
            <div class="edit-playlist-song-row edit-playlist-song-missing" data-index="${i}">
              <div class="edit-playlist-drag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <p class="edit-playlist-song-title">Unknown song</p>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}">Remove</button>
            </div>
          `,
      )
      .join('')}
        </div>
        ${!pl.songs.length ? `<div class="edit-playlist-empty"><div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div><h3 class="edit-playlist-empty-title">No songs yet</h3><p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p></div>` : ''}
      </div>
    `;
  }

  _coverPreview(pl) {
    const state = this.ui.state;
    const songs = pl.songs
      .map((sid) => state.getSongById(sid))
      .filter(Boolean)
      .slice(0, 4);
    if (!songs.length)
      return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1)
      return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((s) => `<img src="${s.coverUrl}" class="edit-cover-quarter" alt="">`).join('')}</div>`;
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
          <div class="note"><p>Error 404 — The requested resource could not be found.</p></div>
        </div>
      </div>
    `;
  }
}




window.Home = Home;
window.Library = Library;
window.Favorites = Favorites;
window.Playlists = Playlists;
window.Artists = Artists;
window.EditPlaylist = EditPlaylist;
window.Error404 = Error404;