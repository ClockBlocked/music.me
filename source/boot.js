jQuery(function ($) {
  "use strict";

  Prefs.init();

  window.colorExtractor = new ColorExtractor();
  window.state = new PlayerState();
  window.audioPlayer = new AudioEngine(window.state);



// ──────────────────  Menus  ────────── • • •
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

  function getAlbumSongsSync(albumId) {
    const record = window.MusicStore?.albumCache?.get(String(albumId));
    if (!record || record._discographyOnly || !record.songs?.length) return null;
    return record.songs
      .map((s) => window.MusicStore.songCache.get(String(s.id)) || s)
      .filter((s) => s && (s.downloadPath || s.source));
  }


// ──────────────────  Offline  ────────── • • •
  function setOfflineToggleUI(btn, state) {
    const label = btn.querySelector(".hub-btn-txt");
    const active = state === "all";
    btn.classList.toggle("is-cached-locally", active);
    btn.style.borderColor = active ? "rgba(var(--colorPurple), 0.8)" : "";
    if (!label) return;
    if (state === "all") label.textContent = "Saved Offline ✓";
    else if (state === "busy") label.textContent = "Working…";
    else if (typeof state === "object" && state.partial) {
      label.textContent = `Listen Offline (${state.cached}/${state.total} saved)`;
    } else label.textContent = "Listen Offline";
  }
  function syncOfflineToggle() {
    const btn = document.getElementById("bento-offline-toggle");
    if (!btn || !window.offlineCache) return;
    const songs = getAlbumSongsSync(btn.dataset.albumId);
    if (!songs || !songs.length) {
      setOfflineToggleUI(btn, "none");
      return;
    }
    const cached = songs.filter((s) => window.offlineCache.isCached(s)).length;
    if (cached === songs.length) setOfflineToggleUI(btn, "all");
    else if (cached > 0) setOfflineToggleUI(btn, { partial: true, cached, total: songs.length });
    else setOfflineToggleUI(btn, "none");
  }
  async function handleOfflineToggle(btn) {
    const albumId = btn.dataset.albumId;
    const cache = window.offlineCache;
    const toast = (msg, kind) => window.state?.showToast?.(msg, kind);

    if (!cache || !("serviceWorker" in navigator)) {
      toast?.("Offline caching unavailable on this device", "warning");
      return;
    }

    let songs = getAlbumSongsSync(albumId);

    if (!songs) {
      const record = window.MusicStore?.albumCache?.get(String(albumId));
      if (!record?.artistId) {
        toast?.("Album is not loaded yet", "warning");
        return;
      }
      setOfflineToggleUI(btn, "busy");
      btn.disabled = true;
      try {
        await window.MusicStore.loadAlbum(record.artistId, albumId);
        songs = getAlbumSongsSync(albumId) || [];
      } catch (err) {
        console.warn("[offline] album load failed:", err);
        toast?.("Could not load album for offline saving", "warning");
        return;
      } finally {
        btn.disabled = false;
      }
    }

    if (!songs.length) {
      toast?.("Nothing to cache for this album", "warning");
      return;
    }

    const allCached = songs.every((s) => cache.isCached(s));
    if (allCached) {
      for (const song of songs) cache.removeSong(song);
    } else {
      for (const song of songs) if (!cache.isCached(song)) cache.cacheSong(song);
    }

    syncOfflineToggle();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const type = event.data?.type;
      if (type === "CACHE_STATUS_RESULT" || type === "SONG_CACHED") syncOfflineToggle();
    });
  }




