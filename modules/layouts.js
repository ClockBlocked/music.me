// ---------------------------------------------------------------------
// Home — Bento redesign (ported from home.html), wired to live data.
//   • Recently Played starts with 15 songs and live-updates as you listen
//   • All icons come from icons.js (Icons.*)
//   • "..." buttons reuse the global song dropdown (showSongMenu)
//   • Right-click uses the dynamic ContextMenu (per data-* attributes)
//   • Live updates animate in place — no page reloads
// ---------------------------------------------------------------------
// layouts.js
import { Utils, IdUtils } from "./utilities.js";
import { Icons } from "./icons.js";


export class Home {
  constructor(ui) {
    this.ui = ui;
    this.RECENT_LIMIT = 15;
    this.MOST_PLAYED_LIMIT = 3;
    this._bindLiveUpdates();
  }

  // -------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------
  buildAllSongs(state) {
    return state.enrichedLibrary.flatMap(artist =>
      artist.albums.flatMap(album =>
        album.songs.map(song => ({
          ...song,
          artistId: artist.id,
          albumId: album.id,
          artist: artist.artist,
          album: album.album,
          coverUrl: album.coverUrl,
          artistImageUrl: artist.imageUrl,
          genre: artist.genre || ''
        }))
      )
    );
  }

  buildAllAlbums(state) {
    return state.enrichedLibrary.flatMap(a =>
      a.albums.map(alb => ({
        artistId: a.id,
        artistName: a.artist,
        albumId: alb.id,
        albumName: alb.album,
        coverUrl: alb.coverUrl,
        genre: a.genre || '',
        year: alb.year || '2024',
        songCount: alb.songs.length,
        songs: alb.songs
      }))
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

  pickFeaturedRelease(state) {
    const albums = this.buildAllAlbums(state).filter(a => a.coverUrl);
    if (!albums.length) return null;
    return this.shuffle(albums)[0];
  }

  getRecent(state) {
    return (state.recentlyPlayed || [])
      .slice(0, this.RECENT_LIMIT)
      .map(s => state.getSongById(s.id) || s)
      .filter(Boolean);
  }

  getMostPlayed(state) {
    const songs = typeof state.getMostPlayed === 'function'
      ? state.getMostPlayed(this.MOST_PLAYED_LIMIT)
      : [];
    return songs.map(s => ({ song: s, plays: state.getPlayCount ? state.getPlayCount(s.id) : 0 }));
  }

  getLibraryCounts(state) {
    return {
      songs: this.buildAllSongs(state).length,
      albums: this.buildAllAlbums(state).length,
      artists: state.enrichedLibrary.length,
      playlists: (state.playlists || []).length
    };
  }

  getFavoritesSummary(state) {
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;

    let coverUrl = '';
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

  escapeHtml(text) {
    if (text == null) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // -------------------------------------------------------------------
  // Row templates (shared by initial render AND live insertions)
  // -------------------------------------------------------------------
  songRow(s) {
    const isFav = this.ui.favorites.isSongFavorite(s.id);
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.escapeHtml(s.title || 'Unknown Title');
    return `
      <article
        class="song${isPlaying ? ' is-playing' : ''}"
        data-song-id="${this.escapeHtml(s.id)}"
        data-artist-id="${this.escapeHtml(s.artistId ?? '')}"
        data-album-id="${this.escapeHtml(s.albumId ?? '')}"
      >
        <div class="songArtwork">
          <img src="${this.escapeHtml(s.coverUrl || '')}" alt="${title}" loading="lazy">
          <button type="button" class="songArtworkOverlay" aria-label="Play ${title}" data-action="play">
            <span class="playIcon" aria-hidden="true">${Icons.player.play(13)}</span>
          </button>
        </div>
        <div class="songInformation">
          <span class="songArtist">${this.escapeHtml(s.artist || 'Unknown Artist')}</span>
          <span class="songTitle">${title}</span>
          <div class="songMeta">
            <span class="songAlbum">${this.escapeHtml(s.album || '')}</span>
            <span aria-hidden="true">&bull;</span>
            <span class="songDuration">${this.escapeHtml(s.duration || '')}</span>
          </div>
        </div>
        <div class="songActions">
          <button type="button" class="songAction favorite${isFav ? ' is-favorite favorited' : ''}" aria-label="Favorite song" data-fav-song="${this.escapeHtml(s.id)}">
            ${this.ui.likeStatus('song', isFav, false, null)}
          </button>
          <button type="button" class="songAction" aria-label="More options" data-more-song="${this.escapeHtml(s.id)}">
            ${Icons.general.moreVert(18)}
          </button>
        </div>
      </article>
    `;
  }

  rankRow(entry, index) {
    const s = entry.song;
    const isPlaying = String(this.ui.state.currentSong?.id) === String(s.id);
    const title = this.escapeHtml(s.title || 'Unknown Title');
    const plays = entry.plays;
    return `
      <article
        class="rankItem${isPlaying ? ' is-playing' : ''}"
        data-song-id="${this.escapeHtml(s.id)}"
        data-artist-id="${this.escapeHtml(s.artistId ?? '')}"
        data-album-id="${this.escapeHtml(s.albumId ?? '')}"
      >
        <span class="rankNumber">${String(index + 1).padStart(2, '0')}</span>
        <div class="rankArtwork">
          <img src="${this.escapeHtml(s.coverUrl || '')}" alt="${title}" loading="lazy">
        </div>
        <div class="rankInformation">
          <span class="rankTitle">${title}</span>
          <span class="rankSubtitle">${this.escapeHtml(s.artist || 'Unknown Artist')}</span>
        </div>
        <span class="rankCount">${plays} play${plays === 1 ? '' : 's'}</span>
      </article>
    `;
  }

  emptyNote(text) {
    return `<div class="hp-empty">${this.escapeHtml(text)}</div>`;
  }

  // -------------------------------------------------------------------
  // Card sections
  // -------------------------------------------------------------------
  renderHeader() {
    return `
      <header class="pageHeader">
        <div class="pageHeaderContent">
          <span class="pageKicker">Your Music</span>
          <h1 class="pageTitle">Music Library</h1>
          <p class="pageDescription">
            Pick up where you left off, discover new releases,
            and explore your music collection.
          </p>
        </div>
        <button type="button" class="headerAction" data-nav="library">
          View Library
        </button>
      </header>
    `;
  }

  cardHead(kicker, title, action, label) {
    return `
      <header class="musicCardHeader">
        <div class="cardHeading">
          <span class="cardKicker">${kicker}</span>
          <h2 class="cardTitle">${title}</h2>
        </div>
        <button type="button" class="cardAction" aria-label="${label}" data-action="${action}">
          ${Icons.general.arrowRight(16)}
        </button>
      </header>
    `;
  }

  renderRecentlyPlayed(recent) {
    return `
      <article class="musicCard recentlyPlayed" data-card="recents">
        ${this.cardHead('Your Activity', 'Recently Played', 'view-recents', 'View recently played')}
        <div class="cardContent">
          <div class="songList" id="recentSongs" aria-label="Recently played songs">
            ${recent.length
              ? recent.map(s => this.songRow(s)).join('')
              : this.emptyNote('Nothing here yet — play a song and it will appear at the top of this list.')}
          </div>
        </div>
      </article>
    `;
  }

  renderNewRelease(rel) {
    if (!rel) return '';
    const playData = this.escapeHtml(JSON.stringify({ artistId: rel.artistId, albumId: rel.albumId }));
    return `
      <article
        class="musicCard releasesCard"
        data-card="releases"
        data-artist-id="${this.escapeHtml(rel.artistId)}"
        data-album-id="${this.escapeHtml(rel.albumId)}"
      >
        ${this.cardHead('Discover', 'New Release', 'view-releases', 'View all releases')}
        <div class="releaseFeature">
          <img class="releaseBackground" src="${this.escapeHtml(rel.coverUrl)}" alt="${this.escapeHtml(rel.albumName)}">
          <div class="releaseInfo">
            <span class="releaseLabel">Featured Album</span>
            <h3 class="releaseTitle">${this.escapeHtml(rel.albumName)}</h3>
            <p class="releaseArtist">${this.escapeHtml(rel.artistName)}</p>
            <div class="releaseControls">
              <button type="button" class="primaryPlay" aria-label="Play album" data-play-album='${playData}'>
                ${Icons.player.play(18)}
              </button>
              <button type="button" class="secondaryControl" aria-label="Add album to queue" data-action="add-album-to-queue" data-album-id="${this.escapeHtml(rel.albumId)}">
                ${Icons.general.plus(18)}
              </button>
              <button type="button" class="secondaryControl" aria-label="More album options" data-release-more data-artist-id="${this.escapeHtml(rel.artistId)}" data-album-id="${this.escapeHtml(rel.albumId)}">
                ${Icons.general.moreVert(18)}
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderMostPlayed(mostPlayed) {
    return `
      <article class="musicCard mostPlayed" data-card="most-played">
        ${this.cardHead('Statistics', 'Most Played', 'view-most-played', 'View most played')}
        <div class="cardContent">
          <div class="rankList" id="mostPlayedSongs">
            ${mostPlayed.length
              ? mostPlayed.map((e, i) => this.rankRow(e, i)).join('')
              : this.emptyNote('Your most played songs will show up here once you start listening.')}
          </div>
        </div>
      </article>
    `;
  }

  renderLibraryCard(counts) {
    const items = [
      { key: 'songs',     label: 'Songs',     count: counts.songs,     icon: Icons.general.musicNote(18) },
      { key: 'albums',    label: 'Albums',    count: counts.albums,    icon: Icons.general.album(18) },
      { key: 'artists',   label: 'Artists',   count: counts.artists,   icon: Icons.general.artist(18) },
      { key: 'playlists', label: 'Playlists', count: counts.playlists, icon: Icons.general.playlistAdd(18) }
    ];
    return `
      <article class="musicCard libraryCard" data-card="library">
        ${this.cardHead('Collection', 'Your Library', 'open-library', 'Open library')}
        <div class="cardContent">
          <div class="libraryGrid">
            ${items.map(it => `
              <button type="button" class="libraryItem" data-library="${it.key}">
                <span class="libraryIcon" aria-hidden="true">${it.icon}</span>
                <span class="libraryName">${it.label}</span>
                <span class="libraryCount">${it.count} ${it.label.toLowerCase()}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </article>
    `;
  }

  favoritesCardInner() {
    const f = this.getFavoritesSummary(this.ui.state);
    const total = f.songCount + f.albumCount + f.artistCount;
    return `
      <div class="favoriteHero">
        ${f.coverUrl ? `<img class="favoriteArtwork" src="${this.escapeHtml(f.coverUrl)}" alt="Favorite album artwork">` : ''}
        <div class="favoriteInfo">
          <h3 class="favoriteTitle">Your Favorite Music</h3>
          <p class="favoriteSubtitle">
            ${total
              ? `${f.songCount} song${f.songCount === 1 ? '' : 's'} &bull; ${f.albumCount} album${f.albumCount === 1 ? '' : 's'} &bull; ${f.artistCount} artist${f.artistCount === 1 ? '' : 's'}`
              : 'Your most-loved songs and albums.'}
          </p>
        </div>
      </div>
    `;
  }

  renderFavoritesCard() {
    return `
      <article class="musicCard favoritesCard" data-card="favorites">
        ${this.cardHead('Your Collection', 'Favorites', 'view-favorites', 'View favorites')}
        <div class="favoriteContent" id="homeFavoritesCard">
          ${this.favoritesCardInner()}
        </div>
      </article>
    `;
  }

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------
  render() {
    const state = this.ui.state;
    const html = `
      <div data-page="home" class="hp pageSection">
        <div class="container">
          ${this.renderHeader()}
          <section class="bentoGrid" aria-label="Music dashboard">
            ${this.renderRecentlyPlayed(this.getRecent(state))}
            ${this.renderNewRelease(this.pickFeaturedRelease(state))}
            ${this.renderMostPlayed(this.getMostPlayed(state))}
            ${this.renderLibraryCard(this.getLibraryCounts(state))}
            ${this.renderFavoritesCard()}
          </section>

          ${this.renderHomeRails(state)}
        </div>
      </div>
    `;
    this._bindWhenReady();
    return html;
  }


  // -------------------------------------------------------------------
  // Teaser rails — compact previews of the Library (Browse) page.
  // The arrow takes you to the full view.
  // -------------------------------------------------------------------
  renderHomeRails(state) {
    const lib = this.ui.libraryPage;
    if (!lib) return '';

    const albums = [...lib.allAlbums(state)].reverse().slice(0, 8);
    const artists = lib.allArtists(state).sort((a, b) => b.songCount - a.songCount).slice(0, 6);
    const genres = lib.allGenres(state).slice(0, 8);

    const rail = (title, sub, cards) => `
      <section>
        <div class="railHead">
          <div>
            <h2 class="railTitle">${title}</h2>
            <p class="railSub">${sub}</p>
          </div>
          <button type="button" class="railArrow" data-nav="library" aria-label="Open full view in Library">
            ${Icons.general.arrowRight(16)}
          </button>
        </div>
        <div class="railScroll">${cards}</div>
      </section>
    `;

    return `
      <div class="bp homeRails">
        ${albums.length ? rail('Recently Added', 'New additions to your collection — hover for details', albums.map(a => lib.albumCard(a)).join('')) : ''}
        ${artists.length ? rail('Popular Artists', 'The most music in your collection', artists.map(a => lib.artistCard(a)).join('')) : ''}
        ${genres.length ? rail('Browse by Genre', 'Find something based on the mood', genres.map(g => lib.genreCard(g)).join('')) : ''}
      </div>
    `;
  }

  // The UIManager swaps innerHTML ~300ms after render() returns,
  // so poll briefly until the fresh home root exists, then bind.
  _bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="home"].hp');
    if (root) {
      this.bindEvents(root);
    } else if (attempts < 60) {
      setTimeout(() => this._bindWhenReady(attempts + 1), 50);
    }
  }

  _root() {
    return document.querySelector('[data-page="home"].hp');
  }

  // -------------------------------------------------------------------
  // Event binding — one delegated listener on the home root.
  // (Hearts, "..." dropdowns, album play/queue buttons on the initial
  //  render are wired by ContentEventManager with stopPropagation, so
  //  this delegation only ever sees what those didn't claim.)
  // -------------------------------------------------------------------
  bindEvents(root) {
    if (!root || root._homeDelegated) return;
    root._homeDelegated = true;

    root.addEventListener('click', (e) => {
      const ui = this.ui;
      const state = ui.state;

      // Play overlay on a song row
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

      // "..." on rows added live (initial rows are handled globally)
      const moreBtn = e.target.closest('[data-more-song]');
      if (moreBtn) {
        e.stopPropagation();
        ui.contentEvents.showSongMenu(moreBtn.dataset.moreSong, e);
        return;
      }

      // Album "..." (rails + release card) → dynamic album context menu
      const albumMore = e.target.closest('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId
        });
        return;
      }

      // Artist rail buttons
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

      // Genre rail cards
      const genreCard = e.target.closest('.genreCard[data-genre]');
      if (genreCard) {
        e.stopPropagation();
        if (window.pagesActions?.playGenre) window.pagesActions.playGenre(genreCard.dataset.genre);
        return;
      }

      // Release card "..." → dynamic album context menu
      const releaseMore = e.target.closest('[data-release-more]');
      if (releaseMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: releaseMore.dataset.artistId,
          albumId: releaseMore.dataset.albumId
        });
        return;
      }

      // Card header arrows / header button
      const navBtn = e.target.closest('[data-nav], .cardAction[data-action]');
      if (navBtn) {
        e.stopPropagation();
        const dest = navBtn.dataset.nav || {
          'view-recents': 'library',
          'view-releases': 'library',
          'view-most-played': 'library',
          'open-library': 'library',
          'view-favorites': 'favorites'
        }[navBtn.dataset.action];
        if (dest) ui.navigate(dest);
        return;
      }

      // Library tiles
      const libItem = e.target.closest('.libraryItem[data-library]');
      if (libItem) {
        e.stopPropagation();
        ui.navigate(libItem.dataset.library === 'playlists' ? 'playlists' : 'library');
        return;
      }

      // Favorites card body
      if (e.target.closest('.favoriteContent')) {
        e.stopPropagation();
        ui.navigate('favorites');
        return;
      }

      // Song rows (Recently Played) + rank rows (Most Played) → play
      const row = e.target.closest('.song[data-song-id], .rankItem[data-song-id]');
      if (row) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        const song = state.getSongById(row.dataset.songId);
        if (song) ui.audioPlayer.playSong(song, null, true, 'home');
        return;
      }
    });
  }

  // Hydrate a row inserted at runtime: hearts get the full
  // setupHeartButton behavior (hover/temp states), "..." gets the dropdown.
  _hydrateRow(row) {
    const songId = row.dataset.songId;
    const heart = row.querySelector('[data-fav-song]');
    if (heart) this.ui.contentEvents.setupHeartButton(heart, 'song', heart.dataset.favSong);
    const more = row.querySelector('[data-more-song]');
    if (more && !more._homeMoreBound) {
      more._homeMoreBound = true;
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(songId, e);
      });
    }
  }

  // -------------------------------------------------------------------
  // Live updates — the page never reloads; rows/cards animate in place.
  // -------------------------------------------------------------------
  _bindLiveUpdates() {
    if (Home._liveBound) return;
    Home._liveBound = true;
    window.addEventListener('mybeats:recently-played', (e) => this._onRecentlyPlayed(e.detail?.song));
    window.addEventListener('mybeats:playback-change', () => this._syncNowPlaying());
    window.addEventListener('mybeats:favorites-changed', () => this._syncFavorites());
    window.addEventListener('mybeats:play-counts', () => this._syncMostPlayed());
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

    // FLIP snapshot of current positions
    const kids = [...list.querySelectorAll('.song')];
    const tops = new Map(kids.map(k => [k, k.getBoundingClientRect().top]));
    const animateSiblings = () => {
      kids.forEach(k => {
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
      // Song re-played: glide it back to the top
      if (list.firstElementChild !== existing) {
        list.prepend(existing);
        animateSiblings();
      }
      existing.classList.remove('song-bump');
      void existing.offsetWidth; // restart animation
      existing.classList.add('song-bump');
      setTimeout(() => existing.classList.remove('song-bump'), 900);
    } else {
      // Brand-new entry: push it onto the top of the list
      const tpl = document.createElement('template');
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add('song-enter');
      list.prepend(row);
      animateSiblings();
      this._hydrateRow(row);
      row.addEventListener('animationend', () => row.classList.remove('song-enter'), { once: true });
    }

    this._syncNowPlaying();

    // Keep the list capped; overflow rows slide out
    const rows = [...list.querySelectorAll('.song')];
    rows.slice(this.RECENT_LIMIT).forEach((row) => {
      row.classList.add('song-exit');
      row.addEventListener('animationend', () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400); // safety
    });
  }

  _syncNowPlaying() {
    if (!this._isActive()) return;
    const root = this._root();
    const id = this.ui.state.currentSong?.id;
    root.querySelectorAll('.song.is-playing, .rankItem.is-playing')
      .forEach(el => el.classList.remove('is-playing'));
    if (id == null) return;
    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root.querySelectorAll(`.song${sel}, .rankItem${sel}`)
      .forEach(el => el.classList.add('is-playing'));
  }

  _syncFavorites() {
    if (!this._isActive()) return;
    const root = this._root();
    const fav = this.ui.favorites;

    // Heart buttons (skip any mid-animation from setupHeartButton)
    root.querySelectorAll('[data-fav-song]').forEach(btn => {
      if (btn.classList.contains('heart-busy')) return;
      const isFav = fav.isSongFavorite(btn.dataset.favSong);
      btn.classList.toggle('is-favorite', isFav);
      btn.classList.toggle('favorited', isFav);
      const html = this.ui.likeStatus('song', isFav, false, null);
      if (btn.innerHTML.trim() !== html.trim()) {
        btn.innerHTML = html;
        btn.classList.remove('heart-pop');
        void btn.offsetWidth;
        btn.classList.add('heart-pop');
        setTimeout(() => btn.classList.remove('heart-pop'), 420);
      }
    });

    // Favorites card (artwork + counts), softly cross-faded
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
      : this.emptyNote('Your most played songs will show up here once you start listening.');
    list.classList.remove('hp-swap');
    void list.offsetWidth;
    list.classList.add('hp-swap');
    this._syncNowPlaying();
  }

  destroy() {}
}


// ---------------------------------------------------------------------
// Library — Browse page (ported from library.html), wired to live data.
//   Tabs: Overview / Songs / Albums / Artists / Playlists / Genres
//   Filters: Artist / Genre / Year / Decade   Sort • Grid/List toggle
//   Album cards reveal rich details in a polished hover overlay.
// ---------------------------------------------------------------------
export class Library {
  constructor(ui) {
    this.ui = ui;
    this.view = 'overview';      // overview | songs | albums | artists | playlists | genres
    this.filter = { type: 'all', value: null, label: '' };
    this.sort = 'recent';        // recent | title | artist | yearDesc | yearAsc | mostPlayed
    this.mode = 'grid';          // grid | list
    this.query = '';
  }

  // -------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------
  allSongs(state) {
    return state.enrichedLibrary.flatMap(a =>
      a.albums.flatMap(alb =>
        alb.songs.map(s => ({
          ...s,
          artistId: a.id,
          albumId: alb.id,
          artist: a.artist,
          album: alb.album,
          coverUrl: alb.coverUrl,
          genre: a.genre || '',
          year: alb.year || ''
        }))
      )
    );
  }

  allAlbums(state) {
    return state.enrichedLibrary.flatMap(a =>
      a.albums.map(alb => {
        const totalSeconds = alb.songs.reduce((sum, s) => {
          const p = String(s.duration || '0:0').split(':');
          return sum + (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
        }, 0);
        const plays = alb.songs.reduce((sum, s) => sum + (state.getPlayCount ? state.getPlayCount(s.id) : 0), 0);
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
          plays
        };
      })
    );
  }

  allArtists(state) {
    return state.enrichedLibrary.map(a => ({
      id: a.id,
      name: a.artist,
      imageUrl: a.imageUrl,
      genre: a.genre || '',
      albumCount: a.albums.length,
      songCount: a.albums.reduce((n, alb) => n + alb.songs.length, 0),
      plays: a.albums.reduce((n, alb) =>
        n + alb.songs.reduce((m, s) => m + (state.getPlayCount ? state.getPlayCount(s.id) : 0), 0), 0)
    }));
  }

  allGenres(state) {
    const map = new Map();
    this.allSongs(state).forEach(s => {
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

  esc(text) { return Utils.escapeHtml(text == null ? '' : String(text)); }

  // -------------------------------------------------------------------
  // Filter + query + sort pipeline
  // -------------------------------------------------------------------
  pipeline(items) {
    let out = [...items];
    const f = this.filter;
    if (f.type !== 'all' && f.value != null) {
      out = out.filter(it => {
        if (f.type === 'artist') return String(it.artistId ?? it.id) === String(f.value);
        if (f.type === 'genre') return (it.genre || '').toLowerCase() === String(f.value).toLowerCase();
        if (f.type === 'year') return String(it.year || '') === String(f.value);
        if (f.type === 'decade') return it.year && Math.floor(Number(it.year) / 10) * 10 === Number(f.value);
        return true;
      });
    }
    if (this.query.trim()) {
      const q = this.query.trim().toLowerCase();
      out = out.filter(it =>
        [it.title, it.albumName, it.name, it.album, it.artist, it.artistName, it.genre]
          .filter(Boolean)
          .some(t => String(t).toLowerCase().includes(q))
      );
    }
    const by = {
      title: (a, b) => String(a.title ?? a.albumName ?? a.name ?? '').localeCompare(String(b.title ?? b.albumName ?? b.name ?? '')),
      artist: (a, b) => String(a.artist ?? a.artistName ?? a.name ?? '').localeCompare(String(b.artist ?? b.artistName ?? b.name ?? '')),
      yearDesc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0),
      yearAsc: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
      mostPlayed: (a, b) => (b.plays || 0) - (a.plays || 0)
    }[this.sort];
    if (by) out.sort(by);
    return out; // 'recent' keeps natural library order
  }

  // -------------------------------------------------------------------
  // Card templates
  // -------------------------------------------------------------------
  albumCard(alb) {
    const isFav = this.ui.favorites.isAlbumFavorite(alb.albumId);
    const playData = this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.albumId }));
    const meta = [
      `${alb.songCount} song${alb.songCount === 1 ? '' : 's'}`,
      this.minutes(alb.totalSeconds),
      alb.plays ? `${alb.plays} play${alb.plays === 1 ? '' : 's'}` : ''
    ].filter(Boolean).join(' • ');
    return `
      <article class="albumCard" data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}" tabindex="0" aria-label="${this.esc(alb.albumName)}">
        <div class="albumArtwork">
          <img src="${this.esc(alb.coverUrl || '')}" alt="${this.esc(alb.albumName)}" loading="lazy">
          <button class="albumPlay" type="button" aria-label="Play ${this.esc(alb.albumName)}" data-play-album='${playData}'>${Icons.player.play(16)}</button>
          <div class="albumHover">
            <div class="albumHoverTop">
              ${alb.year ? `<span class="albumBadge">${this.esc(alb.year)}</span>` : ''}
              ${alb.genre ? `<span class="albumBadge albumBadgeGenre">${this.esc(alb.genre)}</span>` : ''}
            </div>
            <div class="albumHoverBody">
              <h3 class="albumHoverTitle">${this.esc(alb.albumName)}</h3>
              <p class="albumHoverArtist">${this.esc(alb.artistName)}</p>
              <p class="albumHoverMeta">${meta}</p>
            </div>
            <div class="albumHoverActions">
              <button type="button" class="albumHoverPlay" data-play-album='${playData}'>${Icons.player.play(13)} Play</button>
              <button type="button" class="albumHoverBtn${isFav ? ' favorited' : ''}" aria-label="Favorite album" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-action="toggle-favorite-album" data-album-id="${this.esc(alb.albumId)}">${Icons.general.heart(16, isFav)}</button>
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
          <button type="button" class="tableAction" aria-label="Play" data-play-album='${this.esc(JSON.stringify({ artistId: alb.artistId, albumId: alb.albumId }))}'>${Icons.player.play(14)}</button>
          <button type="button" class="tableAction" aria-label="More options" data-album-more data-artist-id="${this.esc(alb.artistId)}" data-album-id="${this.esc(alb.albumId)}">${Icons.general.moreVert(16)}</button>
        </div>
      </div>
    `;
  }

  artistCard(a) {
    return `
      <article class="artistCard" data-artist-id="${this.esc(a.id)}">
        <div class="artistPortrait">
          <img src="${this.esc(a.imageUrl || '')}" alt="${this.esc(a.name)}" loading="lazy">
        </div>
        <div class="artistInfo">
          <span class="artistName">${this.esc(a.name)}</span>
          <p class="artistDetails">${a.albumCount} album${a.albumCount === 1 ? '' : 's'} • ${a.songCount} song${a.songCount === 1 ? '' : 's'}</p>
          <div class="artistActions">
            <button type="button" class="artistButton primary" data-artist-open="${this.esc(a.id)}">View Artist</button>
            <button type="button" class="artistButton" data-artist-play="${this.esc(a.id)}">Play</button>
          </div>
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
    const covers = pl.songs.map(id => state.getSongById(id)).filter(Boolean).map(s => s.coverUrl).filter(Boolean);
    while (covers.length < 4 && covers.length) covers.push(covers[covers.length % Math.max(covers.length, 1)] || '');
    return `
      <article class="playlistCard" data-playlist-id="${this.esc(pl.id)}">
        <div class="playlistMosaic">
          ${covers.slice(0, 4).map(c => `<img src="${this.esc(c)}" alt="" loading="lazy">`).join('') || `<div class="playlistMosaicEmpty">${Icons.general.playlist(28)}</div>`}
        </div>
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
    return `
      <article class="genreCard" data-genre="${this.esc(g.name)}">
        <h3 class="genreName">${this.esc(g.name)}</h3>
        <p class="genreCount">${g.count} song${g.count === 1 ? '' : 's'}</p>
      </article>
    `;
  }

  songRow(s, i, queue) {
    const isFav = this.ui.favorites.isSongFavorite(s.id);
    return `
      <tr data-song-id="${this.esc(s.id)}" data-artist-id="${this.esc(s.artistId)}" data-album-id="${this.esc(s.albumId)}" data-context='${this.esc(JSON.stringify({ artistId: s.artistId, albumId: s.albumId }))}'>
        <td class="tableNum">${i + 1}</td>
        <td>
          <div class="tableSong">
            <div class="tableArtwork"><img src="${this.esc(s.coverUrl || '')}" alt="" loading="lazy"></div>
            <div class="tableSongInformation">
              <span class="tableSongTitle">${this.esc(s.title)}</span>
              <span class="tableSongArtist">${this.esc(s.artist)}</span>
            </div>
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
    return `
      <div class="emptyState">
        <div class="emptyIcon">${Icons.general.search(34)}</div>
        <h3 class="emptyTitle">${this.esc(title)}</h3>
        <p class="emptyDescription">${this.esc(desc)}</p>
      </div>
    `;
  }

  sectionHead(title, sub) {
    return `
      <div class="resultsHeader">
        <div>
          <h2 class="resultsTitle">${this.esc(title)}</h2>
          <p class="resultsSubtitle">${this.esc(sub)}</p>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------
  contentFor(view) {
    const state = this.ui.state;

    if (view === 'songs') {
      const songs = this.pipeline(this.allSongs(state));
      if (!songs.length) return this.emptyState('No songs match', 'Try clearing your search or filters.');
      return `
        <div class="songTableWrapper">
          <table class="songTable">
            <thead>
              <tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr>
            </thead>
            <tbody>${songs.map((s, i) => this.songRow(s, i)).join('')}</tbody>
          </table>
        </div>
      `;
    }

    if (view === 'albums') {
      const albums = this.pipeline(this.allAlbums(state));
      if (!albums.length) return this.emptyState('No albums match', 'Try clearing your search or filters.');
      return this.mode === 'grid'
        ? `<div class="albumGrid">${albums.map(a => this.albumCard(a)).join('')}</div>`
        : `<div class="rowsList">${albums.map(a => this.albumRow(a)).join('')}</div>`;
    }

    if (view === 'artists') {
      const artists = this.pipeline(this.allArtists(state));
      if (!artists.length) return this.emptyState('No artists match', 'Try clearing your search or filters.');
      return this.mode === 'grid'
        ? `<div class="artistGrid">${artists.map(a => this.artistCard(a)).join('')}</div>`
        : `<div class="rowsList">${artists.map(a => this.artistRow(a)).join('')}</div>`;
    }

    if (view === 'playlists') {
      const pls = (state.playlists || []).filter(pl =>
        !this.query.trim() || pl.name.toLowerCase().includes(this.query.trim().toLowerCase()));
      if (!pls.length) return this.emptyState('No playlists yet', 'Create a playlist and it will show up here.');
      return `<div class="playlistGrid">${pls.map(pl => this.playlistCard(pl, state)).join('')}</div>`;
    }

    if (view === 'genres') {
      const genres = this.pipeline(this.allGenres(state));
      if (!genres.length) return this.emptyState('No genres found', 'Your library genres will appear here.');
      return `<div class="genreGrid">${genres.map(g => this.genreCard(g)).join('')}</div>`;
    }

    // ---- overview ----
    const albums = this.allAlbums(state);
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists(state)).sort((a, b) => b.songCount - a.songCount).slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres(state).slice(0, 8);

    return `
      ${recentAlbums.length ? `
        <section>
          ${this.sectionHead('Recently Added', 'New additions to your collection.')}
          <div class="albumGrid">${recentAlbums.map(a => this.albumCard(a)).join('')}</div>
        </section>` : ''}
      ${artists.length ? `
        <section style="margin-top: 3rem">
          ${this.sectionHead('Popular Artists', 'Artists with the most music in your collection.')}
          <div class="artistGrid">${artists.map(a => this.artistCard(a)).join('')}</div>
        </section>` : ''}
      ${playlists.length ? `
        <section style="margin-top: 3rem">
          ${this.sectionHead('Explore Playlists', 'Curated collections ready to explore.')}
          <div class="playlistGrid">${playlists.map(pl => this.playlistCard(pl, state)).join('')}</div>
        </section>` : ''}
      ${genres.length ? `
        <section style="margin-top: 3rem">
          ${this.sectionHead('Browse by Genre', 'Find something based on the mood.')}
          <div class="genreGrid">${genres.map(g => this.genreCard(g)).join('')}</div>
        </section>` : ''}
    `;
  }

  countFor(view) {
    const state = this.ui.state;
    const fmt = n => `${n.toLocaleString()} item${n === 1 ? '' : 's'}`;
    switch (view) {
      case 'songs': return fmt(this.pipeline(this.allSongs(state)).length);
      case 'albums': return fmt(this.pipeline(this.allAlbums(state)).length);
      case 'artists': return fmt(this.pipeline(this.allArtists(state)).length);
      case 'playlists': return fmt((state.playlists || []).length);
      case 'genres': return fmt(this.pipeline(this.allGenres(state)).length);
      default: {
        const total = this.allAlbums(state).length + this.allArtists(state).length +
          (state.playlists || []).length + this.allGenres(state).length;
        return fmt(total);
      }
    }
  }

  viewMeta(view) {
    return {
      overview: ['Explore Your Collection', 'A curated overview of your music.'],
      songs: ['All Songs', 'Every track in your library.'],
      albums: ['All Albums', 'Hover an album for the full story.'],
      artists: ['All Artists', 'The people behind your music.'],
      playlists: ['All Playlists', 'Your curated collections.'],
      genres: ['All Genres', 'Browse by mood and style.']
    }[view] || ['', ''];
  }

  sortLabel() {
    return {
      recent: 'Recently Added', title: 'Title A–Z', artist: 'Artist A–Z',
      yearDesc: 'Newest First', yearAsc: 'Oldest First', mostPlayed: 'Most Played'
    }[this.sort];
  }

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------
  render() {
    const tabs = [
      ['overview', 'Overview'], ['songs', 'Songs'], ['albums', 'Albums'],
      ['artists', 'Artists'], ['playlists', 'Playlists'], ['genres', 'Genres']
    ];
    const f = this.filter;
    const filterBtn = (type, label) => {
      const active = f.type === type;
      return `
        <button type="button" class="filterButton${active ? ' has-filter is-active' : ''}" data-filter="${type}">
          ${active ? this.esc(f.label) : label}
          <span class="filterArrow">${Icons.general.chevronDown()}</span>
        </button>
      `;
    };
    const [title, sub] = this.viewMeta(this.view);

    const html = `
      <div data-page="library" class="bp browsePage">
        <div class="browseContainer">
          <header class="browseHeader">
            <div>
              <span class="browseKicker">Explore</span>
              <h1 class="browseTitle">Browse Music</h1>
              <p class="browseDescription">Explore songs, albums, artists, playlists, genres, and everything else in your music collection.</p>
            </div>

            <div class="searchWrapper">
              <span class="searchIcon" aria-hidden="true">${Icons.general.search(16)}</span>
              <input type="search" class="librarySearch" id="librarySearch" placeholder="Search songs, artists, albums, playlists..." autocomplete="off" value="${this.esc(this.query)}">
            </div>

            <nav class="browseNavigation" aria-label="Browse categories">
              ${tabs.map(([key, label]) => `
                <button class="browseTab${this.view === key ? ' is-active' : ''}" type="button" data-view="${key}">${label}</button>
              `).join('')}
            </nav>

            <div class="filterToolbar">
              <div class="filterGroup">
                <button type="button" class="filterButton${f.type === 'all' ? ' is-active' : ''}" data-filter="all">All</button>
                ${filterBtn('artist', 'Artist')}
                ${filterBtn('genre', 'Genre')}
                ${filterBtn('year', 'Year')}
                ${filterBtn('decade', 'Decade')}
              </div>
              <div class="displayControls">
                <button type="button" class="sortButton" data-action="sort">
                  ${this.sortLabel()}
                  <span>${Icons.general.chevronDown()}</span>
                </button>
                <div class="viewToggle" aria-label="Display mode">
                  <button type="button" class="viewButton${this.mode === 'grid' ? ' is-active' : ''}" aria-label="Grid view" data-view-mode="grid">${Icons.general.grid(15)}</button>
                  <button type="button" class="viewButton${this.mode === 'list' ? ' is-active' : ''}" aria-label="List view" data-view-mode="list">${Icons.general.list(15)}</button>
                </div>
              </div>
            </div>
          </header>

          <div class="resultsHeader" id="browseResultsHeader">
            <div>
              <h2 class="resultsTitle">${title}</h2>
              <p class="resultsSubtitle">${sub}</p>
            </div>
            <span class="resultsCount" id="browseResultsCount">${this.countFor(this.view)}</span>
          </div>

          <section class="dynamicContent" id="browseContent" aria-live="polite">
            <div class="loadingLayer is-hidden" id="loadingLayer" aria-hidden="true">
              <div class="loadingContent">
                <div class="loadingSpinner" aria-hidden="true"></div>
                <div>
                  <div class="loadingTitle">Searching your library…</div>
                  <p class="loadingDescription">Finding the music that matches your selection.</p>
                </div>
              </div>
            </div>
            <div class="contentSection" data-content-view="${this.view}">
              ${this.contentFor(this.view)}
            </div>
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
    else if (attempts < 60) setTimeout(() => this._bindWhenReady(attempts + 1), 50);
  }

  _root() { return document.querySelector('[data-page="library"].bp'); }

  // -------------------------------------------------------------------
  // Content refresh (tab / filter / sort / search / view-mode changes)
  // re-renders only the results area — the header keeps its state.
  // -------------------------------------------------------------------
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
      root.querySelectorAll('.browseTab').forEach(t =>
        t.classList.toggle('is-active', t.dataset.view === this.view));
      this.hydrate(root.querySelector('#browseContent'));
    };
    if (withLoading) {
      const layer = root.querySelector('#loadingLayer');
      layer?.classList.remove('is-hidden');
      setTimeout(() => {
        swap();
        layer?.classList.add('is-hidden');
      }, 260);
    } else {
      swap();
    }
  }

  // Newly injected content needs the same wiring attachContentEvents()
  // gives the page on full renders.
  hydrate(scope) {
    if (!scope) return;
    scope.querySelectorAll('[data-fav-song]').forEach(btn =>
      this.ui.contentEvents.setupHeartButton(btn, 'song', btn.dataset.favSong));
    scope.querySelectorAll('[data-more-song]').forEach(el => {
      if (el._moreBound) return;
      el._moreBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ui.contentEvents.showSongMenu(el.dataset.moreSong, e);
      });
    });
    scope.querySelectorAll('[data-play-album]').forEach(el => {
      if (el._paBound) return;
      el._paBound = true;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.buildAlbumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, 'album');
      });
    });
    scope.querySelectorAll('[data-action="toggle-favorite-album"]').forEach(el => {
      if (el._tfaBound) return;
      el._tfaBound = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fav = this.ui.favorites || window.favoritesPlaylists;
        fav?.toggleFavoriteAlbum?.(el.dataset.albumId);
        const isFav = fav?.isAlbumFavorite?.(el.dataset.albumId);
        el.classList.toggle('favorited', !!isFav);
        el.innerHTML = Icons.general.heart(16, !!isFav);
      });
    });
    scope.querySelectorAll('[data-action="add-album-to-queue"]').forEach(el => {
      if (el._aqBound) return;
      el._aqBound = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = this.ui.state;
        const albumId = el.dataset.albumId;
        const album = state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.buildAlbumQueue(state, album.artistId, albumId);
        const currentQueue = state.queue || [];
        state.queue = [...currentQueue, ...queue];
        if (state.currentSong)
          state.queueIndex = state.queue.findIndex(s => s.id == state.currentSong.id);
        state.showToast(`Added ${queue.length} song${queue.length === 1 ? '' : 's'} to queue`);
      });
    });
  }

  // -------------------------------------------------------------------
  // Filter / sort dropdown menus
  // -------------------------------------------------------------------
  closeMenus() {
    this._root()?.querySelectorAll('.filterMenu').forEach(m => m.remove());
  }

  openMenu(anchorBtn, items, current, onSelect) {
    this.closeMenus();
    const root = this._root();
    if (!root) return;
    const menu = document.createElement('div');
    menu.className = 'filterMenu';
    menu.innerHTML = items.map(it => `
      <button type="button" class="filterMenuItem${String(it.value) === String(current) ? ' is-active' : ''}" data-value="${this.esc(it.value)}">
        <span>${this.esc(it.label)}</span>
        ${it.count != null ? `<span class="count">${it.count}</span>` : ''}
      </button>
    `).join('');
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
      this._menuCloser = (e) => { if (!menu.contains(e.target)) this.closeMenus(); };
      document.addEventListener('click', this._menuCloser, { once: true });
    }, 0);
  }

  openFilterMenu(btn, type) {
    const state = this.ui.state;
    let items = [];
    if (type === 'artist') {
      items = this.allArtists(state)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({ value: a.id, label: a.name, count: a.songCount }));
    } else if (type === 'genre') {
      items = this.allGenres(state).map(g => ({ value: g.name, label: g.name, count: g.count }));
    } else if (type === 'year') {
      const years = [...new Set(this.allAlbums(state).map(a => a.year).filter(Boolean))].sort().reverse();
      items = years.map(y => ({ value: y, label: y }));
    } else if (type === 'decade') {
      const decades = [...new Set(this.allAlbums(state).map(a => a.year).filter(Boolean)
        .map(y => Math.floor(Number(y) / 10) * 10))].sort((a, b) => b - a);
      items = decades.map(d => ({ value: d, label: `${d}s` }));
    }
    if (!items.length) {
      state.showToast?.('Nothing to filter by yet');
      return;
    }
    this.openMenu(btn, items, this.filter.type === type ? this.filter.value : null, (value) => {
      const it = items.find(i => String(i.value) === String(value));
      this.filter = { type, value, label: it ? it.label : value };
      this.ui.render();
    });
  }

  openSortMenu(btn) {
    const items = [
      { value: 'recent', label: 'Recently Added' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'artist', label: 'Artist A–Z' },
      { value: 'yearDesc', label: 'Newest First' },
      { value: 'yearAsc', label: 'Oldest First' },
      { value: 'mostPlayed', label: 'Most Played' }
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
    const queue = artist.albums.flatMap(alb =>
      alb.songs.map(s => state.getSongById(s.id)).filter(Boolean));
    if (queue.length) {
      this.ui.audioPlayer.playSong(queue[0], queue, true, 'artist');
      state.showToast?.(`Playing ${artist.artist}`);
    }
  }

  // -------------------------------------------------------------------
  // Events (delegated on the browse root)
  // -------------------------------------------------------------------
  bindEvents(root) {
    if (!root || root._browseDelegated) return;
    root._browseDelegated = true;
    const ui = this.ui;

    root.addEventListener('click', (e) => {
      // Tabs
      const tab = e.target.closest('.browseTab');
      if (tab) {
        e.stopPropagation();
        if (tab.dataset.view !== this.view) {
          this.view = tab.dataset.view;
          this.refreshContent(true);
        }
        return;
      }

      // Filter buttons
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

      // Sort
      if (e.target.closest('[data-action="sort"]')) {
        e.stopPropagation();
        this.openSortMenu(e.target.closest('[data-action="sort"]'));
        return;
      }

      // Grid / list toggle
      const viewBtn = e.target.closest('.viewButton[data-view-mode]');
      if (viewBtn) {
        e.stopPropagation();
        if (viewBtn.dataset.viewMode !== this.mode) {
          this.mode = viewBtn.dataset.viewMode;
          root.querySelectorAll('.viewButton').forEach(b =>
            b.classList.toggle('is-active', b === viewBtn));
          this.refreshContent(false);
        }
        return;
      }

      // Album "..." → dynamic context menu
      const albumMore = e.target.closest('[data-album-more]');
      if (albumMore) {
        e.stopPropagation();
        window.contextMenu?.show(e.clientX, e.clientY, {
          artistId: albumMore.dataset.artistId,
          albumId: albumMore.dataset.albumId
        });
        return;
      }

      // Artist card buttons
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

      // Genre cards
      const genre = e.target.closest('.genreCard[data-genre]');
      if (genre) {
        e.stopPropagation();
        if (window.pagesActions?.playGenre) window.pagesActions.playGenre(genre.dataset.genre);
        return;
      }

      // Playlist cards
      const plCard = e.target.closest('.playlistCard[data-playlist-id]');
      if (plCard) {
        e.stopPropagation();
        const pl = ui.state.playlists.find(p => String(p.id) === String(plCard.dataset.playlistId));
        if (pl) {
          ui.state.selectedPlaylistName = pl.name;
          ui.state.selectedPlaylistId = pl.id;
          ui.navigate('playlists');
        }
        return;
      }

      // Song table rows → play (single click)
      const songRow = e.target.closest('tr[data-song-id]');
      if (songRow) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        const song = ui.state.getSongById(songRow.dataset.songId);
        if (!song) return;
        const queue = [...root.querySelectorAll('tr[data-song-id]')]
          .map(r => ui.state.getSongById(r.dataset.songId))
          .filter(Boolean);
        ui.audioPlayer.playSong(song, queue.length ? queue : null, true, 'library');
        return;
      }

      // List-view rows (albums / artists) → open
      const rowItem = e.target.closest('.rowItem[data-artist-id]');
      if (rowItem) {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        ui.navigate('artist', rowItem.dataset.artistId, rowItem.dataset.albumId || null);
        return;
      }
    });

    // Live search within the library page
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

  destroy() {}
}


// ---------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------
export class Playlists {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;
    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <div class="head">
          <div class="heading">
            <p class="kicker">Playlists</p>
            <h1 class="title">${viewing || "Your mixes"}</h1>
            <p class="sub">Curate albums, moods, and artist journeys you can revisit anytime.</p>
          </div>
          <button id="create-playlist-btn" class="create"
                  onclick="window.uiManager.showSpinner(); setTimeout(() => { document.getElementById('create-playlist-modal')?.classList.remove('hidden'); window.uiManager.hideSpinner(); }, window.uiManager.fragmentLoadDelay);">
            + Create
          </button>
        </div>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>
    `;
  }

  playlistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length) {
      return `
        <div class="empty">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h3 class="title">No playlists yet</h3>
          <p class="desc">Create your first playlist to organize your favorite songs</p>
        </div>
      `;
    }
    return `
      <div data-list="playlists" class="grid">
        ${state.playlists
          .map((pl, i) => {
            const previewSongs = pl.songs
              .map((id) => state.getSongById(id))
              .filter(Boolean)
              .slice(0, 3);
            return `
            <div data-card="playlist" class="card animate-fadeInUp" style="--d: ${i * 60}ms" data-playlist-view="${pl.name}">
              <div class="head">
                <div class="heading">
                  <p class="kicker">Playlist</p>
                  <p class="name">${pl.name}</p>
                  <p class="count">${pl.songs.length} songs</p>
                </div>
                <div class="actions">
                  <button class="playlist-card-play" data-playlist-play="${pl.id}" title="Play playlist">
                    ${Icons.player.play(14)}
                  </button>
                  <button class="more" onclick="event.stopPropagation(); window.favoritesPlaylists.openPlaylistModal()">
                    ${Icons.general.moreHoriz(18)}
                  </button>
                </div>
              </div>
              <div class="previews">
                ${previewSongs.map((s) => `<img src="${s.coverUrl}" class="thumb">`).join("")}
                ${pl.songs.length > 3 ? `<div class="extra">+${pl.songs.length - 3}</div>` : ""}
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  playlistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div class="missing">Playlist not found</div>`;
    const songs = playlist.songs
      .map((id) => state.getSongById(id))
      .filter(Boolean);
    return `
      <div data-area="viewer" class="viewer">
        <div class="head">
          <div class="heading">
            <p class="kicker">Playlist</p>
            <h2 class="title">${playlist.name}</h2>
            <p class="sub">${songs.length} songs • curated by you</p>
          </div>
          <div class="actions">
            <button class="playlist-hero-btn" data-playlist-play="${playlist.id}" title="Play playlist">
              ${Icons.player.play(14)} <span>Play</span>
            </button>
            <button class="playlist-hero-btn playlist-hero-btn-alt" data-playlist-shuffle="${playlist.id}" title="Shuffle playlist">
              ${Icons.player.shuffle(14)} <span>Shuffle</span>
            </button>
            <button class="share-playlist-btn share" data-playlist-id="${playlist.id}">
              Share
            </button>
          </div>
        </div>
        <div data-list="songs" class="rows">
          ${songs
            .map(
              (s, i) => `
            <div class="song-row" data-song-id="${s.id}" data-playlist-id="${playlist.id}" data-play-source="playlist">
              <span class="num">${i + 1}</span>
              <img src="${s.coverUrl}" class="cover">
              <div class="info">
                <p class="title">${s.title}</p>
                <p class="sub">${s.artist}</p>
              </div>
              <button class="downloadBtn" data-action="download-song" data-song-id="${s.id}" data-song-title="${s.title}" data-song-thumbnail="${s.coverUrl}" title="Download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <p class="time">${s.duration}</p>
              <button class="remove-from-playlist-btn remove" data-playlist-id="${playlist.id}" data-song-id="${s.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------
export class Favorites {
  constructor(ui) {
    this.ui = ui;
  }

  emptyState(emoji, title, desc) {
    return `
      <div class="empty animate-fadeInUp">
        <div class="icon">${emoji}</div>
        <h3 class="title">${title}</h3>
        <p class="desc">${desc}</p>
      </div>
    `;
  }

  renderSongCards(songs) {
    return `
      <div data-list="songs" class="rows">
        ${songs
          .map(
            (s, i) => `
        <div class="row ${this.ui.favorites.isSongFavorite(s.id) ? 'favorited' : ''}">
          <button class="cover-wrap" data-song-id="${s.id}" data-play-source="favorites">
            <img src="${s.coverUrl}" class="cover" loading="lazy" alt="">
            <span class="play-overlay">${Icons.player.play(14)}</span>
          </button>
          <div class="info">
            <p class="title">${s.title}</p>
            <p class="sub">${s.artist} • ${s.album}</p>
            <p class="time">${s.duration}</p>
          </div>
          <div class="actions">
            <button class="play" title="Play" data-song-id="${s.id}" onclick="event.stopPropagation(); window.pagesActions.playSong(this.dataset.songId, 'favorites')">
              ${Icons.player.play(14)}
            </button>
            <button class="downloadBtn" data-action="download-song" data-song-id="${s.id}" data-song-title="${s.title}" data-song-thumbnail="${s.coverUrl}" title="Download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="heart ${this.ui.favorites.isSongFavorite(s.id) ? 'favorited' : ''}" data-fav-song="${s.id}">
              ${this.ui.likeStatus('song', this.ui.favorites.isSongFavorite(s.id), false, null)}
            </button>
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
      <div data-list="artists" class="grid">
        ${artists
          .map(
            (a, i) => `
          <button data-card="artist" class="card animate-fadeInUp" style="--d: ${i * 40}ms" data-artist-id="${a.id}">
            <img src="${a.imageUrl}" class="avatar">
            <p class="name">${a.artist}</p>
            <p class="sub">${a.genre || "Artist"}</p>
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderAlbumCards(albums) {
    return `
      <div data-list="albums" class="grid">
        ${albums
          .map(
            (alb, i) => `
          <div data-card="album" class="card animate-fadeInUp" style="--d: ${i * 50}ms" data-artist-id="${alb.artistId}" data-album-id="${alb.id}">
            <div class="album-cover-wrap wrap">
              <img src="${alb.coverUrl}" class="cover">
            </div>
            <p class="title">${alb.album}</p>
            <p class="sub">${alb.artistName}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderPlaylistCards(playlists) {
    return `
      <div data-list="playlists" class="grid">
        ${playlists
          .map(
            (pl, i) => `
          <div data-card="playlist" class="card animate-fadeInUp" style="--d: ${i * 50}ms">
            <div class="row">
              <div class="heading">
                <p class="kicker">Saved Playlist</p>
                <p class="name">${pl.name}</p>
                <p class="count">${pl.songs.length} songs</p>
              </div>
              <div class="actions">
                <button class="playlist-card-play" data-playlist-play="${pl.id}" title="Play playlist">
                  ${Icons.player.play(14)}
                </button>
                <button class="more" onclick="window.favoritesPlaylists.openPlaylistModal()">
                  ${Icons.general.moreHoriz(18)}
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  render() {
    const state = this.ui.state;
    const tabToCount = {
      songs: state.favoriteSongs.length,
      artists: state.favoriteArtists.length,
      albums: state.favoriteAlbums.length,
      playlists: state.playlists.length
    };
    const tabs = [
      { key: "songs", label: "Songs", count: tabToCount.songs },
      { key: "artists", label: "Artists", count: tabToCount.artists },
      { key: "albums", label: "Albums", count: tabToCount.albums },
      { key: "playlists", label: "Playlists", count: tabToCount.playlists }
    ];
    const totalFavs = tabToCount.songs + tabToCount.artists + tabToCount.albums;
    return `
      <div data-page="favorites" class="page animate-fadeInUp">
        <section data-area="hero" class="hero">
          <div class="wrap">
            <div class="heading">
              <p class="kicker">Favorites</p>
              <h1 class="title">Your collection</h1>
              <p class="sub">All the songs, artists, and albums you never want to lose.</p>
            </div>
            <div data-list="stats" class="stats">
              ${tabs
                .map(
                  (tab) => `
                <div class="stat">
                  <p class="value">${tab.count}</p>
                  <p class="label">${tab.label}</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          <p class="total">${totalFavs} saved picks across your library.</p>
        </section>
        <div data-area="tabs" class="tabs">
          ${tabs
            .map(
              ({ key, label, count }) => `
            <button class="tab-btn ${key === state.favoritesTab ? "active" : ""}" data-tab="${key}">
              ${label} (${count})
            </button>
          `
            )
            .join("")}
        </div>
        <div id="favorites-content">${this.tabContent(state.favoritesTab)}</div>
      </div>
    `;
  }

  tabContent(tab) {
    const state = this.ui.state;

    if (tab === "songs") {
      const songIds = state.favoriteSongs;
      if (!songIds.length)
        return this.emptyState(
          "🎵",
          "No favorite songs yet",
          "Tap the heart on any track to build a quick-play collection you can come back to anytime."
        );
      const songs = songIds.map((id) => state.getSongById(id)).filter(Boolean);
      return this.renderSongCards(songs);
    }

    if (tab === "artists") {
      const artistIds = state.favoriteArtists;
      if (!artistIds.length)
        return this.emptyState(
          "🎤",
          "No favorite artists yet",
          "Save the artists you love most and they will show up here with instant access to their discography."
        );
      const artists = artistIds
        .map((id) => state.getArtistById(id))
        .filter(Boolean);
      return this.renderArtistCards(artists);
    }

    if (tab === "albums") {
      const albumIds = state.favoriteAlbums;
      if (!albumIds.length)
        return this.emptyState(
          "💿",
          "No favorite albums yet",
          "Mark standout albums to keep your best full-length listens one tap away."
        );
      const albums = albumIds
        .map((id) => state.getAlbumById(id))
        .filter(Boolean);
      return this.renderAlbumCards(albums);
    }

    if (tab === "playlists") {
      return state.playlists.length
        ? this.renderPlaylistCards(state.playlists)
        : this.emptyState(
            "📚",
            "No playlists yet",
            "Create a playlist to start curating moods, moments, and all your repeat-worthy tracks."
          );
    }
    return "";
  }
}

// ---------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------
export class Artists {
  constructor(ui) { this.ui = ui; }

  render() {
    const state = this.ui.state;
    const artistId = state.artistId;
    if (!artistId) return '<div>Artist not found</div>';
    const artist = state.getArtistById(artistId);
    if (!artist) return '<div>Artist not found</div>';

    const activeAlbumId = state.selectedAlbumId;
    const activeAlbum = activeAlbumId
      ? artist.albums.find(a => IdUtils.normalize(a.id) === IdUtils.normalize(activeAlbumId))
      : artist.albums[0];
    if (!activeAlbum) return '<div>Album not found</div>';

    const similarIds = artist.similar || [];
    const similarArtists = similarIds
      .map(id => state.getArtistById(id))
      .filter(Boolean);
    const rows = [
      similarArtists.slice(0, 4),
      similarArtists.slice(4, 8),
      similarArtists.slice(8, 12)
    ];

    return `
      <div class="artist-page" data-page="artist">
        <div class="artist-meta">
          <h4 class="artist-name">${artist.artist}</h4>
          <button class="artist-heart ${this.ui.favorites.isArtistFavorite(artist.id) ? 'favorited' : ''}"
                  data-artist-heart="${artist.id}">
            ${this.ui.likeStatus('artist', this.ui.favorites.isArtistFavorite(artist.id), false, null)}
          </button>
        </div>

        <div data-area="about">
          ${this.aboutSection(artist, activeAlbum)}
        </div>

        ${similarIds.length ? this.similarMarquee(rows, artist.id) : ''}
        <div class="spacer"></div>
      </div>
    `;
  }

  aboutSection(artist, activeAlbum) {
    return `
      <div class="hero-card">
        <div data-area="albums" class="area albumTabs">
          ${artist.albums.map(alb => `
            <button class="albumTab ${alb.id === activeAlbum.id ? 'active' : ''}"
                    data-artist-id="${artist.id}"
                    data-album-id="${alb.id}"
                    onclick="window.uiManager.refreshArtistContent('${artist.id}', '${alb.id}')">
              ${alb.album}
            </button>
          `).join('')}
        </div>

        <section class="hero-stage">
          <div class="hero-cover">
            <img src="${activeAlbum.coverUrl}" alt="${activeAlbum.album}">
            <div class="hero-scrim"></div>

            <div class="hero-overlay">
              <div class="album-meta">
                <h3 class="album-title">${activeAlbum.album}</h3>
                <span class="track-count">${activeAlbum.songs.length} tracks</span>
              </div>

              <button class="play-all"
                      data-play-album='${JSON.stringify({ artistId: artist.id, albumId: activeAlbum.id })}'
                      aria-label="Shuffle album">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://w3.org" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
                  <polygon points="10,7 17,12 10,17" fill="currentColor"/>
                </svg>
                <span class="shuffle-text">Shuffle</span>
              </button>
            </div>
          </div>

          <!-- =========================================================
               NEW INTERMEDIATE BENTO BOXES LAYER (MOBILE FULL-WIDTH ROWS)
               ========================================================= -->
          <div data-area="meta-summary" class="animate-fadeInUp" style="--d: 60ms;">

            <!-- NEW BOX LEFT: Content Attribution & Dynamic Share Link -->
            <div data-list="editorial-brief" class="bento-meta-node">
              <div class="brief-wrapper">
                <span class="brief-mono">${activeAlbum.year || '2024'}</span>
                <span class="brief-heading">${activeAlbum.status || 'Double Platinum'}</span>
              </div>
              <a href="#" class="brief-anchor" id="bento-album-share" data-album-title="${Utils.escapeHtml(activeAlbum.album)}">Share this album</a>
            </div>

            <!-- NEW BOX RIGHT: Library Control Hub -->
              <div data-list="utility-hub" class="bento-meta-node">
              <button class="hub-pill-btn" id="bento-offline-toggle" data-album-id="${Utils.escapeHtml(activeAlbum.id)}">
                <span class="hub-btn-txt">Listen Offline</span>
              </button>

              <div class="hub-group">
                <h5 class="hub-group-title">Add to library</h5>
                <div class="hub-links">
                  <a href="#" class="hub-link-item" data-action="add-album-to-playlist" data-album-id="${Utils.escapeHtml(activeAlbum.id)}">
                    Playlist
                  </a>
                  <a href="#" class="hub-link-item" data-action="add-album-to-queue" data-album-id="${Utils.escapeHtml(activeAlbum.id)}">
                    Queue
                  </a>
                  <a href="#" class="hub-link-item" data-action="toggle-favorite-album" data-album-id="${Utils.escapeHtml(activeAlbum.id)}">
                    ${this.ui.favorites.isAlbumFavorite(activeAlbum.id) ? 'Remove Favorite' : 'Favorites'}
                  </a>
                </div>
              </div>
            </div>

          </div>
          <!-- ========================================================= -->

          <div data-list="songs" data-type="album">
            <div id="songsList" class="body">
              ${activeAlbum.songs.map((song, i) => this.createSongRow(song, i, artist, activeAlbum)).join('')}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  createSongRow(song, index, artist, album) {
    const isFav = this.ui.favorites.isSongFavorite(song.id);
    const isPlaying = this.ui.state.currentSong?.id == song.id;
    return `
      <div class="songItem ${isPlaying ? 'playing' : ''}"
           data-song-id="${song.id}"
           data-context='${JSON.stringify({ artistId: artist.id, albumId: album.id })}'>
        <div class="left">
          <div class="trackNum">${index + 1}</div>
          <div class="play">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1"/>
              <polygon points="10,7 17,12 10,17" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div class="center">
          <div class="title">
            <span>${song.title}</span>
          </div>
        </div>
        <div class="right">
          <div class="time">${song.duration}</div>
          <button class="heart ${isFav ? 'favorited' : ''}" data-fav-song="${song.id}">
            ${this.ui.likeStatus('song', isFav, false, null)}
          </button>
          <button class="downloadBtn" data-action="download-song" data-song-id="${song.id}" data-song-title="${song.title}" data-song-thumbnail="${album.coverUrl}" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="moreMenu" data-more-song="${song.id}">
            ${Icons.general.moreVert(18)}
          </button>
        </div>
      </div>
    `;
  }

  similarMarquee(rows, artistId) {
    const configs = [['left', 40], ['right', 45], ['left', 35]];
    const marquee = (artists, dir, dur) => `
      <div class="marquee-container">
        <div class="marquee-track marquee-${dir}" style="animation-duration: ${dur}s;">
          ${[...artists, ...artists].map(a => `
            <span class="artist-name-pill animate-fadeIn" data-artist-id="${a.id}" data-artist-name="${a.artist}"
                  onclick="window.uiManager.showSpinner(); setTimeout(() => { window.uiManager.contentEvents.showArtistPopover('${a.id}', event); window.uiManager.hideSpinner(); }, window.uiManager.popoverDelay);">
              ${a.artist}
            </span>
          `).join('')}
        </div>
      </div>
    `;
    return `
      <div data-area="similar" class="similar-artists-section">
        <h5 class="similar-artists-title">Listen to similar Artists</h5>
        ${rows.map((row, i) => row.length ? marquee(row, ...configs[i]) : '').join('')}
      </div>
    `;
  }
}

// ---------------------------------------------------------------------
// EditPlaylist
// ---------------------------------------------------------------------
export class EditPlaylist {
  constructor(ui) { this.ui = ui; }

  render() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find(p => String(p.id) === String(id));
    if (!pl) return `<div class="page animate-fadeInUp"><div class="missing">Playlist not found</div></div>`;

    const songs = pl.songs.map((sid, i) => {
      const song = state.getSongById(sid);
      return { song, index: i, sid: String(sid) };
    });

    const totalDuration = songs.reduce((sum, item) => {
      const parts = item.song?.duration?.split(':') || ['0', '0'];
      if (parts.length === 2) {
        return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
      return sum;
    }, 0);

    const durationText = Utils.formatTime(totalDuration);

    return `
      <div data-page="edit-playlist" class="page animate-fadeInUp">
        <div class="edit-playlist-header">
          <button class="edit-playlist-back" data-action="back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="edit-playlist-title">Edit Playlist</h1>
          <button class="edit-playlist-done" data-action="done">Done</button>
        </div>

        <div class="edit-playlist-hero">
          <div class="edit-playlist-cover">
            ${this._coverPreview(pl)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field">
              <label for="edit-pl-name">Name</label>
              <input type="text" id="edit-pl-name" class="edit-playlist-input" value="${Utils.escapeHtml(pl.name)}" maxlength="80" data-playlist-id="${Utils.escapeHtml(pl.id)}">
            </div>
            <div class="edit-playlist-field">
              <label for="edit-pl-desc">Description</label>
              <textarea id="edit-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" data-playlist-id="${Utils.escapeHtml(pl.id)}">${Utils.escapeHtml(pl.description || '')}</textarea>
            </div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="edit-pl-tags">
                ${(pl.tags || []).map(t => `
                  <span class="edit-playlist-tag" data-tag="${Utils.escapeHtml(t)}">
                    ${Utils.escapeHtml(t)}
                    <button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.escapeHtml(t)}">×</button>
                  </span>
                `).join('')}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${pl.songs.length} songs • ${durationText}</p>
          </div>
        </div>

        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="shuffle-play">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
            Shuffle Play
          </button>
          <button class="edit-playlist-tool" data-action="add-songs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Songs
          </button>
          <button class="edit-playlist-tool edit-playlist-tool-danger" data-action="delete-playlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>

        <div class="edit-playlist-songs" id="edit-playlist-songs" data-playlist-id="${Utils.escapeHtml(pl.id)}">
          ${songs.map((item, i) => item.song ? `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${item.song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/>
                  <circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/>
                  <circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/>
                </svg>
              </div>
              <img src="${item.song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info">
                <p class="edit-playlist-song-title">${Utils.escapeHtml(item.song.title)}</p>
                <p class="edit-playlist-song-artist">${Utils.escapeHtml(item.song.artist || '')} • ${Utils.escapeHtml(item.song.album || '')}</p>
              </div>
              <span class="edit-playlist-song-time">${item.song.duration || ''}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ` : `
            <div class="edit-playlist-song-row edit-playlist-song-missing" data-index="${i}">
              <div class="edit-playlist-drag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/>
                  <circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/>
                  <circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/>
                </svg>
              </div>
              <p class="edit-playlist-song-title">Unknown song</p>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}">Remove</button>
            </div>
          `).join('')}
        </div>

        ${!pl.songs.length ? `
          <div class="edit-playlist-empty">
            <div class="edit-playlist-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>
              </svg>
            </div>
            <h3 class="edit-playlist-empty-title">No songs yet</h3>
            <p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  _coverPreview(pl) {
    const state = this.ui.state;
    const songs = pl.songs.map(sid => state.getSongById(sid)).filter(Boolean).slice(0, 4);
    if (!songs.length) {
      return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    }
    if (songs.length === 1) {
      return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    }
    return `
      <div class="edit-cover-mosaic">
        ${songs.map(s => `<img src="${s.coverUrl}" class="edit-cover-quarter" alt="">`).join('')}
      </div>
    `;
  }
}

// ---------------------------------------------------------------------
// Error404
// ---------------------------------------------------------------------
export class Error404 {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    return `
    <div data-page="404" class="page animate-fadeInUp">
      <div class="wrap">
        <div class="code">404</div>
        <h1 class="title">Page Not Found</h1>
        <p class="desc">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div class="actions">
          <button onclick="window.pagesActions.goHome()" class="home">
            🏠 Take me Home
          </button>
          <button onclick="window.history.back()" class="back">
            ↩ Go Back
          </button>
        </div>
        <div class="note">
          <p>Error 404 — The requested resource could not be found.</p>
        </div>
      </div>
    </div>
    `;
  }
}

// ---------------------------------------------------------------------
// pagesActions – global helper for inline onclick handlers
// ---------------------------------------------------------------------
if (typeof window !== "undefined") {
  window.pagesActions = {
    buildSongs() {
      const state = window.uiManager?.state || window.state;
      if (!state?.enrichedLibrary) return [];
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
            genre: artist.genre || ""
          }))
        )
      );
    },
    playQueue(queue, index = 0, label = "", source = null) {
      if (!queue.length || !window.uiManager?.audioPlayer) return;
      const safeIndex = Math.max(0, Math.min(index, queue.length - 1));
      window.uiManager.audioPlayer.playSong(
        queue[safeIndex],
        queue,
        true,
        source
      );
      if (label) (window.uiManager?.state || window.state)?.showToast?.(label);
    },
    playSong(songId, source = null) {
      const state = window.uiManager?.state || window.state;
      const song = state?.getSongById?.(songId);
      if (song && window.uiManager?.audioPlayer)
        window.uiManager.audioPlayer.playSong(song, null, true, source);
    },
    shuffleAll() {
      const songs = IdUtils.sample(this.buildSongs(), this.buildSongs().length);
      this.playQueue(songs, 0, "Shuffling your whole library", "home");
    },
    playGenre(genre) {
      const genreSongs = this.buildSongs().filter(
        (song) =>
          String(song.genre).toLowerCase() === String(genre).toLowerCase()
      );
      if (!genreSongs.length) return;
      const pick = IdUtils.sample(genreSongs, 1)[0];
      this.playSong(pick.id, "home");
      (window.uiManager?.state || window.state)?.showToast?.(
        `Playing ${genre}`
      );
    },
    playMood(mood) {
      const moodMap = {
        chill: ["pop", "indie", "acoustic", "r&b", "soul"],
        energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
        focus: [
          "indie",
          "acoustic",
          "classical",
          "instrumental",
          "alternative"
        ],
        party: ["dance", "electronic", "club", "pop", "hip hop"],
        romance: ["r&b", "soul", "ballad", "pop", "love"]
      };
      const tags = moodMap[mood] || [];
      const allSongs = this.buildSongs();
      const filtered = allSongs.filter((song) =>
        tags.some((tag) => String(song.genre).toLowerCase().includes(tag))
      );
      const queue = IdUtils.sample(
        filtered.length ? filtered : allSongs,
        Math.min(12, (filtered.length ? filtered : allSongs).length)
      );
      this.playQueue(
        queue,
        0,
        `${mood.charAt(0).toUpperCase() + mood.slice(1)} mix loaded`,
        "home"
      );
    },
    openStatsDashboard() {
      if (!window.uiManager || !window.state) return;
      window.state.modalOpen(window.uiManager.homePage.statsDashboard());
    },
    goHome() {
      const state = window.uiManager?.state || window.state;
      if (state) {
        state.is404 = false;
        window.uiManager?.navigate("home");
      }
    }
  };
}

