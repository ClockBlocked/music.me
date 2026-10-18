jQuery(function ($) {

  Prefs.init();

  window.colorExtractor = new ColorExtractor();
  window.state = new PlayerState();
  window.audioPlayer = new AudioEngine(window.state);

  window.favoritesPlaylists = new FavoritesPlaylistsManager(window.state);
  window.popups = new PopupsManager({ ui: null });
  window.heartManager = new HeartButtonManager(window.favoritesPlaylists, window.state);
  window.contextMenu = new ContextMenu();
  window.offlineCache = new OfflineCache(window.state);

  window.saveToLibraryDrawer = window.saveToLibraryDrawer || {
    refreshSavedBadges: () => {},
    badgeRows: () => {},
  };
  window.saveDrawer = window.saveToLibraryDrawer;

  window.persistence = new PersistenceManager(window.state, window.audioPlayer);
  window.mediaSessionManager = new MediaSessionManager(window.state, window.audioPlayer);
  window.audioPlayer.setMediaSessionManager(window.mediaSessionManager);

  window.MyBeats.createRuntime({
    state: window.state,
    audioPlayer: window.audioPlayer,
    favoritesStore: window.favoritesPlaylists,
  }).boot();

  window.closeModal = () => window.popups?.closeType("modal");
  window.createNewPlaylist = () => window.favoritesPlaylists.createNewPlaylist();
  window.renamePlaylist = (id) => window.favoritesPlaylists.renamePlaylist(id);
  window.deletePlaylist = (id) => window.favoritesPlaylists.deletePlaylist(id);
  window.addSongToPlaylist = (plId, songId) => window.favoritesPlaylists.addSongToPlaylist(plId, songId);
  window.toggleFavAndReRender = (id) => window.uiManager?.toggleFavAndReRender(id);

  window.openMoreMenu = (event, type, id) => {
    if (type === "album") window.contextMenu.show(event.clientX, event.clientY, { albumId: id });
    else if (type === "artist") window.contextMenu.show(event.clientX, event.clientY, { artistId: id });
    else if (type === "playlist") window.contextMenu.show(event.clientX, event.clientY, { playlistId: id });
  };



/****
(function initLibrary() {
  if (!window.MusicStore || !window.MusicStore.index) {
    const errDiv = document.createElement("div");
    errDiv.style.cssText = "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;";
    errDiv.textContent = "Initialization failed:\nwindow.MusicStore.index is missing. Ensure the index is loaded before boot.js.";
    document.body.appendChild(errDiv);
    return;
  }

  window.MusicStore.artists = window.MusicStore.artists || {};
  window.MusicStore.songCache = new Map();
  window.MusicStore.albumCache = new Map();

  const _artistInflight = new Map();
  const _albumInflight = new Map();

  const json = async (url) => {
    const r = await fetch(url, { cache: "default" });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  };

  window.MusicStore.loadArtist = async function (artistId) {
    const id = String(artistId);
    if (window.MusicStore.artists[id]) return window.MusicStore.artists[id];
    if (_artistInflight.has(id)) return _artistInflight.get(id);

    const promise = (async () => {
      const base = `/music.me/library/artists/${id}`;
      const [artist, discography] = await Promise.all([
        json(`${base}/artist.json`),
        json(`${base}/discography.json`).catch(() => ({ albums: [] })),
      ]);

      const merged = {
        ...artist,
        id: artist.id ?? id,
        artist: artist.name ?? artist.artist ?? "",
        albums: discography.albums || [],
      };

      for (const a of merged.albums) {
        const aid = String(a.id);
        if (!window.MusicStore.albumCache.has(aid)) {
          window.MusicStore.albumCache.set(aid, {
            id: a.id,
            title: a.title ?? a.album ?? "",
            year: a.year,
            artwork: a.artwork,
            artistId: merged.id,
            artistName: merged.artist,
            songCount: a.songCount,
            _discographyOnly: true,
          });
        }
      }

      window.MusicStore.artists[id] = merged;
      _artistInflight.delete(id);
      return merged;
    })();

    _artistInflight.set(id, promise);
    return promise;
  };

  window.MusicStore.loadAlbum = async function (artistId, albumId) {
    const aid = String(albumId);
    const cached = window.MusicStore.albumCache.get(aid);
    if (cached && !cached._discographyOnly) return cached;
    if (_albumInflight.has(aid)) return _albumInflight.get(aid);

    const promise = (async () => {
      const url = `/music.me/library/artists/${artistId}/albums/${aid}/album.json`;
      const album = await json(url);
      const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);

      const record = {
        ...album,
        id: album.id ?? aid,
        artistId: album.artistId ?? artistId,
        artistName: artist?.artist ?? "",
        title: album.title ?? album.album ?? "",
        _discographyOnly: false,
      };

      window.MusicStore.albumCache.set(aid, record);

      for (const song of record.songs || []) {
        const sources = song.sources || [];
        window.MusicStore.songCache.set(String(song.id), {
          ...song,
          artistId: record.artistId,
          albumId: record.id,
          artist: record.artistName,
          album: record.title,
          artwork: record.artwork,
          portrait: artist?.portrait,
          genre: artist?.genre || "Unknown",
          source: sources[0]?.src || "",
          sources,
        });
      }

      _albumInflight.delete(aid);
      return record;
    })();

    _albumInflight.set(aid, promise);
    return promise;
  };

  window.MusicStore.prefetchAlbums = function (artistId, albumIds) {
    for (const id of albumIds) {
      window.MusicStore.loadAlbum(artistId, id).catch(() => {});
    }
  };

  window.MusicStore.loadAllSongs = async function (onProgress) {
    const artists = window.MusicStore.index || [];
    const total = artists.length;
    let done = 0;
    for (const a of artists) {
      try {
        const artist = await window.MusicStore.loadArtist(a.id);
        for (const album of artist.albums || []) {
          try { await window.MusicStore.loadAlbum(a.id, album.id); } catch (e) {}
        }
      } catch (e) {}
      done++;
      if (onProgress) onProgress(done, total);
    }
  };

  function artworkUrl(artwork, size = 320) {
    if (!artwork) return "";
    if (typeof artwork === "string") return artwork;
    return artwork[size] || artwork["320"] || artwork["640"] || artwork["160"] || "";
  }

  function portraitUrl(portrait, size = 160) {
    if (!portrait) return "";
    if (typeof portrait === "string") return portrait;
    return portrait[size] || portrait["160"] || portrait["320"] || portrait["640"] || "";
  }

  function pickSource(sources) {
    if (!sources || !sources.length) return "";
    return sources[0].src || "";
  }

  window.metadata = window.MusicStore.index;
  window.state.enrichedLibrary = window.MusicStore.index;

  window.state.getSongById = (id) => window.MusicStore.songCache.get(String(id)) || null;
  window.state.getAlbumById = (id) => window.MusicStore.albumCache.get(String(id)) || null;
  window.state.getArtistById = (id) => {
    const sid = String(id);
    if (window.MusicStore.artists[sid]) return window.MusicStore.artists[sid];
    return window.MusicStore.index.find((a) => String(a.id) === sid || a.artist === sid) || null;
  };

  window.uiManager = new UIManager(window.state, window.audioPlayer, window.favoritesPlaylists);
  window.popups.ui = window.uiManager;
  window.heartManager.store.state = window.state;

  window.pagesActions = {
    buildSongs() {
      if (!window.MusicStore?.songCache) return [];
      return Array.from(window.MusicStore.songCache.values());
    },

    getSongById(id) {
      if (!window.MusicStore?.songCache) return null;
      return window.MusicStore.songCache.get(String(id)) || null;
    },

    getArtistById(id) {
      const sid = String(id);
      if (window.MusicStore?.artists?.[sid]) return window.MusicStore.artists[sid];
      return window.MusicStore?.index?.find(
        (a) => String(a.id) === sid || a.artist === sid
      ) || null;
    },

    getAlbumById(id) {
      if (!window.MusicStore?.albumCache) return null;
      return window.MusicStore.albumCache.get(String(id)) || null;
    },

    getAllSongs() {
      if (!window.MusicStore?.songCache) return [];
      return Array.from(window.MusicStore.songCache.values());
    },

    artworkUrl,
    portraitUrl,
    pickSource,

    playQueue(queue, index = 0, label = "", source = null) {
      if (!queue.length || !window.uiManager?.audioPlayer) return;
      const safeIndex = Math.max(0, Math.min(index, queue.length - 1));
      window.uiManager.audioPlayer.playSong(queue[safeIndex], queue, true, source);
      if (label) (window.uiManager?.state || window.state)?.showToast?.(label);
    },

    playSong(songId, source = null) {
      const state = window.uiManager?.state || window.state;
      const song = state?.getSongById?.(songId);
      if (song && window.uiManager?.audioPlayer) {
        window.uiManager.audioPlayer.playSong(song, null, true, source);
      }
    },

    async shuffleAll() {
      await window.MusicStore.loadAllSongs();
      const songs = this.buildSongs();
      if (!songs.length) return;
      const shuffled = IdUtils.sample(songs, songs.length);
      this.playQueue(shuffled, 0, "Shuffling your whole library", "home");
    },

    async playGenre(genre) {
      await window.MusicStore.loadAllSongs();
      const genreSongs = this.buildSongs().filter(
        (song) => String(song.genre).toLowerCase() === String(genre).toLowerCase()
      );
      if (!genreSongs.length) return;
      const pick = IdUtils.sample(genreSongs, 1)[0];
      this.playSong(pick.id, "home");
      (window.uiManager?.state || window.state)?.showToast?.(`Playing ${genre}`);
    },

    async playMood(mood) {
      await window.MusicStore.loadAllSongs();
      const moodMap = {
        chill: ["pop", "indie", "acoustic", "r&b", "soul"],
        energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
        focus: ["indie", "acoustic", "classical", "instrumental", "alternative"],
        party: ["dance", "electronic", "club", "pop", "hip hop"],
        romance: ["r&b", "soul", "ballad", "pop", "love"],
      };
      const tags = moodMap[mood] || [];
      const allSongs = this.buildSongs();
      const filtered = allSongs.filter((song) =>
        tags.some((tag) => String(song.genre).toLowerCase().includes(tag))
      );
      const pool = filtered.length ? filtered : allSongs;
      const queue = IdUtils.sample(pool, Math.min(12, pool.length));
      this.playQueue(queue, 0, `${mood.charAt(0).toUpperCase() + mood.slice(1)} mix loaded`, "home");
    },

    openStatsDashboard() {
      if (!window.uiManager || !window.state) return;
      window.state.modalOpen(window.uiManager.homePage.statsDashboard());
    },

    goHome() {
      const state = window.uiManager?.state || window.state;
      if (!state) return;
      state.is404 = false;
      window.uiManager?.navigate("home");
    },

    async playAlbum(artistId, albumId) {
      const album = await window.MusicStore.loadAlbum(artistId, albumId);
      const queue = (album.songs || [])
        .map((s) => window.MusicStore.songCache.get(String(s.id)))
        .filter(Boolean);
      if (queue.length && window.uiManager?.audioPlayer) {
        window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
      }
    },

    async shuffleAlbum(artistId, albumId) {
      const album = await window.MusicStore.loadAlbum(artistId, albumId);
      const queue = (album.songs || [])
        .map((s) => window.MusicStore.songCache.get(String(s.id)))
        .filter(Boolean);
      if (queue.length && window.uiManager?.audioPlayer) {
        const shuffled = Utils.shuffle(queue);
        window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
      }
    },
  };
})();
***/


  (async function initLibrary() {
  console.log("[initLibrary] starting");

  if (!window.MusicStore || !window.MusicStore.index) {
    const d = document.createElement("div");
    d.style.cssText = "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;";
    d.textContent = "Initialization failed:\nwindow.MusicStore.index is missing.";
    document.body.appendChild(d);
    return;
  }

  const BASE = "https://clockblocked.github.io/music.me";
  const LIB = `${BASE}/library`;
  const SZ = { cover: 320, portrait: 160 };

  window.MusicStore.artists = {};
  window.MusicStore.songCache = new Map();
  window.MusicStore.albumCache = new Map();
  window.MusicStore.indexById = new Map(
    (window.MusicStore.index || []).map((a) => [String(a.id), a])
  );

  const _artistInflight = new Map();
  const _albumInflight = new Map();

  const json = async (url) => {
    const r = await fetch(url, { cache: "default" });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  };

  const artworkUrl = (artwork, size = SZ.cover) => {
    if (!artwork) return "";
    if (typeof artwork === "string") return artwork;
    return artwork[size] || artwork["320"] || artwork["640"] || artwork["160"] || "";
  };
  const portraitUrl = (portrait, size = SZ.portrait) => {
    if (!portrait) return "";
    if (typeof portrait === "string") return portrait;
    return portrait[size] || portrait["160"] || portrait["320"] || portrait["640"] || "";
  };
  window.MusicStore.artworkUrl = artworkUrl;
  window.MusicStore.portraitUrl = portraitUrl;

  window.MusicStore.loadArtist = async function (artistId) {
    const id = String(artistId);
    if (window.MusicStore.artists[id]) return window.MusicStore.artists[id];
    if (_artistInflight.has(id)) return _artistInflight.get(id);

    const promise = (async () => {
      const [artist, disc] = await Promise.all([
        json(`${LIB}/artists/${id}/artist.json`),
        json(`${LIB}/artists/${id}/discography.json`).catch(() => ({ albums: [] })),
      ]);

      const merged = {
        id: artist.id ?? id,
        artist: artist.name ?? artist.artist ?? "",
        genre: artist.genre ?? "Unknown",
        portrait: artist.portrait ?? {},
        imageUrl: portraitUrl(artist.portrait),
        similar: artist.similar ?? [],
        albums: disc.albums || [],
      };

      for (const a of merged.albums) {
        const aid = String(a.id);
        if (!window.MusicStore.albumCache.has(aid)) {
          window.MusicStore.albumCache.set(aid, {
            id: a.id,
            album: a.title ?? a.album ?? "",
            title: a.title ?? a.album ?? "",
            year: a.year,
            artwork: a.artwork,
            coverUrl: artworkUrl(a.artwork),
            artistId: merged.id,
            artistName: merged.artist,
            songCount: a.songCount,
            songs: [],
            _discographyOnly: true,
          });
        }
      }
      window.MusicStore.artists[id] = merged;
      _artistInflight.delete(id);
      return merged;
    })();

    _artistInflight.set(id, promise);
    return promise;
  };

  window.MusicStore.loadAlbum = async function (artistId, albumId) {
    const aid = String(albumId);
    const cached = window.MusicStore.albumCache.get(aid);
    if (cached && !cached._discographyOnly) return cached;
    if (_albumInflight.has(aid)) return _albumInflight.get(aid);

    const promise = (async () => {
      const album = await json(`${LIB}/artists/${artistId}/albums/${aid}/album.json`);
      const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);

      const record = {
        id: album.id ?? aid,
        album: album.title ?? album.album ?? "",
        title: album.title ?? album.album ?? "",
        artistId: album.artistId ?? artistId,
        artistName: artist?.artist ?? "",
        year: album.year,
        artwork: album.artwork,
        coverUrl: artworkUrl(album.artwork),
        sold: album.sold,
        songs: [],
        _discographyOnly: false,
      };

      for (const song of album.songs || []) {
        const sources = song.sources || [];
        const enriched = {
          ...song,
          artistId: record.artistId,
          albumId: record.id,
          artist: record.artistName,
          album: record.title,
          artwork: record.artwork,
          coverUrl: record.coverUrl,
          portrait: artist?.portrait,
          artistImageUrl: portraitUrl(artist?.portrait),
          genre: artist?.genre || "Unknown",
          source: sources[0]?.src || "",
          sources,
        };
        window.MusicStore.songCache.set(String(song.id), enriched);
        record.songs.push(enriched);
      }

      window.MusicStore.albumCache.set(aid, record);
      _albumInflight.delete(aid);
      return record;
    })();

    _albumInflight.set(aid, promise);
    return promise;
  };

  window.MusicStore.loadAllSongs = async function (onProgress) {
    const entries = window.MusicStore.index || [];
    let done = 0;
    for (const entry of entries) {
      try {
        const artist = await window.MusicStore.loadArtist(entry.id);
        for (const a of artist.albums || []) {
          try { await window.MusicStore.loadAlbum(entry.id, a.id); }
          catch (e) { console.warn(`[loadAllSongs] album ${a.id}:`, e); }
        }
      } catch (e) {
        console.warn(`[loadAllSongs] artist ${entry.id}:`, e);
      }
      done++;
      if (onProgress) onProgress(done, entries.length);
    }
  };

  window.state.getSongById = (id) => window.MusicStore.songCache.get(String(id)) || null;
  window.state.getAlbumById = (id) => window.MusicStore.albumCache.get(String(id)) || null;
  window.state.getArtistById = (id) => {
    const sid = String(id);
    return window.MusicStore.artists[sid] || window.MusicStore.indexById.get(sid) || null;
  };

  window.metadata = window.MusicStore.index;
  window.state.enrichedLibrary = window.MusicStore.index;

  console.log("[initLibrary] creating UIManager");
  window.uiManager = new UIManager(window.state, window.audioPlayer, window.favoritesPlaylists);
  window.popups.ui = window.uiManager;
  window.heartManager.store.state = window.state;

  window.pagesActions = {
    buildSongs() {
      return Array.from(window.MusicStore.songCache.values());
    },
    buildAlbums() {
      return Array.from(window.MusicStore.albumCache.values()).filter((a) => !a._discographyOnly);
    },
    getSongById(id) { return window.MusicStore.songCache.get(String(id)) || null; },
    getAlbumById(id) { return window.MusicStore.albumCache.get(String(id)) || null; },
    getArtistById(id) {
      const sid = String(id);
      return window.MusicStore.artists[sid] || window.MusicStore.indexById.get(sid) || null;
    },
    artworkUrl,
    portraitUrl,
    pickSource(sources) { return sources?.[0]?.src || ""; },

    playQueue(queue, index = 0, label = "", source = null) {
      if (!queue.length || !window.uiManager?.audioPlayer) return;
      const i = Math.max(0, Math.min(index, queue.length - 1));
      window.uiManager.audioPlayer.playSong(queue[i], queue, true, source);
      if (label) window.uiManager.state.showToast?.(label);
    },
    playSong(songId, source = null) {
      const song = this.getSongById(songId);
      if (song) window.uiManager?.audioPlayer?.playSong(song, null, true, source);
    },
    async shuffleAll() {
      await window.MusicStore.loadAllSongs();
      const songs = this.buildSongs();
      if (!songs.length) return;
      this.playQueue(IdUtils.sample(songs, songs.length), 0, "Shuffling your whole library", "home");
    },
    async playGenre(genre) {
      await window.MusicStore.loadAllSongs();
      const songs = this.buildSongs().filter(
        (s) => String(s.genre).toLowerCase() === String(genre).toLowerCase()
      );
      if (!songs.length) return;
      this.playSong(IdUtils.sample(songs, 1)[0].id, "home");
      window.uiManager?.state.showToast?.(`Playing ${genre}`);
    },
    async playMood(mood) {
      await window.MusicStore.loadAllSongs();
      const map = {
        chill: ["pop", "indie", "acoustic", "r&b", "soul"],
        energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
        focus: ["indie", "acoustic", "classical", "instrumental", "alternative"],
        party: ["dance", "electronic", "club", "pop", "hip hop"],
        romance: ["r&b", "soul", "ballad", "pop", "love"],
      };
      const tags = map[mood] || [];
      const all = this.buildSongs();
      const filtered = all.filter((s) => tags.some((t) => String(s.genre).toLowerCase().includes(t)));
      const pool = filtered.length ? filtered : all;
      this.playQueue(IdUtils.sample(pool, Math.min(12, pool.length)), 0,
        `${mood[0].toUpperCase() + mood.slice(1)} mix loaded`, "home");
    },
    openStatsDashboard() {
      if (window.uiManager && window.state)
        window.state.modalOpen(window.uiManager.homePage.statsDashboard());
    },
    goHome() {
      if (!window.state) return;
      window.state.is404 = false;
      window.uiManager?.navigate("home");
    },
    async playAlbum(artistId, albumId) {
      const album = await window.MusicStore.loadAlbum(artistId, albumId);
      const queue = (album.songs || []).map((s) => window.MusicStore.songCache.get(String(s.id))).filter(Boolean);
      if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
    },
    async shuffleAlbum(artistId, albumId) {
      const album = await window.MusicStore.loadAlbum(artistId, albumId);
      const queue = (album.songs || []).map((s) => window.MusicStore.songCache.get(String(s.id))).filter(Boolean);
      if (queue.length) {
        const sh = Utils.shuffle(queue);
        window.uiManager.audioPlayer.playSong(sh[0], sh, true, "album");
      }
    },
  };

  console.log("[initLibrary] ready");
})();



  

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