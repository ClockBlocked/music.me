(function (window, $) {
  'use strict';

  const normalizeId = (value) => (value == null ? '' : String(value));
  const NS = '.mbRuntime';

  const Bus = {
    EVENTS: {
      FAVORITES: 'mybeats:favorites-changed',
      QUEUE: 'mybeats:queue-changed',
      PLAYLISTS: 'mybeats:playlists-changed',
      RECENTLY_PLAYED: 'mybeats:recently-played',
      PLAY_COUNTS: 'mybeats:play-counts',
      LIBRARY: 'mybeats:library-changed',
      PLAYBACK: 'mybeats:playback-change'
    },

    listeners: new Map(),

    sub(event, fn) {
      if (typeof event !== 'string' || typeof fn !== 'function') return () => {};
      let handlers = this.listeners.get(event);
      if (!handlers) {
        handlers = new Set();
        this.listeners.set(event, handlers);
      }
      if (handlers.has(fn)) return () => {};
      window.addEventListener(event, fn);
      handlers.add(fn);
      return () => this.unsub(event, fn);
    },

    unsub(event, fn) {
      if (!event || typeof fn !== 'function') return;
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(fn);
        if (!handlers.size) this.listeners.delete(event);
      }
      window.removeEventListener(event, fn);
    },

    pub(event, detail) {
      if (!event) return;
      window.dispatchEvent(new CustomEvent(event, { detail }));
    }
  };

  const Clickables = {
    NS,

    on(el, event, key, handler) {
      if (!el) return;
      const $el = el instanceof $ ? el : $(el);
      const namespaced = `${event}.${key}${NS}`;
      $el.off(namespaced).on(namespaced, handler);
    },

    off(el, event, key) {
      if (!el) return;
      const $el = el instanceof $ ? el : $(el);
      $el.off(`${event}.${key}${NS}`);
    },

    offKey(el, key) {
      if (!el) return;
      const $el = el instanceof $ ? el : $(el);
      $el.off(`.${key}${NS}`);
    },

    resetAll() {
      $(document).off(NS);
      $(window).off(NS);
    }
  };

  function FavoritesController(store, state) {
    this.store = store || null;
    this.state = state || {};
  }

  FavoritesController.prototype.has = function (type, id) {
    if (!this.store) return false;
    const key = normalizeId(id);
    switch (type) {
      case 'song': return this.store.isSong ? this.store.isSong(key) : false;
      case 'artist': return this.store.isArtist ? this.store.isArtist(key) : false;
      case 'album': return this.store.isAlbum ? this.store.isAlbum(key) : false;
      case 'playlist': return this.store.isPlaylist ? this.store.isPlaylist(key) : false;
      default: return false;
    }
  };

  FavoritesController.prototype.toggle = function (type, id) {
    if (!this.store) return false;
    const key = normalizeId(id);

    switch (type) {
      case 'song': {
        const song = this.state && this.state.getSongById ? this.state.getSongById(key) : null;
        if (song) this.store.toggleSong(song);
        break;
      }
      case 'artist':
        this.store.toggleArtist(key);
        break;
      case 'album':
        this.store.toggleAlbum(key);
        break;
      case 'playlist':
        this.store.togglePlaylist(key);
        break;
      default:
        return false;
    }

    Bus.pub(Bus.EVENTS.FAVORITES, {
      type,
      id: key,
      active: this.has(type, key)
    });

    return true;
  };

  FavoritesController.prototype.syncIcon = function (type, id, active) {
    const value = normalizeId(id);
    if (!value) return;
    const selector = `[data-favorite-${type}="${$.escapeSelector(value)}"]`;
    $(selector).each(function () {
      const $node = $(this);
      $node.toggleClass('favorited', !!active);
      $node.toggleClass('is-favorite', !!active);
      $node.attr('aria-pressed', String(!!active));
    });
  };

  function QueueController(state, audioPlayer) {
    this.state = state || {};
    this.state.queue = Array.isArray(this.state.queue) ? this.state.queue : [];
    this.state.queueIndex = Number.isInteger(this.state.queueIndex) ? this.state.queueIndex : -1;
    this.audioPlayer = audioPlayer || { playSong() {} };
    this._persistTimer = null;
  }

  QueueController.prototype._schedulePersist = function () {
    if (!this.state || typeof this.state.persist !== 'function') return;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this.state.persist();
    }, 50);
  };

  QueueController.prototype.add = function (song, position) {
    if (!song) return;
    if (position == null) this.state.queue.push(song);
    else this.state.queue.splice(position, 0, song);
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'add', song, position });
  };

  QueueController.prototype.remove = function (index) {
    if (index < 0 || index >= this.state.queue.length) return null;
    const removed = this.state.queue.splice(index, 1)[0];
    if (index < this.state.queueIndex) this.state.queueIndex--;
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'remove', index, song: removed });
    return removed;
  };

  QueueController.prototype.clear = function () {
    const current = this.state.queue[this.state.queueIndex] || this.state.currentSong;
    this.state.queue = current ? [current] : [];
    this.state.queueIndex = current ? 0 : -1;
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'clear' });
  };

  QueueController.prototype.getNext = function () {
    const queue = this.state.queue;
    if (!queue.length) return null;
    const next = this.state.queueIndex + 1;
    if (next < queue.length) return queue[next];
    if (this.state.repeatMode === 'all') return queue[0];
    return null;
  };

  QueueController.prototype.jumpTo = function (index) {
    if (index < 0 || index >= this.state.queue.length) return;
    const song = this.state.queue[index];
    this.state.queueIndex = index;
    this.audioPlayer.playSong(song, this.state.queue, true, 'queue');
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'jump', index, song });
  };

  function PlaylistController(state, audioPlayer) {
    this.state = state || {};
    this.state.playlists = Array.isArray(this.state.playlists) ? this.state.playlists : [];
    this.audioPlayer = audioPlayer || { playSong() {} };
    this._persistTimer = null;
  }

  PlaylistController.prototype._schedulePersist = function () {
    if (!this.state || typeof this.state.persist !== 'function') return;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this.state.persist();
    }, 50);
  };

  PlaylistController.prototype._toast = function (type, message) {
    if (window.popups && window.popups.toast) {
      window.popups.toast({ type, message });
    } else if (window.state && window.state.showToast) {
      window.state.showToast(message);
    }
  };

  PlaylistController.prototype.get = function (id) {
    const targetId = normalizeId(id);
    return this.state.playlists.find((playlist) => normalizeId(playlist.id) === targetId);
  };

  PlaylistController.prototype.create = function (opts) {
    opts = opts || {};
    const name = (opts.name || '').trim();
    if (!name) {
      this._toast('warning', 'Please enter a playlist name');
      return null;
    }

    const playlist = {
      id: `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: opts.description || '',
      tags: Array.isArray(opts.tags) ? opts.tags : [],
      songs: [],
      created: new Date().toISOString()
    };

    this.state.playlists.push(playlist);
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'create', playlist });
    this._toast('success', `Created "${playlist.name}"`);
    return playlist;
  };

  PlaylistController.prototype.rename = function (id, name) {
    const playlist = this.get(id);
    const clean = (name || '').trim();
    if (!playlist || !clean) return false;
    playlist.name = clean;
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'rename', id, name: clean });
    return true;
  };

  PlaylistController.prototype.remove = function (id) {
    const playlist = this.get(id);
    if (!playlist) return false;

    const name = playlist.name;
    this.state.playlists = this.state.playlists.filter(
      (candidate) => normalizeId(candidate.id) !== normalizeId(id)
    );

    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'delete', id, name });
    this._toast('info', `Deleted "${name}"`);
    return true;
  };

  PlaylistController.prototype.addSong = function (id, song) {
    const playlist = this.get(id);
    if (!playlist || !song) return false;

    const songId = normalizeId(song.id);
    const exists = playlist.songs.some((sid) => normalizeId(sid) === songId);
    if (exists) {
      this._toast('warning', `"${song.title}" is already in "${playlist.name}"`);
      return false;
    }

    playlist.songs.push(songId);
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:add', id, songId });
    this._toast('success', `Added "${song.title}" to "${playlist.name}"`);
    return true;
  };

  PlaylistController.prototype.removeSong = function (id, songId) {
    const playlist = this.get(id);
    if (!playlist) return false;

    const before = playlist.songs.length;
    playlist.songs = playlist.songs.filter((sid) => normalizeId(sid) !== normalizeId(songId));
    if (playlist.songs.length === before) return false;

    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:remove', id, songId: normalizeId(songId) });
    return true;
  };

  PlaylistController.prototype.reorder = function (id, newOrder) {
    const playlist = this.get(id);
    if (!playlist || !Array.isArray(newOrder)) return false;
    playlist.songs = newOrder.map(normalizeId);
    this._schedulePersist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'reorder', id });
    return true;
  };

  PlaylistController.prototype.buildQueue = function (id) {
    const playlist = this.get(id);
    if (!playlist) return [];
    return playlist.songs
      .map((songId) => this.state.getSongById ? this.state.getSongById(songId) : null)
      .filter(Boolean);
  };

  PlaylistController.prototype.play = function (id, opts) {
    opts = opts || {};
    let queue = this.buildQueue(id);
    if (!queue.length) {
      this._toast('warning', 'Playlist is empty');
      return;
    }
    if (opts.shuffle) queue = Utils.shuffle(queue);
    this.audioPlayer.playSong(queue[0], queue, true, 'playlist');
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'play', id });
  };

  function Runtime(opts) {
    opts = opts || {};
    this.state = opts.state || {};
    this.audioPlayer = opts.audioPlayer || { playSong() {} };
    this.clickables = Clickables;
    this.favorites = new FavoritesController(opts.favoritesStore, this.state);
    this.queue = new QueueController(this.state, this.audioPlayer);
    this.playlists = new PlaylistController(this.state, this.audioPlayer);
    this._booted = false;
    this._keyboardHandler = null;
    this._documentHandler = null;
    this._favoritesUnsub = null;
  }

  Runtime.prototype.boot = function () {
    if (this._booted) return this;
    this._booted = true;
    this._bindKeyboard();
    this._bindDocument();
    this._bindFavoritesSync();
    return this;
  };

  Runtime.prototype.reinit = function () {
    if (this._documentHandler) {
      $(document).off('click.runtimeDoc', this._documentHandler);
      this._documentHandler = null;
    }
    this._bindDocument();
    return this;
  };

  Runtime.prototype.destroy = function () {
    if (this._keyboardHandler) {
      $(window).off('keydown.runtimeKey', this._keyboardHandler);
      this._keyboardHandler = null;
    }

    if (this._documentHandler) {
      $(document).off('click.runtimeDoc', this._documentHandler);
      this._documentHandler = null;
    }

    if (this._favoritesUnsub) {
      this._favoritesUnsub();
      this._favoritesUnsub = null;
    }

    Clickables.resetAll();
    this._booted = false;
    return this;
  };

  Runtime.prototype._bindKeyboard = function () {
    if (this._keyboardHandler) return;

    this._keyboardHandler = (e) => {
      const target = e.target || null;
      const tag = ((target && target.tagName) || '').toUpperCase();

      if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.code === 'KeyK') {
        e.preventDefault();
        if (window.uiManager && window.uiManager.openSearch) {
          window.uiManager.openSearch();
        }
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        if (window.uiManager && window.uiManager.openPlayerDrawer) {
          window.uiManager.openPlayerDrawer();
        }
      }
    };

    $(window).on('keydown.runtimeKey', this._keyboardHandler);
  };

  Runtime.prototype._bindDocument = function () {
    if (this._documentHandler) return;

    this._documentHandler = (e) => {
      const target = e.target || null;
      if (!target) return;

      const dropdowns = document.querySelectorAll('[data-popup="dropdown"]');
      for (let i = 0; i < dropdowns.length; i++) {
        const dropdown = dropdowns[i];
        if (dropdown === target || dropdown.contains(target)) continue;

        if (window.popups && window.popups.closeType) {
          window.popups.closeType('dropdown');
        }
        break;
      }
    };

    $(document).on('click.runtimeDoc', this._documentHandler);
  };

  Runtime.prototype._bindFavoritesSync = function () {
    if (this._favoritesUnsub) return;

    this._favoritesUnsub = Bus.sub(Bus.EVENTS.FAVORITES, (evt) => {
      const detail = evt && evt.detail ? evt.detail : evt;
      const payload = detail && detail.detail ? detail.detail : detail;
      if (payload && payload.type && payload.id != null) {
        this.favorites.syncIcon(payload.type, payload.id, payload.active);
      }
    });
  };

  window.MyBeats = window.MyBeats || {};
  window.MyBeats.Bus = Bus;
  window.MyBeats.Clickables = Clickables;
  window.MyBeats.FavoritesController = FavoritesController;
  window.MyBeats.QueueController = QueueController;
  window.MyBeats.PlaylistController = PlaylistController;
  window.MyBeats.Runtime = Runtime;

  window.MyBeats.createRuntime = function (opts) {
    const runtime = new Runtime(opts);
    window.MyBeats.runtime = runtime;
    return runtime;
  };
})(window, jQuery);