// ---------------------------------------------------------------------
// Bento‑box dynamic sharing & offline toggle (DOM listeners)
// ---------------------------------------------------------------------
document.addEventListener("click", async (e) => {
  // 1. Native Web Share Wrapper Logic
  const shareAnchor = e.target.closest("#bento-album-share");
  if (shareAnchor) {
    e.preventDefault();
    const albumTitle = shareAnchor.getAttribute("data-album-title") || "Album Selection";

    const shareMeta = {
      title: albumTitle,
      text: `Listen to ${albumTitle} streaming on our app portfolio platform.`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareMeta);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        if (window.uiManager?.state?.showToast) {
          window.uiManager.state.showToast("Share path copied to device clipboard!");
        } else if (window.state?.showToast) {
          window.state.showToast("Share path copied to device clipboard!");
        }
      }
    } catch (err) {
      console.warn("Media runtime share actions terminated cleanly:", err);
    }
  }

  // 2. Offline Mode Button UI Toggle Mechanics
  const offlineBtn = e.target.closest("#bento-offline-toggle");
  if (offlineBtn) {
    e.preventDefault();
    offlineBtn.classList.toggle("is-cached-locally");
    const indicatorText = offlineBtn.querySelector(".hub-btn-txt");

    if (offlineBtn.classList.contains("is-cached-locally")) {
      indicatorText.textContent = "Saved Offline ✓";
      offlineBtn.style.borderColor = "rgba(var(--colorPurple), 0.8)";
    } else {
      indicatorText.textContent = "Listen Offline";
      offlineBtn.style.borderColor = "";
    }
  }
});

// ---------------------------------------------------------------------
// End of layouts.js
// ---------------------------------------------------------------------