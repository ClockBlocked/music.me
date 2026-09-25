/**
*
*
*
**/
class AppRouter {
  constructor(ui) {
    this.ui = ui;
    this.state = ui.state;
    this.audioPlayer = ui.audioPlayer;
    this.favorites = ui.favorites;
  }


  generateUrl = {
    home: () => "/home/",

    library: () => {
      const library = this.ui.libraryPage;
      if (!library) return "/library/";
      const view = library.view || "overview";
      const sort = library.sort || "recent";
      const filter = library.filter || { type: "all", value: null, label: "" };
      if (sort === "mostPlayed" && view === "albums") return "/library/top/albums/";
      if (sort === "mostPlayed" && view === "artists") return "/library/top/artists/";
      if (sort === "mostPlayed") return "/library/mostplayed/";
      if (view === "artists" && filter.type === "all" && filter.value === null) {
        return "/library/artists/all/";
      }
      if (view && view !== "overview") return "/library/" + view + "/";
      return "/library/";
    },

    favorites: () => {
      const tab = this.state.favoritesTab || "songs";
      return "/favorites/" + tab + "/";
    },

    playlists: () => "/playlists/",

    playlist: () => {
      return this.state.selectedPlaylistId
        ? "/playlist/" + this.state.selectedPlaylistId + "/"
        : "/playlists/";
    },

    editPlaylist: () => {
      return this.state.editingPlaylistId
        ? "/playlist/" + this.state.editingPlaylistId + "/edit/"
        : "/playlists/";
    },

    artist: (artistId, albumId) => {
      if (!artistId) return "/home/";
      if (albumId) return "/artist/" + artistId + "/album/" + albumId + "/";
      return "/artist/" + artistId + "/";
    },

    siteMap: (page, artistId, albumId) => {
      switch (page) {
        case "home":         return this.generateUrl.home();
        case "library":      return this.generateUrl.library();
        case "favorites":    return this.generateUrl.favorites();
        case "playlists":    return this.generateUrl.playlist();
        case "editPlaylist": return this.generateUrl.editPlaylist();
        case "artist":       return this.generateUrl.artist(artistId, albumId);
        default:             return "/home/";
      }
    },
  };

  // ----------------------------------------------
  // URL helpers
  // ----------------------------------------------
  normalizePath(path) {
    if (!path) return "/";
    const stripped = path.replace(/\/+$/, "");
    return stripped === "" ? "/" : stripped;
  }

  setUrl(page, artistId, albumId) {
    const url = this.generateUrl.siteMap(page, artistId, albumId);
    const current = this.normalizePath(window.location.pathname);
    const target = this.normalizePath(url);
    const currentSearch = window.location.search || "";
    if (current === target && !currentSearch) return;
    history.pushState({ page, artistId, albumId }, "", url);
  }

  goTo(page, artistId = null, albumId = null) {
    if (this.state.isDrawerOpen) this.ui.closePlayerDrawer();

    let artist = null;
    if (artistId) {
      artist = this.state.getArtistById(artistId);
      if (!artist) {
        artist = this.state.enrichedLibrary.find((a) => a.artist === artistId);
        if (artist) artistId = artist.id;
      }
    }

    const tab = this.state.favoritesTab || "songs";
    const album = albumId ? this.state.getAlbumById(albumId) : null;

    const titleMap = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName
        ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      editPlaylist: this.state.selectedPlaylistName
        ? `MyBeats — Edit: ${this.state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : "MyBeats",
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
    this.setUrl(page, artistId, albumId);
    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.ui.render();
  }

  // ----------------------------------------------
  // Route parsing
  // ----------------------------------------------
  parseLibraryRoute(parts) {
    const library = this.ui.libraryPage;
    if (!library) return;

    library.view = "overview";
    library.filter = { type: "all", value: null, label: "" };
    library.sort = "recent";
    library.mode = "grid";
    library.query = "";

    if (!parts.length) return;

    const a = parts[0];
    const b = parts[1];
    const views = ["overview", "songs", "albums", "artists", "playlists", "genres"];

    if (a === "top" && b && views.includes(b)) {
      library.view = b;
      library.sort = "mostPlayed";
      return;
    }
    if (a === "mostplayed") {
      library.view = "songs";
      library.sort = "mostPlayed";
      return;
    }
    if (a === "artists" && b === "all") {
      library.view = "artists";
      library.filter = { type: "all", value: null, label: "" };
      return;
    }
    if (a === "artists" && b) {
      library.view = "artists";
      library.filter = { type: "artist", value: b, label: b };
      return;
    }
    if (a === "genres" && b) {
      library.view = "genres";
      library.filter = { type: "genre", value: b, label: b };
      return;
    }
    if (a === "year" && b) {
      library.view = "albums";
      library.filter = { type: "year", value: b, label: b };
      return;
    }
    if (a === "decade" && b) {
      library.view = "albums";
      library.filter = { type: "decade", value: b, label: b + "s" };
      return;
    }
    if (views.includes(a)) {
      library.view = a;
      return;
    }
  }

  parseDiscoverRoute(parts) {
    const library = this.ui.libraryPage;
    if (!library) return;

    library.view = "overview";
    library.filter = { type: "all", value: null, label: "" };
    library.sort = "recent";
    library.mode = "grid";
    library.query = "";

    if (!parts.length) return;

    const a = parts[0];
    if (a === "artists") { library.view = "artists"; return; }
    if (a === "albums")  { library.view = "albums";  return; }
    if (a === "songs")   { library.view = "songs";   return; }
    if (a === "genres")  { library.view = "genres";  return; }
  }

  syncWithUrl() {
    const parts = window.location.pathname.split("/").filter((p) => p);
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkSong = searchParams.get("song");

    this.state.pendingDeepLinkSong = null;
    this.state.editingPlaylistId = null;

    if (!parts.length || parts[0] === "home") {
      this.state.currentPage = "home";
      this.state.artistId = null;
      this.state.artistPageName = null;
      this.state.selectedAlbumId = null;
      this.state.selectedAlbumName = null;
      this.state.selectedPlaylistName = null;
      this.state.selectedPlaylistId = null;
      this.state.isCreatingPlaylist = false;
    } else {
      const page = parts[0];

      if (page === "library") {
        this.state.currentPage = "library";
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.parseLibraryRoute(parts.slice(1));
      } else if (page === "discover") {
        this.state.currentPage = "library";
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.parseDiscoverRoute(parts.slice(1));
      } else if (page === "favorites") {
        this.state.currentPage = "favorites";
        this.state.favoritesTab = parts[1] || "songs";
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === "playlist" && parts[1]) {
        const playlistId = parts[1];
        const normalizedId = IdUtils.norm(playlistId);
        const playlist = this.state.playlists.find((p) => IdUtils.norm(p.id) === normalizedId);

        if (parts[2] === "edit" && playlist) {
          this.state.currentPage = "editPlaylist";
          this.state.editingPlaylistId = playlistId;
          this.state.selectedPlaylistName = playlist.name;
          this.state.selectedPlaylistId = playlistId;
        } else if (parts[2] === "edit") {
          this.state.currentPage = "404";
        } else {
          this.state.currentPage = "playlists";
          this.state.selectedPlaylistName = playlist?.name || null;
          this.state.selectedPlaylistId = playlist ? playlistId : null;
        }

        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
        this.state.isCreatingPlaylist = false;
      } else if (page === "playlists") {
        this.state.currentPage = "playlists";
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
        this.state.artistId = null;
        this.state.artistPageName = null;
        this.state.selectedAlbumId = null;
        this.state.selectedAlbumName = null;
      } else if (page === "artist" && parts[1]) {
        const artistId = parts[1];
        const artist = this.state.getArtistById(artistId);

        if (artist) {
          this.state.currentPage = "artist";
          this.state.artistId = artistId;
          this.state.artistPageName = artist.artist;

          if (parts[2] === "album" && parts[3]) {
            const albumId = parts[3];
            const album = artist.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
            this.state.selectedAlbumId = album ? albumId : null;
            this.state.selectedAlbumName = album?.album || null;
          } else {
            this.state.selectedAlbumId = null;
            this.state.selectedAlbumName = null;
          }

          if (deepLinkSong) this.state.pendingDeepLinkSong = deepLinkSong;
        } else {
          this.state.currentPage = "404";
        }

        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      } else {
        this.state.currentPage = "404";
        this.state.selectedPlaylistName = null;
        this.state.selectedPlaylistId = null;
        this.state.isCreatingPlaylist = false;
      }
    }

    this.updateActiveNav();
    this.updateBreadcrumbs();
    this.updateTitle();
    this.ui.render();
  }

  handlePopState() {
    this.syncWithUrl();
  }

  // ----------------------------------------------
  // Nav / breadcrumbs / title
  // ----------------------------------------------
  updateActiveNav() {
    document.querySelectorAll("nav .link[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === this.state.currentPage);
    });
  }

  updateBreadcrumbs() {
    const container = document.getElementById("breadcrumb-items");
    if (!container) return;

    const crumbs = this.getBreadcrumbs();
    const existingItems = container.querySelectorAll(".item, .sep");

    if (existingItems.length > 0) {
      existingItems.forEach((item) => item.classList.add("removing"));
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

    container.innerHTML = crumbs
      .map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return `
          <span class="item ${isLast ? "active" : ""}" style="--i: ${i};">
            ${crumb}
          </span>
          ${!isLast ? `<span class="sep" style="--i: ${i};">›</span>` : ""}
        `;
      })
      .join("");
  }

  getBreadcrumbs() {
    const crumbs = [];
    const page = this.state.currentPage;
    const library = this.ui.libraryPage;

    if (page === "home") {
      crumbs.push("Home");
    } else if (page === "library") {
      crumbs.push("Library");
      if (library) {
        const view = library.view || "overview";
        const sort = library.sort || "recent";
        const filter = library.filter || { type: "all", value: null, label: "" };

        if (sort === "mostPlayed" && view === "albums") {
          crumbs.push("Top", "Albums");
        } else if (sort === "mostPlayed" && view === "artists") {
          crumbs.push("Top", "Artists");
        } else if (sort === "mostPlayed") {
          crumbs.push("Most Played");
        } else if (view && view !== "overview") {
          const label = view.charAt(0).toUpperCase() + view.slice(1);
          crumbs.push(label);

          if (view === "artists" && filter.type === "all" && filter.value === null) {
            crumbs.push("All");
          } else if (filter.type !== "all" && filter.label) {
            crumbs.push(filter.label);
          }
        }
      }
    } else if (page === "favorites") {
      const tab = this.state.favoritesTab || "songs";
      crumbs.push("Library", "Favorites", tab.charAt(0).toUpperCase() + tab.slice(1));
    } else if (page === "playlists") {
      crumbs.push("Library", "Playlists");
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      if (this.state.isCreatingPlaylist) crumbs.push("Create");
    } else if (page === "editPlaylist") {
      crumbs.push("Library", "Playlists");
      if (this.state.selectedPlaylistName) crumbs.push(this.state.selectedPlaylistName);
      crumbs.push("Edit");
    } else if (page === "artist") {
      crumbs.push("Artists");
      if (this.state.artistPageName) crumbs.push(this.state.artistPageName);
      if (this.state.selectedAlbumName) crumbs.push(this.state.selectedAlbumName);
    }

    return crumbs;
  }

  toggleBreadcrumb() {
    const breadcrumbNav = document.querySelector('[data-navbar="breadcrumbs"]');
    if (!breadcrumbNav) return;

    this.ui.isBreadcrumbHidden = !this.ui.isBreadcrumbHidden;
    if (this.ui.isBreadcrumbHidden) {
      breadcrumbNav.classList.add("hide");
    } else {
      breadcrumbNav.classList.remove("hide");
    }
  }

  updateTitle() {
    const page = this.state.currentPage;
    const tab = this.state.favoritesTab || "songs";
    const artist = this.state.artistId ? this.state.getArtistById(this.state.artistId) : null;
    const album = this.state.selectedAlbumId ? this.state.getAlbumById(this.state.selectedAlbumId) : null;

    const titles = {
      home: "MyBeats — Home",
      library: "MyBeats — Library",
      favorites: `MyBeats — Favorites / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`,
      playlists: this.state.selectedPlaylistName
        ? `MyBeats — Playlist: ${this.state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      editPlaylist: this.state.selectedPlaylistName
        ? `MyBeats — Edit: ${this.state.selectedPlaylistName}`
        : "MyBeats — Playlists",
      artist: artist
        ? album
          ? `MyBeats — ${artist.artist} / ${album.album}`
          : `MyBeats — ${artist.artist}`
        : "MyBeats",
    };

    document.title = titles[page] ?? "MyBeats";
  }
}

