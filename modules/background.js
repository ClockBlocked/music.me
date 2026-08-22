import { CONFIG, Utils, Prefs } from "./utilities.js";
import { metadata } from "./library.js";



export class PlayerState {
  constructor() {
    this.artistsById = new Map();
    this.albumsById  = new Map();
    this.songsById   = new Map();

    this.enrichedLibrary = this.buildLibrary();

    this.currentPage        = 'home';
    this.artistId           = null;
    this.selectedAlbumId    = null;
    this.isSearchOpen       = false;
    this.searchQuery        = '';
    this.pendingDeepLinkSong = null;

    this.currentSong   = null;
    this.isPlaying     = false;
    this.currentTime   = 0;
    this.duration      = 0;
    this.playSource    = null;
    this.audioError    = null;
    this.queue         = [];
    this.queueIndex    = -1;
    this.recentlyPlayed = [];
    this.volume        = CONFIG.VOLUME.default;
    this.isMuted       = false;
    this.isShuffled    = false;
    this.repeatMode    = 'off';
    this.isDrawerOpen  = false;
    this.playbackRate  = 1;
    this.sleepTimerId  = null;
    this.sleepTimerEndsAt = null;
    this.sleepTimerTrackEnd = false;
    this.isQueueOpen   = false;
    this.isLyricsOpen  = false;

    this.favoriteSongs   = [];
    this.favoriteArtists = [];
    this.favoriteAlbums  = [];
    this.playlists       = [];

    this.playCounts  = {};
    this.listenStats = { totalSeconds: 0, plays: 0, perArtist: {}, perSong: {} };

    this.loadPersisted();

    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalEl      = document.getElementById('modal');
    this.toastEl      = document.getElementById('toast');

  }



  buildLibrary() {
    if (typeof metadata === 'undefined') {
      console.error('[PlayerState] Global `metadata` not found. Library is empty.');
      return [];
    }

    return metadata.map(artistRaw => {
      const artistId  = Utils.id(artistRaw.id);
      const imageUrl  = `${CONFIG.IMAGE_BASE.artist}${Utils.slugify(artistRaw.artist)}.png`;

      const albums = artistRaw.albums.map(albumRaw => {
        const albumId  = Utils.id(albumRaw.id);
        const coverUrl = `${CONFIG.IMAGE_BASE.album}${Utils.slugify(albumRaw.album)}.png`;

        const songs = albumRaw.songs.map(songRaw => {
          const songId = Utils.id(songRaw.id);
          const song = { ...songRaw, id: songId, albumId, artistId };
          this.songsById.set(songId, song);
          return song;
        });

        const album = { ...albumRaw, id: albumId, artistId, coverUrl, songs };
        this.albumsById.set(albumId, album);
        return album;
      });

      const artist = { ...artistRaw, id: artistId, imageUrl, albums };
      this.artistsById.set(artistId, artist);
      return artist;
    });
  }

  getArtistById(id) {
    return this.artistsById.get(Utils.id(id));
  }
  getAlbumById(id) {
    const album = this.albumsById.get(Utils.id(id));
    if (!album) return undefined;
    const artist = this.artistsById.get(album.artistId);
    return { ...album, artistName: artist ? artist.artist : undefined };
  }
  getSongById(id) {
    const song = this.songsById.get(Utils.id(id));
    if (!song) return undefined;
    const album  = this.albumsById.get(song.albumId);
    const artist = this.artistsById.get(song.artistId);
    return {
      ...song,
      artist:         artist ? artist.artist   : undefined,
      album:          album  ? album.album     : undefined,
      coverUrl:       album  ? album.coverUrl  : undefined,
      artistImageUrl: artist ? artist.imageUrl : undefined
    };
  }
  getAllSongs() {
    return Array.from(this.songsById.keys()).map(id => this.getSongById(id));
  }

  getArtistName(id) {
    return this.getArtistById(id)?.artist;
  }
  getAlbumName(id) {
    return this.getAlbumById(id)?.album;
  }
  getSongName(id) {
    const song = this.getSongById(id);
    return song?.title ?? song?.name;
  }


  createPlaylist({ name, description = '', tags = [] } = {}) {
    const playlist = {
      id: Utils.newId('pl'),
      name: name || 'Unnamed',
      description,
      tags,
      songs: []
    };
    this.playlists.push(playlist);
    this.persist();
    return playlist.id;
  }
  getPlaylistById(id) {
    const sid = Utils.id(id);
    return this.playlists.find(p => Utils.id(p.id) === sid);
  }
  updatePlaylist(playlistId, updates) {
    const pl = this.getPlaylistById(playlistId);
    if (pl) Object.assign(pl, updates);
    this.persist();
  }