// ──────────────────  Players  ────────── • • •
  function buildAlbumShareUrl(albumTitle) {
    try {
      const match = Array.from(window.MusicStore?.albumCache?.values() || []).find(
        (a) => String(a.title || a.album || "").toLowerCase() === String(albumTitle).toLowerCase()
      );
      if (match?.artistId && match?.id) {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set("artist", match.artistId);
        url.searchParams.set("album", match.id);
        url.searchParams.set("play", "1");
        return url.toString();
      }
    } catch {}
    return window.location.href;
  }
  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } finally {
      area.remove();
    }
  }

  const SEEK_STEP_SECONDS = 10;

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return (
      tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true
    );
  }

  function bindKeyboardShortcuts() {
    const player = window.audioPlayer;
    if (!player) return;

    const seekBy = (delta) => {
      const audio = player.audio;
      if (!audio || !Number.isFinite(audio.currentTime)) return;
      player.seekTo(audio.currentTime + delta);
    };

    const shortcuts = (key) => {
      switch (key) {
        case " ":
        case "k":
          player.togglePlay();
          return true;
        case "arrowright":
        case "l":
          seekBy(SEEK_STEP_SECONDS);
          return true;
        case "arrowleft":
        case "j":
          seekBy(-SEEK_STEP_SECONDS);
          return true;
        case "n":
        case ".":
          player.skipForward?.();
          return true;
        case "p":
        case ",":
          player.skipBack?.();
          return true;
        case "m":
          player.toggleMute?.();
          return true;
        case "s":
          player.toggleShuffle?.();
          return true;
        case "?":
          window.state?.showToast?.(
            "Shortcuts — Space/K: play-pause · ←/→ or J/L: seek 10s · N/P: next/previous · M: mute · S: shuffle · ?: this help"
          );
          return true;
        default:
          return false;
      }
    };

    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (window.state?.isSearchOpen) return;

      const key = event.key.toLowerCase();
      if (shortcuts(key)) event.preventDefault();
    });
  }

  window.persistence = new PersistenceManager(window.state, window.audioPlayer);
  window.mediaSessionManager = new MediaSessionManager(window.state, window.audioPlayer);
  window.audioPlayer.setMediaSessionManager(window.mediaSessionManager);

  window.MyBeats.createRuntime({
    state: window.state,
    audioPlayer: window.audioPlayer,
    favoritesStore: window.favoritesPlaylists,
  }).boot();

  window.closeModal = () => window.popups?.closeType("modal");

  

  
  // ──────────────────  Playlists  ────────── • • •
  const PLAYLIST_NAME_MAX = 120;

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
              <input id="new-pl-name" class="popups-input" maxlength="${PLAYLIST_NAME_MAX}" placeholder="e.g. Late Night Drive">
            </div>
          </div>
        `,
        confirmLabel: "Create",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const input = document.getElementById("new-pl-name");
          const name = (input?.value || "").trim().slice(0, PLAYLIST_NAME_MAX);
          if (!name) {
            window.state?.showToast?.("Please enter a playlist name", "warning");
            return;
          }
          if (window.favoritesPlaylists?.createPlaylist) {
            window.favoritesPlaylists.createPlaylist({ name });
          } else {
            window.state?.showToast?.("Playlist creation is unavailable right now", "warning");
          }
        },
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


  
// ──────────────────  S O U R C E S  ────────── • • •
  const FETCH_TIMEOUT_MS = 12000;
  const FETCH_RETRIES = 1;

  const BASE = resolveBase();
  const LIB = `${BASE}/library`;
  const SZ = { cover: 320, portrait: 160 };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function resolveBase() {
    if (window.MUSIC_ME_BASE) {
      return String(window.MUSIC_ME_BASE).replace(/\/+$/, "");
    }

    const { hostname, origin, pathname } = window.location;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
    if (isLocal) {
      return `${origin}${pathname.includes("/music.me") ? "/music.me" : ""}`;
    }

    try {
      const base = new URL(document.baseURI, origin);
      const dir = base.pathname.replace(/\/[^/]*$/, "");
      return `${base.origin}${dir}`.replace(/\/+$/, "") || base.origin;
    } catch {
      return "https://clockblocked.github.io/music.me";
    }
  }
  async function fetchJson(url, { retries = FETCH_RETRIES } = {}) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, { cache: "default", signal: controller.signal });

        if (!response.ok) {
          const err = new Error(`HTTP ${response.status}: ${url}`);
          if ((response.status >= 500 || response.status === 429) && attempt < retries) {
            lastError = err;
            await delay(400 * (attempt + 1));
            continue;
          }
          throw err;
        }

        return await response.json();
      } catch (err) {
        lastError = err;
        const transient = err.name === "AbortError" || err instanceof TypeError;
        if (attempt < retries && transient) {
          await delay(400 * (attempt + 1));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  }


  function mediaSource(value, fallback = "", baseUrl = BASE) {
    if (value == null || value === "") return fallback;

    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return fallback;

      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/")) return `${BASE}${raw}`;

      try {
        return new URL(raw, `${baseUrl.replace(/\/+$/, "")}/`).toString();
      } catch {
        return `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\.?\//, "")}`;
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = mediaSource(item, "", baseUrl);
        if (normalized) return normalized;
      }
      return fallback;
    }

    if (typeof value === "object") {
      for (const child of Object.values(value)) {
        const normalized = mediaSource(child, "", baseUrl);
        if (normalized) return normalized;
      }
      return fallback;
    }

    return fallback;
  }
  function artworkSource(artwork, baseUrl = BASE) {
    if (!artwork) return "";
    if (typeof artwork === "string") return mediaSource(artwork, "", baseUrl);
    if (typeof artwork === "object") {
      const out = {};
      for (const [size, src] of Object.entries(artwork)) {
        const normalized = mediaSource(src, "", baseUrl);
        if (normalized) out[size] = normalized;
      }
      return Object.keys(out).length ? out : "";
    }
    return "";
  }
  function portraitSource(artist, baseUrl = BASE) {
    if (!artist) return {};
    const portrait = artworkSource(artist.portrait || artist.image || {}, baseUrl);
    const imageUrl =
      mediaSource(
        artist.imageUrl ||
          artist.portrait?.["160"] ||
          artist.portrait?.[160] ||
          artist.portrait?.["320"] ||
          artist.portrait?.[320] ||
          portrait ||
          "",
        "",
        baseUrl
      ) || "";

    return {
      ...artist,
      portrait,
      imageUrl,
      artist: artist.name ?? artist.artist ?? "",
      genre: artist.genre ?? "Unknown",
    };
  }
  function albumSource(album, baseUrl = BASE) {
    if (!album) return {};
    const artwork = artworkSource(album.artwork || album.cover || {}, baseUrl);
    const coverUrl =
      mediaSource(
        album.coverUrl ||
          album.artwork?.["320"] ||
          album.artwork?.[320] ||
          album.artwork?.["640"] ||
          album.artwork?.[640] ||
          artwork ||
          "",
        "",
        baseUrl
      ) || "";

    return {
      ...album,
      artwork,
      coverUrl,
      title: album.title ?? album.album ?? "",
    };
  }

  const artworkUrl = (artwork, size = SZ.cover) => {
    if (!artwork) return "";
    if (typeof artwork === "string") return mediaSource(artwork, "");
    const normalized = artworkSource(artwork);
    if (normalized && typeof normalized === "object") {
      return (
        mediaSource(normalized[size], "") ||
        mediaSource(normalized["320"], "") ||
        mediaSource(normalized["640"], "") ||
        mediaSource(normalized["160"], "") ||
        ""
      );
    }
    return "";
  };
  const portraitUrl = (portrait, size = SZ.portrait) => {
    if (!portrait) return "";
    if (typeof portrait === "string") return mediaSource(portrait, "");
    const normalized = artworkSource(portrait);
    if (normalized && typeof normalized === "object") {
      return (
        mediaSource(normalized[size], "") ||
        mediaSource(normalized["160"], "") ||
        mediaSource(normalized["320"], "") ||
        mediaSource(normalized["640"], "") ||
        ""
      );
    }
    return "";
  };
