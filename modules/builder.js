

import { Utils, Prefs, IdUtils, Spinner } from "https://clockblocked.github.io/music.me/modules/utilities.js";
import { Icons } from "https://clockblocked.github.io/music.me/modules/icons.js";
import { Popups } from "https://clockblocked.github.io/music.me/modules/overlays/popups.js";
import {
  Home,
  Library,
  Playlists,
  Favorites,
  Artists,
  EditPlaylist,
  Error404
} from "https://clockblocked.github.io/music.me/modules/layouts.js";
import { PlayerManager } from "https://clockblocked.github.io/music.me/modules/players.js";


// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------
export class Router {
  constructor(ui) {
    this.ui = ui;
    this.state = ui.state;
    this.audioPlayer = ui.audioPlayer;
    this.favorites = ui.favorites;
  }

  goToPage(page, artistId = null, albumId = null) {
    if (this.state.isDrawerOpen) this.ui.closePlayerDrawer();
    let artist = null;
    if (artistId) {
      artist = this.state.getArtistById(artistId);
      if (!artist) {
        artist = this.state.enrichedLibrary.find((a) => a.artist === artistId);
        if (artist) artistId = artist.id;
      }
    }
    const runNav = async () => {
      const tab = this.state.favoritesTab || "songs";
      const album = albumId ? this.state.getAlbumById(albumId) : null;

      const urlMap = {
        home:         '/',
        library:      '/library',
        favorites:    '/favorites' + (tab !== 'songs' ? '/' + tab : ''),
        playlists:    this.state.selectedPlaylistId
                        ? `/playlist/${this.state.selectedPlaylistId}`
                        : '/playlists',
        editPlaylist: this.state.editingPlaylistId
                        ? `/playlist/${this.state.editingPlaylistId}/edit`
                        : '/playlists',
        artist:       artistId
                        ? albumId
                          ? `/artist/${artistId}/album/${albumId}`
                          : `/artist/${artistId}`
                        : '/',
      };

      const titleMap = {
        home: "MyBeats — Home",
        library: "MyBeats — Library",
        favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
        playlists: this.state.selectedPlaylistName
          ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
          : "MyBeats — Playlists",
        artist: artist
          ? album
            ? `MyBeats — ${artist.artist} / ${album.album}`
            : `MyBeats — ${artist.artist}`
          : "MyBeats"
      };
      this.state.currentPage = page;
      this.state.artistId = artistId || null;
      this.state.artistPageName = artist?.artist || null;
      this.state.selectedAlbumId = albumId || null;
      this.state.selectedAlbumName = album?.album || null;
      this.state.isSearchOpen = false;
      this.state.selectedPlaylistName = null;
      this.state.isCreatingPlaylist = false;
      document.title = titleMap[page] ?? "MyBeats";
      this.updateActiveNav();
      this.updateBreadcrumbs();
      this.ui.render();
    };

    runNav();
  }

  syncWithURL() {
    const parts = window.location.pathname.split('/').filter(p => p);
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkSong = searchParams.get('song');
    this.state.pendingDeepLinkSong = null;
    this.state.editingPlaylistId = null;

    // TEMPORARILY MODIFIED FOR CODEPEN ( see below )
    /***********************
    if (!parts.length) {
      this.state.currentPage = 'home';
    }
    ***********************/

    //  Temporarily changed from 'Home Page' to 'Artist Page'
    // for Live Styling on CodePen
    if (!parts.length) {
      const defaultArtistId = '4294';
      const defaultAlbumId  = '6778';

      const artist = this.state.getArtistById(defaultArtistId);
      if (artist) {
        this.state.currentPage = 'artist';
        this.state.artistId = defaultArtistId;
        this.state.artistPageName = artist.artist;

        const album = artist.albums.find(a => IdUtils.normalize(a.id) === IdUtils.normalize(defaultAlbumId));
        this.state.selectedAlbumId = album ? defaultAlbumId : null;
        this.state.selectedAlbumName = album?.album || null;
      } else {
        this.state.currentPage = 'home';
      }
    } else {
      const page = parts[0];

      if (page === 'library') {
        this.state.currentPage = 'library';
      } else if (page === 'favorites') {
        this.state.currentPage = 'favorites';
        this.state.favoritesTab = parts[1] || 'songs';
      } else if (page === 'playlist' && parts[1]) {
        const playlistId = parts[1];
        const normalizedId = IdUtils.normalize(playlistId);
        const playlist = this.state.playlists.find(p => IdUtils.normalize(p.id) === normalizedId);

        if (parts[2] === 'edit' && playlist) {
          this.state.currentPage = 'editPlaylist';
          this.state.editingPlaylistId = playlistId;
          this.state.selectedPlaylistName = playlist.name;
          this.state.selectedPlaylistId = playlistId;
        } else if (parts[2] === 'edit') {
          this.state.currentPage = '404';
        } else {
          this.state.currentPage = 'playlists';
          this.state.selectedPlaylistName = playlist?.name || null;
          this.state.selectedPlaylistId = playlist ? playlistId : null;
        }
      } else if (page === 'playlists') {
        this.state.currentPage = 'playlists';
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === 'artist' && parts[1]) {
        const artistId = parts[1];
        const artist = this.state.getArtistById(artistId);

        if (artist) {
          this.state.currentPage = 'artist';
          this.state.artistId = artistId;
          this.state.artistPageName = artist.artist;

          if (parts[2] === 'album' && parts[3]) {
            const albumId = parts[3];
            const album = artist.albums.find(a => IdUtils.normalize(a.id) === IdUtils.normalize(albumId));
            this.state.selectedAlbumId = album ? albumId : null;
            this.state.selectedAlbumName = album?.album || null;
          } else {
            this.state.selectedAlbumId = null;
            this.state.selectedAlbumName = null;
          }

          if (deepLinkSong) this.state.pendingDeepLinkSong = deepLinkSong;
        } else {
          this.state.currentPage = '404';
        }
      } else {
        this.state.currentPage = '404';
      }
    }

    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    this.ui.render();
  }

  handlePopState() {
    this.syncWithURL();
  }

  updateActiveNav() {
    document.querySelectorAll("nav .link[data-nav]").forEach((link) => {
      link.classList.toggle(
        "active",
        link.dataset.nav === this.state.currentPage
      );
    });
  }

  updateBreadcrumbs() {
    const container = document.getElementById('breadcrumb-items');
    if (!container) return;

    const crumbs = this.getBreadcrumbs();
    const existingItems = container.querySelectorAll('.item, .sep');

    if (existingItems.length > 0) {
      existingItems.forEach(el => el.classList.add('removing'));

      // Wait for exit blur/wipe + collapse transition (0.3s + buffer)
      setTimeout(() => {
        this.renderNewCrumbs(container, crumbs);
      }, 350);
    } else {
      this.renderNewCrumbs(container, crumbs);
    }
  }

  renderNewCrumbs(container, crumbs) {
    if (!crumbs.length) {
      container.innerHTML = '<span class="item active">Home</span>';
      return;
    }

    container.innerHTML = crumbs.map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      return `
        <span class="item ${isLast ? 'active' : ''}" style="--i: ${i};">
          ${crumb}
        </span>
        ${!isLast ? `<span class="sep" style="--i: ${i};">›</span>` : ''}
      `;
    }).join('');
  }

  getBreadcrumbs() {
    const crumbs = [];
    const page = this.state.currentPage;

    if (page === 'home') {
      crumbs.push('Home');
    } else if (page === 'library') {
      crumbs.push('Library');
    } else if (page === 'favorites') {
      const tab = (this.state.favoritesTab || 'songs');
      crumbs.push('Library', 'Favorites', tab.charAt(0).toUpperCase() + tab.slice(1));
    } else if (page === 'playlists') {
      crumbs.push('Library', 'Playlists');
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      if (this.state.isCreatingPlaylist)   crumbs.push('Create');
    } else if (page === 'artist') {
      crumbs.push('Artists');
      if (this.state.artistPageName)    crumbs.push(this.state.artistPageName);
      if (this.state.selectedAlbumName) crumbs.push(this.state.selectedAlbumName);
    }
    return crumbs;
  }

  toggleBreadcrumb() {
    const breadcrumbNav = document.querySelector('[data-navbar="breadcrumbs"]');
    if (!breadcrumbNav) return;

    this.ui.isBreadcrumbHidden = !this.ui.isBreadcrumbHidden;

    if (this.ui.isBreadcrumbHidden) {
      breadcrumbNav.classList.add('hide');
    } else {
      breadcrumbNav.classList.remove('hide');
    }
  }

  updateTitle() {
    const page = this.state.currentPage;
    const tab = this.state.favoritesTab || "songs";
    const artist = this.state.artistId
      ? this.state.getArtistById(this.state.artistId)
      : null;
    const album = this.state.selectedAlbumId
      ? this.state.getAlbumById(this.state.selectedAlbumId)
      : null;
    const titles = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName
        ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : "MyBeats"
    };
    document.title = titles[page] ?? "MyBeats";
  }
}

