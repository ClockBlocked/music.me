// /////////////////////////////////////////////////
// Library Page
// /////////////////////////////////////////////////
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

  // ----------------------------------------------
  // Data builders
  // ----------------------------------------------
  allSongs(state) {
    if (!window.MusicStore) return [];
    return Array.from(window.MusicStore.songCache.values());
  }

  allAlbums(state) {
    if (!window.MusicStore) return [];
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

  allArtists(state) {
    if (!window.MusicStore) return [];
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

  allGenres(state) {
    const map = new Map();
    this.allSongs(state).forEach((song) => {
      if (!song.genre) return;
      map.set(song.genre, (map.get(song.genre) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ----------------------------------------------
  // Helpers
  // ----------------------------------------------
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

  // ----------------------------------------------
  // Card factories
  // ----------------------------------------------
  albumCard(album) {
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

  albumRow(album) {
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

  artistCard(artist) {
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

  artistRow(artist) {
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

  playlistCard(playlist, state) {
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

  genreCard(genre) {
    return `<article class="genreCard" data-genre="${this.esc(genre.name)}"><h3 class="genreName">${this.esc(genre.name)}</h3><p class="genreCount">${genre.count} song${genre.count === 1 ? "" : "s"}</p></article>`;
  }

  songRow(song, index, queue) {
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

  // ----------------------------------------------
  // Empty / header
  // ----------------------------------------------
  emptyState(title, description) {
    return `<div class="emptyState"><div class="emptyIcon">${Icons.general.search(34)}</div><h3 class="emptyTitle">${this.esc(title)}</h3><p class="emptyDescription">${this.esc(description)}</p></div>`;
  }

  sectionHead(title, sub) {
    return `<div class="resultsHeader"><div><h2 class="resultsTitle">${this.esc(title)}</h2><p class="resultsSubtitle">${this.esc(sub)}</p></div></div>`;
  }

  // ----------------------------------------------
  // Content / metadata
  // ----------------------------------------------
  contentFor(view) {
    const state = this.ui.state;

    if (view === "songs") {
      const songs = this.pipeline(this.allSongs(state));
      if (!songs.length) return this.emptyState("No songs match", "Try clearing your search or filters.");
      return `<div class="songTableWrapper"><table class="songTable"><thead><tr><th>#</th><th>Title</th><th>Album</th><th>Year</th><th>Time</th><th></th></tr></thead><tbody>${songs.map((song, i) => this.songRow(song, i)).join("")}</tbody></table></div>`;
    }

    if (view === "albums") {
      const albums = this.pipeline(this.allAlbums(state));
      if (!albums.length) return this.emptyState("No albums match", "Try clearing your search or filters.");
      return this.mode === "grid"
        ? `<div class="albumGrid">${albums.map((album) => this.albumCard(album)).join("")}</div>`
        : `<div class="rowsList">${albums.map((album) => this.albumRow(album)).join("")}</div>`;
    }

    if (view === "artists") {
      const artists = this.pipeline(this.allArtists(state));
      if (!artists.length) return this.emptyState("No artists match", "Try clearing your search or filters.");
      return this.mode === "grid"
        ? `<div class="artistGrid">${artists.map((artist) => this.artistCard(artist)).join("")}</div>`
        : `<div class="rowsList">${artists.map((artist) => this.artistRow(artist)).join("")}</div>`;
    }

    if (view === "playlists") {
      const playlists = (state.playlists || []).filter(
        (playlist) => !this.query.trim() || playlist.name.toLowerCase().includes(this.query.trim().toLowerCase())
      );
      if (!playlists.length) return this.emptyState("No playlists yet", "Create a playlist and it will show up here.");
      return `<div class="playlistGrid">${playlists.map((playlist) => this.playlistCard(playlist, state)).join("")}</div>`;
    }

    if (view === "genres") {
      const genres = this.pipeline(this.allGenres(state));
      if (!genres.length) return this.emptyState("No genres found", "Your library genres will appear here.");
      return `<div class="genreGrid">${genres.map((genre) => this.genreCard(genre)).join("")}</div>`;
    }

    const albums = this.allAlbums(state);
    const recentAlbums = this.pipeline([...albums].reverse()).slice(0, 10);
    const artists = this.pipeline(this.allArtists(state))
      .sort((a, b) => b.songCount - a.songCount)
      .slice(0, 5);
    const playlists = (state.playlists || []).slice(0, 3);
    const genres = this.allGenres(state).slice(0, 8);

    return `
      ${recentAlbums.length ? `<section>${this.sectionHead("Recently Added", "New additions to your collection.")}<div class="albumGrid">${recentAlbums.map((album) => this.albumCard(album)).join("")}</div></section>` : ""}
      ${artists.length ? `<section style="margin-top: 3rem">${this.sectionHead("Popular Artists", "Artists with the most music in your collection.")}<div class="artistGrid">${artists.map((artist) => this.artistCard(artist)).join("")}</div></section>` : ""}
      ${playlists.length ? `<section style="margin-top: 3rem">${this.sectionHead("Explore Playlists", "Curated collections ready to explore.")}<div class="playlistGrid">${playlists.map((playlist) => this.playlistCard(playlist, state)).join("")}</div></section>` : ""}
      ${genres.length ? `<section style="margin-top: 3rem">${this.sectionHead("Browse by Genre", "Find something based on the mood.")}<div class="genreGrid">${genres.map((genre) => this.genreCard(genre)).join("")}</div></section>` : ""}
    `;
  }

  countFor(view) {
    const state = this.ui.state;
    const fmt = (n) => `${n.toLocaleString()} item${n === 1 ? "" : "s"}`;

    switch (view) {
      case "songs":     return fmt(this.pipeline(this.allSongs(state)).length);
      case "albums":    return fmt(this.pipeline(this.allAlbums(state)).length);
      case "artists":   return fmt(this.pipeline(this.allArtists(state)).length);
      case "playlists": return fmt((state.playlists || []).length);
      case "genres":    return fmt(this.pipeline(this.allGenres(state)).length);
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
        overview:  ["Explore Your Collection", "A curated overview of your music."],
        songs:     ["All Songs", "Every track in your library."],
        albums:    ["All Albums", "Hover an album for the full story."],
        artists:   ["All Artists", "The people behind your music."],
        playlists: ["All Playlists", "Your curated collections."],
        genres:    ["All Genres", "Browse by mood and style."],
      }[view] || ["", ""]
    );
  }

  sortLabel() {
    return {
      recent:     "Recently Added",
      title:      "Title A-Z",
      artist:     "Artist A-Z",
      yearDesc:   "Newest First",
      yearAsc:    "Oldest First",
      mostPlayed: "Most Played",
    }[this.sort];
  }

  // ----------------------------------------------
  // Render
  // ----------------------------------------------
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
          <div class="resultsHeader" id="browseResultsHeader"><div><h2 class="resultsTitle">${title}</h2><p class="resultsSubtitle">${sub}</p></div><span class="resultsCount" id="browseResultsCount">${this.countFor(this.view)}</span></div>
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

  // ----------------------------------------------
  // Binding
  // ----------------------------------------------
  bindWhenReady(attempts = 0) {
    const root = document.querySelector('[data-page="library"].bp');
    if (root) {
      this.bindEvents(root);
      this.hydrateAll(root);
    } else if (attempts < 60) setTimeout(() => this.bindWhenReady(attempts + 1), 50);
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
        section.innerHTML = this.contentFor(this.view);
      }

      const [title, sub] = this.viewMeta(this.view);
      const head = root.querySelector("#browseResultsHeader");
      if (head) {
        head.querySelector(".resultsTitle").textContent = title;
        head.querySelector(".resultsSubtitle").textContent = sub;
      }

      const count = root.querySelector("#browseResultsCount");
      if (count) count.textContent = this.countFor(this.view);

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
        this.ui.contentEvents.showSongMenu(el.dataset.moreSong, e);
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
        state.showToast(`Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`);
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
      items = this.allArtists(state)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((artist) => ({ value: artist.id, label: artist.name, count: artist.songCount }));
    } else if (type === "genre") {
      items = this.allGenres(state).map((genre) => ({ value: genre.name, label: genre.name, count: genre.count }));
    } else if (type === "year") {
      const years = [...new Set(this.allAlbums(state).map((album) => album.year).filter(Boolean))].sort().reverse();
      items = years.map((year) => ({ value: year, label: year }));
    } else if (type === "decade") {
      const decades = [
        ...new Set(
          this.allAlbums(state)
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
    const state = this.ui.state;
    const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);
    if (!artist) return;

    const queues = await Promise.all(
      (artist.albums || []).map((album) => Utils.albumQueue(artistId, album.id))
    );
    const queue = queues.flat();
    if (queue.length) {
      this.ui.audioPlayer.playSong(queue[0], queue, true, "artist");
      state.showToast?.(`Playing ${artist.artist}`);
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

      const plCard = e.target.closest(".playlistCard[data-playlist-id]");
      if (plCard) {
        e.stopPropagation();
        const playlist = ui.state.playlists.find((p) => String(p.id) === String(plCard.dataset.playlistId));
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

window.Library = Library;
