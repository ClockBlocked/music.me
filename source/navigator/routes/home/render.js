// Home render methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeRenderMethods {
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
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeRenderMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