// ---------------------------------------------------------------------
// AppListeners
// ---------------------------------------------------------------------
export class AppListeners {
  static global(ui) {
    return [
      {  //  Close any open modal when outside clicked
        el: document.getElementById("modal-overlay"),
        type: "click",
        handler: () => ui.state.modalClose()
      },
      {  //  Disable native context menu everywhere; show custom app menu
        el: document,
        type: "contextmenu",
        handler: (e) => {
          e.preventDefault();
          const target = e.target.closest('[data-artist-id], [data-album-id], [data-song-id], [data-playlist-id]');
          if (!target) return;

          const artistId = target.dataset.artistId;
          const albumId  = target.dataset.albumId;
          const songId   = target.dataset.songId;
          const playlistId = target.dataset.playlistId;

          if (window.contextMenu?.show) {
            window.contextMenu.show(e.clientX, e.clientY, { artistId, albumId, songId, playlistId });
          }
        }
      },
      {  //  Desktop keyboard clicks
        el: window,
        type: "keydown",
        handler: (e) => {
          const tag = e.target.tagName;
          if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            e.target.isContentEditable
          )
            return;
          if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            ui.showShortcutsHelp();
            return;
          }
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          switch (e.code) {
            case "Space":
              e.preventDefault();
              ui.audioPlayer.togglePlay();
              break;
            case "ArrowLeft":
              e.preventDefault();
              ui.audioPlayer.skipBack();
              break;
            case "ArrowRight":
              e.preventDefault();
              ui.audioPlayer.skipForward();
              break;
            case "ArrowUp":
              e.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume + 0.05);
              break;
            case "ArrowDown":
              e.preventDefault();
              ui.audioPlayer.setVolume(ui.state.volume - 0.05);
              break;
            case "KeyM":
              ui.audioPlayer.toggleMute();
              break;
            case "KeyL":
              if (ui.state.currentSong)
                ui.toggleFavAndReRender(ui.state.currentSong.id);
              break;
            case "KeyS":
              ui.audioPlayer.toggleShuffle();
              break;
            case "KeyR":
              ui.audioPlayer.cycleRepeat();
              break;
            case "KeyQ":
              if (!ui.state.isDrawerOpen) {
                ui.openPlayerDrawer();
                ui.player.openQueue();
              } else {
                ui.player.toggleQueue();
              }
              break;
            case "Escape":
              if (ui.state.isDrawerOpen) ui.closePlayerDrawer();
              if (document.querySelector(".modal.active"))
                ui.state.modalClose();
              break;
          }
        }
      }
    ];
  }

  static static(ui) {
    const navButtons = document.querySelectorAll("nav .link[data-nav]");
    return Array.from(navButtons).map((btn) => ({
      el: btn,
      type: "click",
      handler: () => ui.navigate(btn.dataset.nav)
    }));
  }

  static init(ui) {
    return [
      {  //  URL / History sync
        el: window,
        type: "popstate",
        handler: () => ui.router.handlePopState()
      },
      {  //  Open / Close BreadCrumbs NAVBar
        el: document.getElementById("breadcrumb-toggle"),
        type: "click",
        handler: () => ui.router.toggleBreadcrumb()
      },
      {  //  Search Music
        el: document.getElementById("open-search"),
        type: "click",
        handler: () => ui.openSearch()
      },
      {  //  Close Search
        el: document.getElementById("close-search"),
        type: "click",
        handler: () => ui.closeSearch()
      },
      {  //  Clicks outside of Search ( closes )
        el: document.getElementById("search-overlay"),
        type: "click",
        handler: () => ui.closeSearch()
      },
      {  //  Color Schemes Modal
        el: document.querySelector('[data-action="settings"]'),
        type: "click",
        handler: () => ui.showSettingsModal()
      },
      {  //  Notifications History PopOver
        el: document.querySelector('[data-dash="notifications"]'),
        type: "click",
        handler: (e) => window.popups.showNotificationPanel(e.currentTarget)
      },
      {
        setup: (bind) => {
          const input = document.getElementById("search-input");
          if (input) {
            let timer;
            const handler = (e) => {
              clearTimeout(timer);
              ui.state.searchQuery = e.target.value;
              timer = setTimeout(() => ui.search.updateDropdown(), 200);
            };
            input.addEventListener("input", handler);
            bind.push({ el: input, type: "input", handler });
          }
        }
      },
      {
        setup: (bind) => {
          const handler = (e) => {
            if (e.key === "Escape" && ui.state.isSearchOpen) ui.closeSearch();
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
              e.preventDefault();
              ui.openSearch();
            }
          };
          document.addEventListener("keydown", handler);
          bind.push({ el: document, type: "keydown", handler });
        }
      },
      {
        immediate: () => {
          Prefs.applyTheme(Prefs.getTheme(), { persist: false });
        }
      }
    ];
  }

  static add(ui) {
    return [];
  }

  static remove(ui) {
    return [];
  }

  static bindAll(ui) {
    const bindList = [];
    const attach = (arr) => {
      arr.forEach((item) => {
        if (item.setup) {
          item.setup(bindList);
        } else if (item.immediate) {
          item.immediate();
        } else if (item.el && item.type && item.handler) {
          item.el.addEventListener(item.type, item.handler);
          bindList.push(item);
        }
      });
    };
    attach(AppListeners.global(ui));
    attach(AppListeners.static(ui));
    attach(AppListeners.init(ui));
    attach(AppListeners.add(ui));
    return bindList;
  }
}

// ---------------------------------------------------------------------
// ContentEventManager
// ---------------------------------------------------------------------
export class ContentEventManager {
  constructor(ui) {
    this.ui = ui;
    this.heartTimeouts = new Map();

    this.popups = window.popups || new Popups({ ui });
    this.popups.ui = ui;
  }

  escapeHtml(text = "") {
    return Utils.escapeHtml(text);
  }

