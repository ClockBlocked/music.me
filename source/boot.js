/* ==================== 6. BOOT : INITIALIZER ==================== */
/* Boots the app: prefs, MyBeats runtime, popups, favorites, offline cache,
   media session, persistence, library load, pagesActions & delegated handlers. */
//  Initializers
jQuery(function ($) {
  Prefs.init();

  window.colorExtractor = new ColorExtractor();
  window.state = new PlayerState();
  window.audioPlayer = new AudioEngine(window.state);


  window.MyBeats.createRuntime({
    state:          window.state,
    audioPlayer:    window.audioPlayer,
    favoritesStore: window.favoritesPlaylists
  }).boot();


  window.popups = new PopupsManager({ ui: null });
  window.favoritesPlaylists = new FavoritesPlaylistsManager(window.state);
  window.heartManager = new HeartButtonManager(window.favoritesPlaylists, window.state);
  window.contextMenu = new ContextMenu();
  window.offlineCache = new OfflineCache(window.state);

  window.saveToLibraryDrawer = window.saveToLibraryDrawer || { refreshSavedBadges: () => {}, badgeRows: () => {} };
  window.saveDrawer = window.saveToLibraryDrawer;

  window.persistence = new PersistenceManager(window.state, window.audioPlayer);
  window.mediaSessionManager = new MediaSessionManager(window.state, window.audioPlayer);
  window.audioPlayer.setMediaSessionManager(window.mediaSessionManager);

  window.closeModal = () => window.popups?.closeType("modal");
  window.createNewPlaylist = () => window.favoritesPlaylists.createNewPlaylist();
  window.renamePlaylist = (id) => window.favoritesPlaylists.renamePlaylist(id);
  window.deletePlaylist = (id) => window.favoritesPlaylists.deletePlaylist(id);
  window.addSongToPlaylist = (plId, songId) => window.favoritesPlaylists.addSongToPlaylist(plId, songId);
  window.toggleFavAndReRender = (id) => window.uiManager.toggleFavAndReRender(id);
  window.openMoreMenu = (event, type, id) => {
    if (type === "album") window.contextMenu.show(event.clientX, event.clientY, { albumId: id });
    else if (type === "artist") window.contextMenu.show(event.clientX, event.clientY, { artistId: id });
    else if (type === "playlist") window.contextMenu.show(event.clientX, event.clientY, { playlistId: id });
  };


function loadLibrary() {
  let jsonUrl;
  try {
    jsonUrl = new URL("https://mybeats.cloud/source/library.json", window.__MYBEATS_BASE__).href;
  } catch {
    jsonUrl = "https://mybeats.cloud/source/library.json";
  }

  const candidates = [
    jsonUrl,
//    "https://mybeats.cloud/source/library.json",
//    "/library.json",
    "./library.json"
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  return tryNext(0);

  function tryNext(i) {
    if (i >= candidates.length) {
      return $.Deferred().reject({ status: 404, statusText: "Not Found" }).promise();
    }
    const url = candidates[i];
    return $.ajax({ url, dataType: "json", cache: true })
      .then(metadata => metadata)
      .catch(err => {
        if (err && err.status === 404) return tryNext(i + 1);
        throw new Error(`Failed to fetch ${url} (${err && err.status ? err.status : "network"})`);
      });
  }
}

  
  loadLibrary()
    .then((metadata) => {
      for (const artist of metadata) {
        if (!artist.imageUrl) {
          const firstAlbum = artist.albums?.[0];
          artist.imageUrl = firstAlbum?.coverUrl || "";
        }
        if (!artist.similar) artist.similar = [];
        for (const album of artist.albums || []) {
          if (!album.coverUrl) album.coverUrl = "";
          for (const song of album.songs || []) {
            song._artistName = artist.artist;
            song._artistId = artist.id;
            song._albumName = album.album;
            song._albumId = album.id;
            song.downloadPath = `/api/song/${artist.id}/${album.id}/${song.id}?title=${encodeURIComponent(song.title ?? "")}`;
          }
        }
      }

      window.metadata = metadata;
      window.state.enrichedLibrary = metadata;

      window.uiManager = new UIManager(window.state, window.audioPlayer, window.favoritesPlaylists);
      window.popups.ui = window.uiManager;
      window.heartManager.store.state = window.state;
      window.uiManager.render();
    })
    .catch((err) => {
      console.error("Initialization failed:", err);
      const errDiv = document.createElement("div");
      errDiv.style.cssText = "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;";
      errDiv.textContent = `Initialization failed:\n${err.message}\n\nStack:\n${err.stack || ""}`;
      document.body.appendChild(errDiv);
    });

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
            genre: artist.genre || "",
          }))
        )
      );
    },
    playQueue(queue, index = 0, label = "", source = null) {
      if (!queue.length || !window.uiManager?.audioPlayer) return;
      const safeIndex = Math.max(0, Math.min(index, queue.length - 1));
      window.uiManager.audioPlayer.playSong(queue[safeIndex], queue, true, source);
      if (label) (window.uiManager?.state || window.state)?.showToast?.(label);
    },
    playSong(songId, source = null) {
      const state = window.uiManager?.state || window.state;
      const song = state?.getSongById?.(songId);
      if (song && window.uiManager?.audioPlayer) window.uiManager.audioPlayer.playSong(song, null, true, source);
    },
    shuffleAll() {
      const songs = IdUtils.sample(this.buildSongs(), this.buildSongs().length);
      this.playQueue(songs, 0, "Shuffling your whole library", "home");
    },
    playGenre(genre) {
      const genreSongs = this.buildSongs().filter(
        (song) => String(song.genre).toLowerCase() === String(genre).toLowerCase()
      );
      if (!genreSongs.length) return;
      const pick = IdUtils.sample(genreSongs, 1)[0];
      this.playSong(pick.id, "home");
      (window.uiManager?.state || window.state)?.showToast?.(`Playing ${genre}`);
    },
    playMood(mood) {
      const moodMap = {
        chill: ["pop", "indie", "acoustic", "r&b", "soul"],
        energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
        focus: ["indie", "acoustic", "classical", "instrumental", "alternative"],
        party: ["dance", "electronic", "club", "pop", "hip hop"],
        romance: ["r&b", "soul", "ballad", "pop", "love"],
      };
      const tags = moodMap[mood] || [];
      const allSongs = this.buildSongs();
      const filtered = allSongs.filter((song) => tags.some((tag) => String(song.genre).toLowerCase().includes(tag)));
      const queue = IdUtils.sample(
        filtered.length ? filtered : allSongs,
        Math.min(12, (filtered.length ? filtered : allSongs).length)
      );
      this.playQueue(queue, 0, `${mood.charAt(0).toUpperCase() + mood.slice(1)} mix loaded`, "home");
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
    },
    playAlbum(artistId, albumId) {
      const state = window.uiManager?.state || window.state;
      const queue = Utils.albumQueue(state, artistId, albumId);
      if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
    },
    shuffleAlbum(artistId, albumId) {
      const state = window.uiManager?.state || window.state;
      const queue = Utils.albumQueue(state, artistId, albumId);
      if (queue.length) {
        const shuffled = Utils.shuffle(queue);
        window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
      }
    },
  };

  // Global share/offline handlers [ delegated ]  andOr  Dynamic content
  $(document).on("click", async function (e) {
    const shareAnchor = e.target.closest("#bento-album-share");
    if (shareAnchor) {
      e.preventDefault();
      const albumTitle = shareAnchor.getAttribute("data-album-title") || "Album Selection";
      const shareMeta = {
        title: albumTitle,
        text: `Listen to ${albumTitle} streaming on our app portfolio platform.`,
        url: window.location.href,
      };
      try {
        if (navigator.share) await navigator.share(shareMeta);
        else {
          await navigator.clipboard.writeText(window.location.href);
          if (window.uiManager?.state?.showToast)
            window.uiManager.state.showToast("Share path copied to device clipboard!");
          else if (window.state?.showToast) window.state.showToast("Share path copied to device clipboard!");
        }
      } catch (err) {
        console.warn("Media runtime share actions terminated cleanly:", err);
      }
    }
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
});

/*≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
       Copyright  ©   2 0 2 6 
  Use it for your personal projects,
      or your businsss projects,
  or whatever you find it useful for!


       William Cole Hanson
    ——————————————————————————
      Chevrolay@Outlook.com
         m.me/Chevrolay
≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈*/
