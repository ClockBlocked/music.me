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

  window.createNewPlaylist = function () {
    if (window.favoritesPlaylists && typeof window.favoritesPlaylists.createNewPlaylist === "function") {
      return window.favoritesPlaylists.createNewPlaylist();
    }

    if (window.uiManager && typeof window.uiManager.createPlaylist === "function") {
      return window.uiManager.createPlaylist();
    }

    if (window.popups && typeof window.popups.modal === "function") {
      return window.popups.modal({
        title: "Create Playlist",
        content: `
          <div class="popups-form">
            <div class="popups-field">
              <label for="new-pl-name">Playlist name</label>
              <input id="new-pl-name" class="popups-input" placeholder="e.g. Late Night Drive">
            </div>
          </div>
        `,
        confirmLabel: "Create",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const input = document.getElementById("new-pl-name");
          const name = (input?.value || "").trim();
          if (!name) {
            if (window.state?.showToast) {
              window.state.showToast("Please enter a playlist name", "warning");
            }
            return;
          }
          if (window.favoritesPlaylists) {
            window.favoritesPlaylists.createPlaylist({ name });
          }
        }
      });
    }

    console.warn("[boot] Playlist creation flow is unavailable.");
    return null;
  };

  window.createPlaylist = window.createNewPlaylist;
  window.renamePlaylist = (id) => window.favoritesPlaylists?.renamePlaylist?.(id);
  window.deletePlaylist = (id) => window.favoritesPlaylists?.deletePlaylist?.(id);
  window.addSongToPlaylist = (plId, songId) => window.favoritesPlaylists?.addSongToPlaylist?.(plId, songId);
  window.toggleFavAndReRender = (id) => window.uiManager?.toggleFavAndReRender?.(id);

  window.openMoreMenu = (event, type, id) => {
    if (type === "album") window.contextMenu.show(event.clientX, event.clientY, { albumId: id });
    else if (type === "artist") window.contextMenu.show(event.clientX, event.clientY, { artistId: id });
    else if (type === "playlist") window.contextMenu.show(event.clientX, event.clientY, { playlistId: id });
  };



