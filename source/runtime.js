




/* runtime.jquery.js — window-global, jQuery-friendly runtime layer
 *
 * Drop this AFTER all managers exist (state, audioPlayer, favoritesPlaylists,
 * heartManager, popups, persistence). Load order: last, or split later.
 */
(function (window, $) {
  'use strict';

  // ============================================================
  // Bus — thin wrapper over your existing CustomEvents
  // ============================================================
  var Bus = {
    EVENTS: {
      FAVORITES:       'mybeats:favorites-changed',
      QUEUE:           'mybeats:queue-changed',
      PLAYLISTS:       'mybeats:playlists-changed',
      RECENTLY_PLAYED: 'mybeats:recently-played',
      PLAY_COUNTS:     'mybeats:play-counts',
      LIBRARY:         'mybeats:library-changed',
      PLAYBACK:        'mybeats:playback-change'
    },
    sub: function (event, fn) {
      window.addEventListener(event, fn);
      return function () { window.removeEventListener(event, fn); };
    },
    pub: function (event, detail) {
      window.dispatchEvent(new CustomEvent(event, { detail: detail }));
    }
  };

  // ============================================================
  // Clickables — idempotent bindings via jQuery event namespacing
  //   Same (el, key) replaces the handler instead of stacking.
  // ============================================================
  var NS = '.mbRuntime';

  var Clickables = {
    NS: NS,

    // Idempotent: $(el).off(event.keyNS).on(event.keyNS, handler)
    on: function (el, event, key, handler) {
      if (!el) return;
      var $el = el instanceof $ ? el : $(el);
      var namespaced = event + '.' + key + NS;
      $el.off(namespaced).on(namespaced, handler);
    },

    off: function (el, event, key) {
      if (!el) return;
      var $el = el instanceof $ ? el : $(el);
      $el.off(event + '.' + key + NS);
    },

    // Remove every handler bound under a given key across the document.
    offKey: function (el, key) {
      if (!el) return;
      var $el = el instanceof $ ? el : $(el);
      $el.off('.' + key + NS);
    },

    // Nuke everything we've ever bound. Safe for hot-reload / hard reset.
    resetAll: function () {
      $(document).off(NS);
      $(window).off(NS);
    }
  };

  // ============================================================
  // FavoritesController — wraps FavoritesPlaylistsManager
  // ============================================================
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
        var song = this.state.getSongById(id);
        if (song) this.store.toggleSong(song);
        break;
      }
      case 'artist':   this.store.toggleArtist(id);   break;
      case 'album':    this.store.toggleAlbum(id);    break;
      case 'playlist': this.store.togglePlaylist(id); break;
    }
    Bus.pub(Bus.EVENTS.FAVORITES, {
      type: type,
      id: String(id),
      active: this.has(type, id)
    });
  };
  FavoritesController.prototype.syncIcon = function (type, id, active) {
    $('[data-favorite-' + type + '="' + id + '"]').each(function () {
      var $n = $(this);
      $n.toggleClass('favorited', active);
      $n.toggleClass('is-favorite', active);
      $n.attr('aria-pressed', String(active));
    });
  };

  // ============================================================
  // QueueController — direct slice of PlayerState.queue
  // ============================================================
  function QueueController(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
  }
  QueueController.prototype.add = function (song, position) {
    if (!song) return;
    if (position == null) this.state.queue.push(song);
    else this.state.queue.splice(position, 0, song);
    this.state.persist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'add', song: song, position: position });
  };
  QueueController.prototype.remove = function (index) {
    if (index < 0 || index >= this.state.queue.length) return null;
    var removed = this.state.queue.splice(index, 1)[0];
    if (index < this.state.queueIndex) this.state.queueIndex--;
    this.state.persist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'remove', index: index, song: removed });
    return removed;
  };
  QueueController.prototype.clear = function () {
    var current = this.state.queue[this.state.queueIndex] || this.state.currentSong;
    this.state.queue = current ? [current] : [];
    this.state.queueIndex = current ? 0 : -1;
    this.state.persist();
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'clear' });
  };
  QueueController.prototype.getNext = function () {
    var q = this.state.queue;
    if (!q.length) return null;
    var next = this.state.queueIndex + 1;
    if (next < q.length) return q[next];
    if (this.state.repeatMode === 'all') return q[0];
    return null;
  };
  QueueController.prototype.jumpTo = function (index) {
    if (index < 0 || index >= this.state.queue.length) return;
    var song = this.state.queue[index];
    this.state.queueIndex = index;
    this.audioPlayer.playSong(song, this.state.queue, true, 'queue');
    Bus.pub(Bus.EVENTS.QUEUE, { action: 'jump', index: index, song: song });
  };

  // ============================================================
  // PlaylistController — self-contained CRUD + playback
  // ============================================================
  function PlaylistController(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
  }
  PlaylistController.prototype.get = function (id) {
    return this.state.playlists.find(function (p) { return String(p.id) === String(id); });
  };
  PlaylistController.prototype.create = function (opts) {
    opts = opts || {};
    var name = (opts.name || '').trim();
    if (!name) { this._toast('warning', 'Please enter a playlist name'); return null; }
    var pl = {
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      description: opts.description || '',
      tags: Array.isArray(opts.tags) ? opts.tags : [],
      songs: [],
      created: new Date().toISOString()
    };
    this.state.playlists.push(pl);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'create', playlist: pl });
    this._toast('success', 'Created "' + pl.name + '"');
    return pl;
  };
  PlaylistController.prototype.rename = function (id, name) {
    var pl = this.get(id);
    var clean = (name || '').trim();
    if (!pl || !clean) return false;
    pl.name = clean;
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'rename', id: id, name: clean });
    return true;
  };
  PlaylistController.prototype.remove = function (id) {
    var pl = this.get(id);
    if (!pl) return false;
    var name = pl.name;
    this.state.playlists = this.state.playlists.filter(function (p) {
      return String(p.id) !== String(id);
    });
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'delete', id: id, name: name });
    this._toast('info', 'Deleted "' + name + '"');
    return true;
  };
  PlaylistController.prototype.addSong = function (id, song) {
    var pl = this.get(id);
    if (!pl || !song) return false;
    var sid = String(song.id);
    var exists = pl.songs.some(function (x) { return String(x) === sid; });
    if (exists) {
      this._toast('warning', '"' + song.title + '" is already in "' + pl.name + '"');
      return false;
    }
    pl.songs.push(sid);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:add', id: id, songId: sid });
    this._toast('success', 'Added "' + song.title + '" to "' + pl.name + '"');
    return true;
  };
  PlaylistController.prototype.removeSong = function (id, songId) {
    var pl = this.get(id);
    if (!pl) return false;
    var before = pl.songs.length;
    pl.songs = pl.songs.filter(function (x) { return String(x) !== String(songId); });
    if (pl.songs.length === before) return false;
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'song:remove', id: id, songId: String(songId) });
    return true;
  };
  PlaylistController.prototype.reorder = function (id, newOrder) {
    var pl = this.get(id);
    if (!pl || !Array.isArray(newOrder)) return false;
    pl.songs = newOrder.map(String);
    this.state.persist();
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'reorder', id: id });
    return true;
  };
  PlaylistController.prototype.buildQueue = function (id) {
    var pl = this.get(id);
    if (!pl) return [];
    var self = this;
    return pl.songs.map(function (sid) { return self.state.getSongById(sid); }).filter(Boolean);
  };
  PlaylistController.prototype.play = function (id, opts) {
    opts = opts || {};
    var queue = this.buildQueue(id);
    if (!queue.length) { this._toast('warning', 'Playlist is empty'); return; }
    if (opts.shuffle) queue = Utils.shuffle(queue);
    this.audioPlayer.playSong(queue[0], queue, true, 'playlist');
    Bus.pub(Bus.EVENTS.PLAYLISTS, { action: 'play', id: id });
  };
  PlaylistController.prototype._toast = function (type, message) {
    if (window.popups && window.popups.toast) window.popups.toast({ type: type, message: message });
    else if (window.state && window.state.showToast) window.state.showToast(message);
  };

  // ============================================================
  // Runtime — boots the whole thing
  // ============================================================
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
  // Safe to call after any partial re-render.
  Runtime.prototype.reinit = function () {
    Clickables.offKey(document, 'runtimeDoc');
    this._bindDocument();
  };
  Runtime.prototype.destroy = function () {
    Clickables.resetAll();
    this._booted = false;
  };

  Runtime.prototype._bindKeyboard = function () {
    // Deliberately narrow: your AppListeners already handles Space, arrows,
    // M, L, S, R, Q, Escape. We only add the two it does not.
    $(window).off('keydown.runtimeKey').on('keydown.runtimeKey', function (e) {
      var tag = (e.target && e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      var mod = e.ctrlKey || e.metaKey;
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
    $(document).off('click.runtimeDoc').on('click.runtimeDoc', function (e) {
      var $openDD = $('[data-popup="dropdown"]');
      if ($openDD.length && !$openDD.is(e.target) && !$openDD.has(e.target).length) {
        if (window.popups && window.popups.closeType) window.popups.closeType('dropdown');
      }
    });
  };

  Runtime.prototype._bindFavoritesSync = function () {
    var self = this;
    Bus.sub(Bus.EVENTS.FAVORITES, function (detail) {
      if (detail && detail.type && detail.id != null) {
        self.favorites.syncIcon(detail.type, detail.id, detail.active);
      }
    });
  };

  // ============================================================
  // Expose on window (no modules, safe to split into its own file)
  // ============================================================
  window.MyBeats = window.MyBeats || {};
  window.MyBeats.Bus              = Bus;
  window.MyBeats.Clickables       = Clickables;
  window.MyBeats.FavoritesController = FavoritesController;
  window.MyBeats.QueueController  = QueueController;
  window.MyBeats.PlaylistController = PlaylistController;
  window.MyBeats.Runtime          = Runtime;

  window.MyBeats.createRuntime = function (opts) {
    var rt = new Runtime(opts);
    window.MyBeats.runtime = rt;
    return rt;
  };

})(window, jQuery);