  setupHeartButton(btn, type, id) {
    let tempState = null;
    let timeoutId = null;
    const songRow =
      type === "song" ? btn.closest(".song-row, .song-item") : null;
    const fav = this.ui.favorites;
    const isFav = () =>
      type === "song" ? fav.isSongFavorite(id) : fav.isArtistFavorite(id);
    const updateIcon = (isHovered) => {
      btn.innerHTML = this.ui.likeStatus(type, isFav(), isHovered, tempState);
    };
    const onMouseEnter = () => updateIcon(true);
    const onMouseLeave = () => updateIcon(false);
    const target = songRow || btn;
    target.addEventListener("mouseenter", onMouseEnter);
    target.addEventListener("mouseleave", onMouseLeave);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (timeoutId) clearTimeout(timeoutId);
      if (type === "song") {
        const song = this.ui.state.getSongById(id);
        if (song) fav.toggleFavoriteSong(song);
      } else {
        fav.toggleFavoriteArtist(id);
      }
      btn.classList.toggle("favorited", isFav());
      btn.classList.toggle("is-favorite", isFav());
      btn.classList.add("heart-busy");
      tempState = "check";
      updateIcon(false);
      timeoutId = setTimeout(() => {
        tempState = null;
        updateIcon(false);
        timeoutId = null;
        btn.classList.remove("heart-busy");
        const isInFavorites = btn.closest("#favorites-content") !== null;
        if (isInFavorites && !isFav() && type === "song") {
          btn.closest(".song-row")?.remove();
          const tabBtn = document.querySelector('.tab-btn[data-tab="songs"]');
          if (tabBtn) {
            const match = tabBtn.textContent.match(/(\d+)/);
            if (match) tabBtn.textContent = `Songs (${parseInt(match[1]) - 1})`;
          }
        }
      }, 5000);
      this.heartTimeouts.set(btn, {
        timeoutId,
        onMouseEnter,
        onMouseLeave,
        songRow
      });
    });
    this.heartTimeouts.set(btn, {
      timeoutId,
      onMouseEnter,
      onMouseLeave,
      songRow
    });
  }

  attachHeartEvents() {
    this.heartTimeouts.forEach(
      ({ timeoutId, onMouseEnter, onMouseLeave, songRow }, btn) => {
        clearTimeout(timeoutId);
        const target = songRow || btn;
        target.removeEventListener("mouseenter", onMouseEnter);
        target.removeEventListener("mouseleave", onMouseLeave);
      }
    );
    this.heartTimeouts.clear();

    document.querySelectorAll("[data-fav-song]").forEach((btn) => {
      this.setupHeartButton(btn, "song", btn.dataset.favSong);
    });
    document.querySelectorAll("[data-artist-heart]").forEach((btn) => {
      this.setupHeartButton(btn, "artist", btn.dataset.artistHeart);
    });
  }

  attachEditPlaylistEvents() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const pl = state.playlists.find(p => String(p.id) === String(id));
    if (!pl) return;

    const nameInput = document.getElementById('edit-pl-name');
    const descInput = document.getElementById('edit-pl-desc');
    const tagWrap   = document.getElementById('edit-pl-tags');

    if (nameInput) {
      nameInput.addEventListener('change', () => {
        window.favoritesPlaylists.renamePlaylist(id, nameInput.value);
      });
    }

    if (descInput) {
      descInput.addEventListener('change', () => {
        window.favoritesPlaylists.updatePlaylistDescription(id, descInput.value);
      });
    }

    if (tagWrap) {
      const input = tagWrap.querySelector('.edit-playlist-tag-input');
      input?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const vals = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        const tags = pl.tags || [];
        vals.forEach(v => { if (!tags.includes(v) && tags.length < 8) tags.push(v); });
        input.value = '';
        window.favoritesPlaylists.updatePlaylistTags(id, tags);
        this.ui.render();
      });

      tagWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.edit-playlist-tag-remove');
        if (!btn) return;
        const tag = btn.dataset.tag;
        const tags = (pl.tags || []).filter(t => t !== tag);
        window.favoritesPlaylists.updatePlaylistTags(id, tags);
        this.ui.render();
      });
    }

    document.querySelectorAll('[data-page="edit-playlist"] [data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'back' || action === 'done') {
          this.ui.navigate('playlists');
        } else if (action === 'delete-playlist') {
          window.favoritesPlaylists._confirmDeletePlaylist(id);
        } else if (action === 'shuffle-play') {
          const queue = state.buildPlaylistQueue(id);
          if (queue.length) {
            const shuffled = Utils.shuffled(queue);
            this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, 'playlist');
          }
        } else if (action === 'add-songs') {
          this.ui.navigate('library');
        }
      });
    });

    const list = document.getElementById('edit-playlist-songs');
    if (list) {
      let dragIdx = null;

      list.querySelectorAll('.edit-playlist-song-row').forEach(row => {
        row.addEventListener('dragstart', (e) => {
          dragIdx = parseInt(row.dataset.index, 10);
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch {}
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          list.querySelectorAll('.edit-playlist-song-row').forEach(r => r.classList.remove('drop-target'));
          dragIdx = null;
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          list.querySelectorAll('.edit-playlist-song-row').forEach(r => r.classList.remove('drop-target'));
          row.classList.add('drop-target');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetIdx = parseInt(row.dataset.index, 10);
          if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;
          const newOrder = [...pl.songs];
          const [moved] = newOrder.splice(dragIdx, 1);
          newOrder.splice(targetIdx, 0, moved);
          window.favoritesPlaylists.reorderPlaylistSongs(id, newOrder);
          this.ui.render();
        });
      });

      list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-song"]');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        const sid = pl.songs[index];
        const song = state.getSongById(sid);
        if (song) window.favoritesPlaylists.removeSongFromPlaylist(id, sid);
        else {
          const newOrder = [...pl.songs];
          newOrder.splice(index, 1);
          window.favoritesPlaylists.reorderPlaylistSongs(id, newOrder);
          this.ui.render();
        }
      });
    }
  }

  showArtistPopover(artistId, event) {
    return this.popups.showArtistPopover(artistId, event);
  }

  showSongMenu(songId, event) {
    return this.popups.showSongMenu(songId, event);
  }

  attachContentEvents() {
    this.heartTimeouts.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    this.heartTimeouts.clear();

    const mainContent = document.getElementById("main-content");
    if (mainContent && !mainContent.artistClicksBound) {
      mainContent.artistClicksBound = true;
      mainContent.addEventListener("click", (e) => {
        const el = e.target.closest("[data-artist-id]");
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId || null;
        e.stopPropagation();
        this.ui.navigate("artist", artistId, albumId);
      });
      mainContent.addEventListener("dblclick", (e) => {
        const el = e.target.closest(
          ".album-cover-wrap[data-artist-id][data-album-id]"
        );
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId;
        if (!artistId || !albumId) return;
        const queue = Utils.buildAlbumQueue(this.ui.state, artistId, albumId);
        if (queue.length)
          this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    }

    document.querySelectorAll('[data-action="add-album-to-playlist"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const firstSong = this.ui.state.getSongById(album.songs[0].id) || album.songs[0];
        const queue = Utils.buildAlbumQueue(this.ui.state, album.artistId, albumId);
        if (queue.length && window.favoritesPlaylists?.addToPlaylistModal) {
          window.favoritesPlaylists.addToPlaylistModal(firstSong);
        }
      });
    });

    document.querySelectorAll('[data-action="add-album-to-queue"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;
        const queue = Utils.buildAlbumQueue(this.ui.state, album.artistId, albumId);
        const currentQueue = this.ui.state.queue || [];
        const startIndex = currentQueue.length;
        this.ui.state.queue = [...currentQueue, ...queue];
        if (this.ui.state.currentSong && startIndex === currentQueue.length) {
          this.ui.state.queueIndex = this.ui.state.queue.findIndex(s => s.id == this.ui.state.currentSong.id);
        }
        this.ui.state.showToast(`Added ${queue.length} song${queue.length === 1 ? '' : 's'} to queue`);
      });
    });

    document.querySelectorAll('[data-action="toggle-favorite-album"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        window.favoritesPlaylists?.toggleFavoriteAlbum?.(albumId);
      });
    });

    document.querySelectorAll("[data-song-id]").forEach((el) => {
      el.addEventListener("dblclick", (e) => {
        if (e.target.closest(".downloadBtn")) return;
        const songId = el.dataset.songId;
        const song = this.ui.state.getSongById(songId);
        if (!song) return;
        if (el.dataset.context) {
          const ctx = JSON.parse(el.dataset.context);
          const queue = Utils.buildAlbumQueue(
            this.ui.state,
            ctx.artistId,
            ctx.albumId
          );
          if (queue.length) {
            this.ui.audioPlayer.playSong(
              queue.find(
                (s) => IdUtils.normalize(s.id) === IdUtils.normalize(songId)
              ),
              queue,
              true,
              "album"
            );
            return;
          }
        }
        if (el.dataset.playlistId) {
          const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistId);
          if (queue.length) {
            const startSong =
              queue.find(
                (s) => IdUtils.normalize(s.id) === IdUtils.normalize(songId)
              ) || queue[0];
            this.ui.audioPlayer.playSong(startSong, queue, true, "playlist");
            return;
          }
        }
        this.ui.audioPlayer.playSong(
          song,
          null,
          true,
          el.dataset.playSource || null
        );
      });
    });

    document.querySelectorAll("[data-play-album]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.detail > 1) return;
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.buildAlbumQueue(
          this.ui.state,
          data.artistId,
          data.albumId
        );
        if (queue.length)
          this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    });

    document.querySelectorAll("[data-playlist-play]").forEach((el) => {
      if (el._plPlayBound) return;
      el._plPlayBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistPlay);
        if (queue.length) {
          this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist");
          this.ui.state.showToast("Playing playlist");
        } else {
          this.ui.state.showToast("Playlist is empty");
        }
      });
    });

    document.querySelectorAll("[data-playlist-view]").forEach((el) => {
      if (el._plViewBound) return;
      el._plViewBound = true;
      el.addEventListener("click", () => {
        const pl = this.ui.state.playlists.find(
          (p) => p.name === el.dataset.playlistView
        );
        if (!pl) return;
        history.pushState(null, "", "/playlist/" + pl.id);
        this.ui.handlePopState();
      });
    });

    document.querySelectorAll("[data-playlist-shuffle]").forEach((el) => {
      if (el._plShuffleBound) return;
      el._plShuffleBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(
          el.dataset.playlistShuffle
        );
        if (queue.length) {
          const shuffled = Utils.shuffled(queue);
          this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
          this.ui.state.showToast("Shuffling playlist");
        } else {
          this.ui.state.showToast("Playlist is empty");
        }
      });
    });

    document.querySelectorAll("[data-more-song]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showSongMenu(el.dataset.moreSong, e);
      });
    });

    document.querySelectorAll(".add-to-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const song = this.ui.state.getSongById(btn.dataset.songId);
        if (song) this.ui.favorites.addToPlaylistModal(song);
      });
    });

    document.querySelectorAll(".artist-name-pill").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistId = el.dataset.artistId;
        if (artistId) this.showArtistPopover(artistId, e);
      });
    });

    document
      .querySelectorAll('[data-album-id][data-dynamic="true"]')
      .forEach((el) => {
        el.addEventListener("click", () => {
          const artistId = IdUtils.normalize(el.dataset.artistId);
          const albumId = IdUtils.normalize(el.dataset.albumId);
          if (artistId && albumId)
            this.ui.navigate("artist", artistId, albumId);
        });
      });

    if (this.ui.state.currentPage === "playlists") {
      const createPlBtn = document.getElementById("create-playlist-btn");
      if (createPlBtn && !createPlBtn._hasListener) {
        createPlBtn._hasListener = true;
        createPlBtn.addEventListener("click", () => {
          window.favoritesPlaylists.createNewPlaylist();
          this.ui.render();
        });
      }

      document
        .querySelectorAll(".playlist-name-input, .playlist-description-input")
        .forEach((el) => {
          el.addEventListener("input", (e) => {
            const pl = this.ui.state.playlists.find(
              (p) => p.id === e.target.dataset.playlistId
            );
            if (pl) {
              pl[e.target.dataset.field] = e.target.value;
              this.ui.state.persist();
            }
          });
        });

      document.querySelectorAll(".tag-input").forEach((input) => {
        input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" || !e.target.value.trim()) return;
          e.preventDefault();
          const pl = this.ui.state.playlists.find(
            (p) => p.id === e.target.dataset.playlistId
          );
          if (!pl) return;
          const newTag = e.target.value.trim();
          if (!pl.tags) pl.tags = [];
          if (pl.tags.includes(newTag)) return;
          pl.tags.push(newTag);
          this.ui.state.persist();
          const chip = document.createElement("span");
          chip.className = "tag-chip animate-fadeIn";
          chip.style.background = "rgba(var(--bg-interactive))";
          const safeTag = newTag
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
          chip.innerHTML = `${safeTag} <button class="remove-tag-btn" data-tag="${safeTag}">×</button>`;
          e.target.closest(".tags-container").insertBefore(chip, e.target);
          chip
            .querySelector(".remove-tag-btn")
            .addEventListener("click", (ce) => {
              ce.stopPropagation();
              pl.tags = pl.tags.filter((t) => t !== ce.target.dataset.tag);
              this.ui.state.persist();
              chip.remove();
            });
          e.target.value = "";
        });
      });

      document.querySelectorAll(".remove-tag-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const plId = e.target.closest(".tags-container").dataset.playlistId;
          const pl = this.ui.state.playlists.find((p) => p.id === plId);
          if (pl?.tags) {
            pl.tags = pl.tags.filter((t) => t !== e.target.dataset.tag);
            this.ui.state.persist();
            e.target.closest(".tag-chip").remove();
          }
        });
      });

      document.querySelectorAll(".remove-from-playlist-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find(
            (p) => p.id === btn.dataset.playlistId
          );
          if (pl) {
            pl.songs = pl.songs.filter(
              (sid) => String(sid) !== String(btn.dataset.songId)
            );
            this.ui.state.persist();
            btn.closest(".song-row").remove();
          }
        });
      });

      document.querySelectorAll(".share-playlist-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const pl = this.ui.state.playlists.find(
            (p) => p.id === btn.dataset.playlistId
          );
          if (!pl) return;
          const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ""}`;
          if (navigator.share) {
            navigator.share({ title: pl.name, text: shareText });
          } else {
            navigator.clipboard
              ?.writeText(shareText)
              .then(() =>
                this.ui.state.showToast("Playlist copied to clipboard")
              );
          }
        });
      });
    }

    if (this.ui.state.currentPage === 'editPlaylist') {
      this.attachEditPlaylistEvents();
    }

    document.querySelectorAll('[data-hover-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.hoverAction;
        const artistId = btn.dataset.artistId;
        const albumId = btn.dataset.albumId;
        const playlistId = btn.dataset.playlistId;
        const state = this.ui.state;

        switch (action) {
          case 'play-album': {
            const queue = Utils.buildAlbumQueue(state, artistId, albumId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, 'album');
            break;
          }
          case 'shuffle-album': {
            const queue = Utils.buildAlbumQueue(state, artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffled(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, 'album');
            }
            break;
          }
          case 'favorite-album': {
            window.favoritesPlaylists?.toggleFavoriteAlbum?.(albumId);
            break;
          }
          case 'album-playlist': {
            const album = state.getAlbumById(albumId);
            const firstSong = album?.songs?.[0] ? state.getSongById(album.songs[0].id) : null;
            if (firstSong) window.favoritesPlaylists?.addToPlaylistModal?.(firstSong);
            break;
          }
          case 'view-artist': {
            this.ui.navigate('artist', artistId);
            break;
          }
          case 'play-artist': {
            const artist = state.getArtistById(artistId);
            if (artist?.albums?.length) {
              const queue = Utils.buildAlbumQueue(state, artistId, artist.albums[0].id);
              if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, 'album');
            }
            break;
          }
          case 'favorite-artist': {
            window.favoritesPlaylists?.toggleFavoriteArtist?.(artistId);
            break;
          }
          case 'play-playlist': {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, 'playlist');
            break;
          }
          case 'shuffle-playlist': {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) {
              const shuffled = Utils.shuffled(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, 'playlist');
            }
            break;
          }
          case 'edit-playlist': {
            this.ui.editPlaylist(playlistId);
            break;
          }
          case 'share-playlist': {
            const pl = state.playlists.find(p => String(p.id) === String(playlistId));
            if (!pl) return;
            const shareText = `Playlist: ${pl.name}\n${pl.songs.length} songs\n${pl.description || ''}`;
            if (navigator.share) {
              navigator.share({ title: pl.name, text: shareText });
            } else if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(shareText).then(() => state.showToast('Playlist copied to clipboard'));
            }
            break;
          }
        }
      });
    });

    this.attachHeartEvents();

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn._tabBound) return;
      btn._tabBound = true;
      btn.addEventListener("click", () => {
        this.ui.refreshFavoritesContent(btn.dataset.tab);
      });
    });

    window.saveToLibraryDrawer?.refreshSavedBadges?.();
    window.offlineCache?.badgeRows?.();
  }
}

// ---------------------------------------------------------------------
// OfflineCacheManager
// ---------------------------------------------------------------------
export class OfflineCacheManager {
  constructor(state) {
    this.state = state;
    this.cachedUrls = new Set();
    this._listening = false;
    this.init();
  }

  normalizeUrl(song) {
    if (!song?.downloadPath) return "";
    try {
      return new URL(song.downloadPath, window.location.origin).href;
    } catch (e) {
      return song.downloadPath;
    }
  }

  isCached(song) {
    const abs = this.normalizeUrl(song);
    return this.cachedUrls.has(abs) || this.cachedUrls.has(song?.downloadPath);
  }

  init() {
    if (!("serviceWorker" in navigator)) return;
    if (!this._listening) {
      this._listening = true;
      navigator.serviceWorker.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || !data.type) return;
        if (data.type === "CACHE_STATUS_RESULT") {
          const urls = data.songs?.urls || [];
          this.cachedUrls = new Set(urls);
          this.badgeRows();
        }
        if (data.type === "SONG_CACHED" && data.url) {
          this.cachedUrls.add(data.url);
          this.badgeRows();
          this.state.showToast("Song available offline");
        }
      });
    }
    this.queryStatus();
    window.addEventListener("sw:controller-change", () => this.queryStatus());
    window.addEventListener("sw:ready", () => this.queryStatus());
  }

  queryStatus() {
    const send = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "GET_CACHE_STATUS"
        });
      }
    };
    if (navigator.serviceWorker?.controller) send();
    else if (navigator.serviceWorker?.ready)
      navigator.serviceWorker.ready.then(send).catch(() => {});
  }

  cacheSong(song) {
    if (!song?.downloadPath) return;
    if (
      !("serviceWorker" in navigator) ||
      !navigator.serviceWorker.controller
    ) {
      this.state.showToast("Offline caching unavailable");
      return;
    }
    if (this.isCached(song)) {
      this.state.showToast("Already available offline");
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_SONG",
      url: this.normalizeUrl(song)
    });
    this.state.showToast("Caching song for offline…");
  }

  removeSong(song) {
    if (!song?.downloadPath) return;
    const abs = this.normalizeUrl(song);
    this.cachedUrls.delete(abs);
    this.cachedUrls.delete(song.downloadPath);
    this._deleteFromCacheDb(abs);
    this._deleteFromCacheDb(song.downloadPath);
    this.badgeRows();
    this.state.showToast("Offline copy removed");
  }

  _deleteFromCacheDb(url) {
    try {
      const request = indexedDB.open("mybeats-cache", 1);
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains("songs")) {
            db.close();
            return;
          }
          const tx = db.transaction("songs", "readwrite");
          tx.objectStore("songs").delete(url);
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        } catch (e) {}
      };
    } catch (e) {}
  }

  badgeRows() {
    document.querySelectorAll("[data-song-id]").forEach((row) => {
      const song = this.state.getSongById(row.dataset.songId);
      if (!song) return;
      const has = this.isCached(song);
      const existing = row.querySelector(".offline-badge");
      if (has && !existing) {
        const badge = document.createElement("span");
        badge.className = "offline-badge";
        badge.title = "Available offline";
        badge.innerHTML = Icons.general.checkBadge(12);
        const host = row.querySelector(".time") || row;
        host.appendChild(badge);
      } else if (!has && existing) {
        existing.remove();
      }
    });
  }
}

// ---------------------------------------------------------------------
// SearchManager
// ---------------------------------------------------------------------
export class SearchManager {
  constructor(ui) {
    this.ui = ui;
    this.activeIndex = -1;   // keyboard-highlighted result
    this._kbBound = false;   // arrow/enter keys bound to #search-input
    this._lastQueue = null;  // songs shown in the current results (play queue)
  }

  // -------------------------------------------------------------------
  // Open / close
  // -------------------------------------------------------------------
  openSearch() {
    this.ui.state.isSearchOpen = true;
    this.ui.state.searchQuery = "";
    document
      .querySelector(".breadcrumb-wrapper")
      ?.classList.add("search-active");
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.classList.remove("hidden");
      searchBar.style.opacity = "0";
      requestAnimationFrame(() => {
        searchBar.style.opacity = "1";
      });
      if (window.innerWidth > 768)
        setTimeout(() => document.getElementById("search-input")?.focus(), 150);
    }
    this._resetResults();
    this._bindKeyboard();
  }

  closeSearch() {
    this.ui.state.isSearchOpen = false;
    this.ui.state.searchQuery = "";
    document
      .querySelector(".breadcrumb-wrapper")
      ?.classList.remove("search-active");
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.style.opacity = "0";
      setTimeout(() => {
        searchBar.classList.add("hidden");
        searchBar.style.opacity = "";
      }, 300);
    }
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    this._resetResults();
  }

  // The results live in #search-results-container inside the overlay panel
  // (index.html). Reuse it — never remove it — so the overlay shell stays intact.
  _resultsEl() {
    let el = document.getElementById("search-results-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-results-container";
      const host =
        document.querySelector("#search-bar .panel") ||
        document.getElementById("search-bar");
      host?.appendChild(el);
    }
    return el;
  }

  _resetResults() {
    const el = document.getElementById("search-results-container");
    if (el) {
      el.className = "results hidden";
      el.innerHTML = "";
    }
    this.activeIndex = -1;
    this._lastQueue = null;
  }

  // -------------------------------------------------------------------
  // Render — instant, no artificial spinner delay
  // -------------------------------------------------------------------
  updateDropdown() {
    if (!this.ui.state.isSearchOpen) return;
    const q = (this.ui.state.searchQuery || "").trim();
    const el = this._resultsEl();
    if (!el) return;
    if (!q) {
      this._resetResults();
      return;
    }
    el.className = "srResults";
    el.innerHTML = this.renderDropdown();
    this.activeIndex = -1;
    this.attachResultEvents(el);
  }

  // -------------------------------------------------------------------
  // Matching: exact > prefix > substring, weighted per entity type
  // -------------------------------------------------------------------
  _collect(q) {
    const state = this.ui.state;
    const lower = q.toLowerCase();
    const score = (text) => {
      const t = (text || "").toLowerCase();
      if (!t || !lower) return 0;
      if (t === lower) return 3;
      if (t.startsWith(lower)) return 2;
      return t.includes(lower) ? 1 : 0;
    };

    const songHits = state
      .getAllSongs()
      .map((song) => ({
        kind: "song",
        ref: song,
        sc: Math.max(
          score(song.title),
          score(song.artist) * 0.65,
          score(song.album) * 0.65
        )
      }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const artistHits = state.enrichedLibrary
      .map((a) => ({ kind: "artist", ref: a, sc: score(a.artist) * 1.25 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const albumHits = [];
    state.enrichedLibrary.forEach((a) =>
      a.albums.forEach((alb) => {
        const sc = score(alb.album) * 1.15;
        if (sc > 0)
          albumHits.push({
            kind: "album",
            ref: {
              artistId: a.id,
              albumId: alb.id,
              artistName: a.artist,
              albumName: alb.album,
              coverUrl: alb.coverUrl,
              year: alb.year || "",
              songCount: alb.songs ? alb.songs.length : 0
            },
            sc
          });
      })
    );
    albumHits.sort((a, b) => b.sc - a.sc);

    const playlistHits = (state.playlists || [])
      .map((p) => ({ kind: "playlist", ref: p, sc: score(p.name) * 1.1 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    // Single best match across everything becomes the hero ("Top result").
    const top =
      [
        artistHits[0],
        songHits[0],
        albumHits[0],
        playlistHits[0]
      ]
        .filter(Boolean)
        .sort((a, b) => b.sc - a.sc)[0] || null;

    const without = (list) => list.filter((h) => !top || h.ref !== top.ref);

    return {
      top,
      songs: (top?.kind === "song" ? without(songHits) : songHits).slice(0, 5),
      artists: (top?.kind === "artist" ? without(artistHits) : artistHits).slice(0, 6),
      albums: (top?.kind === "album" ? without(albumHits) : albumHits).slice(0, 6),
      playlists: (top?.kind === "playlist" ? without(playlistHits) : playlistHits).slice(0, 3)
    };
  }

  // -------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------
  _esc(text) {
    return Utils.escapeHtml(text == null ? "" : String(text));
  }

  // Escape, then wrap every match in <mark class="sr-hl">.
  _hl(text, q) {
    const t = this._esc(text);
    const needle = this._esc(q.trim());
    if (!needle) return t;
    const rx = new RegExp(
      "(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
      "ig"
    );
    return t.replace(rx, '<mark class="sr-hl">$1</mark>');
  }

  _hero(top, q) {
    const kindLabel = { song: "Song", artist: "Artist", album: "Album", playlist: "Playlist" };
    let art = "";
    let title = "";
    let sub = "";
    let attrs = "";
    let playBtn = "";

    if (top.kind === "song") {
      const s = top.ref;
      attrs = `data-sr-song="${this._esc(s.id)}"`;
      art = `<img src="${this._esc(s.coverUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(s.title, q);
      sub = `${kindLabel.song} · ${this._hl(s.artist || "", q)}${s.album ? ` · ${this._hl(s.album, q)}` : ""}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-song="${this._esc(s.id)}" aria-label="Play ${this._esc(s.title)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "artist") {
      const a = top.ref;
      const albums = a.albums ? a.albums.length : 0;
      const songs = (a.albums || []).reduce((n, alb) => n + alb.songs.length, 0);
      attrs = `data-sr-artist="${this._esc(a.id)}"`;
      art = `<img src="${this._esc(a.imageUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(a.artist, q);
      sub = `${kindLabel.artist}${a.genre ? ` · ${this._hl(a.genre, q)}` : ""} · ${albums} album${albums === 1 ? "" : "s"} · ${songs} song${songs === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-artist="${this._esc(a.id)}" aria-label="Play ${this._esc(a.artist)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "album") {
      const al = top.ref;
      attrs = `data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}"`;
      art = `<img src="${this._esc(al.coverUrl || "")}" alt="" loading="lazy">`;
      title = this._hl(al.albumName, q);
      sub = `${kindLabel.album}${al.year ? ` · ${this._esc(al.year)}` : ""} · ${this._hl(al.artistName, q)} · ${al.songCount} song${al.songCount === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.albumName)}">${Icons.player.play(16)}</button>`;
    } else {
      const p = top.ref;
      attrs = `data-sr-playlist="${this._esc(p.id)}"`;
      art = `<span class="srHeroArtFallback">${Icons.general.playlist(30)}</span>`;
      title = this._hl(p.name, q);
      sub = `${kindLabel.playlist} · ${p.songs.length} song${p.songs.length === 1 ? "" : "s"}`;
    }

    return `
      <div class="srHero" data-sr-item ${attrs} role="button" tabindex="-1">
        <span class="srHeroArt${top.kind === "artist" ? " round" : ""}">
          ${art}
          ${playBtn}
        </span>
        <span class="srHeroBody">
          <span class="srHeroBadge">${Icons.general.sparkles(12)} Top result</span>
          <span class="srHeroTitle">${title}</span>
          <span class="srHeroSub">${sub}</span>
        </span>
      </div>
    `;
  }

  _songRow(song, i, q) {
    const isFav = this.ui.favorites.isSongFavorite(song.id);
    return `
      <div class="srRow" data-sr-item data-sr-song="${this._esc(song.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowNum">${i + 1}</span>
        <span class="srRowArt">
          <img src="${this._esc(song.coverUrl || "")}" alt="" loading="lazy">
          <span class="srRowPlay">${Icons.player.play(11)}</span>
        </span>
        <span class="srRowText">
          <span class="srRowTitle">${this._hl(song.title, q)}</span>
          <span class="srRowSub">${this._hl(song.artist || "", q)}${song.album ? ` · ${this._hl(song.album, q)}` : ""}</span>
        </span>
        <button type="button" class="srIconBtn heart${isFav ? " favorited is-favorite" : ""}" data-fav-song="${this._esc(song.id)}" aria-label="Favorite ${this._esc(song.title)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
        <button type="button" class="srIconBtn" data-more-song="${this._esc(song.id)}" aria-label="More options">${Icons.general.moreVert(15)}</button>
        <span class="srRowTime">${this._esc(song.duration || "")}</span>
      </div>
    `;
  }

  _albumCard(al, i, q) {
    return `
      <div class="srCard" data-sr-item data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt">
          <img src="${this._esc(al.coverUrl || "")}" alt="" loading="lazy">
          <button type="button" class="srCardPlay" data-sr-play data-sr-album="${this._esc(al.albumId)}" data-artist-id="${this._esc(al.artistId)}" aria-label="Play ${this._esc(al.albumName)}">${Icons.player.play(13)}</button>
        </span>
        <span class="srCardTitle">${this._hl(al.albumName, q)}</span>
        <span class="srCardSub">${al.year ? `${this._esc(al.year)} · ` : ""}${this._hl(al.artistName, q)}</span>
      </div>
    `;
  }

  _artistCard(a, i, q) {
    const albums = a.albums ? a.albums.length : 0;
    return `
      <div class="srCard srCardArtist" data-sr-item data-sr-artist="${this._esc(a.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srCardArt round">
          <img src="${this._esc(a.imageUrl || "")}" alt="" loading="lazy">
        </span>
        <span class="srCardTitle">${this._hl(a.artist, q)}</span>
        <span class="srCardSub">Artist · ${albums} album${albums === 1 ? "" : "s"}</span>
      </div>
    `;
  }

  _playlistRow(p, i, q) {
    return `
      <div class="srRow" data-sr-item data-sr-playlist="${this._esc(p.id)}" role="button" tabindex="-1" style="--sr-i:${i}">
        <span class="srRowArt srRowArtPl">${Icons.general.playlist(20)}</span>
        <span class="srRowText">
          <span class="srRowTitle">${this._hl(p.name, q)}</span>
          <span class="srRowSub">Playlist · ${p.songs.length} song${p.songs.length === 1 ? "" : "s"}</span>
        </span>
        <span class="srRowGo">${Icons.general.arrowRight(15)}</span>
      </div>
    `;
  }

  renderDropdown() {
    const q = (this.ui.state.searchQuery || "").trim();
    if (!q) return "";

    const { top, songs, artists, albums, playlists } = this._collect(q);
    this._lastQueue = songs.map((s) => s.ref);

    if (!top && !songs.length && !artists.length && !albums.length && !playlists.length) {
      return `
        <div class="srEmpty">
          <span class="srEmptyIcon">${Icons.general.search(26)}</span>
          <p class="srEmptyTitle">No results for &ldquo;${this._esc(q)}&rdquo;</p>
          <p class="srEmptySub">Check the spelling, or try a different song, artist, album or playlist.</p>
        </div>
      `;
    }

    const section = (label, inner) => `
      <section class="srSection">
        <h4 class="srLabel">${label}</h4>
        ${inner}
      </section>
    `;

    let html = "";
    if (top) html += this._hero(top, q);
    if (songs.length)
      html += section(
        "Songs",
        `<div class="srRows">${songs.map((h, i) => this._songRow(h.ref, i, q)).join("")}</div>`
      );
    if (albums.length)
      html += section(
        "Albums",
        `<div class="srCards">${albums.map((h, i) => this._albumCard(h.ref, i, q)).join("")}</div>`
      );
    if (artists.length)
      html += section(
        "Artists",
        `<div class="srCards">${artists.map((h, i) => this._artistCard(h.ref, i, q)).join("")}</div>`
      );
    if (playlists.length)
      html += section(
        "Playlists",
        `<div class="srRows">${playlists.map((h, i) => this._playlistRow(h.ref, i, q)).join("")}</div>`
      );

    html += `
      <div class="srFoot">
        <span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>
        <span><kbd>&#8629;</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    `;
    return html;
  }

  // -------------------------------------------------------------------
  // Activation (click or Enter)
  // -------------------------------------------------------------------
  _activate(el, forcePlay = false) {
    if (!el) return;
    const d = el.dataset;
    const ui = this.ui;

    if (d.srSong) {
      const song = ui.state.getSongById(d.srSong);
      if (song)
        ui.audioPlayer.playSong(
          song,
          this._lastQueue && this._lastQueue.length ? this._lastQueue : null,
          true,
          "search"
        );
      this.closeSearch();
      return;
    }
    if (d.srAlbum) {
      if (forcePlay) {
        const queue = Utils.buildAlbumQueue(ui.state, d.artistId, d.srAlbum);
        if (queue.length) ui.audioPlayer.playSong(queue[0], queue, true, "album");
      } else {
        ui.navigate("artist", d.artistId, d.srAlbum);
      }
      this.closeSearch();
      return;
    }
    if (d.srArtist) {
      if (forcePlay && ui.libraryPage?.playArtist) {
        ui.libraryPage.playArtist(d.srArtist);
      } else {
        ui.navigate("artist", d.srArtist);
      }
      this.closeSearch();
      return;
    }
    if (d.srPlaylist) {
      const pl = (ui.state.playlists || []).find(
        (p) => String(p.id) === String(d.srPlaylist)
      );
      if (pl) {
        ui.state.selectedPlaylistName = pl.name;
        ui.state.selectedPlaylistId = pl.id;
      }
      ui.navigate("playlists");
      this.closeSearch();
    }
  }

  // -------------------------------------------------------------------
  // Events — one delegated listener on the container (survives re-renders),
  // hearts re-bound per render for the full hover/confirm behavior.
  // -------------------------------------------------------------------
  attachResultEvents(container) {
    if (!container) return;

    if (!container._srDelegated) {
      container._srDelegated = true;
      container.addEventListener("click", (e) => {
        // "..." → the standard song dropdown menu (stays open over results)
        const more = e.target.closest("[data-more-song]");
        if (more) {
          e.stopPropagation();
          this.ui.contentEvents.showSongMenu(more.dataset.moreSong, e);
          return;
        }
        // explicit play buttons on artwork (hero / album cards)
        const play = e.target.closest("[data-sr-play]");
        if (play) {
          e.stopPropagation();
          this._activate(play, true);
          return;
        }
        // any result row/card
        const item = e.target.closest("[data-sr-item]");
        if (item) {
          if (e.target.closest("[data-fav-song]")) return; // hearts handle themselves
          this._activate(item, false);
        }
      });
    }

    container
      .querySelectorAll("[data-fav-song]")
      .forEach((btn) =>
        this.ui.contentEvents.setupHeartButton(btn, "song", btn.dataset.favSong)
      );
  }

  // -------------------------------------------------------------------
  // Keyboard: ↑/↓ moves the highlight, ↵ opens the highlighted result
  // -------------------------------------------------------------------
  _bindKeyboard() {
    if (this._kbBound) return;
    const input = document.getElementById("search-input");
    if (!input) return;
    this._kbBound = true;

    input.addEventListener("keydown", (e) => {
      if (!this.ui.state.isSearchOpen) return;
      const items = [
        ...document.querySelectorAll("#search-results-container [data-sr-item]")
      ];

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        this.activeIndex =
          e.key === "ArrowDown"
            ? (this.activeIndex + 1) % items.length
            : (this.activeIndex - 1 + items.length) % items.length;
        items.forEach((el, i) =>
          el.classList.toggle("sr-active", i === this.activeIndex)
        );
        items[this.activeIndex].scrollIntoView?.({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (!items.length) return;
        e.preventDefault();
        this._activate(items[this.activeIndex] || items[0], false);
      }
    });
  }
  // Legacy no-ops kept for backward compatibility with older callers.
  attachCategoryCollapse() {}
  attachSearchDropdownEvents() {}
}

