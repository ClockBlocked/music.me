




const AUDIO_CDN_BASE = "https://pub-54216af4fb1549ff95a6cb5f8d63fe2d.r2.dev";

class PlayerState {
  constructor() {
    this.currentSong = null;
    this.queue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = Config.VOLUME.default;
    this.isMuted = false;
    this.playbackRate = 1;
    this.repeatMode = "off";
    this.isShuffled = false;
    this.recentlyPlayed = [];
    this.isDrawerOpen = false;
    this.isQueueOpen = false;
    this.isLyricsOpen = false;
    this.isVideoOpen = false;
    this.videoInfo = null;
    this.sleepTimerEndsAt = null;
    this.sleepTimerId = null;
    this.sleepTimerTrackEnd = false;
    this.audioError = null;
    this.pendingDeepLinkSong = null;
    this.favoriteSongs = [];
    this.favoriteArtists = [];
    this.favoriteAlbums = [];
    this.favoritePlaylists = [];
    this.playlists = [];
    this.enrichedLibrary = [];
    this.favoritesTab = "songs";
    this.selectedPlaylistName = null;
    this.selectedPlaylistId = null;
    this.isCreatingPlaylist = false;
    this.editingPlaylistId = null;
    this.artistId = null;
    this.selectedAlbumId = null;
    this.artistPageName = null;
    this.selectedAlbumName = null;
    this.currentPage = "home";
    this.isSearchOpen = false;
    this.searchQuery = "";
    this.is404 = false;
    this._persist = null;
    this._playCounts = new Map();
    this._recentCache = [];
    this._originalQueue = null;
    this.lastVolume = 1;
  }
  getSongById(id) {
    const sid = String(id);
    for (const artist of this.enrichedLibrary) {
      for (const album of artist.albums) {
        const song = album.songs.find((s) => String(s.id) === sid);
        if (song)
          return {
            ...song,
            artistId: artist.id,
            albumId: album.id,
            artist: artist.artist,
            album: album.album,
            coverUrl: album.coverUrl,
          };
      }
    }
    return null;
  }
  getArtistById(id) {
    const sid = String(id);
    return this.enrichedLibrary.find((a) => String(a.id) === sid || a.artist === sid) || null;
  }
  getAlbumById(id) {
    const sid = String(id);
    for (const artist of this.enrichedLibrary) {
      const album = artist.albums.find((a) => String(a.id) === sid);
      if (album) return { ...album, artistId: artist.id, artistName: artist.artist };
    }
    return null;
  }
  getAllSongs() {
    const songs = [];
    for (const artist of this.enrichedLibrary) {
      for (const album of artist.albums) {
        for (const song of album.songs) {
          songs.push({
            ...song,
            artistId: artist.id,
            albumId: album.id,
            artist: artist.artist,
            album: album.album,
            coverUrl: album.coverUrl,
          });
        }
      }
    }
    return songs;
  }
  buildPlaylistQueue(playlistId) {
    const pl = this.playlists.find((p) => String(p.id) === String(playlistId));
    if (!pl) return [];
    return pl.songs.map((id) => this.getSongById(id)).filter(Boolean);
  }
  getPlayCount(songId) {
    return this._playCounts.get(String(songId)) || 0;
  }
  getMostPlayed(limit = 10) {
    const entries = [...this._playCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    return entries.map(([id]) => this.getSongById(id)).filter(Boolean);
  }
  formatTime(seconds) {
    return Utils.fmtTime(seconds);
  }
  persist() {
    if (this._persist) this._persist.save();
  }
  showToast(message, type = "info", duration) {
    window.popups?.toast({ message, type, duration });
  }
  modalOpen(content) {
    window.popups?.modal({ content, closable: true, autoClose: false });
  }
  modalClose() {
    window.popups?.closeType("modal");
  }
}

class AudioEngine {
  constructor(state) {
    this.state = state;
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.volume = state.volume;
    this.audio.playbackRate = state.playbackRate;
    this.mediaSessionManager = null;
    this._listeners = {};
    this._sourceCandidates = [];
    this._sourceIndex = 0;
    this._autoplayPending = false;
    if (!this.state._playCounts) this.state._playCounts = new Map();
    if (!this.state._originalQueue) this.state._originalQueue = null;
    this._init();
  }
  _init() {
    this.audio.addEventListener("loadstart", () => {
      this.state.duration = 0;
      this.state.currentTime = 0;
    });
    this.audio.addEventListener("play", () => {
      this.state.isPlaying = true;
      this._autoplayPending = false;
      this._emit("play");
    });
    this.audio.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this._emit("pause");
    });
    this.audio.addEventListener("ended", () => {
      this._emit("ended");
      this.handleEnded();
    });
    this.audio.addEventListener("timeupdate", () => {
      this.state.currentTime = this.audio.currentTime;
      this._emit("timeupdate");
    });
    this.audio.addEventListener("loadedmetadata", () => {
      this.state.duration = this.audio.duration;
      this._emit("loadedmetadata");
    });
    this.audio.addEventListener("error", () => {
      if (this._sourceIndex < this._sourceCandidates.length - 1) {
        this._sourceIndex++;
        this.audio.src = this._sourceCandidates[this._sourceIndex];
        this.audio.load();
        if (this._autoplayPending) this.audio.play().catch(() => {});
        return;
      }
      this._autoplayPending = false;
      this.state.audioError = this.state.currentSong ? this.state.currentSong.id : null;
      this._emit("error");
    });
    this.audio.addEventListener("ratechange", () => {
      this.state.playbackRate = this.audio.playbackRate;
      this._emit("ratechange");
    });
  }
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }
  off(event, cb) {
    if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter((f) => f !== cb);
  }
  _emit(event, data) {
    (this._listeners[event] || []).forEach((cb) => cb(data));
  }
  setMediaSessionManager(mgr) {
    this.mediaSessionManager = mgr;
  }
  playSong(song, queue = null, autoplay = true, source = null) {
    if (!song) return;
    if (queue && queue.length) {
      this.state.queue = queue;
      this.state.queueIndex = queue.findIndex((s) => String(s.id) === String(song.id));
      if (this.state.queueIndex === -1) this.state.queueIndex = 0;
    } else {
      this.state.queue = [song];
      this.state.queueIndex = 0;
    }
    this.state.currentSong = song;
    this.state.audioError = null;
    this.state.duration = 0;
    const songId = song.id;
    if (!songId) {
      console.error("Cannot build audio URL: song has no id.");
      return;
    }
    this._sourceCandidates = [`${AUDIO_CDN_BASE}/${songId}.mp3`, `${AUDIO_CDN_BASE}/${songId}.webm`];
    this._sourceIndex = 0;
    this._autoplayPending = !!autoplay;
    this.audio.src = this._sourceCandidates[0];
    this.audio.load();
    if (autoplay) this.audio.play().catch((err) => console.warn("Playback failed:", err));
    this._updateRecentlyPlayed(song);
    this._updatePlayCount(song.id);
    const enriched = this.state.getSongById(song.id) || song;
    this.mediaSessionManager?.updateMetadata(enriched);
    this._emit("songchange", { song, source });
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }
  togglePlay() {
    if (!this.state.currentSong) return;
    if (this.state.isVideoOpen) {
      window.uiManager?.videoController?.toggleVideoPlayback?.();
      return;
    }
    if (this.audio.paused) this.audio.play().catch(() => {});
    else this.audio.pause();
  }
  skipForward() {
    if (!this.state.queue.length) return;
    let nextIndex = this.state.queueIndex + 1;
    if (nextIndex >= this.state.queue.length) {
      if (this.state.repeatMode === "all") nextIndex = 0;
      else return;
    }
    this.state.queueIndex = nextIndex;
    this.playSong(this.state.queue[nextIndex]);
  }
  skipBack() {
    if (!this.state.queue.length) return;
    let prevIndex = this.state.queueIndex - 1;
    if (prevIndex < 0) {
      if (this.state.repeatMode === "all") prevIndex = this.state.queue.length - 1;
      else prevIndex = 0;
    }
    this.state.queueIndex = prevIndex;
    this.playSong(this.state.queue[prevIndex]);
  }
  setVolume(vol) {
    this.state.volume = Utils.clamp(vol, 0, 1);
    this.audio.volume = this.state.volume;
    this.state.isMuted = this.state.volume === 0;
    this._emit("volumechange");
  }
  toggleMute() {
    if (!this.state.isMuted) {
      this.state.lastVolume = this.state.volume > 0 ? this.state.volume : this.state.lastVolume || 1;
      this.state.isMuted = true;
      this.audio.volume = 0;
    } else {
      this.state.isMuted = false;
      this.audio.volume = this.state.lastVolume || this.state.volume || 1;
      this.state.volume = this.audio.volume;
    }
    this._emit("volumechange");
  }
  toggleShuffle() {
    this.state.isShuffled = !this.state.isShuffled;
    if (this.state.isShuffled) {
      if (!this.state._originalQueue) this.state._originalQueue = [...this.state.queue];
      const current = this.state.queue[this.state.queueIndex];
      const rest = this.state.queue.filter((_, i) => i !== this.state.queueIndex);
      const shuffledRest = Utils.shuffle(rest);
      this.state.queue = [current, ...shuffledRest];
      this.state.queueIndex = 0;
    } else {
      if (this.state._originalQueue) {
        const currentSong = this.state.currentSong;
        this.state.queue = [...this.state._originalQueue];
        this.state.queueIndex = this.state.queue.findIndex((s) => s.id === currentSong?.id);
        this.state._originalQueue = null;
      }
    }
    this._emit("shufflechange");
  }
  cycleRepeat() {
    const modes = ["off", "all", "one"];
    const idx = modes.indexOf(this.state.repeatMode);
    this.state.repeatMode = modes[(idx + 1) % modes.length];
    this._emit("repeatchange");
    this.audio.loop = this.state.repeatMode === "one";
  }
  handleEnded() {
    if (this.state.repeatMode === "one") {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
      return;
    }
    if (this.state.queueIndex < this.state.queue.length - 1) this.skipForward();
    else if (this.state.repeatMode === "all") {
      this.state.queueIndex = 0;
      this.playSong(this.state.queue[0]);
    } else {
      this.state.isPlaying = false;
      this._emit("queueend");
    }
  }
  _updateRecentlyPlayed(song) {
    const id = song.id;
    const existing = this.state.recentlyPlayed.find((s) => String(s.id) === String(id));
    if (existing) this.state.recentlyPlayed.splice(this.state.recentlyPlayed.indexOf(existing), 1);
    this.state.recentlyPlayed.unshift(song);
    if (this.state.recentlyPlayed.length > Config.QUEUE.recentMax)
      this.state.recentlyPlayed.length = Config.QUEUE.recentMax;
    window.dispatchEvent(new CustomEvent("mybeats:recently-played", { detail: { song } }));
  }
  _updatePlayCount(songId) {
    const sid = String(songId);
    this.state._playCounts.set(sid, (this.state._playCounts.get(sid) || 0) + 1);
    window.dispatchEvent(new CustomEvent("mybeats:play-counts"));
  }
  restorePlaybackState(song, queue, time, wasPlaying) {
    this.state.currentSong = song;
    this.state.queue = queue;
    this.state.queueIndex = queue.findIndex((s) => String(s.id) === String(song.id));
    const songId = song.id;
    this._sourceCandidates = songId ? [`${AUDIO_CDN_BASE}/${songId}.mp3`, `${AUDIO_CDN_BASE}/${songId}.webm`] : [];
    this._sourceIndex = 0;
    this._autoplayPending = !!wasPlaying;
    this.audio.src = this._sourceCandidates[0] || "";
    this.audio.load();
    if (time) this.audio.currentTime = time;
    if (wasPlaying) this.audio.play().catch(() => {});
    const enriched = this.state.getSongById(song.id) || song;
    this.mediaSessionManager?.updateMetadata(enriched);
  }
  get currentTime() {
    return this.audio.currentTime;
  }
  set currentTime(val) {
    this.audio.currentTime = val;
  }
  get duration() {
    return this.audio.duration;
  }
  set duration(val) {
    this.state.duration = val;
  }
}