// ////////////////////////////////////////////////////////////////////////
// AppListeners — global / static / init bindings collected in one place
// ////////////////////////////////////////////////////////////////////////
class AppListeners {
  static global(ui) {
    return [
      {
        el: document.getElementById("modal-overlay"),
        type: "click",
        handler: () => ui.state.modalClose(),
      },
      {
        el: document,
        type: "contextmenu",
        handler: (e) => {
          e.preventDefault();
          const target = e.target.closest(
            "[data-artist-id], [data-album-id], [data-song-id], [data-playlist-id]"
          );
          if (!target) return;

          const artistId = target.dataset.artistId;
          const albumId = target.dataset.albumId;
          const songId = target.dataset.songId;
          const playlistId = target.dataset.playlistId;

          if (window.contextMenu?.show) {
            window.contextMenu.show(e.clientX, e.clientY, {
              artistId,
              albumId,
              songId,
              playlistId,
            });
          }
        },
      },
      {
        el: window,
        type: "keydown",
        handler: (e) => {
          const tag = e.target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

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
              if (ui.state.currentSong) ui.toggleFavAndReRender(ui.state.currentSong.id);
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
              if (document.querySelector(".modal.active")) ui.state.modalClose();
              break;
          }
        },
      },
    ];
  }

  static static(ui) {
    const navButtons = document.querySelectorAll("nav .link[data-nav]");
    return Array.from(navButtons).map((btn) => ({
      el: btn,
      type: "click",
      handler: () => ui.navigate(btn.dataset.nav),
    }));
  }

  static init(ui) {
    return [
      {
        el: window,
        type: "popstate",
        handler: () => ui.router.handlePopState(),
      },
      {
        el: document.getElementById("breadcrumb-toggle"),
        type: "click",
        handler: () => ui.router.toggleBreadcrumb(),
      },
      {
        el: document.getElementById("open-search"),
        type: "click",
        handler: () => ui.openSearch(),
      },
      {
        el: document.getElementById("close-search"),
        type: "click",
        handler: () => ui.closeSearch(),
      },
      {
        el: document.getElementById("search-overlay"),
        type: "click",
        handler: () => ui.closeSearch(),
      },
      {
        el: document.querySelector('[data-action="settings"]'),
        type: "click",
        handler: () => ui.showSettingsModal(),
      },
      {
        el: document.querySelector('[data-dash="notifications"]'),
        type: "click",
        handler: (e) => window.popups.showNotificationPanel(e.currentTarget),
      },
      {
        setup: (bind) => {
          const input = document.getElementById("search-input");
          if (!input) return;
          let timer;
          const handler = (e) => {
            clearTimeout(timer);
            ui.state.searchQuery = e.target.value;
            timer = setTimeout(() => ui.search.updateDropdown(), 200);
          };
          input.addEventListener("input", handler);
          bind.push({ el: input, type: "input", handler });
        },
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
        },
      },
      {
        immediate: () => {
          Prefs.applyTheme(Prefs.theme(), { persist: false });
        },
      },
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

// ////////////////////////////////////////////////////////////////////////
// ContentEvents — binds behaviour to dynamically rendered content
// ////////////////////////////////////////////////////////////////////////
class ContentEvents {
  constructor(ui) {
    this.ui = ui;
    this.popups = window.popups || new PopupsManager({ ui });
    this.popups.ui = ui;
  }

  esc(text = "") {
    return Utils.esc(text);
  }

  setupHeartButton(btn, type, id) {
    window.heartManager?.bindAll(btn?.parentElement || document);
  }

  attachHeartEvents() {
    window.heartManager?.bindAll(document);
  }

  attachEditPlaylistEvents() {
    const state = this.ui.state;
    const id = state.editingPlaylistId;
    const playlist = state.playlists.find((p) => String(p.id) === String(id));
    if (!playlist) return;

    const nameInput = document.getElementById("edit-pl-name");
    const descInput = document.getElementById("edit-pl-desc");
    const tagWrap = document.getElementById("edit-pl-tags");

    if (nameInput) {
      nameInput.addEventListener("change", () => {
        window.favoritesPlaylists.renamePlaylist(id, nameInput.value);
      });
    }

    if (descInput) {
      descInput.addEventListener("change", () => {
        window.favoritesPlaylists.updateDesc(id, descInput.value);
      });
    }

    if (tagWrap) {
      const input = tagWrap.querySelector(".edit-playlist-tag-input");
      input?.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        const raw = input.value.trim();
        if (!raw) return;

        const vals = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        const tags = playlist.tags || [];

        vals.forEach((value) => {
          if (!tags.includes(value) && tags.length < 8) tags.push(value);
        });

        input.value = "";
        window.favoritesPlaylists.updateTags(id, tags);
        this.ui.render();
      });

      tagWrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".edit-playlist-tag-remove");
        if (!btn) return;
        const tag = btn.dataset.tag;
        const tags = (playlist.tags || []).filter((t) => t !== tag);
        window.favoritesPlaylists.updateTags(id, tags);
        this.ui.render();
      });
    }

    document.querySelectorAll('[data-page="edit-playlist"] [data-action]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "back" || action === "done") {
          this.ui.navigate("playlists");
        } else if (action === "delete-playlist") {
          window.favoritesPlaylists._confirmDelete(id);
        } else if (action === "shuffle-play") {
          const queue = state.buildPlaylistQueue(id);
          if (queue.length) {
            const shuffled = Utils.shuffle(queue);
            this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
          }
        } else if (action === "add-songs") {
          this.ui.navigate("library");
        }
      });
    });

    const list = document.getElementById("edit-playlist-songs");
    if (list) {
      let dragIdx = null;

      list.querySelectorAll(".edit-playlist-song-row").forEach((row) => {
        row.addEventListener("dragstart", (e) => {
          dragIdx = parseInt(row.dataset.index, 10);
          row.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("text/plain", String(dragIdx));
          } catch {}
        });

        row.addEventListener("dragend", () => {
          row.classList.remove("dragging");
          list.querySelectorAll(".edit-playlist-song-row").forEach((r) => r.classList.remove("drop-target"));
          dragIdx = null;
        });

        row.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          list.querySelectorAll(".edit-playlist-song-row").forEach((r) => r.classList.remove("drop-target"));
          row.classList.add("drop-target");
        });

        row.addEventListener("drop", (e) => {
          e.preventDefault();
          const targetIdx = parseInt(row.dataset.index, 10);
          if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;

          const newOrder = [...playlist.songs];
          const [moved] = newOrder.splice(dragIdx, 1);
          newOrder.splice(targetIdx, 0, moved);
          window.favoritesPlaylists.reorderSongs(id, newOrder);
          this.ui.render();
        });
      });

      list.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="remove-song"]');
        if (!btn) return;

        const index = parseInt(btn.dataset.index, 10);
        const songId = playlist.songs[index];
        const song = state.getSongById(songId);

        if (song) {
          window.favoritesPlaylists.removeSongFromPlaylist(id, songId);
        } else {
          const newOrder = [...playlist.songs];
          newOrder.splice(index, 1);
          window.favoritesPlaylists.reorderSongs(id, newOrder);
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
    window.heartManager?.prune();
    window.heartManager?.bindAll(document);

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
        const el = e.target.closest(".album-cover-wrap[data-artist-id][data-album-id]");
        if (!el) return;
        const artistId = el.dataset.artistId;
        const albumId = el.dataset.albumId;
        if (!artistId || !albumId) return;
        const queue = Utils.albumQueue(this.ui.state, artistId, albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
      });
    }

    document.querySelectorAll('[data-action="add-album-to-playlist"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;

        const firstSong = this.ui.state.getSongById(album.songs[0].id) || album.songs[0];
        if (window.favoritesPlaylists?.addToPlaylistModal) {
          window.favoritesPlaylists.addToPlaylistModal(firstSong);
        }
      });
    });

    document.querySelectorAll('[data-action="add-album-to-queue"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const albumId = el.dataset.albumId;
        const album = this.ui.state.getAlbumById(albumId);
        if (!album?.songs?.length) return;

        const queue = Utils.albumQueue(this.ui.state, album.artistId, albumId);
        const currentQueue = this.ui.state.queue || [];
        const startIndex = currentQueue.length;

        this.ui.state.queue = [...currentQueue, ...queue];
        if (this.ui.state.currentSong && startIndex === currentQueue.length) {
          this.ui.state.queueIndex = this.ui.state.queue.findIndex(
            (s) => s.id == this.ui.state.currentSong.id
          );
        }
        this.ui.state.showToast(
          `Added ${queue.length} song${queue.length === 1 ? "" : "s"} to queue`
        );
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
          const queue = Utils.albumQueue(this.ui.state, ctx.artistId, ctx.albumId);
          if (queue.length) {
            this.ui.audioPlayer.playSong(
              queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)),
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
              queue.find((s) => IdUtils.norm(s.id) === IdUtils.norm(songId)) || queue[0];
            this.ui.audioPlayer.playSong(startSong, queue, true, "playlist");
            return;
          }
        }

        this.ui.audioPlayer.playSong(song, null, true, el.dataset.playSource || null);
      });
    });

    document.querySelectorAll("[data-play-album]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.detail > 1) return;
        const data = JSON.parse(el.dataset.playAlbum);
        const queue = Utils.albumQueue(this.ui.state, data.artistId, data.albumId);
        if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
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
        const playlist = this.ui.state.playlists.find((p) => p.name === el.dataset.playlistView);
        if (!playlist) return;
        history.pushState(null, "", "/playlist/" + playlist.id);
        this.ui.handlePopState();
      });
    });

    document.querySelectorAll("[data-playlist-shuffle]").forEach((el) => {
      if (el._plShuffleBound) return;
      el._plShuffleBound = true;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const queue = this.ui.state.buildPlaylistQueue(el.dataset.playlistShuffle);
        if (queue.length) {
          const shuffled = Utils.shuffle(queue);
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

    document.querySelectorAll('[data-album-id][data-dynamic="true"]').forEach((el) => {
      el.addEventListener("click", () => {
        const artistId = IdUtils.norm(el.dataset.artistId);
        const albumId = IdUtils.norm(el.dataset.albumId);
        if (artistId && albumId) this.ui.navigate("artist", artistId, albumId);
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

      document.querySelectorAll(".playlist-name-input, .playlist-description-input").forEach((el) => {
        el.addEventListener("input", (e) => {
          const playlist = this.ui.state.playlists.find((p) => p.id === e.target.dataset.playlistId);
          if (playlist) {
            playlist[e.target.dataset.field] = e.target.value;
            this.ui.state.persist();
          }
        });
      });

      document.querySelectorAll(".tag-input").forEach((input) => {
        input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" || !e.target.value.trim()) return;
          e.preventDefault();

          const playlist = this.ui.state.playlists.find((p) => p.id === e.target.dataset.playlistId);
          if (!playlist) return;

          const newTag = e.target.value.trim();
          if (!playlist.tags) playlist.tags = [];
          if (playlist.tags.includes(newTag)) return;

          playlist.tags.push(newTag);
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

          chip.querySelector(".remove-tag-btn").addEventListener("click", (ce) => {
            ce.stopPropagation();
            playlist.tags = playlist.tags.filter((t) => t !== ce.target.dataset.tag);
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
          const playlist = this.ui.state.playlists.find((p) => p.id === plId);
          if (playlist?.tags) {
            playlist.tags = playlist.tags.filter((t) => t !== e.target.dataset.tag);
            this.ui.state.persist();
            e.target.closest(".tag-chip").remove();
          }
        });
      });

      document.querySelectorAll(".remove-from-playlist-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const playlist = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
          if (playlist) {
            playlist.songs = playlist.songs.filter((sid) => String(sid) !== String(btn.dataset.songId));
            this.ui.state.persist();
            btn.closest(".song-row").remove();
          }
        });
      });

      document.querySelectorAll(".share-playlist-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const playlist = this.ui.state.playlists.find((p) => p.id === btn.dataset.playlistId);
          if (!playlist) return;

          const shareText = `Playlist: ${playlist.name}\n${playlist.songs.length} songs\n${playlist.description || ""}`;
          if (navigator.share) {
            navigator.share({ title: playlist.name, text: shareText });
          } else {
            navigator.clipboard
              ?.writeText(shareText)
              .then(() => this.ui.state.showToast("Playlist copied to clipboard"));
          }
        });
      });
    }

    if (this.ui.state.currentPage === "editPlaylist") {
      this.attachEditPlaylistEvents();
    }

    document.querySelectorAll("[data-hover-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.dataset.hoverAction;
        const artistId = btn.dataset.artistId;
        const albumId = btn.dataset.albumId;
        const playlistId = btn.dataset.playlistId;
        const state = this.ui.state;

        switch (action) {
          case "play-album": {
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            break;
          }
          case "shuffle-album": {
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
            }
            break;
          }
          case "favorite-album": {
            await window.heartManager?.toggle("album", albumId);
            break;
          }
          case "album-playlist": {
            const album = state.getAlbumById(albumId);
            const firstSong = album?.songs?.[0] ? state.getSongById(album.songs[0].id) : null;
            if (firstSong) window.favoritesPlaylists?.addToPlaylistModal?.(firstSong);
            break;
          }
          case "view-artist": {
            this.ui.navigate("artist", artistId);
            break;
          }
          case "play-artist": {
            const artist = state.getArtistById(artistId);
            if (artist?.albums?.length) {
              const queue = Utils.albumQueue(state, artistId, artist.albums[0].id);
              if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            }
            break;
          }
          case "favorite-artist": {
            await window.heartManager?.toggle("artist", artistId);
            break;
          }
          case "play-playlist": {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) this.ui.audioPlayer.playSong(queue[0], queue, true, "playlist");
            break;
          }
          case "shuffle-playlist": {
            const queue = state.buildPlaylistQueue(playlistId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
            }
            break;
          }
          case "edit-playlist": {
            this.ui.editPlaylist(playlistId);
            break;
          }
          case "share-playlist": {
            const playlist = state.playlists.find((p) => String(p.id) === String(playlistId));
            if (!playlist) return;
            const shareText = `Playlist: ${playlist.name}\n${playlist.songs.length} songs\n${playlist.description || ""}`;
            if (navigator.share) {
              navigator.share({ title: playlist.name, text: shareText });
            } else if (navigator.clipboard?.writeText) {
              navigator.clipboard
                .writeText(shareText)
                .then(() => state.showToast("Playlist copied to clipboard"));
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

// ////////////////////////////////////////////////////////////////////////
// OfflineCache — service worker cache status + UI badges
// ////////////////////////////////////////////////////////////////////////
class OfflineCache {
  constructor(state) {
    this.state = state;
    this.cachedUrls = new Set();
    this.listening = false;
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
    const absolute = this.normalizeUrl(song);
    return this.cachedUrls.has(absolute) || this.cachedUrls.has(song?.downloadPath);
  }

  init() {
    if (!("serviceWorker" in navigator)) return;

    if (!this.listening) {
      this.listening = true;
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
        navigator.serviceWorker.controller.postMessage({ type: "GET_CACHE_STATUS" });
      }
    };

    if (navigator.serviceWorker?.controller) send();
    else if (navigator.serviceWorker?.ready) navigator.serviceWorker.ready.then(send).catch(() => {});
  }

  cacheSong(song) {
    if (!song?.downloadPath) return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      this.state.showToast("Offline caching unavailable");
      return;
    }
    if (this.isCached(song)) {
      this.state.showToast("Already available offline");
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_SONG",
      url: this.normalizeUrl(song),
    });
    this.state.showToast("Caching song for offline…");
  }

  removeSong(song) {
    if (!song?.downloadPath) return;
    const absolute = this.normalizeUrl(song);
    this.cachedUrls.delete(absolute);
    this.cachedUrls.delete(song.downloadPath);
    this.deleteFromCacheDb(absolute);
    this.deleteFromCacheDb(song.downloadPath);
    this.badgeRows();
    this.state.showToast("Offline copy removed");
  }

  deleteFromCacheDb(url) {
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

// ////////////////////////////////////////////////////////////////////////
// Search — top-bar search overlay + dropdown results
// ////////////////////////////////////////////////////////////////////////
class Search {
  constructor(ui) {
    this.ui = ui;
    this.activeIndex = -1;
    this.keyboardBound = false;
    this.lastQueue = null;
  }

  // ----------------------------------------------
  // Open / close
  // ----------------------------------------------
  openSearch() {
    this.ui.state.isSearchOpen = true;
    this.ui.state.searchQuery = "";

    document.querySelector(".breadcrumb-wrapper")?.classList.add("search-active");

    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.classList.remove("hidden");
      searchBar.style.opacity = "0";
      requestAnimationFrame(() => {
        searchBar.style.opacity = "1";
      });
      if (window.innerWidth > 768) {
        setTimeout(() => document.getElementById("search-input")?.focus(), 150);
      }
    }

    this.resetResults();
    this.bindKeyboard();
  }

  closeSearch() {
    this.ui.state.isSearchOpen = false;
    this.ui.state.searchQuery = "";

    document.querySelector(".breadcrumb-wrapper")?.classList.remove("search-active");

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

    this.resetResults();
  }

  // ----------------------------------------------
  // Results container
  // ----------------------------------------------
  getResultsEl() {
    let el = document.getElementById("search-results-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-results-container";
      const host = document.querySelector("#search-bar .panel") || document.getElementById("search-bar");
      host?.appendChild(el);
    }
    return el;
  }

  resetResults() {
    const el = document.getElementById("search-results-container");
    if (el) {
      el.className = "results hidden";
      el.innerHTML = "";
    }
    this.activeIndex = -1;
    this.lastQueue = null;
  }

  updateDropdown() {
    if (!this.ui.state.isSearchOpen) return;

    const query = (this.ui.state.searchQuery || "").trim();
    const el = this.getResultsEl();
    if (!el) return;

    if (!query) {
      this.resetResults();
      return;
    }

    el.className = "srResults";
    el.innerHTML = this.renderDropdown();
    this.activeIndex = -1;
    this.attachResultEvents(el);
  }

  // ----------------------------------------------
  // Hit collection
  // ----------------------------------------------
  collectHits(query) {
    const state = this.ui.state;
    const lower = query.toLowerCase();
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
        sc: Math.max(score(song.title), score(song.artist) * 0.65, score(song.album) * 0.65),
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
        if (sc > 0) {
          albumHits.push({
            kind: "album",
            ref: {
              artistId: a.id,
              albumId: alb.id,
              artistName: a.artist,
              albumName: alb.album,
              coverUrl: alb.coverUrl,
              year: alb.year || "",
              songCount: alb.songs ? alb.songs.length : 0,
            },
            sc,
          });
        }
      })
    );
    albumHits.sort((a, b) => b.sc - a.sc);

    const playlistHits = (state.playlists || [])
      .map((p) => ({ kind: "playlist", ref: p, sc: score(p.name) * 1.1 }))
      .filter((h) => h.sc > 0)
      .sort((a, b) => b.sc - a.sc);

    const top =
      [artistHits[0], songHits[0], albumHits[0], playlistHits[0]]
        .filter(Boolean)
        .sort((a, b) => b.sc - a.sc)[0] || null;

    const without = (list) => list.filter((h) => !top || h.ref !== top.ref);

    return {
      top,
      songs: (top?.kind === "song" ? without(songHits) : songHits).slice(0, 5),
      artists: (top?.kind === "artist" ? without(artistHits) : artistHits).slice(0, 6),
      albums: (top?.kind === "album" ? without(albumHits) : albumHits).slice(0, 6),
      playlists: (top?.kind === "playlist" ? without(playlistHits) : playlistHits).slice(0, 3),
    };
  }

  // ----------------------------------------------
  // Rendering helpers
  // ----------------------------------------------
  escapeText(text) {
    return Utils.esc(text == null ? "" : String(text));
  }

  highlightText(text, query) {
    const escaped = this.escapeText(text);
    const needle = this.escapeText(query.trim());
    if (!needle) return escaped;
    const rx = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return escaped.replace(rx, '<mark class="sr-hl">$1</mark>');
  }

  renderHero(top, query) {
    const kindLabel = { song: "Song", artist: "Artist", album: "Album", playlist: "Playlist" };

    let art = "";
    let title = "";
    let sub = "";
    let attrs = "";
    let playBtn = "";

    if (top.kind === "song") {
      const s = top.ref;
      attrs = `data-sr-song="${this.escapeText(s.id)}"`;
      art = `<img src="${this.escapeText(s.coverUrl || "")}" alt="" loading="lazy">`;
      title = this.highlightText(s.title, query);
      sub = `${kindLabel.song} · ${this.highlightText(s.artist || "", query)}${s.album ? ` · ${this.highlightText(s.album, query)}` : ""}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-song="${this.escapeText(s.id)}" aria-label="Play ${this.escapeText(s.title)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "artist") {
      const a = top.ref;
      const albums = a.albums ? a.albums.length : 0;
      const songs = (a.albums || []).reduce((n, alb) => n + alb.songs.length, 0);
      attrs = `data-sr-artist="${this.escapeText(a.id)}"`;
      art = `<img src="${this.escapeText(a.imageUrl || "")}" alt="" loading="lazy">`;
      title = this.highlightText(a.artist, query);
      sub = `${kindLabel.artist}${a.genre ? ` · ${this.highlightText(a.genre, query)}` : ""} · ${albums} album${albums === 1 ? "" : "s"} · ${songs} song${songs === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-artist="${this.escapeText(a.id)}" aria-label="Play ${this.escapeText(a.artist)}">${Icons.player.play(16)}</button>`;
    } else if (top.kind === "album") {
      const al = top.ref;
      attrs = `data-sr-album="${this.escapeText(al.albumId)}" data-artist-id="${this.escapeText(al.artistId)}"`;
      art = `<img src="${this.escapeText(al.coverUrl || "")}" alt="" loading="lazy">`;
      title = this.highlightText(al.albumName, query);
      sub = `${kindLabel.album}${al.year ? ` · ${this.escapeText(al.year)}` : ""} · ${this.highlightText(al.artistName, query)} · ${al.songCount} song${al.songCount === 1 ? "" : "s"}`;
      playBtn = `<button type="button" class="srHeroPlay" data-sr-play data-sr-album="${this.escapeText(al.albumId)}" data-artist-id="${this.escapeText(al.artistId)}" aria-label="Play ${this.escapeText(al.albumName)}">${Icons.player.play(16)}</button>`;
    } else {
      const p = top.ref;
      attrs = `data-sr-playlist="${this.escapeText(p.id)}"`;
      art = `<span class="srHeroArtFallback">${Icons.general.playlist(30)}</span>`;
      title = this.highlightText(p.name, query);
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

  songRow(song, index, query) {
    const isFav = this.ui.favorites.isSong(song.id);
    return `
      <div class="srRow" data-sr-item data-sr-song="${this.escapeText(song.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srRowNum">${index + 1}</span>
        <span class="srRowArt">
          <img src="${this.escapeText(song.coverUrl || "")}" alt="" loading="lazy">
          <span class="srRowPlay">${Icons.player.play(11)}</span>
        </span>
        <span class="srRowText">
          <span class="srRowTitle">${this.highlightText(song.title, query)}</span>
          <span class="srRowSub">${this.highlightText(song.artist || "", query)}${song.album ? ` · ${this.highlightText(song.album, query)}` : ""}</span>
        </span>
        <button type="button" class="srIconBtn heart${isFav ? " favorited is-favorite" : ""}" data-fav-song="${this.escapeText(song.id)}" aria-label="Favorite ${this.escapeText(song.title)}">${this.ui.likeStatus("song", isFav, false, null)}</button>
        <button type="button" class="srIconBtn" data-more-song="${this.escapeText(song.id)}" aria-label="More options">${Icons.general.moreVert(15)}</button>
        <span class="srRowTime">${this.escapeText(song.duration || "")}</span>
      </div>
    `;
  }

  albumCard(album, index, query) {
    return `
      <div class="srCard" data-sr-item data-sr-album="${this.escapeText(album.albumId)}" data-artist-id="${this.escapeText(album.artistId)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srCardArt">
          <img src="${this.escapeText(album.coverUrl || "")}" alt="" loading="lazy">
          <button type="button" class="srCardPlay" data-sr-play data-sr-album="${this.escapeText(album.albumId)}" data-artist-id="${this.escapeText(album.artistId)}" aria-label="Play ${this.escapeText(album.albumName)}">${Icons.player.play(13)}</button>
        </span>
        <span class="srCardTitle">${this.highlightText(album.albumName, query)}</span>
        <span class="srCardSub">${album.year ? `${this.escapeText(album.year)} · ` : ""}${this.highlightText(album.artistName, query)}</span>
      </div>
    `;
  }

  artistCard(artist, index, query) {
    const albums = artist.albums ? artist.albums.length : 0;
    return `
      <div class="srCard srCardArtist" data-sr-item data-sr-artist="${this.escapeText(artist.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srCardArt round">
          <img src="${this.escapeText(artist.imageUrl || "")}" alt="" loading="lazy">
        </span>
        <span class="srCardTitle">${this.highlightText(artist.artist, query)}</span>
        <span class="srCardSub">Artist · ${albums} album${albums === 1 ? "" : "s"}</span>
      </div>
    `;
  }

  playlistRow(playlist, index, query) {
    return `
      <div class="srRow" data-sr-item data-sr-playlist="${this.escapeText(playlist.id)}" role="button" tabindex="-1" style="--sr-i:${index}">
        <span class="srRowArt srRowArtPl">${Icons.general.playlist(20)}</span>
        <span class="srRowText">
          <span class="srRowTitle">${this.highlightText(playlist.name, query)}</span>
          <span class="srRowSub">Playlist · ${playlist.songs.length} song${playlist.songs.length === 1 ? "" : "s"}</span>
        </span>
        <span class="srRowGo">${Icons.general.arrowRight(15)}</span>
      </div>
    `;
  }

  renderDropdown() {
    const query = (this.ui.state.searchQuery || "").trim();
    if (!query) return "";

    const { top, songs, artists, albums, playlists } = this.collectHits(query);
    this.lastQueue = songs.map((s) => s.ref);

    if (!top && !songs.length && !artists.length && !albums.length && !playlists.length) {
      return `
        <div class="srEmpty">
          <span class="srEmptyIcon">${Icons.general.search(26)}</span>
          <p class="srEmptyTitle">No results for &ldquo;${this.escapeText(query)}&rdquo;</p>
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
    if (top) html += this.renderHero(top, query);
    if (songs.length) {
      html += section("Songs", `<div class="srRows">${songs.map((h, i) => this.songRow(h.ref, i, query)).join("")}</div>`);
    }
    if (albums.length) {
      html += section("Albums", `<div class="srCards">${albums.map((h, i) => this.albumCard(h.ref, i, query)).join("")}</div>`);
    }
    if (artists.length) {
      html += section("Artists", `<div class="srCards">${artists.map((h, i) => this.artistCard(h.ref, i, query)).join("")}</div>`);
    }
    if (playlists.length) {
      html += section("Playlists", `<div class="srRows">${playlists.map((h, i) => this.playlistRow(h.ref, i, query)).join("")}</div>`);
    }

    html += `
      <div class="srFoot">
        <span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>
        <span><kbd>&#8629;</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    `;
    return html;
  }

  // ----------------------------------------------
  // Activation
  // ----------------------------------------------
  activateItem(el, forcePlay = false) {
    if (!el) return;

    const d = el.dataset;
    const ui = this.ui;

    if (d.srSong) {
      const song = ui.state.getSongById(d.srSong);
      if (song) {
        ui.audioPlayer.playSong(
          song,
          this.lastQueue && this.lastQueue.length ? this.lastQueue : null,
          true,
          "search"
        );
      }
      this.closeSearch();
      return;
    }

    if (d.srAlbum) {
      if (forcePlay) {
        const queue = Utils.albumQueue(ui.state, d.artistId, d.srAlbum);
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
      const playlist = (ui.state.playlists || []).find((p) => String(p.id) === String(d.srPlaylist));
      if (playlist) {
        ui.state.selectedPlaylistName = playlist.name;
        ui.state.selectedPlaylistId = playlist.id;
      }
      ui.navigate("playlists");
      this.closeSearch();
    }
  }

  // ----------------------------------------------
  // Delegation
  // ----------------------------------------------
  attachResultEvents(container) {
    if (!container) return;

    if (!container.hasDelegatedResults) {
      container.hasDelegatedResults = true;
      container.addEventListener("click", (e) => {
        const more = e.target.closest("[data-more-song]");
        if (more) {
          e.stopPropagation();
          this.ui.contentEvents.showSongMenu(more.dataset.moreSong, e);
          return;
        }

        const play = e.target.closest("[data-sr-play]");
        if (play) {
          e.stopPropagation();
          this.activateItem(play, true);
          return;
        }

        const item = e.target.closest("[data-sr-item]");
        if (item) {
          if (e.target.closest("[data-fav-song]")) return;
          this.activateItem(item, false);
        }
      });
    }

    container
      .querySelectorAll("[data-fav-song]")
      .forEach((btn) => this.ui.contentEvents.setupHeartButton(btn, "song", btn.dataset.favSong));
  }

  bindKeyboard() {
    if (this.keyboardBound) return;

    const input = document.getElementById("search-input");
    if (!input) return;
    this.keyboardBound = true;

    input.addEventListener("keydown", (e) => {
      if (!this.ui.state.isSearchOpen) return;

      const items = [...document.querySelectorAll("#search-results-container [data-sr-item]")];

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        this.activeIndex =
          e.key === "ArrowDown"
            ? (this.activeIndex + 1) % items.length
            : (this.activeIndex - 1 + items.length) % items.length;

        items.forEach((el, i) => el.classList.toggle("sr-active", i === this.activeIndex));
        items[this.activeIndex].scrollIntoView?.({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (!items.length) return;
        e.preventDefault();
        this.activateItem(items[this.activeIndex] || items[0], false);
      }
    });
  }

  // Preserved no-op hooks (potentially wired up by external code).
  attachCategoryCollapse() {}
  attachSearchDropdownEvents() {}
}

// ////////////////////////////////////////////////////////////////////////
// UIManager — page rendering + orchestrates sub-managers
// ////////////////////////////////////////////////////////////////////////
class UIManager {
  constructor(state, audioPlayer, favorites) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.favorites = favorites;

    this.isTransitioning = false;
    this.isBreadcrumbHidden = false;

    this.state.favoritesTab = "songs";
    this.state.selectedPlaylistName = null;
    this.state.isCreatingPlaylist = false;

    this.skipProgress = false;
    this.fragmentLoadDelay = 1500;
    this.popoverDelay = 400;

    this.spinnerInstance = null;
    this.favTabLoading = false;
    this.artistTabLoading = false;

    this.router = new AppRouter(this);
    this.player = new PlayerManager(this);
    this.search = new Search(this);
    this.contentEvents = new ContentEvents(this);
    this.homePage = new Home(this);
    this.libraryPage = new Library(this);
    this.favoritesPage = new Favorites(this);
    this.playlistsPage = new Playlists(this);
    this.editPlaylistPage = new EditPlaylist(this);
    this.artistPage = new Artists(this);
    this.errorPage = new Error404(this);

    this.init();

    window.NProgress?.configure({
      showSpinner: true,
      speed: 300,
      trickleSpeed: 600,
    });
  }

  // ----------------------------------------------
  // Spinner helpers
  // ----------------------------------------------
  ensureSpinner() {
    const main = document.getElementById("main-content");
    if (!main) return null;

    if (!this.spinnerInstance || !this.spinnerInstance.el || !main.contains(this.spinnerInstance.el)) {
      this.spinnerInstance?.remove?.();
      this.spinnerInstance = new Spinner({ type: "area", container: main });
    }
    return this.spinnerInstance;
  }

  showSpinner() {
    this.ensureSpinner()?.show();
  }

  hideSpinner() {
    this.spinnerInstance?.hide();
  }

  // ----------------------------------------------
  // Init / navigation
  // ----------------------------------------------
  init() {
    this.render = this.render.bind(this);
    this.navigate = this.navigate.bind(this);
    this.handlePopState = this.handlePopState.bind(this);

    AppListeners.bindAll(this);
    this.router.syncWithUrl();
    window.addEventListener("popstate", this.handlePopState);
  }

  navigate(page, artistId = null, albumId = null) {
    if (!this.skipProgress && window.NProgress) NProgress.start();
    this.skipProgress = false;
    this.router.goTo(page, artistId, albumId);
  }

  handlePopState() {
    this.router.handlePopState();
  }

  // ----------------------------------------------
  // Render
  // ----------------------------------------------
  render() {
    this.main = document.getElementById("main-content");
    this.scrollToTop();

    if (this.isTransitioning) {
      if (this.transitionStart && Date.now() - this.transitionStart > 2000) {
        console.warn("[UIManager] Transition timeout — forcing reset");
        this.isTransitioning = false;
      } else {
        return;
      }
    }

    this.isTransitioning = true;
    this.transitionStart = Date.now();

    Object.assign(this.main.style, {
      transition: "opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease",
//      opacity: "0",
      transform: "translateY(10px)",
//      filter: "blur(8px)",
    });

    this.routes();
    this.player.renderMiniPlayer();
  }

  routes() {
    const pageMap = {
      home: () => this.homePage.render(),
      library: () => this.libraryPage.render(),
      favorites: () => this.favoritesPage.render(),
      playlists: () => this.playlistsPage.render(),
      editPlaylist: () => this.editPlaylistPage.render(),
      artist: () => this.artistPage.render(),
      404: () => this.errorPage.render(),
    };

    setTimeout(() => {
      try {
        this.main.innerHTML =
          (pageMap[this.state.currentPage] ?? (() => "<div>Not found</div>"))();
        this.ensureSpinner();

        Object.assign(this.main.style, {
//          opacity: "1",
          transform: "translateY(0)",
 //         filter: "blur(0px)",
        });

        setTimeout(() => {
          this.main.style.transition = "";
          this.isTransitioning = false;
        }, 300);

        this.contentEvents.attachContentEvents();
        if (window.NProgress && NProgress.status !== null) NProgress.done();
        this.autoPlayDeepLink();
      } catch (err) {
        console.error("[UIManager] Page render error:", err);
        this.isTransitioning = false;
        if (window.NProgress && NProgress.status !== null) NProgress.done();
      }
    }, 300);
  }

  // ----------------------------------------------
  // Content factories
  // ----------------------------------------------
  scrollSection(title, cards) {
    return `<section data-area="scroll" class="section container"><h2 class="section-header">${title}</h2><div class="scroll-row">${cards.join("")}</div></section>`;
  }

  albumCard(artistId, artistName, albumId, albumName, coverUrl, index = 0, size = "170px") {
    const album = this.state.getAlbumById(albumId);
    const isFav = albumId && this.favorites.isAlbum(albumId);
    const songCount = album?.songs?.length || 0;

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 50}ms"
     data-artist-id="${artistId}" data-album-id="${albumId}">
  <div class="imgBx">
    <img src="${coverUrl}" alt="${Utils.esc(albumName)}" loading="lazy">
  </div>

  <div class="content">
    <div class="contentBx">
      <h3>
        ${albumName}
        <br>
        <span>${artistName} • ${songCount} song${songCount === 1 ? "" : "s"}</span>
      </h3>
    </div>

    <ul class="sci">
      <li style="--i:1">
        <a href="#" data-hover-action="play-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Play">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm128-88c0-8.7 4.7-16.7 12.3-20.9s16.8-4.1 24.3 .5l144 88c7.1 4.4 11.5 12.1 11.5 20.5s-4.4 16.1-11.5 20.5l-144 88c-7.4 4.5-16.7 4.7-24.3 .5S176 352.7 176 344l0-176z"/>
  <path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/>
</svg>
        </a>
      </li>

      <li style="--i:2">
        <a href="#" data-hover-action="shuffle-album" data-artist-id="${artistId}" data-album-id="${albumId}" title="Shuffle">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path opacity=".4" fill="currentColor" d=""/>
  <path fill="currentColor" d="M425 31l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-15.1 0-29.3 7.1-38.4 19.2l-33.6 44.8-30-40 25.2-33.6C297.3 118.2 325.8 104 356 104l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0zM194 336l-25.2 33.6C150.7 393.8 122.2 408 92 408l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c15.1 0 29.3-7.1 38.4-19.2L164 296 194 336zm197-49c9.4-9.4 24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39-74.1 0c-30.2 0-58.7-14.2-76.8-38.4L130.4 171.2C121.3 159.1 107.1 152 92 152l-68 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l68 0c30.2 0 58.7 14.2 76.8 38.4L317.6 340.8c9.1 12.1 23.3 19.2 38.4 19.2l74.1 0-39-39c-9.4-9.4-9.4-24.6 0-33.9z"/>
</svg>
        </a>
      </li>
      <li style="--i:3">
        <a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-album" data-album-id="${albumId}" title="Favorite">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path opacity=".4" fill="currentColor" d="M48 256a208 208 0 1 0 416 0 208 208 0 1 0 -416 0zm96-21.3c0-32.4 26.3-58.7 58.7-58.7 18.5 0 35.9 8.7 46.9 23.5l6.4 8.5 6.4-8.5c11.1-14.8 28.5-23.5 46.9-23.5 32.4 0 58.7 26.3 58.7 58.7l0 5.3c0 49.1-65.8 98.1-96.5 118.3-9.5 6.2-21.5 6.2-30.9 0-30.7-20.2-96.5-69.3-96.5-118.3l0-5.3z"/>
  <path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-6.4-312.5c-11.1-14.8-28.5-23.5-46.9-23.5-32.4 0-58.7 26.3-58.7 58.7l0 5.3c0 49.1 65.8 98.1 96.5 118.3 9.5 6.2 21.5 6.2 30.9 0 30.7-20.2 96.5-69.3 96.5-118.3l0-5.3c0-32.4-26.3-58.7-58.7-58.7-18.5 0-35.9 8.7-46.9 23.5l-6.4 8.5-6.4-8.5z"/>
</svg>
        </a>
      </li>

      <li style="--i:4">
        <a href="#" data-hover-action="album-playlist" data-artist-id="${artistId}" data-album-id="${albumId}" title="Add to playlist">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
  <path opacity=".4" fill="currentColor" d="M64 240l261.8 0c-14.7 9.8-28 21.5-39.4 34.9-9.7-1.9-19.9-2.9-30.4-2.9-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5 1.8 11.2 4.7 22.1 8.4 32.5L96 464 64 240z"/>
  <path fill="currentColor" d="M152 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l208 0c13.3 0 24-10.7 24-24S373.3 0 360 0L152 0zM104 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l304 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L104 96zM484.3 208.6C475.1 198 461.9 192 448 192L64 192c-13.9 0-27.1 6-36.3 16.6S14.5 233 16.5 246.8l32 224C51.9 494.4 72.1 512 96 512l180 0c-10.5-14.6-19-30.7-25.1-48L96 464 64 240 325.8 240c30.4-20.2 66.9-32 106.2-32 20.3 0 39.8 3.1 58.1 8.9-1.6-3-3.6-5.8-5.8-8.4zM256 272c-63.1 0-114.3 35.8-114.3 80 0 41 44.1 74.8 100.8 79.5-1.7-10.2-2.6-20.7-2.6-31.5 0-9.5 .7-18.8 2-27.8-10.7-3.6-18-11.3-18-20.2 0-11.7 12.9-21.4 29.3-22.3 7.9-20.2 19.2-38.7 33.1-54.8-9.7-1.9-19.9-2.9-30.4-2.9zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm16-208l0 48 48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48-48 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16z"/>
</svg>
        </a>
      </li>
    </ul>
  </div>
</div>
    `;
  }

  artistCard(artist, index = 0) {
    const isFav = this.favorites.isArtist(artist.id);
    const albumCount = artist.albums?.length || 0;

    return `
<div class="card animate-fadeInUp" style="--d: ${index * 60}ms" data-artist-id="${artist.id}">
  <div class="imgBx">
    <img src="${artist.imageUrl}" alt="${Utils.esc(artist.artist)}" loading="lazy">
  </div>

  <div class="content">
    <div class="contentBx">
      <h3>
        ${artist.artist}
        <br>
        <span>${artist.genre || "Artist"} • ${albumCount} album${albumCount === 1 ? "" : "s"}</span>
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
        <a href="#" class="${isFav ? "favorited" : ""}" data-hover-action="favorite-artist" data-artist-id="${artist.id}" title="Favorite">
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
          <img src="${song.coverUrl}" alt="${Utils.esc(song.title)}" loading="lazy">
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
    const albumId = song.albumId;
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
        ${showDuration ? `<span class="time">${song.duration}</span>` : ""}
        <button class="heart ${this.favorites.isSong(song.id) ? "favorited" : ""}" data-fav-song="${song.id}">
          ${this.likeStatus("song", this.favorites.isSong(song.id), false, null)}
        </button>
      </div>
    `;
  }

  artistNameTooltip(artistId, displayText = null) {
    const artist = this.state.getArtistById(artistId);
    if (!artist) return displayText || "Unknown";

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

  // ----------------------------------------------
  // Playlist / deep-link helpers
  // ----------------------------------------------
  editPlaylist(playlistId) {
    this.state.editingPlaylistId = playlistId;
    const playlist = this.state.playlists.find((p) => String(p.id) === String(playlistId));
    this.state.selectedPlaylistName = playlist?.name || null;
    history.pushState(null, "", `/playlist/${playlistId}/edit`);
    this.navigate("editPlaylist");
  }

  autoPlayDeepLink() {
    const songId = this.state.pendingDeepLinkSong;
    if (!songId) return;

    this.state.pendingDeepLinkSong = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("song");
    history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);

    if (this.state.currentPage !== "artist") return;

    const song = this.state.getSongById(songId);
    if (!song) return;

    const queue = Utils.albumQueue(this.state, song.artistId, song.albumId);
    const startSong = queue.find((s) => Utils.id(s.id) === Utils.id(songId)) || song;
    this.audioPlayer.playSong(startSong, queue.length ? queue : null, true, "album");
  }

  // ----------------------------------------------
  // Theme / settings
  // ----------------------------------------------
  toggleTheme() {
    Prefs.applyTheme(Prefs.nextToggle());
  }

  showSettingsModal() {
    const popups = window.popups;
    if (!popups) return;

    const currentTheme = Prefs.theme();
    const darkThemes = Prefs.listThemes().filter((t) => t.dark);
    const lightThemes = Prefs.listThemes().filter((t) => !t.dark);

    const themeCard = ({ key, label, preview }) => `
      <button type="button" class="popups-theme-card ${key === currentTheme ? "active" : ""}"
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

    const content = document.createElement("div");
    content.className = "popups-settings";
    content.innerHTML = `
      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Dark</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Dark color schemes">
          ${darkThemes.map(themeCard).join("")}
        </div>
      </section>

      <section class="popups-settings-section">
        <p class="popups-settings-label">Color scheme — Light</p>
        <div class="popups-theme-grid" role="radiogroup" aria-label="Light color schemes">
          ${lightThemes.map(themeCard).join("")}
        </div>
      </section>

      <section class="popups-settings-section">
        <p class="popups-settings-label">Playback</p>
        <label class="popups-toggle">
          <input type="checkbox" id="pref-fade" ${Prefs.get("fadeTransitions") ? "checked" : ""}>
          <span>Fade transitions between tracks</span>
        </label>
        <label class="popups-toggle">
          <input type="checkbox" id="pref-radio" ${Prefs.get("radioAutoplay") ? "checked" : ""}>
          <span>Radio autoplay when queue ends</span>
        </label>
      </section>
    `;

    popups.modal({
      title: "Settings",
      size: "md",
      content,
      closable: true,
      autoClose: false,
      onClose: () => {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
      },
    });

    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");

    const setActiveCard = (activeEl) => {
      content.querySelectorAll(".popups-theme-card").forEach((el) => {
        const on = el === activeEl;
        el.classList.toggle("active", on);
        el.setAttribute("aria-checked", String(on));
      });
    };

    content.querySelectorAll(".popups-theme-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.themeOption;
        if (!next || !Prefs.isValidTheme(next)) return;
        Prefs.applyTheme(next);
        setActiveCard(btn);
        popups.toast({ message: `Theme: ${Prefs.THEMES[next].label}` });
      });
    });

    content.querySelector("#pref-fade")?.addEventListener("change", (e) => {
      Prefs.set("fadeTransitions", e.target.checked);
      popups.toast({ message: e.target.checked ? "Fade transitions on" : "Fade transitions off" });
    });

    content.querySelector("#pref-radio")?.addEventListener("change", (e) => {
      Prefs.set("radioAutoplay", e.target.checked);
      popups.toast({ message: e.target.checked ? "Radio autoplay on" : "Radio autoplay off" });
    });

    setTimeout(() => {
      content.querySelector(".popups-theme-card.active, .popups-theme-card, input, button")?.focus();
    }, 50);
  }

  // ----------------------------------------------
  // Passthroughs / delegators
  // ----------------------------------------------
  openSearch() {
    this.search.openSearch();
  }

  closeSearch() {
    this.search.closeSearch();
  }

  showArtistPopover(artistId, event) {
    this.contentEvents.showArtistPopover(artistId, event);
  }

  closePlayerDrawer() {
    this.player.closeDrawer();
  }

  openPlayerDrawer() {
    this.player.openDrawer();
  }

  updateMiniPlayer() {
    this.player.renderMiniPlayer();
  }

  updateProgressOnly() {
    this.player.updateProgressOnly();
  }

  updateFullPlayer() {
    const drawer = document.getElementById("full-player-drawer");
    if (drawer) {
      this.player.softUpdateDrawer(drawer);
    } else if (this.state.isDrawerOpen) {
      this.player.renderFullPlayer();
    }
  }

  showShortcutsHelp() {
    const shortcuts = [
      ["Space", "Play / Pause"],
      ["←", "Previous track"],
      ["→", "Next track"],
      ["↑", "Volume up"],
      ["↓", "Volume down"],
      ["M", "Mute"],
      ["L", "Favorite current song"],
      ["S", "Shuffle"],
      ["R", "Cycle repeat mode"],
      ["Q", "Up Next queue"],
      ["Ctrl/⌘ + K", "Search"],
      ["?", "This help"],
      ["Esc", "Close dialogs"],
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
          ${shortcuts
            .map(
              ([key, description]) => `
            <div class="row">
              <span class="desc">${description}</span>
              <kbd class="kbd">${key}</kbd>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `);
  }

  // ----------------------------------------------
  // Scrolling / refresh
  // ----------------------------------------------
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

  refreshArtistContent(artistId, albumId) {
    if (this.artistTabLoading) return;

    if (artistId !== this.state.artistId) {
      this.navigate("artist", artistId, albumId);
      return;
    }

    this.artistTabLoading = true;
    this.state.selectedAlbumId = albumId;
    this.router.updateTitle();
    this.router.updateBreadcrumbs();

    const artist = this.state.getArtistById(artistId);
    const album = artist?.albums.find((a) => IdUtils.norm(a.id) === IdUtils.norm(albumId));
    if (!artist || !album) {
      this.artistTabLoading = false;
      return;
    }

    const coverContainer = document.querySelector(".hero-card .hero-cover");
    const songsArea = document.querySelector('[data-list="songs"]');
    const aboutArea = document.querySelector('[data-page="artist"] > [data-area="about"]');

    const coverSpinner = coverContainer ? new Spinner({ type: "area", container: coverContainer }) : null;
    const songsSpinner = songsArea ? new Spinner({ type: "area", container: songsArea }) : null;

    coverSpinner?.show();
    songsSpinner?.show();
//    songsArea?.classList.add("isLoading");

    setTimeout(() => {
      if (coverContainer && album.coverUrl) {
        const img = coverContainer.querySelector("img");
        if (img) img.src = album.coverUrl;
        else coverContainer.style.backgroundImage = `url(${album.coverUrl})`;
      }

      if (songsArea) {
        songsArea.innerHTML = `
          <div class="header">
            <div class="left">
              <span class="badge">${album.certification || "Double Platinum"}</span>
              <span class="year">${album.year || "2024"}</span>
            </div>
            <span class="hint">Double-click</span>
          </div>
          <div class="body">
            ${album.songs.map((song, i) => this.artistPage.createSongRow(song, i, artist, album)).join("")}
          </div>
        `;
//        songsArea?.classList.remove("isLoading");
        this.contentEvents.attachContentEvents();
      }

      if (aboutArea && this.artistPage.aboutSection) {
        aboutArea.innerHTML = this.artistPage.aboutSection(artist, album);
        aboutArea.querySelectorAll(".tab").forEach((btn) => {
          btn.classList.toggle("active", IdUtils.norm(btn.dataset.albumId) === IdUtils.norm(albumId));
        });
        this.contentEvents.attachContentEvents();
      }

      coverSpinner?.hide();
      songsSpinner?.hide();

      setTimeout(() => {
        coverSpinner?.remove();
        songsSpinner?.remove();
      }, 400);

      this.artistTabLoading = false;
    }, 1500);
  }

  refreshFavoritesContent(tab) {
    if (this.favTabLoading) return;

    const favContainer = document.getElementById("favorites-content");
    if (!favContainer) return;

    this.favTabLoading = true;
    const spinner = new Spinner({ type: "area", container: favContainer });
    spinner.show();

    this.state.favoritesTab = tab;
    history.pushState(null, "", `/favorites/${tab}`);
    this.router.updateBreadcrumbs();

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    setTimeout(() => {
      favContainer.innerHTML = this.favoritesPage.tabContent(tab);
      this.contentEvents.attachContentEvents();
      spinner.hide();
      spinner.remove();
      this.favTabLoading = false;
    }, 600);
  }

  async toggleFavAndReRender(songId) {
    await window.heartManager?.toggle("song", songId);
  }

  likeStatus(type, isFavorite, isHovered, tempState) {
    if (tempState === "error" || tempState === "exclamation") {
      return `<i class="fa-solid fa-heart-circle-exclamation error-icon"></i>`;
    }
    if (tempState === "check" || tempState === "confirm") {
      return `<i class="fa-solid fa-heart-circle-check confirm-icon"></i>`;
    }
    if (isFavorite) {
      return isHovered
        ? `<i class="fa-solid fa-heart-circle-minus hover-liked-icon"></i>`
        : `<i class="fa-solid fa-heart liked-icon"></i>`;
    }
    return isHovered
      ? `<i class="fa-solid fa-heart-circle-plus hover-not-liked-icon"></i>`
      : `<i class="fa-solid fa-heart not-liked-icon"></i>`;
  }
}

// ////////////////////////////////////////////////////////////////////////
// ContextMenu — right-click / long-press actions
// ////////////////////////////////////////////////////////////////////////
class ContextMenu {
  constructor() {
    this.el = null;
    this.init();
  }

  init() {
    document.addEventListener("click", () => this.hide());
    document.addEventListener("scroll", () => this.hide(), true);
    window.addEventListener("resize", () => this.hide());
  }

  show(x, y, data) {
    this.hide();

    const menu = document.createElement("div");
    menu.id = "mybeats-context-menu";
    menu.className = "mb-context-menu";

    let items = "";

    if (data.songId) {
      const song = window.uiManager?.state?.getSongById(data.songId);
      if (song) {
        const isFav = window.uiManager.favorites.isSong(data.songId);
        items += `
          <button class="mb-ctx-item" data-ctx="play-song" data-id="${data.songId}">
            ${Icons.player.play(16)}
            Play
          </button>
          <button class="mb-ctx-item" data-ctx="fav-song" data-id="${data.songId}">
            <i class="fa-solid fa-heart ${isFav ? "liked-icon" : "not-liked-icon"}"></i>
            ${isFav ? "Remove from Favorites" : "Add to Favorites"}
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
          <i class="fa-solid fa-heart not-liked-icon"></i>
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

    const rect = menu.getBoundingClientRect();
    let posX = x;
    let posY = y;

    if (posX + rect.width > window.innerWidth) posX = window.innerWidth - rect.width - 8;
    if (posY + rect.height > window.innerHeight) posY = window.innerHeight - rect.height - 8;

    menu.style.left = posX + "px";
    menu.style.top = posY + "px";

    menu.querySelectorAll(".mb-ctx-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.ctx;
        const id = btn.dataset.id;
        const artistId = btn.dataset.artist;
        const albumId = btn.dataset.album;
        const playlistId = btn.dataset.playlist;
        const state = window.uiManager?.state;

        switch (action) {
          case "play-song": {
            const song = state?.getSongById(id);
            if (song) window.uiManager.audioPlayer.playSong(song, null, true, "context");
            break;
          }
          case "fav-song": {
            const song = state?.getSongById(id);
            if (song) window.uiManager.favorites.toggleSong(song);
            break;
          }
          case "add-playlist": {
            const song = state?.getSongById(id);
            if (song) window.favoritesPlaylists?.addToPlaylistModal?.(song);
            break;
          }
          case "play-album": {
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
            break;
          }
          case "shuffle-album": {
            const queue = Utils.albumQueue(state, artistId, albumId);
            if (queue.length) {
              const shuffled = Utils.shuffle(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "album");
            }
            break;
          }
          case "view-album": {
            window.uiManager.navigate("artist", artistId, albumId);
            break;
          }
          case "view-artist": {
            window.uiManager.navigate("artist", artistId);
            break;
          }
          case "play-artist": {
            const artist = state?.getArtistById(artistId);
            if (artist?.albums?.length) {
              const queue = Utils.albumQueue(state, artistId, artist.albums[0].id);
              if (queue.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "album");
            }
            break;
          }
          case "fav-artist": {
            window.favoritesPlaylists?.toggleArtist?.(artistId);
            break;
          }
          case "play-playlist": {
            const queue = state?.buildPlaylistQueue(playlistId);
            if (queue?.length) window.uiManager.audioPlayer.playSong(queue[0], queue, true, "playlist");
            break;
          }
          case "shuffle-playlist": {
            const queue = state?.buildPlaylistQueue(playlistId);
            if (queue?.length) {
              const shuffled = Utils.shuffle(queue);
              window.uiManager.audioPlayer.playSong(shuffled[0], shuffled, true, "playlist");
            }
            break;
          }
          case "edit-playlist": {
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



window.AppRouter = AppRouter;
window.AppListeners = AppListeners;
window.ContentEvents = ContentEvents;
window.ContextMenu = ContextMenu;
window.OfflineCache = OfflineCache;
window.Search = Search;
window.UIManager = UIManager;