// ---------------------------------------------------------------------
// UIManager (main orchestrator)
// ---------------------------------------------------------------------
export class UIManager {
  constructor(state, audioPlayer, favorites) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.favorites = favorites;
    this.isTransitioning = false;
    this.isBreadcrumbHidden = false;
    this.state.favoritesTab = 'songs';
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;
    this.skipProgress = false;
    this.fragmentLoadDelay = 1500;
    this.popoverDelay = 400;
    this._spinner = null;
    this._favTabLoading = false;
    this._artistTabLoading = false;

    this.router = new Router(this);
    this.player = new PlayerManager(this);
    this.search = new SearchManager(this);
    this.contentEvents = new ContentEventManager(this);

    this.homePage      = new Home(this);
    this.libraryPage   = new Library(this);
    this.favoritesPage = new Favorites(this);
    this.playlistsPage = new Playlists(this);
    this.editPlaylistPage = new EditPlaylist(this);
    this.artistPage    = new Artists(this);
    this.errorPage     = new Error404(this);

    this.init();
    window.NProgress?.configure({ showSpinner: true, speed: 300, trickleSpeed: 600 });
  }

  _ensureSpinner() {
    const main = document.getElementById('main-content');
    if (!main) return null;
    if (!this._spinner || !this._spinner.el || !main.contains(this._spinner.el)) {
      this._spinner?.remove?.();
      this._spinner = new Spinner({ type: 'area', container: main });
    }
    return this._spinner;
  }

  showSpinner() {
    this._ensureSpinner()?.show();
  }

  hideSpinner() {
    this._spinner?.hide();
  }

  init() {
    this.render = this.render.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    AppListeners.bindAll(this);
    this.router.syncWithURL();
    window.addEventListener('popstate', this.handlePopState);
  }

  navigate(page, artistId = null, albumId = null) {
    if (!this.skipProgress && window.NProgress) NProgress.start();
    this.skipProgress = false;
    this.router.goToPage(page, artistId, albumId);
  }

  handlePopState() { this.router.handlePopState(); }

  render() {
    this.main = document.getElementById('main-content');
    this.scrollToTop();
    if (this.isTransitioning) {
      if (this.transitionStart && (Date.now() - this.transitionStart > 2000)) {
        console.warn('[UIManager] Transition timeout — forcing reset');
        this.isTransitioning = false;
      } else {
        return;
      }
    }
    this.isTransitioning = true;
    this.transitionStart = Date.now();
    Object.assign(this.main.style, {
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      opacity: '0',
      transform: 'translateY(10px)',
    });
    this.routes();
    this.player.renderMiniPlayer();
  }

  routes() {
    const pageMap = {
      home:      () => this.homePage.render(),
      library:   () => this.libraryPage.render(),
      favorites: () => this.favoritesPage.render(),
      playlists: () => this.playlistsPage.render(),
      editPlaylist: () => this.editPlaylistPage.render(),
      artist:    () => this.artistPage.render(),
      '404':     () => this.errorPage.render(),
    };
    setTimeout(() => {
      try {
        this.main.innerHTML = (pageMap[this.state.currentPage] ?? (() => '<div>Not found</div>'))();
        this._ensureSpinner();
        Object.assign(this.main.style, { opacity: '1', transform: 'translateY(0)' });
        setTimeout(() => { this.main.style.transition = ''; this.isTransitioning = false; }, 300);
        this.contentEvents.attachContentEvents();
        if (window.NProgress && NProgress.status !== null) NProgress.done();
        this._maybeAutoPlayDeepLink();
      } catch (err) {
        console.error('[UIManager] Page render error:', err);
        this.isTransitioning = false;
        if (window.NProgress && NProgress.status !== null) NProgress.done();
      }
    }, 300);
  }

  scrollSection(title, cards) {
    return `<section data-area="scroll" class="section container"><h2 class="section-header">${title}</h2><div class="scroll-row">${cards.join('')}</div></section>`;
  }

  albumCard(artistId, artistName, albumId, albumName, coverUrl, index = 0, size = '170px') {
    const album = this.state.getAlbumById(albumId);
    const isFav = albumId && this.favorites.isAlbumFavorite(albumId);
    const songCount = album?.songs?.length || 0;

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 50}ms"
     data-artist-id="${artistId}" data-album-id="${albumId}">
  <div class="imgBx">
    <img src="${coverUrl}" alt="${Utils.escapeHtml(albumName)}" loading="lazy">
  </div>

  <div class="content">
    <div class="contentBx">
      <h3>
        ${albumName}
        <br>
        <span>${artistName} • ${songCount} song${songCount === 1 ? '' : 's'}</span>
      </h3>
    </div>

    <ul class="sci">
      <li style="--i:1">
        <a href="#" data-hover-action="play-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Play">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path
    opacity=".4"
    fill="currentColor"
    d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm128-88c0-8.7 4.7-16.7 12.3-20.9s16.8-4.1 24.3 .5l144 88c7.1 4.4 11.5 12.1 11.5 20.5s-4.4 16.1-11.5 20.5l-144 88c-7.4 4.5-16.7 4.7-24.3 .5S176 352.7 176 344l0-176z"
  />
  <path
    fill="currentColor"
    d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"
  />