  buildPlaylistQueue(id) {
    const pl = this.getPlaylistById(id);
    if (!pl) return [];
    return pl.songs.map(sid => this.getSongById(sid)).filter(Boolean);
  }


  getPlayCount(id) {
    return this.playCounts[Utils.id(id)] || 0;
  }
  incrementPlayCount(id) {
    const key = Utils.id(id);
    if (!key) return;
    this.playCounts[key] = (this.playCounts[key] || 0) + 1;
    try {
      localStorage.setItem('mybeats.playCounts.v1', JSON.stringify(this.playCounts));
    } catch (e) {}
  }
  getMostPlayed(limit = 8) {
    return Object.entries(this.playCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.getSongById(id))
      .filter(Boolean);
  }

  recordPlay(song) {
    if (!song) return;
    this.incrementPlayCount(song.id);
    const stats = this.listenStats;
    stats.plays = (stats.plays || 0) + 1;
    const artistId = Utils.id(song.artistId);
    if (artistId) {
      const entry = stats.perArtist[artistId] || (stats.perArtist[artistId] = { seconds: 0, plays: 0 });
      entry.plays += 1;
    }
    this._saveListenStats();
  }

  recordListenTime(song, seconds) {
    if (!song || !(seconds > 0)) return;
    const stats = this.listenStats;
    stats.totalSeconds = (stats.totalSeconds || 0) + seconds;
    const artistId = Utils.id(song.artistId);
    if (artistId) {
      const entry = stats.perArtist[artistId] || (stats.perArtist[artistId] = { seconds: 0, plays: 0 });
      entry.seconds += seconds;
    }
    const songId = Utils.id(song.id);
    if (songId) stats.perSong[songId] = (stats.perSong[songId] || 0) + seconds;
    this._saveListenStats();
  }

  _saveListenStats() {
    try {
      localStorage.setItem('mybeats.listenStats.v1', JSON.stringify(this.listenStats));
    } catch (e) {}
  }

  getTopArtistsByPlays(limit = 5) {
    return Object.entries(this.listenStats.perArtist || {})
      .sort((a, b) => b[1].plays - a[1].plays)
      .slice(0, limit)
      .map(([id, data]) => ({ artist: this.getArtistById(id), plays: data.plays, seconds: data.seconds }))
      .filter(entry => entry.artist);
  }

  getTopSongsByTime(limit = 5) {
    return Object.entries(this.listenStats.perSong || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, seconds]) => ({ song: this.getSongById(id), seconds }))
      .filter(entry => entry.song);
  }


  formatTime(s) { return Utils.formatTime(s); }

  loadPersisted() {
    this.favoriteSongs   = this.parseStore(CONFIG.FAVOURITES.favSongs, []);
    this.favoriteArtists = this.parseStore(CONFIG.FAVOURITES.favArtists, []);
    this.favoriteAlbums  = this.parseStore(CONFIG.FAVOURITES.favAlbums, []);

    this.playlists = this.parseStore(CONFIG.FAVOURITES.playlists, []).map(pl => ({
      id:          pl.id          || Utils.newId('pl'),
      name:        pl.name        || 'Unnamed',
      description: pl.description || '',
      tags:        pl.tags        || [],
      songs:       pl.songs       || []
    }));

    this.playCounts = this.parseStore('mybeats.playCounts.v1', {});
    const stats = this.parseStore('mybeats.listenStats.v1', null);
    if (stats && typeof stats === 'object') {
      this.listenStats = {
        totalSeconds: Number(stats.totalSeconds) || 0,
        plays:        Number(stats.plays) || 0,
        perArtist:    stats.perArtist && typeof stats.perArtist === 'object' ? stats.perArtist : {},
        perSong:      stats.perSong && typeof stats.perSong === 'object' ? stats.perSong : {}
      };
    }
  }
  parseStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  persist() {
    localStorage.setItem(CONFIG.FAVOURITES.favSongs,   JSON.stringify(this.favoriteSongs));
    localStorage.setItem(CONFIG.FAVOURITES.favArtists, JSON.stringify(this.favoriteArtists));
    localStorage.setItem(CONFIG.FAVOURITES.favAlbums,  JSON.stringify(this.favoriteAlbums));
    localStorage.setItem(CONFIG.FAVOURITES.playlists,  JSON.stringify(this.playlists));
  }

  showToast(msg) {
    if (typeof window !== 'undefined' && window.popups) {
      window.popups.toast({ message: msg });
      return;
    }
    // Legacy fallback only if Popups isn't loaded
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2500);
  }

  modalOpen(content) {
    if (typeof window !== 'undefined' && window.popups) {
      window.popups.closeType('modal');
      window.popups.modal({
        content,
        closable: true,
        size: 'md',
        autoClose: false
      });
      return;
    }
    // Legacy fallback
    if (!this.modalEl || !this.modalOverlay) return;
    this.modalEl.innerHTML = content;
    this.modalOverlay.classList.add('active');
    this.modalEl.classList.add('active');
  }

  modalClose() {
    if (typeof window !== 'undefined' && window.popups) {
      window.popups.closeType('modal');
      return;
    }
    this.modalOverlay?.classList.remove('active');
    this.modalEl?.classList.remove('active');
  }



  
