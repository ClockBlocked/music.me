// ////////////////////////////////////////////////////////////////////////
// App Shell
// Responsive frame controller: sidebar/tab active states, desktop discovery
// rail (top artists + player card), shell header actions, theme toggle.
// ////////////////////////////////////////////////////////////////////////

class AppShell {
  constructor() {
    this.ui = null;
    this.bound = false;
    this.topArtists = [];
    this._railSongId = null;
  }

  // ----------------------------------------------------------
  // Boot — wait until UIManager exists, then wire everything
  // ----------------------------------------------------------
  start(attempts = 0) {
    if (window.uiManager) {
      this.ui = window.uiManager;
      this.init();
    } else if (attempts < 120) {
      setTimeout(() => this.start(attempts + 1), 50);
    }
  }

  init() {
    this.bindActions();
    this.syncActiveNav(this.ui.state.currentPage || "home");
    this.renderTopArtists();
    this.syncRailPlayer();

    window.addEventListener("mybeats:page-change", (e) => {
      this.syncActiveNav(e.detail?.page || this.ui.state.currentPage);
    });
    window.addEventListener("mybeats:favorites-changed", () => this.syncFollowStates());
    window.addEventListener("mybeats:library-changed", () => this.renderTopArtists());
    window.addEventListener("themechange", () => this.syncThemeIcon());
    this.syncThemeIcon();
  }

  // ----------------------------------------------------------
  // Delegated shell actions
  // ----------------------------------------------------------
  bindActions() {
    if (this.bound) return;
    this.bound = true;

    document.addEventListener("click", (e) => {
      const shellBtn = e.target.closest("[data-shell-action]");
      if (shellBtn) {
        e.preventDefault();
        this.handleAction(shellBtn.dataset.shellAction, e);
        return;
      }

      const headerNav = e.target.closest("[data-shell-nav]");
      if (headerNav) {
        e.preventDefault();
        this.ui.navigate(headerNav.dataset.shellNav);
        return;
      }

      const follow = e.target.closest(".railFollow[data-artist-id]");
      if (follow) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleFollow(follow.dataset.artistId);
        return;
      }

      const artistRow = e.target.closest(".railArtist[data-artist-open]");
      if (artistRow) {
        if (e.target.closest(".railFollow")) return;
        e.preventDefault();
        this.ui.navigate("artist", artistRow.dataset.artistOpen);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const logo = e.target.closest?.('.logo[data-shell-action="go-home"]');
      if (logo) {
        e.preventDefault();
        this.ui.navigate("home");
      }
    });

    // Rail player controls
    this.on("rail-toggle", () => this.ui.audioPlayer.togglePlay());
    this.on("rail-next", () => this.ui.audioPlayer.skipForward());
    this.on("rail-prev", () => this.ui.audioPlayer.skipBack());
    this.on("rail-shuffle", () => this.ui.audioPlayer.toggleShuffle());
    this.on("rail-fav", () => {
      const song = this.ui.state.currentSong;
      if (song) this.ui.toggleFavAndReRender?.(song.id) ?? this.ui.favorites.toggleSong(song);
      this.syncRailPlayer(true);
    });
  }

  on(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", (e) => { e.preventDefault(); fn(e); });
  }

  handleAction(action, e) {
    const ui = this.ui;
    switch (action) {
      case "go-home":
        ui.navigate("home");
        break;
      case "new-playlist":
        ui.createPlaylist?.() ?? window.createNewPlaylist?.();
        break;
      case "toggle-theme":
        if (window.Prefs) Prefs.applyTheme(Prefs.nextToggle());
        this.syncThemeIcon();
        break;
      case "open-settings":
        ui.showSettingsModal?.();
        break;
      case "open-search":
        ui.openSearch?.();
        break;
      case "open-drawer":
        if (ui.state.currentSong) ui.openPlayerDrawer?.();
        break;
      case "shuffle-play":
        this.shufflePlay();
        break;
      default:
        break;
    }
  }

  // ----------------------------------------------------------
  // Active nav sync (desktop sidebar links + mobile top bar links)
  // ----------------------------------------------------------
  syncActiveNav(page) {
    const map = {
      home: "home",
      artist: "home",
      library: "library",
      favorites: "favorites",
      playlists: "playlists",
      playlist: "playlists",
      createPlaylist: "playlists",
      editPlaylist: "playlists",
    };
    const active = map[page] || "home";

    document
      .querySelectorAll("nav [data-nav]")
      .forEach((btn) => btn.classList.toggle("active", btn.dataset.nav === active));
  }

  // ----------------------------------------------------------
  // Theme icon state
  // ----------------------------------------------------------
  syncThemeIcon() {
    const dark = document.documentElement.getAttribute("data-theme") !== "light" &&
                 document.documentElement.getAttribute("data-theme") !== "bloom";
    document.querySelectorAll('[data-shell-action="toggle-theme"]').forEach((btn) => {
      btn.classList.toggle("is-light", !dark);
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    });
  }

  // ----------------------------------------------------------
  // Top artists rail
  // ----------------------------------------------------------
  pickTopArtists() {
    const index = window.MusicStore?.index || [];
    if (!index.length) return [];
    // Deterministic daily rotation so the rail feels curated, not random on every load
    const day = Math.floor(Date.now() / 86400000);
    const offset = day % index.length;
    const rotated = [...index.slice(offset), ...index.slice(0, offset)];
    return rotated.slice(0, 4);
  }

