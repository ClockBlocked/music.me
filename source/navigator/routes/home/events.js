// Home events methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeEventsMethods {
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
  const descriptors = Object.getOwnPropertyDescriptors(HomeEventsMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(window.Home.prototype, descriptors);
})();
