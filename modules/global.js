// ============================================================
// global.js — single entry point for the entire app.
// Location: /modules/global.js
//
// This is the ONLY module the HTML should load.
// It imports every other module in dependency order and bootstraps
// all runtime singletons onto window.* for legacy inline handlers.
// ============================================================

// ---------- 1. Side-effect libraries (load first) ----------
// import "https://clockblocked.github.io/music.me/modules/progress.js";

// ---------- 2. Core utilities ----------
import {
  CONFIG,
  Utils,
  Prefs,
  IdUtils,
  ColorExtractor,
  Spinner
} from "https://clockblocked.github.io/music.me/modules/utilities.js";

// ---------- 3. Theme bootstrap (reads localStorage, sets data-theme/accent) ----------
//  import { Themes } from "https://clockblocked.github.io/music.me/modules/theming.js";

// ---------- 4. UI primitives ----------
import { Icons } from "https://clockblocked.github.io/music.me/modules/icons.js";
import { Popups } from "https://clockblocked.github.io/music.me/modules/overlays/popups.js";

import { metadata } from "https://clockblocked.github.io/music.me/modules/library.js";

// ---------- 5. State / audio engine ----------
import { PlayerState, AudioEngine } from "https://clockblocked.github.io/music.me/modules/background.js";

// ---------- 6. Feature modules ----------
import { FavoritesPlaylists } from "https://clockblocked.github.io/music.me/modules/FavoritesPlaylists.js";
import { SaveToLibraryDrawer, createSaveDrawer } from "https://clockblocked.github.io/music.me/modules/ytSaver.js";

// ---------- 7. Page renderers ----------
import {
  Home,
  Library,
  Playlists,
  Favorites,
  Artists,
  EditPlaylist,
  Error404
} from "https://clockblocked.github.io/music.me/modules/layouts.js";

// ---------- 8. Player UI ----------
import { PlayerManager, MediaSessionManager } from "https://clockblocked.github.io/music.me/modules/players.js";

// ---------- 9. App orchestration ----------
import {
  Router,
  AppListeners,
  ContentEventManager,
  OfflineCacheManager,
  SearchManager,
  UIManager,
  ContextMenu
} from "https://clockblocked.github.io/music.me/modules/builder.js";

// ============================================================
// Bootstrap
// ============================================================

if (!window.Prefs) {
  window.Prefs = Prefs;
}

if (typeof window.Prefs.init === "function") {
  window.Prefs.init();
}

window.colorExtractor = new ColorExtractor();

window.state = new PlayerState();
window.audioPlayer = new AudioEngine(window.state);

window.popups = new Popups({ ui: null });

window.favoritesPlaylists = new FavoritesPlaylists(window.state);
window.uiManager = new UIManager(
  window.state,
  window.audioPlayer,
  window.favoritesPlaylists
);
window.popups.ui = window.uiManager;

// Dynamic right-click context menu (options depend on the data-* attributes
// of whatever was right-clicked: song / album / artist / playlist).
window.contextMenu = new ContextMenu();

// ytSaver auto-initializes on import; this is a fallback to ensure a drawer instance exists.
window.saveDrawer =
  window.saveToLibraryDrawer || createSaveDrawer(window.uiManager);

window.offlineCache = new OfflineCacheManager(window.state);

// Legacy global helpers referenced by inline onclick handlers.
window.closeModal = () => window.popups?.closeType("modal");

window.createNewPlaylist = () => window.favoritesPlaylists.createNewPlaylist();
window.renamePlaylist = (id) => window.favoritesPlaylists.renamePlaylist(id);
window.deletePlaylist = (id) => window.favoritesPlaylists.deletePlaylist(id);
window.addSongToPlaylist = (plId, songId) =>
  window.favoritesPlaylists.addSongToPlaylist(plId, songId);
window.toggleFavAndReRender = (id) =>
  window.uiManager.toggleFavAndReRender(id);

window.mediaSessionManager = new MediaSessionManager(
  window.state,
  window.audioPlayer
);
window.audioPlayer.setMediaSessionManager(window.mediaSessionManager);

// ============================================================
// Optional re-exports for dynamic imports / debugging.
// DO NOT import global.js from any other module — that creates
// a circular dependency. These exports are for the console/tests only.
// ============================================================
export {
  CONFIG,
  Utils,
  Prefs,
  IdUtils,
  ColorExtractor,
  Spinner,
  Icons,
  Popups,
  PlayerState,
  AudioEngine,
  FavoritesPlaylists,
  SaveToLibraryDrawer,
  createSaveDrawer,
  Home,
  Library,
  Playlists,
  Favorites,
  Artists,
  EditPlaylist,
  Error404,
  PlayerManager,
  MediaSessionManager,
  Router,
  AppListeners,
  ContentEventManager,
  OfflineCacheManager,
  SearchManager,
  UIManager,
  ContextMenu
};

export const state = window.state;
export const audioPlayer = window.audioPlayer;
export const uiManager = window.uiManager;
export const favoritesPlaylists = window.favoritesPlaylists;
export const popups = window.popups;
export const offlineCache = window.offlineCache;
export const mediaSessionManager = window.mediaSessionManager;