</svg>
        </a>
      </li>

      <li style="--i:2">
        <a href="#" data-hover-action="shuffle-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Shuffle">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path opacity=".4" fill="currentColor" d="" />
  <path
    fill="currentColor"
    d="M425 31l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-15.1 0-29.3 7.1-38.4 19.2l-33.6 44.8-30-40 25.2-33.6C297.3 118.2 325.8 104 356 104l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0zM194 336l-25.2 33.6C150.7 393.8 122.2 408 92 408l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c15.1 0 29.3-7.1 38.4-19.2L164 296 194 336zm197-49c9.4-9.4 24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-30.2 0-58.7-14.2-76.8-38.4L130.4 171.2C121.3 159.1 107.1 152 92 152l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c30.2 0 58.7 14.2 76.8 38.4L317.6 340.8c9.1 12.1 23.3 19.2 38.4 19.2l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9z"
  />
</svg>
        </a>
      </li>
      <li style="--i:3">
        <a href="#" class="${isFav ? 'favorited' : ''}" data-hover-action="favorite-album" data-album-id="${albumId}" title="Favorite">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path
    opacity=".4"
    fill="currentColor"
    d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm96-21.3c0-32.4 26.3-58.7 58.7-58.7 18.5 0 35.9 8.7 46.9 23.5l6.4 8.5 6.4-8.5c11.1-14.8 28.5-23.5 46.9-23.5 32.4 0 58.7 26.3 58.7 58.7l0 5.3c0 49.1-65.8 98.1-96.5 118.3-9.5 6.2-21.5 6.2-30.9 0-30.7-20.2-96.5-69.3-96.5-118.3l0-5.3z"
  />
  <path
    fill="currentColor"
    d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-6.4-312.5c-11.1-14.8-28.5-23.5-46.9-23.5-32.4 0-58.7 26.3-58.7 58.7l0 5.3c0 49.1 65.8 98.1 96.5 118.3 9.5 6.2 21.5 6.2 30.9 0 30.7-20.2 96.5-69.3 96.5-118.3l0-5.3c0-32.4-26.3-58.7-58.7-58.7-18.5 0-35.9 8.7-46.9 23.5l-6.4 8.5-6.4-8.5z"
  />