// ─────────────────────────────────────────────────────────────┘

  
  function renderBootError(err) {
    const card = document.createElement("div");
    card.style.cssText =
      "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;line-height:1.6;";

    const message = document.createElement("div");
    message.textContent = `Initialization failed:\n${err?.message || err}`;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.style.cssText =
      "margin-top:1rem;padding:0.6rem 1.4rem;border:1px solid #ff6b6b;border-radius:8px;" +
      "background:transparent;color:#ff6b6b;font-family:inherit;cursor:pointer;";
    retry.addEventListener("click", () => window.location.reload());

    card.append(message, retry);
    document.body.appendChild(card);
  }
  async function initLibrary() {
    if (!window.MusicStore || !window.MusicStore.index) {
      throw new Error("window.MusicStore.index is missing.");
    }

    window.MusicStore.artists = {};
    window.MusicStore.songCache = new Map();
    window.MusicStore.albumCache = new Map();
    window.MusicStore.indexById = new Map(
      (window.MusicStore.index || []).map((a) => [String(a.id), a])
    );

    const _artistInflight = new Map();
    const _albumInflight = new Map();

    window.MusicStore.mediaSource = mediaSource;
    window.MusicStore.artworkUrl = artworkUrl;
    window.MusicStore.portraitUrl = portraitUrl;

    window.MusicStore.loadArtist = async function (artistId) {
      const id = String(artistId);
      if (window.MusicStore.artists[id]) return window.MusicStore.artists[id];
      if (_artistInflight.has(id)) return _artistInflight.get(id);

      const promise = (async () => {
        const [artist, disc] = await Promise.all([
          fetchJson(`${LIB}/artists/${id}/artist.json`),
          fetchJson(`${LIB}/artists/${id}/discography.json`).catch(() => ({ albums: [] })),
        ]);

        const artistDir = `${LIB}/artists/${id}/`;
        const artistPhoto = portraitSource(artist, artistDir);

        const merged = {
          id: artistPhoto.id ?? id,
          artist: artistPhoto.name ?? artistPhoto.artist ?? "",
          genre: artistPhoto.genre ?? "Unknown",
          portrait: artistPhoto.portrait || {},
          imageUrl: artistPhoto.imageUrl || "",
          similar: artistPhoto.similar ?? [],
          albums: (disc.albums || []).map((album) =>
            albumSource(album, `${LIB}/artists/${id}/albums/${album.id}/`)
          ),
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
        return merged;
      })();

      _artistInflight.set(id, promise);
      try {
        return await promise;
      } finally {
        _artistInflight.delete(id);
      }
    };

    window.MusicStore.loadAlbum = async function (artistId, albumId) {
      const aid = String(albumId);
      const cached = window.MusicStore.albumCache.get(aid);
      if (cached && !cached._discographyOnly) return cached;
      if (_albumInflight.has(aid)) return _albumInflight.get(aid);

      const promise = (async () => {
        const album = await fetchJson(`${LIB}/artists/${artistId}/albums/${aid}/album.json`);
        const artist = await window.MusicStore.loadArtist(artistId).catch(() => null);

        const albumDir = `${LIB}/artists/${artistId}/albums/${aid}/`;
        const artistDir = `${LIB}/artists/${artistId}/`;

        const normalizedAlbum = albumSource(album, albumDir);
        const artistPhoto = portraitSource(artist || {}, artistDir);

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
          const primarySrc = mediaSource(sources[0]?.src || song.source || "", "");
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
            source: primarySrc,
            downloadPath: mediaSource(song.downloadPath || sources[0]?.src || song.source || "", ""),
            sources: sources.map((src) => ({
              ...src,
              src: mediaSource(src?.src || "", ""),
            })),
          };

          window.MusicStore.songCache.set(String(song.id), normalizedSong);
          record.songs.push(normalizedSong);
        }

        window.MusicStore.albumCache.set(aid, record);
        return record;
      })();

      _albumInflight.set(aid, promise);
      try {
        return await promise;
      } finally {
        _albumInflight.delete(aid);
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

    window.uiManager = new UIManager(window.state, window.audioPlayer, window.favoritesPlaylists);
    window.popups.ui = window.uiManager;
    window.heartManager.store.state = window.state;

    const MOOD_GENRE_MAP = {
      chill: ["pop", "indie", "acoustic", "r&b", "soul"],
      energy: ["dance", "electronic", "edm", "hip hop", "rock", "pop"],
      focus: ["indie", "acoustic", "classical", "instrumental", "alternative"],
      party: ["dance", "electronic", "club", "pop", "hip hop"],
      romance: ["r&b", "soul", "ballad", "pop", "love"],
    };

    async function gatherSongsByPredicate(predicate, {
      target = 20,
      maxArtists = 12,
      maxAlbumsPerArtist = 3,
      artistConcurrency = 3,
    } = {}) {
      const index = window.MusicStore.index || [];
      if (!index.length) return [];

      const matches = [];
      const seenSongs = new Set();
      const shuffled = Utils.shuffle(index.slice()).slice(0, maxArtists);

      const processArtist = async (entry) => {
        if (matches.length >= target) return;

        let artist;
        try {
          artist = await window.MusicStore.loadArtist(entry.id);
        } catch {
          return;
        }
        if (!artist?.albums?.length) return;

        const albums = Utils.shuffle(artist.albums.slice()).slice(0, maxAlbumsPerArtist);
        for (const a of albums) {
          if (matches.length >= target) return;

          let album;
          try {
            album = await window.MusicStore.loadAlbum(entry.id, a.id);
          } catch {
            continue;
          }

          for (const song of album.songs || []) {
            if (matches.length >= target) break;
            if (seenSongs.has(song.id)) continue;
            seenSongs.add(song.id);
            if (predicate(song)) matches.push(song);
          }
        }
      };

      for (let i = 0; i < shuffled.length && matches.length < target; i += artistConcurrency) {
        const batch = shuffled.slice(i, i + artistConcurrency);
        await Promise.all(batch.map(processArtist));
      }

      return matches.slice(0, target);
    }

    window.pagesActions = {
      buildSongs() {
        return Array.from(window.MusicStore.songCache.values());
      },
      buildAlbums() {
        return Array.from(window.MusicStore.albumCache.values()).filter((a) => !a._discographyOnly);
      },
      getSongById(id) {
        return window.MusicStore.songCache.get(String(id)) || null;
      },
      getAlbumById(id) {
        return window.MusicStore.albumCache.get(String(id)) || null;
      },
      getArtistById(id) {
        const sid = String(id);
        return window.MusicStore.artists[sid] || window.MusicStore.indexById.get(sid) || null;
      },
      artworkUrl,
      portraitUrl,
      pickSource(sources) {
        return mediaSource(sources?.[0]?.src || "", "");
      },

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

      async playGenre(genre) {
        const songs = await gatherSongsByPredicate(
          (s) => String(s.genre || "").toLowerCase() === String(genre).toLowerCase(),
          { target: 20, maxArtists: 15 }
        );
        if (!songs.length) {
          window.uiManager?.state.showToast?.(`No songs found in ${genre}`);
          return;
        }
        this.playQueue(Utils.shuffle(songs), 0, `Playing ${genre}`, "home");
      },

      async playMood(mood) {
        const tags = MOOD_GENRE_MAP[mood] || [];
        if (!tags.length) return;

        const songs = await gatherSongsByPredicate(
          (s) => tags.some((t) => String(s.genre || "").toLowerCase().includes(t)),
          { target: 20, maxArtists: 25 }
        );
        if (!songs.length) {
          window.uiManager?.state.showToast?.(`No songs found for ${mood}`);
          return;
        }

        this.playQueue(
          Utils.shuffle(songs).slice(0, 12),
          0,
          `${mood[0].toUpperCase() + mood.slice(1)} mix loaded`,
          "home"
        );
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
        const queue = (album.songs || [])
          .map((s) => window.MusicStore.songCache.get(String(s.id)))
          .filter(Boolean);
        if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
      },
      async shuffleAlbum(artistId, albumId) {
        const album = await window.MusicStore.loadAlbum(artistId, albumId);
        const queue = (album.songs || [])
          .map((s) => window.MusicStore.songCache.get(String(s.id)))
          .filter(Boolean);
        if (queue.length) {
          const sh = Utils.shuffle(queue);
          window.uiManager.audioPlayer.playSong(sh[0], sh, true, "album");
        }
      },
    };

    async function handleDeepLink() {
      const params = new URLSearchParams(window.location.search);
      const artistId = params.get("artist");
      const albumId = params.get("album");
      const songId = params.get("song") || params.get("track");
      const autoplay = params.get("play") === "1";
      if (!artistId && !albumId && !songId) return;

      const stripParams = () => {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      };

      try {
        if (artistId && albumId) {
          const album = await window.MusicStore.loadAlbum(artistId, albumId);
          const queue = (album.songs || [])
            .map((s) => window.MusicStore.songCache.get(String(s.id)))
            .filter(Boolean);

          if (songId) {
            const index = queue.findIndex((s) => String(s.id) === String(songId));
            if (index !== -1) {
              if (autoplay) window.pagesActions.playQueue(queue, index, "", "deep-link");
              else window.state.showToast?.(`${queue[index].title} ready — press play`);
            }
          } else if (autoplay && queue.length) {
            window.pagesActions.playQueue(queue, 0, `Playing ${album.title}`, "deep-link");
          } else {
            window.state.showToast?.(`${album.title} loaded`);
          }
          stripParams();
        } else if (artistId) {
          await window.MusicStore.loadArtist(artistId);
          stripParams();
        }
      } catch (err) {
        console.warn("[deepLink] could not resolve link:", err);
        window.state?.showToast?.("Could not open that link", "warning");
      }
    }

    await handleDeepLink();
  }
  (async () => {
    try {
      await initLibrary();
    } catch (err) {
      console.error("[initLibrary] failed:", err);
      renderBootError(err);
    }
  })();



  
  
  bindKeyboardShortcuts();

  $(document).on("click", async function (e) {
    const shareAnchor = e.target.closest("#bento-album-share");
    if (shareAnchor) {
      e.preventDefault();
      const albumTitle = shareAnchor.getAttribute("data-album-title") || "Album Selection";
      const shareUrl = buildAlbumShareUrl(albumTitle);
      const shareMeta = {
        title: albumTitle,
        text: `Listen to ${albumTitle} on MyBeats Music.`,
        url: shareUrl,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareMeta);
        } else {
          await copyToClipboard(shareUrl);
          const toast = window.uiManager?.state?.showToast || window.state?.showToast;
          toast?.("Link copied!");
        }
      } catch (err) {
        console.warn("Media runtime share actions terminated cleanly:", err);
      }
    }

    const offlineBtn = e.target.closest("#bento-offline-toggle");
    if (offlineBtn) {
      e.preventDefault();
      handleOfflineToggle(offlineBtn).catch((err) => {
        console.warn("[offline] toggle failed:", err);
        window.state?.showToast?.("Offline save failed", "warning");
      });
    }
  });
});