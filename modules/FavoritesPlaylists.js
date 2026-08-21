import { Utils, CONFIG } from "./utilities.js";
import { Icons } from "./icons.js";


export class FavoritesPlaylists {
  constructor(state) {
    this.state = state;
  }

  get popups() {
    return window.popups || null;
  }

  get ui() {
    return window.uiManager || null;
  }

  /* ============================================================
     Favorites (with undo toasts)
     ============================================================ */

  _notifyWithUndo(options) {
    const popups = this.popups;
    if (!popups) return;
    popups.toast({
      type: options.type || 'info',
      message: options.message,
      duration: 6000,
      onUndo: options.onUndo
    });
  }

  isSongFavorite(id) {
    return this.state.favoriteSongs.some(sid => String(sid) === String(id));
  }

  toggleFavoriteSong(song) {
    const id = String(song.id);
    const wasFav = this.isSongFavorite(id);
    const idx = this.state.favoriteSongs.findIndex(sid => String(sid) === id);

    if (idx >= 0) {
      this.state.favoriteSongs.splice(idx, 1);
      this._notifyWithUndo({
        message: `Removed "${song.title}" from favorites`,
        onUndo: () => {
          if (!this.isSongFavorite(id)) {
            this.state.favoriteSongs.push(id);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    } else {
      this.state.favoriteSongs.push(id);
      this._notifyWithUndo({
        message: `Added "${song.title}" to favorites`,
        onUndo: () => {
          const i = this.state.favoriteSongs.findIndex(sid => String(sid) === id);
          if (i >= 0) {
            this.state.favoriteSongs.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    }

    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    // Live-update hook: open pages (e.g. Home) animate heart/count changes
    // in place instead of re-rendering.
    window.dispatchEvent(new CustomEvent('mybeats:favorites-changed', { detail: { type: 'song', id } }));
  }

  isArtistFavorite(id) {
    return this.state.favoriteArtists.some(aid => String(aid) === String(id));
  }

  toggleFavoriteArtist(id) {
    const sid = String(id);
    const idx = this.state.favoriteArtists.findIndex(aid => String(aid) === sid);
    const artist = this.state.getArtistById(id);
    const name = artist?.artist || 'Artist';

    if (idx >= 0) {
      this.state.favoriteArtists.splice(idx, 1);
      this._notifyWithUndo({
        message: `Removed ${name} from favorite artists`,
        onUndo: () => {
          if (!this.isArtistFavorite(id)) {
            this.state.favoriteArtists.push(sid);
            this.state.persist();
            this.ui?.render();
          }
        }
      });
    } else {
      this.state.favoriteArtists.push(sid);
      this._notifyWithUndo({
        message: `Added ${name} to favorite artists`,
        onUndo: () => {
          const i = this.state.favoriteArtists.findIndex(aid => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteArtists.splice(i, 1);
            this.state.persist();
            this.ui?.render();
          }
        }
      });
    }

    this.state.persist();
    window.dispatchEvent(new CustomEvent('mybeats:favorites-changed', { detail: { type: 'artist', id: sid } }));
    this.ui?.render();
  }

  isAlbumFavorite(id) {
    return this.state.favoriteAlbums.some(aid => String(aid) === String(id));
  }

  toggleFavoriteAlbum(id) {
    const sid = String(id);
    const idx = this.state.favoriteAlbums.findIndex(aid => String(aid) === sid);
    const album = this.state.getAlbumById(id);
    const name = album?.album || 'Album';

    if (idx >= 0) {
      this.state.favoriteAlbums.splice(idx, 1);
      this._notifyWithUndo({
        message: `Removed ${name} from favorite albums`,
        onUndo: () => {
          if (!this.isAlbumFavorite(id)) {
            this.state.favoriteAlbums.push(sid);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    } else {
      this.state.favoriteAlbums.push(sid);
      this._notifyWithUndo({
        message: `Added ${name} to favorite albums`,
        onUndo: () => {
          const i = this.state.favoriteAlbums.findIndex(aid => String(aid) === sid);
          if (i >= 0) {
            this.state.favoriteAlbums.splice(i, 1);
            this.state.persist();
            this.ui?.render();
            if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
          }
        }
      });
    }

    this.state.persist();
    if (this.state.isDrawerOpen) this.ui?.updateFullPlayer();
    window.dispatchEvent(new CustomEvent('mybeats:favorites-changed', { detail: { type: 'album', id: sid } }));
  }

  /* ============================================================
     Playlist CRUD
     ============================================================ */

  getPlaylistById(id) {
    const sid = String(id);
    return this.state.playlists.find(p => String(p.id) === sid);
  }

  createPlaylist({ name, description = '', tags = [] } = {}) {
    const playlist = {
      id: Utils.newId('pl'),
      name: name || 'Unnamed Playlist',
      description,
      tags: Array.isArray(tags) ? tags : [],
      songs: []
    };
    this.state.playlists.push(playlist);
    this.state.persist();
    return playlist;
  }

  renamePlaylist(id, newName) {
    const pl = this.getPlaylistById(id);
    if (!pl || !newName.trim()) return false;
    pl.name = newName.trim();
    this.state.persist();
    return true;
  }

  updatePlaylistDescription(id, description) {
    const pl = this.getPlaylistById(id);
    if (!pl) return false;
    pl.description = description;
    this.state.persist();
    return true;
  }

  updatePlaylistTags(id, tags) {
    const pl = this.getPlaylistById(id);
    if (!pl) return false;
    pl.tags = Array.isArray(tags) ? tags : [];
    this.state.persist();
    return true;
  }

  deletePlaylist(id) {
    const pl = this.getPlaylistById(id);
    if (!pl) return false;
    const name = pl.name;
    this.state.playlists = this.state.playlists.filter(p => String(p.id) !== String(id));
    this.state.persist();
    if (this.popups) this.popups.toast({ type: 'success', message: `Playlist "${name}" deleted` });
    return true;
  }

  reorderPlaylistSongs(id, newOrder) {
    const pl = this.getPlaylistById(id);
    if (!pl || !Array.isArray(newOrder)) return false;
    pl.songs = newOrder.map(sid => String(sid));
    this.state.persist();
    return true;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const pl = this.getPlaylistById(playlistId);
    if (!pl) return false;
    const sid = String(songId);
    const before = [...pl.songs];
    const song = this.state.getSongById(sid);
    pl.songs = pl.songs.filter(id => String(id) !== sid);
    this.state.persist();
    if (song) {
      this._notifyWithUndo({
        message: `Removed "${song.title}" from ${pl.name}`,
        onUndo: () => {
          pl.songs = before;
          this.state.persist();
          if (this.ui?.state?.currentPage === 'editPlaylist' && this.ui.state.editingPlaylistId === playlistId) {
            this.ui.render();
          }
        }
      });
    }
    return true;
  }

  addSongToPlaylist(playlistId, songId) {
    const pl = this.getPlaylistById(playlistId);
    const sid = String(songId);
    if (!pl || pl.songs.some(id => String(id) === sid)) return false;
    const song = this.state.getSongById(sid);
    pl.songs.push(sid);
    this.state.persist();
    if (song) {
      this._notifyWithUndo({
        message: `Added "${song.title}" to ${pl.name}`,
        onUndo: () => {
          pl.songs = pl.songs.filter(id => String(id) !== sid);
          this.state.persist();
          this.ui?.render();
        }
      });
    }
    return true;
  }

  /* ============================================================
     Modals using Popups
     ============================================================ */

  openPlaylistModal() {
    const popups = this.popups;
    if (!popups) return;
    const content = document.createElement('div');
    content.className = 'popups-playlist-list';
    content.innerHTML = this.state.playlists.length
      ? this.state.playlists.map(pl => `
          <div class="popups-playlist-row" data-action="view" data-id="${Utils.escapeHtml(pl.id)}">
            <div class="popups-playlist-cover">
              ${this._playlistCoverPreview(pl, 40)}
            </div>
            <div class="popups-playlist-info">
              <p class="popups-playlist-name">${Utils.escapeHtml(pl.name)}</p>
              <p class="popups-playlist-meta">${pl.songs.length} songs</p>
            </div>
            <div class="popups-playlist-actions">
              <button class="popups-icon-btn" data-action="edit" data-id="${Utils.escapeHtml(pl.id)}" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="popups-icon-btn popups-danger" data-action="delete" data-id="${Utils.escapeHtml(pl.id)}" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('')
      : `<p class="popups-empty">No playlists yet.</p>`;

    const modal = popups.modal({
      title: 'Your Playlists',
      size: 'md',
      content,
      closable: true,
      actions: [
        { label: 'Create New Playlist', action: 'create', type: 'primary' }
      ],
      onAction: (action) => {
        if (action === 'create') this.createNewPlaylist();
      }
    });

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'view') {
        modal.hide();
        this.ui?.navigate('playlists');
        this.state.selectedPlaylistName = this.getPlaylistById(id)?.name || null;
        this.ui?.render();
      } else if (action === 'edit') {
        modal.hide();
        this.editPlaylist(id);
      } else if (action === 'delete') {
        modal.hide();
        this._confirmDeletePlaylist(id);
      }
    });
  }

  _playlistCoverPreview(pl, size = 40) {
    const state = this.state;
    const songs = pl.songs.map(sid => state.getSongById(sid)).filter(Boolean).slice(0, 4);
    if (!songs.length) {
      return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${Icons.general.playlist(Math.round(size * 0.5))}</div>`;
    }
    if (songs.length === 1) {
      return `<img src="${songs[0].coverUrl}" width="${size}" height="${size}" class="popups-cover-img">`;
    }
    return `
      <div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">
        ${Array.from({ length: 4 }).map((_, i) => songs[i]
          ? `<img src="${songs[i].coverUrl}" class="popups-cover-quarter">`
          : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`
        ).join('')}
      </div>
    `;
  }

  _confirmDeletePlaylist(id) {
    const pl = this.getPlaylistById(id);
    if (!pl) return;
    this.popups.dialog({
      title: 'Delete Playlist?',
      message: `Are you sure you want to delete "${pl.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        this.deletePlaylist(id);
        if (this.state.selectedPlaylistName === pl.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
        this.ui?.render();
      }
    });
  }

  createNewPlaylist() {
    const popups = this.popups;
    if (!popups) return;

    const wrap = document.createElement('div');
    wrap.className = 'popups-form';
    wrap.innerHTML = `
      <div class="popups-field">
        <label for="new-pl-name">Playlist name</label>
        <input type="text" id="new-pl-name" class="popups-input" placeholder="e.g. Late Night Drive" autocomplete="off" maxlength="80">
      </div>
      <div class="popups-field">
        <label for="new-pl-desc">Description <span>(optional)</span></label>
        <textarea id="new-pl-desc" class="popups-textarea" rows="2" placeholder="What’s this playlist about?" maxlength="240"></textarea>
      </div>
      <div class="popups-field">
        <label>Tags <span>(optional, press Enter)</span></label>
        <div class="popups-tag-input-wrap">
          <input type="text" id="new-pl-tags" class="popups-input" placeholder="e.g. Chill, Workout, Focus" maxlength="20">
        </div>
        <div class="popups-tag-list" id="new-pl-tag-list"></div>
      </div>
    `;

    const tagInput = wrap.querySelector('#new-pl-tags');
    const tagList = wrap.querySelector('#new-pl-tag-list');
    const tags = [];

    const renderTags = () => {
      tagList.innerHTML = tags.map(t => `
        <span class="popups-tag-chip" data-tag="${Utils.escapeHtml(t)}">
          ${Utils.escapeHtml(t)}
          <button type="button" class="popups-tag-remove" data-tag="${Utils.escapeHtml(t)}">×</button>
        </span>
      `).join('');
    };

    tagInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const raw = tagInput.value.trim();
      if (!raw) return;
      const vals = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      vals.forEach(v => {
        if (!tags.includes(v) && tags.length < 8) tags.push(v);
      });
      tagInput.value = '';
      renderTags();
    });

    tagList.addEventListener('click', (e) => {
      const btn = e.target.closest('.popups-tag-remove');
      if (!btn) return;
      const t = btn.dataset.tag;
      const i = tags.indexOf(t);
      if (i >= 0) tags.splice(i, 1);
      renderTags();
    });

    const nameInput = wrap.querySelector('#new-pl-name');

    const modal = popups.modal({
      title: 'Create Playlist',
      size: 'sm',
      content: wrap,
      closable: true,
      actions: [
        { label: 'Cancel', action: 'cancel', type: 'secondary' },
        { label: 'Create', action: 'create', type: 'primary' }
      ],
      onAction: (action, popup) => {
        if (action !== 'create') return;
        const name = nameInput.value.trim();
        if (!name) {
          popups.toast({ type: 'warning', message: 'Please enter a playlist name' });
          return;
        }
        const description = wrap.querySelector('#new-pl-desc').value.trim();
        this.createPlaylist({ name, description, tags: [...tags] });
        popups.toast({ type: 'success', message: `Playlist "${name}" created` });
        this.ui?.render();
        popup.hide();
      }
    });

    setTimeout(() => nameInput.focus(), 50);
  }

  editPlaylist(id) {
    if (!this.ui) return;
    this.state.editingPlaylistId = id;
    this.state.selectedPlaylistName = this.getPlaylistById(id)?.name || null;
    this.ui.navigate('editPlaylist');
    history.pushState(null, '', `/playlist/${id}/edit`);
  }

  addToPlaylistModal(song) {
    const popups = this.popups;
    if (!popups) return;

    if (!this.state.playlists.length) {
      popups.modal({
        title: 'Add to Playlist',
        size: 'sm',
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [
          { label: 'Create Playlist', action: 'create', type: 'primary' }
        ],
        onAction: (action) => {
          if (action === 'create') this.createNewPlaylist();
        }
      });
      return;
    }

    const content = document.createElement('div');
    content.className = 'popups-add-to-playlist';

    const songHeader = song ? `
      <div class="popups-song-context">
        <img src="${song.coverUrl || CONFIG.DEFAULT_COVER}" class="popups-song-context-thumb" alt="">
        <div class="popups-song-context-info">
          <p class="popups-song-context-title">${Utils.escapeHtml(song.title)}</p>
          <p class="popups-song-context-sub">${Utils.escapeHtml(song.artist || '')}</p>
        </div>
      </div>
    ` : '';

    const list = this.state.playlists.map(pl => `
      <button class="popups-playlist-row" data-action="add" data-id="${Utils.escapeHtml(pl.id)}">
        <div class="popups-playlist-cover">${this._playlistCoverPreview(pl, 44)}</div>
        <div class="popups-playlist-info">
          <p class="popups-playlist-name">${Utils.escapeHtml(pl.name)}</p>
          <p class="popups-playlist-meta">${pl.songs.length} songs</p>
        </div>
        ${pl.songs.some(sid => String(sid) === String(song?.id))
          ? `<span class="popups-in-list-badge">In playlist</span>`
          : ''}
      </button>
    `).join('');

    content.innerHTML = songHeader + `<div class="popups-playlist-list">${list}</div>`;

    const modal = popups.modal({
      title: song ? `Add to Playlist` : 'Select Playlist',
      size: 'sm',
      content,
      closable: true,
      actions: [
        { label: 'Create New', action: 'create', type: 'secondary' }
      ],
      onAction: (action) => {
        if (action === 'create') {
          modal.hide();
          this.createNewPlaylist();
        }
      }
    });

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();
      const plId = btn.dataset.id;
      const pl = this.getPlaylistById(plId);
      if (!pl || !song) return;
      if (pl.songs.some(sid => String(sid) === String(song.id))) {
        popups.toast({ type: 'warning', message: `"${song.title}" is already in ${pl.name}` });
        return;
      }
      this.addSongToPlaylist(plId, song.id);
      modal.hide();
    });
  }

  getSongById(id) {
    return this.state.getSongById(id);
  }
}