</svg>
        </a>
      </li>

      <li style="--i:4">
        <a href="#" data-hover-action="album-playlist" data-artist-id="${artistId}" data-album-id="${albumId}" title="Add to playlist">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
  <path
    opacity=".4"
    fill="currentColor"
    d="M64 240l261.8 0c-14.7 9.8-28 21.5-39.4 34.9-9.7-1.9-19.9-2.9-30.4-2.9-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5 1.8 11.2 4.7 22.1 8.4 32.5L96 464 64 240z"
  />
  <path
    fill="currentColor"
    d="M152 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l208 0c13.3 0 24-10.7 24-24S373.3 0 360 0L152 0zM104 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l304 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L104 96zM484.3 208.6C475.1 198 461.9 192 448 192L64 192c-13.9 0-27.1 6-36.3 16.6S14.5 233 16.5 246.8l32 224C51.9 494.4 72.1 512 96 512l180 0c-10.5-14.6-19-30.7-25.1-48L96 464 64 240 325.8 240c30.4-20.2 66.9-32 106.2-32 20.3 0 39.8 3.1 58.1 8.9-1.6-3-3.6-5.8-5.8-8.4zM256 272c-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5-1.7-10.2-2.6-20.7-2.6-31.5 0-9.5 .7-18.8 2-27.8-10.7-3.6-18-11.3-18-20.2 0-11.7 12.9-21.4 29.3-22.3 7.9-20.2 19.2-38.7 33.1-54.8-9.7-1.9-19.9-2.9-30.4-2.9zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm16-208l0 48 48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48-48 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16-7.2 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16z"
  />
</svg>
        </a>
      </li>
    </ul>
  </div>
