// /////////////////////////////////////////////////
// Favorites Page
// /////////////////////////////////////////////////
class Favorites {
  constructor(ui) {
    this.ui = ui;
  }

  emptyState(emoji, title, description) {
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
                  <div class="song-row-art" onclick="event.stopPropagation(); window.pagesActions.playSong('${song.id}', 'favorites')">
                    <img src="${song.coverUrl}" loading="lazy" alt="">
                    <div class="song-row-play">${Icons.player.play(16)}</div>
                  </div>
                  <div class="song-row-info">
                    <span class="song-row-title">${song.title}</span>
                    <span class="song-row-artist">${song.artist}</span>
                  </div>
                  <button class="heart ${this.ui.favorites.isSong(song.id) ? "favorited" : ""}" data-fav-song="${song.id}" onclick="event.stopPropagation();">${this.ui.likeStatus("song", this.ui.favorites.isSong(song.id), false, null)}</button>
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
          <div class="ui-card album-card" style="--d: ${i * 40}ms" data-album-id="${album.id}">
            <div class="imgBx" onclick="window.uiManager.navigate('artist', '${album.artistId}', '${album.id}')"><img src="${album.coverUrl}" loading="lazy" alt=""></div>
            <div class="content">
              <div class="contentBx"><h3>${album.album}<br><span>${album.artistName}</span></h3></div>
              <ul class="sci">
                <li style="--i:1"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.playAlbum('${album.artistId}', '${album.id}')" title="Play">${Icons.player.play(18)}</button></li>
                <li style="--i:2"><button class="icon-btn" onclick="event.stopPropagation(); window.pagesActions.shuffleAlbum('${album.artistId}', '${album.id}')" title="Shuffle Play">${Icons.player.shuffle ? Icons.player.shuffle(18) : ""}</button></li>
                <li style="--i:3"><button class="icon-btn" onclick="event.stopPropagation(); window.uiManager.openMoreMenu(event, 'album', '${album.id}')" title="More">${Icons.general.moreHoriz(18)}</button></li>
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
          <div class="ui-card" data-artist-id="${artist.id}" style="--d: ${i * 40}ms" onclick="window.uiManager.navigate('artist', '${artist.id}')">
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
          <div class="ui-card" data-playlist-view="${Utils.esc(playlist.name)}" style="--d: ${i * 40}ms" onclick="window.uiManager.state.selectedPlaylistName = this.dataset.playlistView; window.uiManager.navigate('playlists')">
            <div class="ui-art-wrap mosaic-wrap">
              ${covers.length ? covers.map((cover) => `<img src="${cover}" alt="">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
              <button class="ui-play-btn" data-playlist-play="${playlist.id}" onclick="event.stopPropagation();">${Icons.player.play(18)}</button>
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
                `<button class="tab-btn ${key === state.favoritesTab ? "active" : ""}" data-tab="${key}" onclick="window.uiManager.refreshFavoritesContent('${key}')">${label}</button>`
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
    this.ui.contentEvents.attachContentEvents();
  }

  async tabContent(tab) {
    const state = this.ui.state;

    if (tab === "songs") {
      const ids = state.favoriteSongs;
      if (!ids.length) return this.emptyState("<i class='fad fa-hearts'></i>", "No favorite songs yet", "Tap the heart on any track to save it.");
      const toLoad = new Set();
      for (const id of ids) {
        const song = state.getSongById(id);
        if (!song) continue;
        if (song.artistId && song.albumId) toLoad.add(`${song.artistId}/${song.albumId}`);
      }
      const missing = ids.filter((id) => !state.getSongById(id));
      const hints = (window.MusicStore?.index || []);
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
      if (!ids.length) return this.emptyState("🎤", "No favorite artists yet", "Save the artists you love most.");
      await Promise.all(ids.map((id) => window.MusicStore.loadArtist(id).catch(() => null)));
      const artists = ids.map((id) => state.getArtistById(id)).filter(Boolean);
      return this.renderArtistCards(artists);
    }

    if (tab === "albums") {
      const ids = state.favoriteAlbums;
      if (!ids.length) return this.emptyState("💿", "No favorite albums yet", "Mark standout albums to keep them close.");
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
        : this.emptyState("📚", "No playlists yet", "Create a playlist to curate your mood.");
    }

    return "";
  }
}

window.Favorites = Favorites;
