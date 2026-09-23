




(function (window, $) {
  'use strict';

  // ////////////////////////////////////////////////////////////////////////
  // Dynamic Listeners
  // ////////////////////////////////////////////////////////////////////////
  const Bus = {
    EVENTS: {
      FAVORITES:       'mybeats:favorites-changed',
      QUEUE:           'mybeats:queue-changed',
      PLAYLISTS:       'mybeats:playlists-changed',
      RECENTLY_PLAYED: 'mybeats:recently-played',
      PLAY_COUNTS:     'mybeats:play-counts',
      LIBRARY:         'mybeats:library-changed',
      PLAYBACK:        'mybeats:playback-change'
    },

    sub(event, fn) {
      window.addEventListener(event, fn);
      return () => window.removeEventListener(event, fn);
    },

    pub(event, detail) {
      window.dispatchEvent(new CustomEvent(event, { detail }));
    }
  };



  
  const NS = '.mbRuntime';
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
    this.store = store;
    this.state = state;
  }

  FavoritesController.prototype.has = function (type, id) {
    switch (type) {
      case 'song':     return this.store.isSong(id);
      case 'artist':   return this.store.isArtist(id);
      case 'album':    return this.store.isAlbum(id);
      case 'playlist': return this.store.isPlaylist(id);
    }
    return false;
  };

  FavoritesController.prototype.toggle = function (type, id) {
    switch (type) {
      case 'song': {
        const song = this.state.getSongById(id);
        if (song) this.store.toggleSong(song);
        break;
      }
      case 'artist':   this.store.toggleArtist(id);   break;
      case 'album':    this.store.toggleAlbum(id);    break;
      case 'playlist': this.store.togglePlaylist(id); break;
    }
    Bus.pub(Bus.EVENTS.FAVORITES, {
      type,
      id: String(id),
      active: this.has(type, id)
    });
  };

  FavoritesController.prototype.syncIcon = function (type, id, active) {
    $(`[data-favorite-${type}="${id}"]`).each(function () {
      const $node = $(this);
      $node.toggleClass('favorited', active);
      $node.toggleClass('is-favorite', active);
      $node.attr('aria-pressed', String(active));
    });
  };


  
  function QueueController(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
  }

  QueueController.prototype.add = function (song, position) {
    if (!song) return;
    if (position == null) this.state.queue.push(song);
    else this.state.queue.splice(position, 0, song);
    this.state.persist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'add', song, position });
  };

  QueueController.prototype.remove = function (index) {
    if (index < 0 || index >= this.state.queue.length) return null;
    const removed = this.state.queue.splice(index, 1)[0];
    if (index < this.state.queueIndex) this.state.queueIndex--;
    this.state.persist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'remove', index, song: removed });
    return removed;
  };

  QueueController.prototype.clear = function () {
    const current = this.state.queue[this.state.queueIndex] || this.state.currentSong;
    this.state.queue = current ? [current] : [];
    this.state.queueIndex = current ? 0 : -1;
    this.state.persist();
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
    this.state = state;
    this.audioPlayer = audioPlayer;
  }

  PlaylistController.prototype.get = function (id) {
    return this.state.playlists.find(
      (playlist) => String(playlist.id) === String(id)
    );
  };

  PlaylistController.prototype.create = function (opts) {
    opts = opts || {};
    const name = (opts.name || '').trim();
    if (!name) {
      this._toast('warning', 'Please enter a playlist name');
      return null;
    }

    const playlist = {
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      description: opts.description || '',
      tags: Array.isArray(opts.tags) ? opts.tags : [],
      songs: [],
      created: new Date().toISOString()
    };

    this.state.playlists.push(playlist);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'create', playlist });
    this._toast('success', `Created "${playlist.name}"`);
    return playlist;
  };

  PlaylistController.prototype.rename = function (id, name) {
    const playlist = this.get(id);
    const clean = (name || '').trim();
    if (!playlist || !clean) return false;
    playlist.name = clean;
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'rename', id, name: clean });
    return true;
  };

  PlaylistController.prototype.remove = function (id) {
    const playlist = this.get(id);
    if (!playlist) return false;
    const name = playlist.name;
    this.state.playlists = this.state.playlists.filter(
      (candidate) => String(candidate.id) !== String(id)
    );
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'delete', id, name });
    this._toast('info', `Deleted "${name}"`);
    return true;
  };

  PlaylistController.prototype.addSong = function (id, song) {
    const playlist = this.get(id);
    if (!playlist || !song) return false;
    const songId = String(song.id);
    const exists = playlist.songs.some((sid) => String(sid) === songId);
    if (exists) {
      this._toast('warning', `"${song.title}" is already in "${playlist.name}"`);
      return false;
    }
    playlist.songs.push(songId);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:add', id, songId });
    this._toast('success', `Added "${song.title}" to "${playlist.name}"`);
    return true;
  };

  PlaylistController.prototype.removeSong = function (id, songId) {
    const playlist = this.get(id);
    if (!playlist) return false;
    const before = playlist.songs.length;
    playlist.songs = playlist.songs.filter((sid) => String(sid) !== String(songId));
    if (playlist.songs.length === before) return false;
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:remove', id, songId: String(songId) });
    return true;
  };

  PlaylistController.prototype.reorder = function (id, newOrder) {
    const playlist = this.get(id);
    if (!playlist || !Array.isArray(newOrder)) return false;
    playlist.songs = newOrder.map(String);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'reorder', id });
    return true;
  };

  PlaylistController.prototype.buildQueue = function (id) {
    const playlist = this.get(id);
    if (!playlist) return [];
    return playlist.songs
      .map((songId) => this.state.getSongById(songId))
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

  PlaylistController.prototype._toast = function (type, message) {
    if (window.popups && window.popups.toast) {
      window.popups.toast({ type, message });
    } else if (window.state && window.state.showToast) {
      window.state.showToast(message);
    }
  };

  
  function Runtime(opts) {
    opts = opts || {};
    this.state = opts.state;
    this.audioPlayer = opts.audioPlayer;
    this.clickables = Clickables;
    this.favorites = new FavoritesController(opts.favoritesStore, opts.state);
    this.queue = new QueueController(opts.state, opts.audioPlayer);
    this.playlists = new PlaylistController(opts.state, opts.audioPlayer);
    this._booted = false;
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
    Clickables.offKey(document, 'runtimeDoc');
    this._bindDocument();
  };

  Runtime.prototype.destroy = function () {
    Clickables.resetAll();
    this._booted = false;
  };



  
  Runtime.prototype._bindKeyboard = function () {
    $(window).off('keydown.runtimeKey').on('keydown.runtimeKey', (e) => {
      const tag = ((e.target && e.target.tagName) || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.code === 'KeyK') {
        e.preventDefault();
        if (window.uiManager && window.uiManager.openSearch) window.uiManager.openSearch();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        if (window.uiManager && window.uiManager.openPlayerDrawer) window.uiManager.openPlayerDrawer();
      }
    });
  };

  Runtime.prototype._bindDocument = function () {
    $(document).off('click.runtimeDoc').on('click.runtimeDoc', (e) => {
      const $openDropdown = $('[data-popup="dropdown"]');
      if ($openDropdown.length && !$openDropdown.is(e.target) && !$openDropdown.has(e.target).length) {
        if (window.popups && window.popups.closeType) window.popups.closeType('dropdown');
      }
    });
  };

  Runtime.prototype._bindFavoritesSync = function () {
    Bus.sub(Bus.EVENTS.FAVORITES, (detail) => {
      if (detail && detail.type && detail.id != null) {
        this.favorites.syncIcon(detail.type, detail.id, detail.active);
      }
    });
  };



  
  window.MyBeats = window.MyBeats || {};
  window.MyBeats.Bus                = Bus;
  window.MyBeats.Clickables         = Clickables;
  window.MyBeats.FavoritesController = FavoritesController;
  window.MyBeats.QueueController    = QueueController;
  window.MyBeats.PlaylistController = PlaylistController;
  window.MyBeats.Runtime            = Runtime;

  window.MyBeats.createRuntime = function (opts) {
    const runtime = new Runtime(opts);
    window.MyBeats.runtime = runtime;
    return runtime;
  };

})(window, jQuery);