findArtistById(id)          { return this.getArtistById(id); }
findAlbumById(albumId)      { return this.getAlbumById(albumId); }
findSong(id)                { return this.getSongById(id); }
getArtistId(name) {
  if (!name) return undefined;
  const match = [...this.artistsById.values()].find(a => a.artist === name || String(a.id) === String(name));
  return match ? match.id : undefined;
}
getAlbumId(artistIdentifier, albumName) {
  if (!albumName) return undefined;
  const artist = this.getArtistById(artistIdentifier) || this.getArtistById(this.getArtistId(artistIdentifier)) || [...this.artistsById.values()].find(a => a.artist === artistIdentifier);
  if (!artist) {
    for (const a of this.artistsById.values()) {
      const alb = a.albums.find(x => x.album === albumName || String(x.id) === String(albumName));
      if (alb) return alb.id;
    }
    return undefined;
  }
  const album = artist.albums.find(a => a.album === albumName || String(a.id) === String(albumName));
  return album ? album.id : undefined;
}
getArtistByIdOrName(idOrName) {
  const byId = this.getArtistById(idOrName);
  if (byId) return byId;
  return [...this.artistsById.values()].find(a => a.artist === idOrName || String(a.id) === String(idOrName));
}
}



export class AudioEngine {
  constructor(state) {
    this.state = state;
    this.audio = document.getElementById('global-audio');
    this.mediaSessionManager = null;
    this._coverBufferTimer = null;
    this._missingGuard = null;
    this._missingSkipChain = false;
    this._fadeRaf = null;
    this._listenPending = 0;
    this._listenPrevPos = null;
    this._listenLastFlush = 0;
    if (!this.audio) {
      console.error('[AudioEngine] <audio id="global-audio"> not found in DOM.');
    }
    this.bindAudioEvents();
  }

  setMediaSessionManager(manager) {
    this.mediaSessionManager = manager;
  }