</div>
    `;
  }

  artistCard(artist, index = 0) {
    const isFav = this.favorites.isArtistFavorite(artist.id);
    const albumCount = artist.albums?.length || 0;

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 60}ms" data-artist-id="${artist.id}">
  <div class="imgBx">
    <img src="${artist.imageUrl}" alt="${Utils.escapeHtml(artist.artist)}" loading="lazy">
  </div>

  <div class="content">
    <div class="contentBx">
      <h3>
        ${artist.artist}
        <br>
        <span>${artist.genre || 'Artist'} • ${albumCount} album${albumCount === 1 ? '' : 's'}</span>
      </h3>
    </div>

    <ul class="sci">
      <li style="--i:1">
        <a href="#" data-hover-action="view-artist" data-artist-id="${artist.id}" title="View">
          ${Icons.general.eye(16)}
        </a>
      </li>
      <li style="--i:2">
        <a href="#" data-hover-action="play-artist" data-artist-id="${artist.id}" title="Play top">
          ${Icons.player.play(16)}
        </a>
      </li>
      <li style="--i:3">
        <a href="#" class="${isFav ? 'favorited' : ''}" data-hover-action="favorite-artist" data-artist-id="${artist.id}" title="Favorite">
          ${Icons.general.heart(16, isFav)}
        </a>
      </li>
    </ul>
  </div>
</div>
    `;
  }

  recentCard(song, index = 0) {
    return `
      <div data-card="album" class="card animate-fadeInUp" style="--w: 140px; --d: ${index * 50}ms">
        <div class="art-wrap" data-song-id="${song.id}" data-play-source="home">
          <img src="${song.coverUrl}" alt="${Utils.escapeHtml(song.title)}" loading="lazy">
          <div class="art-overlay">
            <span class="play-glyph">${Icons.player.play(16)}</span>
          </div>
        </div>
        <div class="card-info">
          <p class="primary">${song.title}</p>
          <p class="secondary">${song.artist}</p>
        </div>
      </div>
    `;
  }

  songRow(song, index, showDuration = true) {
    const artistId = song.artistId;
    const albumId  = song.albumId;
    return `
      <div class="song-row animate-fadeInUp" style="--d: ${index * 25}ms">
        <button class="main" data-song-id="${song.id}">
          <img src="${song.coverUrl}" class="cover">
          <div class="info">
            <p class="title">${song.title}</p>
            <p class="sub">
              ${this.artistNameTooltip(artistId)}
              •
              <span class="album-link" data-artist-id="${artistId}" data-album-id="${albumId}" onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}', '${albumId}')">${song.album}</span>
            </p>
          </div>
        </button>
        <button class="downloadBtn" data-action="download-song" data-song-id="${song.id}" data-song-title="${song.title}" data-song-thumbnail="${song.coverUrl}" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        ${showDuration ? `<span class="time">${song.duration}</span>` : ''}
        <button class="heart ${this.favorites.isSongFavorite(song.id) ? 'favorited' : ''}" data-fav-song="${song.id}">
          ${this.likeStatus('song', this.favorites.isSongFavorite(song.id), false, null)}
        </button>
      </div>
    `;
  }

  likeStatus(type, isFavorite, isHovered, tempState) {
    if (isHovered)          return isFavorite ? Icons.hearts.likedRemove() : Icons.hearts.likedHover();
    if (tempState === 'check')       return Icons.hearts.likedConfirmation();
    if (tempState === 'exclamation') return Icons.hearts.likedError();
    return isFavorite ? Icons.hearts.liked() : Icons.hearts.notLiked();
  }

  artistNameTooltip(artistId, displayText = null) {
    const artist = this.state.getArtistById(artistId);
    if (!artist) return displayText || 'Unknown';
    const name = artist.artist;
    const text = displayText || name;
    return `
    <div class="tooltip-wrapper" tabindex="0" role="button">
      <span class="text">${text}
        <span
           class="popup"
           role="tooltip"
           onclick="event.stopPropagation(); window.uiManager.navigate('artist', '${artistId}')">
          View Artist
        </span>
      </span>
    </div>
    `;
  }

  editPlaylist(playlistId) {
    this.state.editingPlaylistId = playlistId;
    const pl = this.state.playlists.find(p => String(p.id) === String(playlistId));
    this.state.selectedPlaylistName = pl?.name || null;
    history.pushState(null, '', `/playlist/${playlistId}/edit`);
    this.navigate('editPlaylist');
  }

  _maybeAutoPlayDeepLink() {
    const songId = this.state.pendingDeepLinkSong;
    if (!songId) return;
    this.state.pendingDeepLinkSong = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('song');
    history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    if (this.state.currentPage !== 'artist') return;
    const song = this.state.getSongById(songId);
    if (!song) return;
    const queue = Utils.buildAlbumQueue(this.state, song.artistId, song.albumId);
    const startSong = queue.find(s => Utils.id(s.id) === Utils.id(songId)) || song;
    this.audioPlayer.playSong(startSong, queue.length ? queue : null, true, 'album');
  }

  toggleTheme() {
    Prefs.applyTheme(Prefs.nextToggleTarget());
  }

  showSettingsModal() {
    const popups = window.popups;
    if (!popups) return;

    const currentTheme = Prefs.getTheme();
    const darkThemes  = Prefs.listThemes().filter(t => t.dark);
    const lightThemes = Prefs.listThemes().filter(t => !t.dark);

    const themeCard = ({ key, label, preview }) => `
      <button type="button" class="popups-theme-card ${key === currentTheme ? 'active' : ''}"
              data-theme-option="${key}" role="radio" aria-checked="${key === currentTheme}"
              aria-label="${label} theme">
        <span class="popups-theme-preview"
              style="--preview-bg:${preview.bg};--preview-card:${preview.card};--preview-text:${preview.text};--preview-accent:${preview.accent};">
          <span class="popups-theme-preview-bar"></span>
          <span class="popups-theme-preview-body">
            <span class="popups-theme-preview-chip"></span>
            <span class="popups-theme-preview-line"></span>
          </span>
          <span class="popups-theme-check">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </span>
        <span class="popups-theme-name">${label}</span>
      </button>
    `;

    const content = document.createElement('div');
    content.className = 'popups-settings';

    content.innerHTML = `
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Dark</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Dark color schemes">
          ${darkThemes.map(themeCard).join('')}
        </div>
      </section>

      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Light</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Light color schemes">
          ${lightThemes.map(themeCard).join('')}
        </div>
      </section>

      <section class="popups-settings-section">
        <p class="popups-settings-label">Playback</p>
        <label class="popups-toggle">
          <input type="checkbox" id="pref-fade" ${Prefs.get('fadeTransitions') ? 'checked' : ''}>
          <span>Fade transitions between tracks</span>
        </label>
        <label class="popups-toggle">
          <input type="checkbox" id="pref-radio" ${Prefs.get('radioAutoplay') ? 'checked' : ''}>
          <span>Radio autoplay when queue ends</span>
        </label>
      </section>
    `;

    popups.modal({
      title: 'Settings',
      size: 'md',
      content,
      closable: true,
      autoClose: false,
      onClose: () => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      }
    });

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    const setActiveCard = (activeEl) => {
      content.querySelectorAll('.popups-theme-card').forEach(el => {
        const on = el === activeEl;
        el.classList.toggle('active', on);
        el.setAttribute('aria-checked', String(on));
      });
    };

    content.querySelectorAll('.popups-theme-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.themeOption;
        if (!next || !Prefs.isValidTheme(next)) return;
        Prefs.applyTheme(next);
        setActiveCard(btn);
        popups.toast({ message: `Theme: ${Prefs.THEMES[next].label}` });
      });
    });

    content.querySelector('#pref-fade')?.addEventListener('change', (e) => {
      Prefs.set('fadeTransitions', e.target.checked);
      popups.toast({ message: e.target.checked ? 'Fade transitions on' : 'Fade transitions off' });
    });

    content.querySelector('#pref-radio')?.addEventListener('change', (e) => {
      Prefs.set('radioAutoplay', e.target.checked);
      popups.toast({ message: e.target.checked ? 'Radio autoplay on' : 'Radio autoplay off' });
    });

    setTimeout(() => {
      content.querySelector('.popups-theme-card.active, .popups-theme-card, input, button')?.focus();
    }, 50);
  }

  openSearch() { this.search.openSearch(); }
  closeSearch() { this.search.closeSearch(); }

  showArtistPopover(artistId, event) { this.contentEvents.showArtistPopover(artistId, event); }

  closePlayerDrawer() { this.player.closeDrawer(); }
  openPlayerDrawer() { this.player.openDrawer(); }
  updateMiniPlayer() { this.player.renderMiniPlayer(); }
  updateProgressOnly() { this.player.updateProgressOnly(); }

  updateFullPlayer() {
    const drawer = document.getElementById('full-player-drawer');
    if (drawer) {
      this.player.softUpdateDrawer(drawer);
    } else if (this.state.isDrawerOpen) {
      this.player.renderFullPlayer();
    }
  }

  toggleFavAndReRender(songId) {
    const song = this.state.getSongById(songId);
    if (!song) return;
    this.favorites.toggleFavoriteSong(song);
    const isFav = this.favorites.isSongFavorite(songId);
    document.querySelectorAll(`[data-fav-song="${songId}"]`).forEach(btn => {
      btn.classList.toggle('favorited', isFav);
      btn.innerHTML = this.likeStatus('song', isFav, false, null);
    });
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn && this.state.currentSong && String(this.state.currentSong.id) === String(songId)) {
      likeBtn.classList.toggle('favorited', isFav);
      likeBtn.innerHTML = this.likeStatus('song', isFav, false, null);
    }
    const favMini = document.getElementById('fav-mini');
    if (favMini && this.state.currentSong && String(this.state.currentSong.id) === String(songId)) {
      favMini.classList.toggle('favorited', isFav);
      favMini.innerHTML = this.likeStatus('song', isFav, false, null);
    }
  }

  showShortcutsHelp() {
    const shortcuts = [
      ['Space', 'Play / Pause'],
      ['←', 'Previous track'],
      ['→', 'Next track'],
      ['↑', 'Volume up'],
      ['↓', 'Volume down'],
      ['M', 'Mute'],
      ['L', 'Favorite current song'],
      ['S', 'Shuffle'],
      ['R', 'Cycle repeat mode'],
      ['Q', 'Up Next queue'],
      ['Ctrl/⌘ + K', 'Search'],
      ['?', 'This help'],
      ['Esc', 'Close dialogs']
    ];
    this.state.modalOpen(`
      <div data-modal="shortcuts" class="shortcuts-help">
        <div class="head">
          <h2 class="title">Keyboard Shortcuts</h2>
          <button onclick="window.closeModal()" class="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div data-list="shortcuts" class="grid">
          ${shortcuts.map(([key, description]) => `
            <div class="row">
              <span class="desc">${description}</span>
              <kbd class="kbd">${key}</kbd>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }

  scrollToTop(duration = 500) {
    const startY = window.scrollY;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------
  // refreshArtistContent – fixed to use this.artistPage.createSongRow
  // ------------------------------------------------------------
  refreshArtistContent(artistId, albumId) {
    if (this._artistTabLoading) return;

    // Hard Update
    if (artistId !== this.state.artistId) {
      this.navigate('artist', artistId, albumId);
      return;
    }

    // Soft Update
    this._artistTabLoading = true;
    this.state.selectedAlbumId = albumId;
    this.router.updateTitle();
    this.router.updateBreadcrumbs();

    const artist = this.state.getArtistById(artistId);
    const album  = artist?.albums.find(a => IdUtils.normalize(a.id) === IdUtils.normalize(albumId));
    if (!artist || !album) {
      this._artistTabLoading = false;
      return;
    }

    // Spinners
    const coverContainer = document.querySelector('.hero-card .hero-cover');
    const songsArea      = document.querySelector('[data-list="songs"]');
    const aboutArea      = document.querySelector('[data-page="artist"] > [data-area="about"]');

    const coverSpinner  = coverContainer ? new Spinner({ type: 'area', container: coverContainer }) : null;
    const songsSpinner  = songsArea ? new Spinner({ type: 'area', container: songsArea }) : null;

    coverSpinner?.show();
    songsSpinner?.show();

    songsArea?.classList.add('isLoading');

    // Simultaneously Updating Content
    setTimeout(() => {
      // --- Album CoverArt ---
      if (coverContainer && album.coverUrl) {
        const img = coverContainer.querySelector('img');
        if (img) {
          img.src = album.coverUrl;
        } else {
          coverContainer.style.backgroundImage = `url(${album.coverUrl})`;
        }
      }

      // --- Songslist ---
      if (songsArea) {
        const songsHTML = `
          <div class="header">
            <div class="left">
              <span class="badge">${album.certification || 'Double Platinum'}</span>
              <span class="year">${album.year || '2024'}</span>
            </div>
            <span class="hint">Double-click</span>
          </div>
          <div class="body">
            ${album.songs.map((song, i) => this.artistPage.createSongRow(song, i, artist, album)).join('')}
          </div>
        `;
        songsArea.innerHTML = songsHTML;
        songsArea?.classList.remove('isLoading');
        this.contentEvents.attachContentEvents();
      }

      // --- Album Tabs NAVBar ---
      if (aboutArea && this.artistPage.aboutSection) {
        aboutArea.innerHTML = this.artistPage.aboutSection(artist, album);
        aboutArea.querySelectorAll('.tab').forEach(btn => {
          btn.classList.toggle(
            'active',
            IdUtils.normalize(btn.dataset.albumId) === IdUtils.normalize(albumId)
          );
        });
        this.contentEvents.attachContentEvents();
      }

      coverSpinner?.hide();
      songsSpinner?.hide();

      setTimeout(() => {
        coverSpinner?.remove();
        songsSpinner?.remove();
      }, 400);

      this._artistTabLoading = false;
    }, 1500);
  }

  refreshFavoritesContent(tab) {
    if (this._favTabLoading) return;
    const favContainer = document.getElementById('favorites-content');
    if (!favContainer) return;
    this._favTabLoading = true;
    const spinner = new Spinner({ type: 'area', container: favContainer });
    spinner.show();
    this.state.favoritesTab = tab;
    history.pushState(null, '', `/favorites/${tab}`);
    this.router.updateBreadcrumbs();
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    setTimeout(() => {
      favContainer.innerHTML = this.favoritesPage.tabContent(tab);
      this.contentEvents.attachContentEvents();
      spinner.hide();
      spinner.remove();
      this._favTabLoading = false;
    }, 600);
  }
}

// ---------------------------------------------------------------------
// Custom Context Menu (replaces native right-click)
// ---------------------------------------------------------------------
export class ContextMenu {
  constructor() {
    this.el = null;
    this.init();
  }

  init() {
    document.addEventListener('click', () => this.hide());
    document.addEventListener('scroll', () => this.hide(), true);
    window.addEventListener('resize', () => this.hide());
  }

  show(x, y, data) {
    this.hide();

    const menu = document.createElement('div');
    menu.id = 'mybeats-context-menu';
    menu.className = 'mb-context-menu';

    let items = '';

    if (data.songId) {
      const song = window.uiManager?.state?.getSongById(data.songId);
      if (song) {
        const isFav = window.uiManager.favorites.isSongFavorite(data.songId);
        items += `
          <button class="mb-ctx-item" data-ctx="play-song" data-id="${data.songId}">
            ${Icons.player.play(16)}
            Play
          </button>
          <button class="mb-ctx-item" data-ctx="fav-song" data-id="${data.songId}">
            ${Icons.general.heart(16, isFav)}
            ${isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
          <button class="mb-ctx-item" data-ctx="add-playlist" data-id="${data.songId}">
            ${Icons.general.playlistAdd(16)}
            Add to Playlist
          </button>
          <div class="mb-ctx-divider"></div>
        `;
      }
    }

    if (data.albumId && data.artistId) {
      items += `
        <button class="mb-ctx-item" data-ctx="play-album" data-artist="${data.artistId}" data-album="${data.albumId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
          Play Album
        </button>
        <button class="mb-ctx-item" data-ctx="shuffle-album" data-artist="${data.artistId}" data-album="${data.albumId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
          Shuffle Album
        </button>
        <button class="mb-ctx-item" data-ctx="view-album" data-artist="${data.artistId}" data-album="${data.albumId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          View Album
        </button>
        <div class="mb-ctx-divider"></div>
      `;
    }

    if (data.artistId && !data.albumId) {
      items += `
        <button class="mb-ctx-item" data-ctx="view-artist" data-artist="${data.artistId}">
          ${Icons.general.artist(16)}
          View Artist
        </button>
        <button class="mb-ctx-item" data-ctx="play-artist" data-artist="${data.artistId}">
          ${Icons.player.play(16)}
          Play Artist
        </button>
        <button class="mb-ctx-item" data-ctx="fav-artist" data-artist="${data.artistId}">
          ${Icons.general.heart(16)}
          Favorite Artist
        </button>
      `;
    }

    if (data.playlistId) {
      items += `
        <button class="mb-ctx-item" data-ctx="play-playlist" data-playlist="${data.playlistId}">
          ${Icons.player.play(16)}
          Play Playlist
        </button>
        <button class="mb-ctx-item" data-ctx="shuffle-playlist" data-playlist="${data.playlistId}">
          ${Icons.player.shuffle(16)}
          Shuffle Playlist
        </button>
        <button class="mb-ctx-item" data-ctx="edit-playlist" data-playlist="${data.playlistId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Playlist
        </button>
      `;
    }

    if (!items) return;

    menu.innerHTML = items;
    document.body.appendChild(menu);
    this.el = menu;

    // Position
    const rect = menu.getBoundingClientRect();
    let posX = x;
    let posY = y;
    if (posX + rect.width > window.innerWidth) posX = window.innerWidth - rect.width - 8;
    if (posY + rect.height > window.innerHeight) posY = window.innerHeight - rect.height - 8;
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    // Actions
    menu.querySelectorAll('.mb-ctx-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.ctx;
        const id = btn.dataset.id;
        const artistId = btn.dataset.artist;
        const albumId = btn.dataset.album;
        const playlistId = btn.dataset.playlist;
        const state = window.uiManager?.state;

        switch (action) {
          case 'play-song': {
            const song = state?.getSongById(id);
            if (song) window.uiManager.audioPlayer.playSong(song, null, true, 'context');
            break;
          }
          case 'fav-song': {
            const song = state?.getSongById(id);
            if (song) window.uiManager.favorites.toggleFavoriteSong(song);
            break;
          }
          case 'add-playlist': {
            const song = state?.getSongById(id);
            if (song) window.favoritesPlaylists?.addToPlaylistModal?.(song);
            break;
          }
          case 'play-album': {
            const queue = Utils.buildAlbumQueue(state, artistId, albumId);
            if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, 'album');
            break;
          }
          case 'shuffle-album': {
            const queue = Utils.buildAlbumQueue(state, artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffled(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, 'album');
            }
            break;
          }
          case 'view-album': {
            window.uiManager.navigate('artist', artistId, albumId);
            break;
          }
          case 'view-artist': {
            window.uiManager.navigate('artist', artistId);
            break;
          }
          case 'play-artist': {
            const artist = state?.getArtistById(artistId);
            if (artist?.albums?.length) {
              const queue = Utils.buildAlbumQueue(state, artistId, artist.albums[0].id);
              if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, 'album');
            }
            break;
          }
          case 'fav-artist': {
            window.favoritesPlaylists?.toggleFavoriteArtist?.(artistId);
            break;
          }
          case 'play-playlist': {
            const queue = state?.buildPlaylistQueue(playlistId);
            if (queue?.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, 'playlist');
            break;
          }
          case 'shuffle-playlist': {
            const queue = state?.buildPlaylistQueue(playlistId);
            if (queue?.length) {
              const shuffled = Utils.shuffled(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, 'playlist');
            }
            break;
          }
          case 'edit-playlist': {
            window.uiManager.editPlaylist(playlistId);
            break;
          }
        }
        this.hide();
      });
    });
  }

  hide() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}
// window.contextMenu = new ContextMenu();

// (Optional) Ensure PlayerManager is available – if not defined elsewhere,
// you may need to include it. Assuming it's global.