class MediaSessionManager {
  constructor(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.audio = audioPlayer.audio;
    this._supported =
      typeof navigator !== "undefined" && "mediaSession" in navigator && typeof window.MediaMetadata === "function";
    this._pendingMetadata = null;
    this._rafId = null;
    this._positionUpdateScheduled = false;
    this._onPlay = () => {
      this.updatePlaybackState();
      this._reapplyMetadataIfMissing();
    };
    this._onPause = () => this.updatePlaybackState();
    this._onEnded = () => this.updatePlaybackState();
    this._onTimeUpdate = () => this._schedulePositionUpdate();
    this._onLoadedMetadata = () => {
      this.updatePositionState();
      this._reapplyMetadataIfMissing();
    };
    this._onDurationChange = () => this.updatePositionState();
    this._onSeeked = () => this.updatePositionState();
    this._onRateChange = () => this.updatePositionState();
    if (!this._supported) {
      console.warn("[MediaSession] API not supported in this browser");
      return;
    }
    this._setupActionHandlers();
    this._attachAudioListeners();
  }
  updateMetadata(songData) {
    if (!this._supported) return;
    if (!songData) {
      this.clearMetadata();
      return;
    }
    const song = this._resolveSong(songData);
    const title = song.title || song.name || "Unknown Title";
    const artist = song.artist || song.artistName || "Unknown Artist";
    const album = song.album || song.albumName || "";
    const artwork = this._buildArtwork(song.coverUrl);
    this._pendingMetadata = { title, artist, album, artwork };
    try {
      navigator.mediaSession.metadata = new MediaMetadata(this._pendingMetadata);
    } catch (err) {
      console.warn("[MediaSession] Metadata with artwork failed:", err);
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album });
        this._pendingMetadata = { title, artist, album, artwork: [] };
      } catch (err2) {
        console.error("[MediaSession] Metadata failed entirely:", err2);
        return;
      }
    }
    this.updatePlaybackState();
    this.updatePositionState();
  }
  clearMetadata() {
    if (!this._supported) return;
    this._pendingMetadata = null;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    if ("setPositionState" in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState();
      } catch (err) {
        console.warn("[MediaSession] clearMetadata setPositionState failed:", err);
      }
    }
  }
  updatePlaybackState() {
    if (!this._supported) return;
    navigator.mediaSession.playbackState = this.audio.paused ? "paused" : "playing";
  }
  updatePositionState() {
    if (!this._supported) return;
    if (!("setPositionState" in navigator.mediaSession)) return;
    const duration = this.audio.duration;
    const position = this.audio.currentTime;
    const rate = this.audio.playbackRate;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(position) || position < 0) return;
    if (!Number.isFinite(rate) || rate <= 0) return;
    try {
      navigator.mediaSession.setPositionState({ duration, playbackRate: rate, position: Math.min(position, duration) });
    } catch (err) {
      console.warn("[MediaSession] setPositionState failed:", err);
    }
  }
  destroy() {
    if (!this._supported) return;
    this.audio.removeEventListener("play", this._onPlay);
    this.audio.removeEventListener("pause", this._onPause);
    this.audio.removeEventListener("ended", this._onEnded);
    this.audio.removeEventListener("timeupdate", this._onTimeUpdate);
    this.audio.removeEventListener("loadedmetadata", this._onLoadedMetadata);
    this.audio.removeEventListener("durationchange", this._onDurationChange);
    this.audio.removeEventListener("seeked", this._onSeeked);
    this.audio.removeEventListener("ratechange", this._onRateChange);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.clearMetadata();
  }
  _resolveSong(song) {
    if (song.title && song.artist && song.coverUrl) return song;
    const enriched = this.state?.getSongById?.(song.id);
    return enriched ? { ...song, ...enriched } : song;
  }
  _reapplyMetadataIfMissing() {
    if (!this._supported || !this._pendingMetadata) return;
    if (navigator.mediaSession.metadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata(this._pendingMetadata);
    } catch (err) {
      console.warn("[MediaSession] Re-apply failed:", err);
    }
  }
  _buildArtwork(coverUrl) {
    if (!coverUrl) return [];
    let absoluteUrl;
    try {
      absoluteUrl = new URL(coverUrl, document.baseURI).href;
    } catch {
      console.warn("[MediaSession] Invalid coverUrl:", coverUrl);
      return [];
    }
    const protocol = new URL(absoluteUrl).protocol;
    if (protocol !== "http:" && protocol !== "https:") {
      console.warn("[MediaSession] Non-http(s) coverUrl skipped:", absoluteUrl);
      return [];
    }
    const type = this._detectMimeType(absoluteUrl);
    const sizes = ["96x96", "128x128", "192x192", "256x256", "384x384", "512x512"];
    return sizes.map((size) => {
      const entry = { src: absoluteUrl, sizes: size };
      if (type) entry.type = type;
      return entry;
    });
  }
  _detectMimeType(url) {
    const path = url.split("?")[0].split("#")[0].toLowerCase();
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".webp")) return "image/webp";
    if (path.endsWith(".avif")) return "image/avif";
    if (path.endsWith(".gif")) return "image/gif";
    if (path.endsWith(".svg")) return "image/svg+xml";
    return null;
  }
  _setupActionHandlers() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    const safeHandler = (action, fn) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        console.warn("[MediaSession] Action not supported:", action);
      }
    };
    const seekBy = (delta) => {
      const duration = this.audio.duration;
      if (!Number.isFinite(duration)) return;
      this.audio.currentTime = Math.min(duration, Math.max(0, this.audio.currentTime + delta));
    };
    safeHandler("play", () => this.audioPlayer.togglePlay?.());
    safeHandler("pause", () => this.audioPlayer.togglePlay?.());
    safeHandler("previoustrack", () => this.audioPlayer.skipBack?.());
    safeHandler("nexttrack", () => this.audioPlayer.skipForward?.());
    safeHandler("seekbackward", (d) => seekBy(-(d?.seekOffset ?? 10)));
    safeHandler("seekforward", (d) => seekBy(d?.seekOffset ?? 10));
    safeHandler("seekto", (d) => {
      if (d?.seekTime == null) return;
      const duration = this.audio.duration;
      if (!Number.isFinite(duration)) return;
      this.audio.currentTime = Math.min(duration, Math.max(0, d.seekTime));
    });
    safeHandler("stop", () => {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.state.isPlaying = false;
      this.clearMetadata();
    });
  }
  _attachAudioListeners() {
    this.audio.addEventListener("play", this._onPlay);
    this.audio.addEventListener("pause", this._onPause);
    this.audio.addEventListener("ended", this._onEnded);
    this.audio.addEventListener("timeupdate", this._onTimeUpdate);
    this.audio.addEventListener("loadedmetadata", this._onLoadedMetadata);
    this.audio.addEventListener("durationchange", this._onDurationChange);
    this.audio.addEventListener("seeked", this._onSeeked);
    this.audio.addEventListener("ratechange", this._onRateChange);
  }
  _schedulePositionUpdate() {
    if (this._positionUpdateScheduled) return;
    this._positionUpdateScheduled = true;
    this._rafId = requestAnimationFrame(() => {
      this._positionUpdateScheduled = false;
      this._rafId = null;
      this.updatePositionState();
    });
  }
}