  bindAudioEvents() {
    if (!this.audio) return;
    this.audio.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audio.currentTime;
      window.uiManager?.updateProgressOnly();
      this._trackListenTime();
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.state.duration = this.audio.duration || 0;
      window.uiManager?.updateProgressOnly();
    });
    this.audio.addEventListener('ended', () => this.handleTrackEnded());
    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.notifyPlaybackChange();
    });
    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notifyPlaybackChange();
    });
    this.audio.addEventListener('error', (e) => {
      const err = e.target.error;
      console.error('[AudioEngine] Audio error! code:', err?.code, '| message:', err?.message, '| src:', this.audio.src);
      const song = this.state.currentSong;
      if (!song || !err) return;
      if (!this.audio.src || this.audio.src === 'about:blank') return;
      if (song.downloadPath && !this.audio.src.endsWith(song.downloadPath)) return;
      this.handleMissingAudio(song);
    });
  }

  handleTrackEnded() {
    if (this.state.sleepTimerTrackEnd) {
      this.state.sleepTimerTrackEnd = false;
      this.audio.pause();
      this.state.isPlaying = false;
      window.uiManager?.player?.updateSleepBadge?.();
      document.getElementById('sleep-btn')?.classList.remove('active');
      this.notifyPlaybackChange();
      this.state.showToast('Sleep timer — stopped after the track');
      return;
    }
    this.skipForward();
  }
  _trackListenTime() {
    const now = Date.now();
    const pos = this.audio.currentTime;
    if (this._listenPrevPos != null && !this.audio.paused) {
      const delta = pos - this._listenPrevPos;
      if (delta > 0 && delta < 2) this._listenPending += delta;
    }
    this._listenPrevPos = pos;
    if (!this._listenLastFlush) this._listenLastFlush = now;
    if (now - this._listenLastFlush >= 5000) {
      this._listenLastFlush = now;
      if (this._listenPending > 0 && this.state.currentSong) {
        this.state.recordListenTime(this.state.currentSong, this._listenPending);
        this._listenPending = 0;
      }
    }
  }

  notifyPlaybackChange() {
    this.refreshQueueIfOpen();
    window.uiManager?.updateMiniPlayer();
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }

  refreshQueueIfOpen() {
    const queueModal = document.getElementById('queue-modal');
    if (queueModal?.classList.contains('open')) {
      window.uiManager?.player?.renderQueueList?.();
    }
  }

  restorePlaybackState(song, queue, savedTime, wasPlaying) {
    console.log('[AudioEngine] restorePlaybackState:', song?.title, '| savedTime:', savedTime, '| wasPlaying:', wasPlaying);
    if (!song || !this.audio) {
      console.warn('[AudioEngine] restorePlaybackState aborted — missing song or audio element');
      return;
    }

    if (queue && queue.length) {
      this.state.queue = queue;
      const idx = queue.findIndex(s => s.id == song.id);
      this.state.queueIndex = idx >= 0 ? idx : 0;
    } else {
      this.state.queue = [song];
      this.state.queueIndex = 0;
    }

    this.state.currentSong = song;
    this.extractTheme(song.coverUrl);

    const srcNeedsChange = this.audio.src !== song.downloadPath;
    if (srcNeedsChange) {
      this.audio.src = song.downloadPath;
      this.audio.load();
    }
    this.audio.playbackRate = this.state.playbackRate;
    this.mediaSessionManager?.updateMetadata(song);

    const applyRestoredState = () => {
      const validTime = (savedTime > 0 && savedTime < (this.audio.duration || Infinity))
        ? savedTime
        : 0;
      this.audio.currentTime = validTime;
      this.state.currentTime = validTime;
      this.state.duration = this.audio.duration || 0;

      if (wasPlaying) {
        this.audio.play()
          .then(() => {
            this.state.isPlaying = true;
            this.mediaSessionManager?.updateMetadata(song);
          })
          .catch(err => {
            console.warn('[AudioEngine] Auto-play blocked on restore:', err);
            this.state.isPlaying = false;
          })
          .finally(() => {
            this.notifyPlaybackChange();
          });
      } else {
        this.state.isPlaying = false;
        this.notifyPlaybackChange();
      }
    };

    if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      applyRestoredState();
    } else {
      const onMetadata = () => {
        this.audio.removeEventListener('loadedmetadata', onMetadata);
        applyRestoredState();
      };
      this.audio.addEventListener('loadedmetadata', onMetadata, { once: true });
      setTimeout(() => {
        this.audio.removeEventListener('loadedmetadata', onMetadata);
        this.notifyPlaybackChange();
      }, 8000);
    }
  }

  playSong(song, newQueue = null, startFromBeginning = false, source = null) {
    if (!song) {
      console.warn('[AudioEngine] playSong called with no song');
      return;
    }
    console.log('[AudioEngine] playSong called:', song.title || 'unknown', '| id:', song.id, '| src:', song.downloadPath, '| startFromBeginning:', startFromBeginning);
    this.state.audioError = null;
    this._missingGuard = null;
    this._listenPrevPos = null;
    if (source) {
      this.state.playSource = source;
      this._missingSkipChain = false;
    }
    window.uiManager?.player?.showCoverBuffer();
    clearTimeout(this._coverBufferTimer);
    this._coverBufferTimer = setTimeout(() => {
      this._coverBufferTimer = null;
      window.uiManager?.player?.hideCoverBuffer();
    }, 2000);

    if (startFromBeginning || this.audio.src !== song.downloadPath) {
      this.audio.currentTime = 0;
      this.state.currentTime = 0;
    }

    this.preparePlayback(song, newQueue);
    const playPromise = this.audio.play();
    if (playPromise) {
      playPromise
        .then(() => { console.log('[AudioEngine] audio.play() resolved'); this.handlePlaySuccess(); })
        .catch(err => { console.warn('[AudioEngine] audio.play() rejected:', err.name, err.message); this.handlePlayFailure(err); });
    } else {
      console.log('[AudioEngine] audio.play() returned no promise (legacy browser)');
      this.handlePlaySuccess();
    }
  }

  preparePlayback(song, newQueue) {
    console.log('[AudioEngine] preparePlayback:', song.title || 'unknown', '| downloadPath:', song.downloadPath);
    this.resolveQueueForSong(song, newQueue);
    this.extractTheme(song.coverUrl);
    this.state.currentSong = song;

    if (this.audio.src !== song.downloadPath) {
      console.log('[AudioEngine] Setting audio.src to:', song.downloadPath);
      this.audio.src = song.downloadPath;
      this.audio.load();
    }
    this.audio.playbackRate = this.state.playbackRate;
  }

  resolveQueueForSong(song, newQueue) {
    if (newQueue) {
      this.state.queue = newQueue;
      this.state.queueIndex = this.state.queue.findIndex(s => s.id == song.id);
    } else if (!this.state.queue.length) {
      this.state.queue = [song];
      this.state.queueIndex = 0;
    } else {
      const existingIdx = this.state.queue.findIndex(s => s.id == song.id);
      if (existingIdx >= 0) {
        this.state.queueIndex = existingIdx;
      } else {
        this.state.queue = [song];
        this.state.queueIndex = 0;
      }
    }
  }

  extractTheme(coverUrl) {
    if (window.colorExtractor && coverUrl) {
      window.colorExtractor.extractColors(coverUrl)
        .then(colors => window.colorExtractor.applyThemeToPlayer(colors))
        .catch(() => {});
    }
  }

  handlePlaySuccess() {
    this.state.isPlaying = true;
    this._fadeInIfEnabled();
    this.mediaSessionManager?.updateMetadata(this.state.currentSong);
    this.notifyPlaybackChange();
    this.bumpRecentlyPlayed(this.state.currentSong);
    this.state.recordPlay(this.state.currentSong);
  }

  handlePlayFailure(err) {
    console.warn('[AudioEngine] Playback failed:', err);
    if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
      this.state.isPlaying = false;
      this.notifyPlaybackChange();
      return;
    }
    if (this.state.currentSong) {
      this.handleMissingAudio(this.state.currentSong);
    } else {
      this.state.isPlaying = false;
      this.notifyPlaybackChange();
    }
  }

  handleMissingAudio(song) {
    if (!song) return;
    if (this._missingGuard === song.id) return;
    this._missingGuard = song.id;
    console.warn('[AudioEngine] Audio file not found for song:', song.id, '| title:', song.title);
    clearTimeout(this._coverBufferTimer);
    this._coverBufferTimer = null;
    window.uiManager?.player?.hideCoverBuffer();
    if (this.state.playSource === 'playlist' || this.state.playSource === 'queue') {
      this._missingSkipChain = true;
      this.state.showToast('Audio file not found — skipping to next');
      this.skipForward();
      return;
    }
    this.state.isPlaying = false;
    this.state.audioError = song.id;
    this.notifyPlaybackChange();
    this.state.showToast(`Audio file not found: "${song.title || song.name || 'Unknown'}"`);
  }

  bumpRecentlyPlayed(song) {
    this.state.recentlyPlayed = [
      song,
      ...this.state.recentlyPlayed.filter(s => s.id !== song.id)
    ].slice(0, CONFIG.QUEUE.recentMax);
    // Live-update hook: lets an open Home page push the song onto its
    // Recently Played list with an animation instead of a reload.
    window.dispatchEvent(new CustomEvent('mybeats:recently-played', { detail: { song } }));
  }

  togglePlay() {
    if (!this.state.currentSong) {
      console.warn('[AudioEngine] togglePlay: no current song');
      return;
    }
    if (this.state.isPlaying) {
      console.log('[AudioEngine] Pausing');
      this.audio.pause();
      this.state.isPlaying = false;
    } else {
      console.log('[AudioEngine] Resuming, src =', this.audio.src);
      this.audio.play()
        .then(() => {
          console.log('[AudioEngine] Resume successful');
          this.state.isPlaying = true;
          this.mediaSessionManager?.updateMetadata(this.state.currentSong);
        })
        .catch(err => console.warn('[AudioEngine] Resume failed:', err.name, err.message));
    }
    this.notifyPlaybackChange();
  }

  skipForward() {
    console.log('[AudioEngine] skipForward, queueIndex:', this.state.queueIndex, 'queueLength:', this.state.queue.length);
    if (!this.state.queue.length) return;
    if (this.state.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }
    let nextIdx = this.state.queueIndex + 1;
    if (nextIdx >= this.state.queue.length) {
      if (this.state.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        if (!this._missingSkipChain && this.startRadioContinuation()) return;
        const stopPlayback = () => {
          this.state.isPlaying = false;
          this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
          this.notifyPlaybackChange();
        };
        if (this._shouldFade()) this._fadeTo(0, 600, stopPlayback);
        else stopPlayback();
        return;
      }
    }
    const advance = () => {
      this.state.queueIndex = nextIdx;
      this.playSong(this.state.queue[this.state.queueIndex], this.state.queue);
    };
    if (this._shouldFade()) this._fadeTo(0, 600, advance);
    else advance();
  }

  skipBack() {
    console.log('[AudioEngine] skipBack');
    if (!this.state.queue.length) return;
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    let prevIdx = this.state.queueIndex - 1;
    if (prevIdx < 0) {
      if (this.state.repeatMode === 'all') {
        prevIdx = this.state.queue.length - 1;
      } else {
        return;
      }
    }
    const advance = () => {
      this.state.queueIndex = prevIdx;
      this.playSong(this.state.queue[this.state.queueIndex], this.state.queue);
    };
    if (this._shouldFade()) this._fadeTo(0, 600, advance);
    else advance();
  }

  startRadioContinuation() {
    if (!Prefs.get('radioAutoplay')) return false;
    const state = this.state;
    const current = state.currentSong;
    const allSongs = state.enrichedLibrary.flatMap(artist =>
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
    if (!allSongs.length) return false;
    const inQueue = new Set(state.queue.map(s => Utils.id(s.id)));
    let pool = [];
    if (current?.artistId) {
      pool = allSongs.filter(s => Utils.id(s.artistId) === Utils.id(current.artistId) && !inQueue.has(Utils.id(s.id)));
    }
    if (!pool.length) {
      const genre = current?.artistId ? state.getArtistById(current.artistId)?.genre : null;
      if (genre) pool = allSongs.filter(s => s.genre === genre && !inQueue.has(Utils.id(s.id)));
    }
    if (!pool.length) {
      pool = allSongs.filter(s => !inQueue.has(Utils.id(s.id)));
    }
    if (!pool.length) return false;
    const queue = Utils.shuffled(pool).slice(0, 15);
    state.showToast('Radio — continuing with similar songs');
    this.playSong(queue[0], queue, true);
    return true;
  }

  _shouldFade() {
    return !!Prefs.get('fadeTransitions') && this.state.isPlaying && !this.state.isMuted;
  }

  _fadeInIfEnabled() {
    const target = this.state.isMuted ? 0 : this.state.volume;
    if (!Prefs.get('fadeTransitions') || this.state.isMuted) {
      this._fadeCancel();
      this.audio.volume = target;
      return;
    }
    this.audio.volume = 0;
    this._fadeTo(target, 900);
  }

  _fadeCancel() {
    if (this._fadeRaf) {
      cancelAnimationFrame(this._fadeRaf);
      this._fadeRaf = null;
    }
  }

  _fadeTo(target, duration, onDone) {
    this._fadeCancel();
    const audio = this.audio;
    const startVol = audio.volume;
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      audio.volume = Utils.clamp(startVol + (target - startVol) * t, 0, 1);
      if (t < 1) {
        this._fadeRaf = requestAnimationFrame(step);
      } else {
        this._fadeRaf = null;
        audio.volume = Utils.clamp(target, 0, 1);
        if (onDone) onDone();
      }
    };
    this._fadeRaf = requestAnimationFrame(step);
  }

  setVolume(val) {
    this._fadeCancel();
    this.state.volume = Utils.clamp(val, 0, 1);
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
  }

  toggleMute() {
    this._fadeCancel();
    this.state.isMuted = !this.state.isMuted;
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }

  toggleShuffle() {
    this.state.isShuffled = !this.state.isShuffled;
    if (this.state.isShuffled && this.state.queue.length > 1) {
      const currentSong = this.state.queue[this.state.queueIndex];
      const others = this.state.queue.filter((_, i) => i !== this.state.queueIndex);
      this.state.queue = [currentSong, ...Utils.shuffled(others)];
      this.state.queueIndex = 0;
    }
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }

  cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.state.repeatMode);
    this.state.repeatMode = modes[(idx + 1) % modes.length];
    if (this.state.isDrawerOpen) window.uiManager?.updateFullPlayer();
  }
}