  renderTopArtists() {
    const host = document.getElementById("rail-top-artists");
    if (!host) return;

    this.topArtists = this.pickTopArtists();
    if (!this.topArtists.length) {
      host.innerHTML = `<p class="railArtistsEmpty">Artists will appear here once your library loads.</p>`;
      return;
    }

    host.innerHTML = this.topArtists
      .map((entry) => {
        const id = String(entry.id ?? "");
        const name = Utils.esc(entry.artist || entry.name || "Unknown");
        const genre = Utils.esc(entry.genre || "Artist");
        const img =
          window.MusicStore?.portraitUrl?.(entry.portrait) ||
          entry.imageUrl ||
          "";
        const following = this.ui.favorites?.isArtist?.(id);
        return `
          <div class="railArtist" data-artist-open="${Utils.esc(id)}" role="button" tabindex="0" aria-label="Open ${name}">
            <img class="railArtistArt" src="${Utils.esc(img)}" alt="${name}" loading="lazy" onerror="this.style.visibility='hidden'">
            <span class="railArtistMeta">
              <span class="railArtistName">${name}</span>
              <span class="railArtistGenre">${genre}</span>
            </span>
            <button type="button" class="railFollow${following ? " is-following" : ""}" data-artist-id="${Utils.esc(id)}">
              ${following ? "Following" : "Follow"}
            </button>
          </div>
        `;
      })
      .join("");
  }

  syncFollowStates() {
    document.querySelectorAll(".railFollow[data-artist-id]").forEach((btn) => {
      const following = !!this.ui.favorites?.isArtist?.(btn.dataset.artistId);
      btn.classList.toggle("is-following", following);
      btn.textContent = following ? "Following" : "Follow";
    });
  }

  toggleFollow(artistId) {
    if (!artistId || !this.ui.favorites?.toggleArtist) return;
    Promise.resolve(this.ui.favorites.toggleArtist(artistId)).then(() => {
      this.syncFollowStates();
    });
  }

  // ----------------------------------------------------------
  // Rail player
  // ----------------------------------------------------------
  syncRailPlayer(force = false) {
    const state = this.ui?.state;
    if (!state) return;

    const song = state.currentSong;
    const art = document.getElementById("rail-player-art");
    const title = document.getElementById("rail-player-title");
    const artist = document.getElementById("rail-player-artist");
    const toggleIcon = document.getElementById("rail-toggle-icon");
    const favBtn = document.getElementById("rail-fav");
    const shuffleBtn = document.getElementById("rail-shuffle");
    const card = document.getElementById("rail-player-card");
    if (!card) return;

    const songChanged = song && String(song.id) !== String(this._railSongId);
    this._railSongId = song ? song.id : null;

    if (art) {
      const src = song ? song.coverUrl || Config.DEFAULT_COVER : Config.DEFAULT_COVER;
      if (art.getAttribute("src") !== src) {
        if (songChanged && song) {
          art.classList.remove("rail-art-in");
        }
        art.src = src;
        if (songChanged && song) {
          requestAnimationFrame(() => art.classList.add("rail-art-in"));
        }
      }
    }
    if (title) title.textContent = song ? song.title : "Nothing playing";
    if (artist) {
      artist.textContent = song
        ? this.ui.state.getArtistById?.(song.artistId)?.artist || song.artist || "Unknown artist"
        : "Pick something you love";
    }
    if (toggleIcon) {
      toggleIcon.innerHTML = state.isPlaying
        ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'
        : '<path d="M8 5v14l11-7z"/>';
    }
    if (favBtn) {
      const isFav = song ? !!this.ui.favorites?.isSong?.(song.id) : false;
      favBtn.classList.toggle("is-favorite", isFav);
      favBtn.toggleAttribute("disabled", !song);
    }
    if (shuffleBtn) {
      shuffleBtn.classList.toggle("is-on", !!state.isShuffled);
    }

    ["rail-toggle", "rail-next", "rail-prev", "rail-shuffle"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.toggleAttribute("disabled", !song);
    });

    this.syncRailProgress();
  }

  syncRailProgress(pctStr, cur, total) {
    const state = this.ui?.state;
    if (!state) return;

    const pct =
      pctStr ?? `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`;
    const fill = document.getElementById("rail-player-progress");
    if (fill) fill.style.width = pct;

    const curEl = document.getElementById("rail-time-cur");
    if (curEl) curEl.textContent = cur ?? state.formatTime(state.currentTime);
    const durEl = document.getElementById("rail-time-dur");
    if (durEl) durEl.textContent = total ?? state.formatTime(state.duration);
  }

  // ----------------------------------------------------------
  // Shuffle play — pick a random album from the library and go
  // ----------------------------------------------------------
  async shufflePlay() {
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const btn = document.querySelector('[data-shell-action="shuffle-play"]');
    btn?.classList.add("is-busy");

    try {
      const pick = index[Math.floor(Math.random() * index.length)];
      const artist = await window.MusicStore.loadArtist(pick.id).catch(() => null);
      const albumStub = artist?.albums?.length
        ? artist.albums[Math.floor(Math.random() * artist.albums.length)]
        : null;
      if (!albumStub) return;

      const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
      const songs = (album?.songs || [])
        .map((s) => window.MusicStore.songCache.get(String(s.id)) || s)
        .filter(Boolean);
      if (!songs.length) return;

      const shuffled = Utils.shuffle(songs);
      this.ui.audioPlayer.playSong(shuffled[0], shuffled, true, "shuffle-play");
    } finally {
      btn?.classList.remove("is-busy");
    }
  }
}

window.AppShell = AppShell;
window.appShell = new AppShell();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.appShell.start());
} else {
  window.appShell.start();
}