class PlayerManager {
  constructor(ui) {
    this.ui = ui;
    this._coverBufferVisible = false;
    this._sleepBadgeTimer = null;
    this._dragQueueIdx = null;
    this._rafId = null;
    this._eventsBound = false;
    this._videoKeyBound = false;
  }
  bindAudioEvents() {
    if (this._eventsBound) return;
    const ap = this.ui.audioPlayer;
    if (!ap) return;
    this._eventsBound = true;
    ap.on("play", () => {
      this._setPlayingUI(true);
      this._startProgressLoop();
    });
    ap.on("pause", () => {
      this._setPlayingUI(false);
      this._stopProgressLoop();
    });
    ap.on("timeupdate", () => this.updateProgressOnly());
    ap.on("loadedmetadata", () => this.updateProgressOnly());
    ap.on("durationchange", () => this.updateProgressOnly());
    ap.on("songchange", () => {
      this.ui.videoController?.onSongChange?.();
      this.renderMiniPlayer();
      if (this.ui.state.isDrawerOpen) this.renderFullPlayer();
      this.updateProgressOnly();
    });
    ap.on("error", () => {
      this.applyPlaybackErrorState();
      this.hideCoverBuffer();
    });
    ap.on("volumechange", () => this.updateProgressOnly());
    this._setPlayingUI(!!this.ui.state.isPlaying);
    this.updateProgressOnly();
    if (this.ui.state.isPlaying) this._startProgressLoop();
  }
  _startProgressLoop() {
    if (this._rafId) return;
    const tick = () => {
      this.updateProgressOnly();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }
  _stopProgressLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.updateProgressOnly();
  }
  _setPlayingUI(isPlaying) {
    const playSVG = Icons.player.play(22);
    const pauseSVG = Icons.player.pause(22);
    const miniBtn = document.getElementById("toggle-play-mini");
    if (miniBtn) miniBtn.innerHTML = isPlaying ? pauseSVG : playSVG;
    const drawerBtn = document.getElementById("play-pause-drawer");
    if (drawerBtn) {
      drawerBtn.classList.toggle("playing", isPlaying);
      drawerBtn.innerHTML = isPlaying ? Icons.player.pause(32) : Icons.player.play(32);
    }
  }
  updateProgressOnly() {
    const state = this.ui.state;
    const pct = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const pctStr = `${pct}%`;
    const cur = state.formatTime(state.currentTime);
    const total = state.formatTime(state.duration);
    const miniProgress = document.getElementById("mini-progress");
    if (miniProgress) miniProgress.style.width = pctStr;
    const progressFill = document.getElementById("progress-fill");
    if (progressFill) progressFill.style.width = pctStr;
    const curEl = document.getElementById("drawer-current-time");
    if (curEl) curEl.textContent = cur;
    const totalEl = document.getElementById("total-time");
    if (totalEl) totalEl.textContent = total;
  }
  showCoverBuffer() {
    this._coverBufferVisible = true;
    const cover = document.querySelector("#player-bar-container .mini-cover");
    if (!cover) return;
    if (cover.querySelector(".mini-cover-buffer")) return;
    const overlay = document.createElement("div");
    overlay.className = "mini-cover-buffer";
    const circle = document.createElement("div");
    circle.className = "spnr-circle";
    overlay.appendChild(circle);
    cover.appendChild(overlay);
  }
  hideCoverBuffer() {
    this._coverBufferVisible = false;
    document.querySelectorAll("#player-bar-container .mini-cover-buffer").forEach((el) => el.remove());
  }
  applyPlaybackErrorState() {
    const state = this.ui.state;
    const hasError = !!(state.audioError && state.currentSong && state.audioError === state.currentSong.id);
    if (hasError) this.hideCoverBuffer();
    const miniInner = document.querySelector("#player-bar-container .mini-player-inner");
    if (miniInner) miniInner.classList.toggle("audio-missing", hasError);
    [
      "toggle-play-mini",
      "skip-forward-mini",
      "play-pause-drawer",
      "prev-btn",
      "next-btn",
      "shuffle-btn",
      "like-btn",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (hasError) btn.setAttribute("disabled", "");
      else if (state.currentSong) btn.removeAttribute("disabled");
    });
  }
  openDrawer() {
    this.ui.state.isDrawerOpen = true;
    document.getElementById("player-drawer-overlay").classList.add("open");
    this.renderFullPlayer();
  }
  closeDrawer() {
    if (this.ui.state.isVideoOpen) this.ui.videoController?.close({ resumeAudio: false });
    this.ui.state.isDrawerOpen = false;
    this.ui.state.isQueueOpen = false;
    this.ui.state.isLyricsOpen = false;
    document.getElementById("player-drawer-overlay").classList.remove("open");
    const drawer = document.getElementById("full-player-drawer");
    if (drawer) {
      drawer.classList.remove("open");
      setTimeout(() => drawer.remove(), 500);
    }
  }
  renderMiniPlayer() {
    this.bindAudioEvents();
    const container = document.getElementById("player-bar-container");
    const state = this.ui.state;
    const currentSong = state.currentSong;
    const progress = currentSong && state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const pauseSVG = Icons.player.pause(22);
    const playSVG = Icons.player.play(22);
    const skipSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="20" height="20"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>`;
    const defaultCover = Config.DEFAULT_COVER;
    const coverUrl = currentSong ? currentSong.coverUrl : defaultCover;
    const title = currentSong ? currentSong.title : "MyBeats";
    const artistDisplay = currentSong ? this.ui.artistNameTooltip(currentSong.artistId) : "Music";
    const isFav = currentSong ? this.ui.favorites.isSong(currentSong.id) : false;
    container.innerHTML = `
      <div data-player="mini" class="mini-player">
        <div class="mini-player-inner" id="open-drawer">
          <div class="track"><div class="mini-progress" id="mini-progress" style="width: ${progress}%;"></div></div>
          <div class="bar">
            <div class="mini-cover cover"><img src="${coverUrl}" class="mini-cover-img" onerror="this.style.display='none'"></div>
            <div class="info">
              <p class="title">${title}</p>
              <p class="sub">${artistDisplay}</p>
            </div>
            <div class="actions">
              <button id="fav-mini" class="${isFav ? "favorited" : ""}" ${!currentSong ? "disabled" : ""}>${currentSong ? this.ui.likeStatus("song", isFav, false, null) : '<i class="fa-solid fa-heart not-liked-icon"></i>'}</button>
              <button id="toggle-play-mini" class="toggle" ${!currentSong ? "disabled" : ""}>${currentSong ? (state.isPlaying ? pauseSVG : playSVG) : playSVG}</button>
              <button id="skip-forward-mini" ${!currentSong ? "disabled" : ""}>${skipSVG}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const openDrawerBtn = document.getElementById("open-drawer");
    if (openDrawerBtn) openDrawerBtn.onclick = () => this.ui.openPlayerDrawer();
    if (currentSong) {
      const favBtn = document.getElementById("fav-mini");
      if (favBtn) {
        favBtn.dataset.favSong = currentSong.id;
        window.heartManager?.bindAll(container);
      }
      const toggleBtn = document.getElementById("toggle-play-mini");
      if (toggleBtn)
        toggleBtn.onclick = (e) => {
          e.stopPropagation();
          this.ui.audioPlayer.togglePlay();
        };
      const skipBtn = document.getElementById("skip-forward-mini");
      if (skipBtn)
        skipBtn.onclick = (e) => {
          e.stopPropagation();
          this.ui.audioPlayer.skipForward();
        };
    }
    this.applyPlaybackErrorState();
    if (this._coverBufferVisible) this.showCoverBuffer();
  }
  renderFullPlayer() {
    const oldDrawer = document.getElementById("full-player-drawer");
    const state = this.ui.state;
    const song = state.currentSong;
    if (oldDrawer && song) {
      const oldImg = oldDrawer.querySelector(".album-art");
      if (oldImg) {
        const currentSrc = oldImg.getAttribute("src");
        if (currentSrc === song.coverUrl) {
          this.softUpdateDrawer(oldDrawer);
          this.attachFullPlayerEvents();
          return;
        }
      }
    }
    document.getElementById("full-player-drawer")?.remove();
    const defaultCover = Config.DEFAULT_COVER;
    const title = song ? song.title : "MyBeats";
    const artistDisplay = song ? this.ui.artistNameTooltip(song.artistId) : "Music";
    const coverUrl = song ? song.coverUrl : defaultCover;
    const progress = song && state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const isPlaying = song ? state.isPlaying : false;
    const isFav = song ? this.ui.favorites.isSong(song.id) : false;
    const disabledAttr = !song ? 'disabled style="opacity:0.5"' : "";
    const pauseSVG = Icons.player.pause(32);
    const playSVG = Icons.player.play(32);
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div data-player="full" class="player-drawer open" id="full-player-drawer">
        <div class="dot-pattern"></div>
        <div class="drawerUpper">
          <div class="drawer-header">
            <button class="header-btn" id="close-drawer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="header-btn" id="queue-toggle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <div class="album-art-wrapper" id="album-wrapper"><img src="${coverUrl}" alt="${title}" class="album-art"></div>
          <div class="meta">
            <h1 class="title">${title}</h1>
            <p class="sub">${artistDisplay}</p>
          </div>
          <canvas id="visualizer"></canvas>
        </div>
        <div class="control-panel">
          <div class="extra-controls">
            <button class="control-btn" id="share-btn" aria-label="Share" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="control-btn" id="video-btn" aria-label="Watch Video" title="Watch Video" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none"/><path d="M16 10l5-3v10l-5-3"/></svg>
            </button>
            <button class="speed-btn" id="speed-btn" ${disabledAttr}>${state.playbackRate}x</button>
            <button class="control-btn" id="sleep-btn" aria-label="Sleep Timer" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
          </div>
          <div class="progress-container" id="progress-container">
            <div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill" style="width: ${progress}%; background: var(--playerAccent);"></div></div>
            <div class="time-display">
              <span id="drawer-current-time">${song ? state.formatTime(state.currentTime) : "0:00"}</span>
              <span id="total-time">${song ? state.formatTime(state.duration) : "0:00"}</span>
            </div>
          </div>
          <div class="controls">
            <button class="control-btn ${state.isShuffled ? "active" : ""}" id="shuffle-btn" ${disabledAttr}>${Icons.player.shuffle(22)}</button>
            <button class="control-btn" id="prev-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M64 208.1l0 95.7 258 169.6c12.3 8.1 28 8.8 41 1.8s21-20.5 21-35.2l0-368c0-14.7-8.1-28.2-21-35.2s-28.7-6.3-41 1.8L64 208.1z"/><path fill="currentColor" d="M32 32l0 0C14.3 32 0 46.3 0 64L0 448c0 17.7 14.3 32 32 32l0 0c17.7 0 32-14.3 32-32L64 64c0-17.7-14.3-32-32-32z"/></svg>
            </button>
            <button class="play-btn ${isPlaying ? "playing" : ""}" id="play-pause-drawer" ${disabledAttr}>${isPlaying ? pauseSVG : playSVG}</button>
            <button class="control-btn" id="next-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>
            </button>
            <button class="control-btn ${isFav ? "favorited" : ""}" id="like-btn" data-song-id="${song?.id || ""}" ${disabledAttr}>${song ? this.ui.likeStatus("song", isFav, false, null) : '<i class="fa-solid fa-heart not-liked-icon"></i>'}</button>
          </div>
        </div>
        <div class="queue-modal ${state.isQueueOpen ? "open" : ""}" id="queue-modal">
          <div class="drag-handle"></div>
          <div class="queue-header">
            <h3 class="title">Up Next</h3>
            <div class="queue-header-actions">
              <button class="queue-action-btn" id="queue-save-playlist" title="Save remaining queue as a playlist">Save as Playlist</button>
              <button class="queue-action-btn" id="queue-clear" title="Clear upcoming songs">Clear</button>
              <button class="control-btn" id="close-queue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="queue-list scroll-contain" id="queue-list"></div>
        </div>
        <div class="lyrics-overlay ${state.isLyricsOpen ? "visible" : ""}" id="lyrics-overlay">
          <div class="lyrics-text"><p>Lyrics will appear here</p><p class="hint">Tap anywhere to close</p></div>
        </div>
      </div>
    `
    );
    this.attachFullPlayerEvents();
    this.renderQueueList();
    if (song) this.setupVisualizer();
    else {
      const canvas = document.getElementById("visualizer");
      if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  softUpdateDrawer(drawer) {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const state = this.ui.state;
    const progress = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const fill = drawer.querySelector("#progress-fill");
    if (fill) fill.style.width = `${progress}%`;
    const curTime = drawer.querySelector("#drawer-current-time");
    const totTime = drawer.querySelector("#total-time");
    if (curTime) curTime.textContent = state.formatTime(state.currentTime);
    if (totTime) totTime.textContent = state.formatTime(state.duration);
    const playBtn = drawer.querySelector("#play-pause-drawer");
    if (playBtn) {
      playBtn.classList.toggle("playing", state.isPlaying);
      playBtn.innerHTML = state.isPlaying ? Icons.player.pause(32) : Icons.player.play(32);
    }
    const shuffleBtn = drawer.querySelector("#shuffle-btn");
    if (shuffleBtn) shuffleBtn.classList.toggle("active", state.isShuffled);
    const likeBtn = drawer.querySelector("#like-btn");
    if (likeBtn) {
      likeBtn.dataset.favSong = song.id;
      window.heartManager?.bindAll(drawer);
    }
    this.applyPlaybackErrorState();
    if (this.ui.state.isVideoOpen) {
      const drawerEl = document.getElementById("full-player-drawer");
      if (drawerEl) {
        drawerEl.querySelector("#album-wrapper")?.classList.add("video-mode");
        this._renderVideoInfoBar(drawerEl);
        this.ui.videoController?.remount?.(drawerEl);
      }
    }
  }
  attachFullPlayerEvents() {
    const song = this.ui.state.currentSong;
    document.getElementById("close-drawer")?.addEventListener("click", () => this.ui.closePlayerDrawer());
    document.getElementById("player-drawer-overlay")?.addEventListener("click", () => this.ui.closePlayerDrawer());
    document.getElementById("queue-toggle")?.addEventListener("click", () => this.toggleQueue());
    document.getElementById("close-queue")?.addEventListener("click", () => this.closeQueue());
    document.getElementById("queue-clear")?.addEventListener("click", () => this.clearQueue());
    document.getElementById("queue-save-playlist")?.addEventListener("click", () => this.saveQueueAsPlaylist());
    if (song) {
      document.getElementById("play-pause-drawer")?.addEventListener("click", () => this.ui.audioPlayer.togglePlay());
      document.getElementById("prev-btn")?.addEventListener("click", () => this.ui.audioPlayer.skipBack());
      document.getElementById("next-btn")?.addEventListener("click", () => this.ui.audioPlayer.skipForward());
      document.getElementById("shuffle-btn")?.addEventListener("click", () => this.ui.audioPlayer.toggleShuffle());
      document.getElementById("share-btn")?.addEventListener("click", () => this.toggleShare());
      document.getElementById("speed-btn")?.addEventListener("click", () => this.cycleSpeed());
      document.getElementById("sleep-btn")?.addEventListener("click", () => this.toggleSleepTimer());
      document.getElementById("album-wrapper")?.addEventListener("click", () => this.ui.audioPlayer.togglePlay());
      document.getElementById("lyrics-overlay")?.addEventListener("click", () => this.toggleLyrics());
      document.getElementById("progress-container")?.addEventListener("click", (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        this.ui.audioPlayer.audio.currentTime = ((e.clientX - rect.left) / rect.width) * this.ui.state.duration;
      });
      const likeBtn = document.getElementById("like-btn");
      if (likeBtn) {
        likeBtn.dataset.favSong = song.id;
        window.heartManager?.bindAll(document.getElementById("full-player-drawer") || document);
      }
      const drawer = document.getElementById("full-player-drawer");
      let touchStartX = 0,
        touchStartY = 0,
        touchStartTime = 0;
      drawer.addEventListener(
        "touchstart",
        (e) => {
          const t = e.changedTouches[0];
          touchStartX = t.screenX;
          touchStartY = t.screenY;
          touchStartTime = performance.now();
        },
        { passive: true }
      );
      drawer.addEventListener(
        "touchend",
        (e) => {
          const t = e.changedTouches[0];
          const dx = t.screenX - touchStartX;
          const dy = t.screenY - touchStartY;
          const dt = performance.now() - touchStartTime;
          const absDx = Math.abs(dx),
            absDy = Math.abs(dy);
          if (absDx > absDy && absDx > 50) {
            const velocity = absDx / dt;
            if (velocity > 0.4 || absDx > 120)
              dx > 0 ? this.ui.audioPlayer.skipBack() : this.ui.audioPlayer.skipForward();
            return;
          }
          if (dy < -80 && absDy > absDx) {
            this.openQueue();
            return;
          }
          if (dy > 80 && absDy > absDx && touchStartY < drawer.getBoundingClientRect().top + 120)
            this.ui.closePlayerDrawer();
        },
        { passive: true }
      );
      this._attachVideoControls();
    }
    this.ui.contentEvents.attachHeartEvents();
    this.applyPlaybackErrorState();
    this.updateSleepBadge();
  }
  _attachVideoControls() {
    const drawer = document.getElementById("full-player-drawer");
    if (!drawer) return;
    const btn = drawer.querySelector("#video-btn");
    if (btn && !btn._videoBound) {
      btn._videoBound = true;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.ui.videoController?.toggle();
      });
    }
    const wrapper = drawer.querySelector("#album-wrapper");
    if (wrapper && !wrapper._videoLongPressBound) {
      wrapper._videoLongPressBound = true;
      let pressTimer = null;
      let longPressFired = false;
      const start = (e) => {
        if (this.ui.state.isVideoOpen) return;
        if (e.button != null && e.button !== 0) return;
        longPressFired = false;
        pressTimer = setTimeout(() => {
          longPressFired = true;
          if (navigator.vibrate) {
            try {
              navigator.vibrate(15);
            } catch {}
          }
          this.ui.videoController?.toggle();
        }, 550);
      };
      const cancel = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };
      wrapper.addEventListener("pointerdown", start, { passive: true });
      wrapper.addEventListener("pointerup", cancel);
      wrapper.addEventListener("pointercancel", cancel);
      wrapper.addEventListener("pointerleave", cancel);
      wrapper.addEventListener(
        "click",
        (e) => {
          if (longPressFired) {
            e.stopImmediatePropagation();
            e.preventDefault();
            longPressFired = false;
          }
        },
        true
      );
    }
    if (!this._videoKeyBound) {
      this._videoKeyBound = true;
      this._onVideoKey = (e) => {
        const tag = ((e.target && e.target.tagName) || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.code === "KeyV" && this.ui.state.isDrawerOpen) {
          e.preventDefault();
          e.stopPropagation();
          this.ui.videoController?.toggle();
          return;
        }
        if (e.code === "Space" && this.ui.state.isVideoOpen) {
          e.preventDefault();
          e.stopPropagation();
          this.ui.videoController?.toggleVideoPlayback();
        }
      };
      window.addEventListener("keydown", this._onVideoKey, true);
    }
    const host = drawer.querySelector(".yt-player-host");
    if (host && !host._videoSwipeBound) {
      host._videoSwipeBound = true;
      let sx = 0,
        sy = 0,
        st = 0;
      host.addEventListener(
        "touchstart",
        (e) => {
          const t = e.changedTouches[0];
          sx = t.screenX;
          sy = t.screenY;
          st = performance.now();
        },
        { passive: true }
      );
      host.addEventListener(
        "touchend",
        (e) => {
          const t = e.changedTouches[0];
          const dx = t.screenX - sx;
          const dy = t.screenY - sy;
          const dt = performance.now() - st;
          if (dy > 90 && Math.abs(dy) > Math.abs(dx) && dy / Math.max(dt, 1) > 0.35) {
            e.stopPropagation();
            e.preventDefault();
            this.ui.videoController?.close();
          }
        },
        { passive: true }
      );
    }
    this._renderVideoInfoBar(drawer);
    this.ui.videoController?._updateDrawerUI?.();
  }
  _renderVideoInfoBar(drawer) {
    const info = this.ui.state.videoInfo;
    let bar = drawer.querySelector(".video-info-bar");
    if (!info || !this.ui.state.isVideoOpen) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "video-info-bar";
      const wrapper = drawer.querySelector("#album-wrapper");
      if (!wrapper || !wrapper.parentNode) return;
      wrapper.parentNode.insertBefore(bar, wrapper.nextSibling);
    }
    const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(info.videoId)}`;
    bar.innerHTML = `
      <div class="video-info-text">
        <span class="video-info-label">Now Playing Video</span>
        <span class="video-info-title">${Utils.esc(info.title || "")}</span>
        <span class="video-info-channel">${Utils.esc(info.channel || "")}</span>
      </div>
      <div class="video-info-actions">
        <button type="button" class="video-info-btn" data-video-back title="Back to audio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>Audio</span>
        </button>
        <a class="video-info-btn" href="${videoUrl}" target="_blank"
           rel="noopener noreferrer" title="Open on YouTube">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span>YouTube</span>
        </a>
      </div>
    `;
    bar.querySelector("[data-video-back]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.ui.videoController?.close();
    });
  }
  renderQueueList() {
    const list = document.getElementById("queue-list");
    if (!list) return;
    const state = this.ui.state;
    list.innerHTML = "";
    if (!state.queue.length) {
      list.innerHTML = '<div class="empty">Queue is empty</div>';
      return;
    }
    state.queue.forEach((s, idx) => {
      const item = document.createElement("div");
      item.className = `queue-item ${idx === state.queueIndex ? "active" : ""}`;
      item.draggable = true;
      item.dataset.queueIdx = idx;
      item.onclick = (e) => {
        if (e.target.closest(".queue-item-remove") || e.target.closest(".queue-drag-handle")) return;
        this.ui.audioPlayer.playSong(s, state.queue, true, "queue");
        this.closeQueue();
      };
      const indicator =
        idx === state.queueIndex
          ? `<div class="now-playing-indicator"><div class="bar-anim"></div><div class="bar-anim"></div><div class="bar-anim"></div></div>`
          : `<span class="num">${idx + 1}</span>`;
      item.innerHTML = `
        <span class="queue-drag-handle" title="Drag to reorder">${Icons.general.dragHandle(14)}</span>
        <img src="${s.coverUrl}" class="queue-item-thumb">
        <div class="queue-item-info"><div class="queue-item-title">${s.title}</div><div class="queue-item-artist">${s.artist}</div></div>
        ${indicator}
        <button class="queue-item-remove" title="Remove from queue">${Icons.general.close(12)}</button>
      `;
      item.querySelector(".queue-item-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeQueueItem(idx);
      });
      item.addEventListener("dragstart", (e) => {
        this._dragQueueIdx = idx;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(idx));
        } catch (err) {}
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        this._dragQueueIdx = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        let from = this._dragQueueIdx;
        if (from == null) {
          const parsed = parseInt(e.dataTransfer.getData("text/plain"), 10);
          from = Number.isInteger(parsed) ? parsed : null;
        }
        if (from != null && from !== idx) this.moveQueueItem(from, idx);
      });
      list.appendChild(item);
    });
  }
  moveQueueItem(from, to) {
    const state = this.ui.state;
    if (from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) return;
    const [moved] = state.queue.splice(from, 1);
    state.queue.splice(to, 0, moved);
    if (state.queueIndex === from) state.queueIndex = to;
    else if (from < state.queueIndex && to >= state.queueIndex) state.queueIndex--;
    else if (from > state.queueIndex && to <= state.queueIndex) state.queueIndex++;
    this.renderQueueList();
  }
  removeQueueItem(idx) {
    const state = this.ui.state;
    if (idx < 0 || idx >= state.queue.length) return;
    const wasCurrent = idx === state.queueIndex;
    state.queue.splice(idx, 1);
    if (wasCurrent) state.queueIndex = idx - 1;
    else if (idx < state.queueIndex) state.queueIndex--;
    this.renderQueueList();
    state.showToast("Removed from queue");
  }
  clearQueue() {
    const state = this.ui.state;
    const current = state.queue[state.queueIndex] || state.currentSong;
    state.queue = current ? [current] : [];
    state.queueIndex = current ? 0 : -1;
    this.renderQueueList();
    state.showToast("Queue cleared");
  }
  saveQueueAsPlaylist() {
    const state = this.ui.state;
    const remaining = state.queue.slice(Math.max(0, state.queueIndex + 1));
    if (!remaining.length) {
      state.showToast("No upcoming songs to save");
      return;
    }
    state.modalOpen(`
      <div data-modal="save-queue" class="saveQueue">
        <div class="head"><h2 class="title">Save Queue as Playlist</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <p class="note">${remaining.length} upcoming song${remaining.length === 1 ? "" : "s"} will be saved.</p>
        <input type="text" id="save-queue-playlist-name" placeholder="Playlist name" class="input">
        <button id="save-queue-playlist-confirm" class="cta">Save Playlist</button>
      </div>
    `);
    document.getElementById("save-queue-playlist-confirm")?.addEventListener("click", () => {
      const name = document.getElementById("save-queue-playlist-name")?.value.trim();
      if (!name) return;
      state.playlists.push({
        id: Utils.newId("pl"),
        name,
        description: "",
        tags: [],
        songs: remaining.map((s) => Utils.id(s.id)),
      });
      state.persist();
      state.modalClose();
      state.showToast(`Playlist "${name}" created`);
    });
  }
  toggleQueue() {
    this.ui.state.isQueueOpen = !this.ui.state.isQueueOpen;
    document.getElementById("queue-modal")?.classList.toggle("open", this.ui.state.isQueueOpen);
    if (this.ui.state.isQueueOpen) this.renderQueueList();
  }
  openQueue() {
    if (this.ui.state.isQueueOpen) return;
    this.ui.state.isQueueOpen = true;
    document.getElementById("queue-modal")?.classList.add("open");
    this.renderQueueList();
  }
  closeQueue() {
    this.ui.state.isQueueOpen = false;
    document.getElementById("queue-modal")?.classList.remove("open");
  }
  toggleLyrics() {
    this.ui.state.isLyricsOpen = !this.ui.state.isLyricsOpen;
    document.getElementById("lyrics-overlay")?.classList.toggle("visible", this.ui.state.isLyricsOpen);
  }
  toggleShare() {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
    if (navigator.share)
      navigator.share({ title: song.title, text: `Listen to ${song.title} by ${song.artist}`, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => this.ui.state.showToast("Link copied to clipboard"));
  }
  cycleSpeed() {
    const speeds = [0.5, 1, 1.5, 2];
    const idx = (speeds.indexOf(this.ui.state.playbackRate) + 1) % speeds.length;
    this.ui.state.playbackRate = speeds[idx];
    this.ui.audioPlayer.audio.playbackRate = this.ui.state.playbackRate;
    const btn = document.getElementById("speed-btn");
    if (btn) {
      btn.textContent = this.ui.state.playbackRate + "x";
      btn.classList.toggle("active", this.ui.state.playbackRate !== 1);
    }
  }
  toggleSleepTimer() {
    this.openSleepMenu();
  }
  openSleepMenu() {
    const state = this.ui.state;
    const minutes = [5, 15, 30, 45, 60];
    const activeMin = state.sleepTimerEndsAt ? Math.round((state.sleepTimerEndsAt - Date.now()) / 60000) : null;
    state.modalOpen(`
      <div data-modal="sleep" class="sleep-menu">
        <div class="head"><h2 class="title">Sleep Timer</h2>
          <button onclick="window.closeModal()" class="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div data-list="options" class="sleep-options">
          ${minutes.map((m) => `<button class="sleep-option ${activeMin === m ? "active" : ""}" data-sleep-min="${m}"><span class="sleep-option-label">${m} minutes</span></button>`).join("")}
          <button class="sleep-option ${state.sleepTimerTrackEnd ? "active" : ""}" data-sleep-track="1"><span class="sleep-option-label">End of current track</span></button>
          <button class="sleep-option sleep-option-off" data-sleep-off="1"><span class="sleep-option-label">Off</span></button>
        </div>
      </div>
    `);
    document
      .querySelectorAll("#modal [data-sleep-min]")
      .forEach((btn) => btn.addEventListener("click", () => this.setSleepTimer(parseInt(btn.dataset.sleepMin, 10))));
    document.querySelector("#modal [data-sleep-track]")?.addEventListener("click", () => this.setSleepTrackEnd());
    document.querySelector("#modal [data-sleep-off]")?.addEventListener("click", () => {
      this.clearSleepTimer();
      state.modalClose();
    });
  }
  setSleepTimer(minutes) {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
    state.sleepTimerId = setTimeout(() => this._fireSleepTimer(), minutes * 60 * 1000);
    document.getElementById("sleep-btn")?.classList.add("active");
    this._startSleepBadge();
    state.modalClose();
    state.showToast(`Sleep timer: ${minutes} min`);
  }
  setSleepTrackEnd() {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerTrackEnd = true;
    document.getElementById("sleep-btn")?.classList.add("active");
    this.updateSleepBadge();
    state.modalClose();
    state.showToast("Sleep timer: stops after the current track");
  }
  clearSleepTimer({ silent = false } = {}) {
    const state = this.ui.state;
    if (state.sleepTimerId) clearTimeout(state.sleepTimerId);
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    state.sleepTimerTrackEnd = false;
    if (this._sleepBadgeTimer) {
      clearInterval(this._sleepBadgeTimer);
      this._sleepBadgeTimer = null;
    }
    document.getElementById("sleep-btn")?.classList.remove("active");
    this.updateSleepBadge();
    if (!silent) state.showToast("Sleep timer off");
  }
  _fireSleepTimer() {
    const state = this.ui.state;
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    if (state.isPlaying) this.ui.audioPlayer.togglePlay();
    this.clearSleepTimer({ silent: true });
    state.showToast("Sleep timer ended");
  }
  _startSleepBadge() {
    if (this._sleepBadgeTimer) clearInterval(this._sleepBadgeTimer);
    this.updateSleepBadge();
    this._sleepBadgeTimer = setInterval(() => this.updateSleepBadge(), 1000);
  }
  updateSleepBadge() {
    const btn = document.getElementById("sleep-btn");
    if (!btn) return;
    const state = this.ui.state;
    let badge = btn.querySelector(".sleep-badge");
    const remaining = state.sleepTimerEndsAt ? Math.max(0, state.sleepTimerEndsAt - Date.now()) : null;
    if (remaining == null && !state.sleepTimerTrackEnd) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "sleep-badge";
      btn.appendChild(badge);
    }
    badge.textContent = state.sleepTimerTrackEnd ? "track" : Utils.fmtTime(Math.ceil(remaining / 1000));
  }
  setupVisualizer() {
    const canvas = document.getElementById("visualizer");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let width, height;
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    let analyser,
      dataArray,
      audioConnected = false;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(this.ui.audioPlayer.audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioConnected = true;
    } catch {}
    const barCount = 30;
    const barTargets = new Float32Array(barCount);
    const barCurrent = new Float32Array(barCount);
    let accentRGB = { r: 255, g: 107, b: 107 };
    window.addEventListener("themechange", (e) => {
      if (e.detail?.accent) accentRGB = IdUtils.hslToRgb(e.detail.accent);
    });
    let animFrame;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (this.ui.state.isPlaying) {
        if (audioConnected && analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          const step = dataArray.length / barCount;
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const start = Math.floor(i * step),
              end = Math.floor((i + 1) * step);
            for (let j = start; j < end; j++) sum += dataArray[j];
            barTargets[i] = sum / Math.max(1, end - start) / 255;
          }
        } else {
          const t = performance.now() / 1000;
          for (let i = 0; i < barCount; i++)
            barTargets[i] =
              Math.sin(t * 2 + i * 0.4) * 0.3 +
              Math.sin(t * 3.5 + i * 0.7) * 0.2 +
              Math.sin(t * 1.2 + i * 0.2) * 0.15 +
              0.35;
        }
        const lerpFactor = 0.12;
        for (let i = 0; i < barCount; i++) barCurrent[i] += (barTargets[i] - barCurrent[i]) * lerpFactor;
        const halfBars = Math.floor(barCount / 2);
        const barWidth = width / barCount;
        const centerX = width / 2;
        for (let i = 0; i < halfBars; i++) {
          const h = barCurrent[i] * height * 0.85;
          if (h < 1) continue;
          const xLeft = centerX - (i + 1) * barWidth;
          const xRight = centerX + i * barWidth;
          const y = height - h;
          const gradient = ctx.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(0, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0)`);
          gradient.addColorStop(0.5, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.25)`);
          gradient.addColorStop(1, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.55)`);
          ctx.fillStyle = gradient;
          const w = barWidth - 2;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(xLeft, y, w, h, [3, 3, 0, 0]);
            ctx.roundRect(xRight, y, w, h, [3, 3, 0, 0]);
          } else {
            ctx.moveTo(xLeft + 3, y);
            ctx.lineTo(xLeft + w - 3, y);
            ctx.quadraticCurveTo(xLeft + w, y, xLeft + w, y + 3);
            ctx.lineTo(xLeft + w, y + h);
            ctx.lineTo(xLeft, y + h);
            ctx.lineTo(xLeft, y + 3);
            ctx.quadraticCurveTo(xLeft, y, xLeft + 3, y);
            ctx.moveTo(xRight + 3, y);
            ctx.lineTo(xRight + w - 3, y);
            ctx.quadraticCurveTo(xRight + w, y, xRight + w, y + 3);
            ctx.lineTo(xRight + w, y + h);
            ctx.lineTo(xRight, y + h);
            ctx.lineTo(xRight, y + 3);
            ctx.quadraticCurveTo(xRight, y, xRight + 3, y);
          }
          ctx.fill();
        }
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    const observer = new MutationObserver(() => {
      if (!document.getElementById("full-player-drawer")) {
        cancelAnimationFrame(animFrame);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

window.AUDIO_CDN_BASE = AUDIO_CDN_BASE;
window.PlayerState = PlayerState;
window.AudioEngine = AudioEngine;
window.MediaSessionManager = MediaSessionManager;
window.PlayerManager = PlayerManager;