(async function initLibrary() {
  console.log("[initLibrary] starting");

  if (!window.MusicStore || !window.MusicStore.index) {
    const d = document.createElement("div");
    d.style.cssText = "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;";
    d.textContent = "Initialization failed:\nwindow.MusicStore.index is missing.";
    document.body.appendChild(d);
    return;
  }

  const BASE =
    window.location.hostname === "localhost"
      ? `${window.location.origin}${window.location.pathname.includes("/music.me") ? "/music.me" : ""}`
      : "https://clockblocked.github.io/music.me";

  const LIB = `${BASE}/library`;
  const SZ = { cover: 320, portrait: 160 };

  function mediaSource(value, fallback = "") {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") {
      let raw = value.trim();
      if (!raw) return fallback;
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/")) return `${BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
      try { return new URL(raw, `${BASE}/`).toString(); } 
      catch (err) { return `${BASE}/${raw.replace(/^\.?\//, "")}`; }
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = mediaSource(item, "");
        if (normalized) return normalized;
      }
      return fallback;
    }
    if (typeof value === "object") {
      for (const child of Object.values(value)) {
        const normalized = mediaSource(child, "");
        if (normalized) return normalized;
      }
      return fallback;
    }
    return fallback;
  }

  function artworkSource(artwork) {
    if (!artwork) return "";
    if (typeof artwork === "string") return mediaSource(artwork, "");
    if (typeof artwork === "object") {
      const out = {};
      for (const [size, src] of Object.entries(artwork)) {
        const normalized = mediaSource(src, "");
        if (normalized) out[size] = normalized;
      }
      return Object.keys(out).length ? out : "";
    }
    return "";
  }

  function portraitSource(artist) {
    if (!artist) return {};
    const portrait = artworkSource(artist.portrait || artist.image || {});
    const imageUrl = mediaSource(
      artist.imageUrl ||
        artist.portrait?.["160"] || artist.portrait?.[160] ||
        artist.portrait?.["320"] || artist.portrait?.[320] ||
        portrait || "", ""
    ) || "";
    return {
      ...artist,
      portrait,
      imageUrl,
      artist: artist.name ?? artist.artist ?? "",
      genre: artist.genre ?? "Unknown",
    };
  }

  function albumSource(album) {
    if (!album) return {};
    const artwork = artworkSource(album.artwork || album.cover || {});
    const coverUrl = mediaSource(
      album.coverUrl ||
        album.artwork?.["320"] || album.artwork?.[320] ||
        album.artwork?.["640"] || album.artwork?.[640] ||
        artwork || "", ""
    ) || "";
    return {
      ...album,
      artwork,
      coverUrl,
      title: album.title ?? album.album ?? "",
    };
  }

  window.MusicStore.artists = {};
  window.MusicStore.songCache = new Map();
  window.MusicStore.albumCache = new Map();
  window.MusicStore.indexById = new Map((window.MusicStore.index || []).map((a) => [String(a.id), a]));

  const _artistInflight = new Map();
  const _albumInflight = new Map();

  const json = async (url) => {
    const r = await fetch(url, { cache: "default" });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  };

  window.MusicStore.artworkUrl = function(artwork, size = SZ.cover) {
    if (!artwork) return "";
    if (typeof artwork === "string") return mediaSource(artwork, "");
    const normalized = artworkSource(artwork);
    if (normalized && typeof normalized === "object") {
      return mediaSource(normalized[size], "") || mediaSource(normalized["320"], "") || mediaSource(normalized["640"], "") || mediaSource(normalized["160"], "") || "";
    }
    return "";
  };

  window.MusicStore.portraitUrl = function(portrait, size = SZ.portrait) {
    if (!portrait) return "";
    if (typeof portrait === "string") return mediaSource(portrait, "");
    const normalized = artworkSource(portrait);
    if (normalized && typeof normalized === "object") {
      return mediaSource(normalized[size], "") || mediaSource(normalized["160"], "") || mediaSource(normalized["320"], "") || mediaSource(normalized["640"], "") || "";
    }
    return "";
  };

  window.MusicStore.loadArtist = async function (artistId) {
    const id = String(artistId);
    if (window.MusicStore.artists[id]) return window.MusicStore.artists[id];
    if (_artistInflight.has(id)) return _artistInflight.get(id);

    const promise = (async () => {
      const [artist, disc] = await Promise.all([
        json(`${LIB}/artists/${id}/artist.json`),
        json(`${LIB}/artists/${id}/discography.json`).catch(() => ({ albums: [] })),
      ]);

      const artistPhoto = portraitSource(artist);
      const merged = {
        id: artistPhoto.id ?? id,
        artist: artistPhoto.name ?? artistPhoto.artist ?? "",
        genre: artistPhoto.genre ?? "Unknown",
        portrait: artistPhoto.portrait || {},
        imageUrl: artistPhoto.imageUrl || "",
        similar: artistPhoto.similar ?? [],
        albums: (disc.albums || []).map((album) => albumSource(album)),
      };

      for (const a of merged.albums) {
        const aid = String(a.id);
        if (!window.MusicStore.albumCache.has(aid)) {
          window.MusicStore.albumCache.set(aid, {
            id: a.id,
            album: a.title ?? a.album ?? "",
            title: a.title ?? a.album ?? "",
            year: a.year,
            artwork: a.artwork || "",
            coverUrl: a.coverUrl || "",
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

      const normalizedAlbum = albumSource(album);
      const artistPhoto = portraitSource(artist || {});

      const record = {
        id: normalizedAlbum.id ?? aid,
        album: normalizedAlbum.title ?? normalizedAlbum.album ?? "",
        title: normalizedAlbum.title ?? normalizedAlbum.album ?? "",
        artistId: normalizedAlbum.artistId ?? artistId,
        artistName: artistPhoto.artist || normalizedAlbum.artistName || "",
        year: normalizedAlbum.year,
        artwork: normalizedAlbum.artwork || "",
        coverUrl: normalizedAlbum.coverUrl || "",
        sold: normalizedAlbum.sold,
        songs: [],
        _discographyOnly: false,
      };

      for (const song of normalizedAlbum.songs || album.songs || []) {
        const sources = Array.isArray(song.sources) ? song.sources : [];
        const normalizedSong = {
          ...song,
          artistId: record.artistId,
          albumId: record.id,
          artist: record.artistName,
          album: record.title,
          artwork: record.artwork,
          coverUrl: record.coverUrl,
          portrait: artistPhoto.portrait || {},
          artistImageUrl: artistPhoto.imageUrl || "",
          genre: artistPhoto.genre || "Unknown",
          source: mediaSource(sources[0]?.src || song.source || "", ""),
          sources: (sources || []).map((src) => ({
            ...src,
            src: mediaSource(src?.src || "", ""),
          })),
        };

        window.MusicStore.songCache.set(String(song.id), normalizedSong);
        record.songs.push(normalizedSong);
      }

      window.MusicStore.albumCache.set(aid, record);
      _albumInflight.delete(aid);
      return record;
    })();

    _albumInflight.set(aid, promise);
    return promise;
  };

  window.MusicStore.getStats = async function() {
    try {
      return await json(`${LIB}/stats.json`);
    } catch (err) {
      let albums = 0;
      let songs = 0;
      (window.MusicStore.index || []).forEach((a) => {
        albums += a.albumCount || 0;
        songs += a.songCount || 0;
      });
      return {
        songs,
        albums,
        artists: window.MusicStore.index.length,
        playlists: (window.state.playlists || []).length,
      };
    }
  };

  window.MusicStore.getArtistsPaginated = function(page, limit, sort, query) {
    let items = [...window.MusicStore.index];
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((a) => (a.artist || "").toLowerCase().includes(q));
    }
    if (sort === "title" || sort === "artist") {
      items.sort((a, b) => (a.artist || "").localeCompare(b.artist || ""));
    }
    const start = (page - 1) * limit;
    return items.slice(start, start + limit).map((a) => window.MusicStore.artists[String(a.id)] || a);
  };

  window.MusicStore.getAlbumsPaginated = function(page, limit, sort, query) {
    let items = Array.from(window.MusicStore.albumCache.values()).filter((a) => !a._discographyOnly);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((a) => (a.album || "").toLowerCase().includes(q) || (a.artistName || "").toLowerCase().includes(q));
    }
    if (sort === "title") items.sort((a, b) => (a.album || "").localeCompare(b.album || ""));
    else if (sort === "artist") items.sort((a, b) => (a.artistName || "").localeCompare(b.artistName || ""));
    
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  };

  window.MusicStore.getSongsPaginated = function(page, limit, sort, query) {
    let items = Array.from(window.MusicStore.songCache.values());
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((s) => (s.title || "").toLowerCase().includes(q) || (s.artist || "").toLowerCase().includes(q));
    }
    if (sort === "title") items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
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
    artworkUrl: window.MusicStore.artworkUrl,
    portraitUrl: window.MusicStore.portraitUrl,
    pickSource(sources) { return mediaSource(sources?.[0]?.src || "", ""); },

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
      const artists = Utils.shuffle([...window.MusicStore.index]).slice(0, 5);
      let pool = [];
      for (const a of artists) {
        const artist = await window.MusicStore.loadArtist(a.id).catch(() => null);
        if (artist && artist.albums.length) {
          const alb = artist.albums[Math.floor(Math.random() * artist.albums.length)];
          const album = await window.MusicStore.loadAlbum(artist.id, alb.id).catch(() => null);
          if (album && album.songs) pool.push(...album.songs);
        }
      }
      if (pool.length) {
        this.playQueue(Utils.shuffle(pool), 0, "Shuffling your whole library", "home");
      }
    },
    async playGenre(genre) {
      const artistStubs = window.MusicStore.index.filter((a) => String(a.genre).toLowerCase() === String(genre).toLowerCase());
      if (!artistStubs.length) return;
      const picks = Utils.shuffle(artistStubs).slice(0, 3);
      let pool = [];
      for (const a of picks) {
        const artist = await window.MusicStore.loadArtist(a.id).catch(() => null);
        if (artist && artist.albums.length) {
          const alb = artist.albums[0];
          const album = await window.MusicStore.loadAlbum(artist.id, alb.id).catch(() => null);
          if (album && album.songs) pool.push(...album.songs);
        }
      }
      if (pool.length) {
        this.playSong(Utils.shuffle(pool)[0].id, "home");
        window.uiManager?.state.showToast?.(`Playing ${genre}`);
      }
    },
    async playMood(mood) {
      const map = {
        chill: ["pop", "indie", "acoustic", "r&b", "soul"],
        energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
        focus: ["indie", "acoustic", "classical", "instrumental", "alternative"],
        party: ["dance", "electronic", "club", "pop", "hip hop"],
        romance: ["r&b", "soul", "ballad", "pop", "love"],
      };
      const tags = map[mood] || [];
      const artistStubs = window.MusicStore.index.filter((a) =>
        tags.some((t) => String(a.genre).toLowerCase().includes(t))
      );
      if (!artistStubs.length) return;

      const picks = Utils.shuffle(artistStubs).slice(0, 3);
      let pool = [];
      for (const a of picks) {
        const artist = await window.MusicStore.loadArtist(a.id).catch(() => null);
        if (artist && artist.albums.length) {
          const alb = artist.albums[0];
          const album = await window.MusicStore.loadAlbum(artist.id, alb.id).catch(() => null);
          if (album && album.songs) pool.push(...album.songs);
        }
      }
      if (pool.length) {
        this.playQueue(Utils.shuffle(pool), 0, `${mood[0].toUpperCase() + mood.slice(1)} mix loaded`, "home");
      }
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