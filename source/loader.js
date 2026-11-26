// Route-aware module loader. Core player and shell remain persistent.
// This file is a classic script; route files are loaded as native ES modules.
(() => {
  const root = new URL("./navigator/routes/", document.currentScript.src);
  const definitions = Object.freeze({
    home: { files: ["home.js", ...["data", "utils", "render", "loading", "discover", "collections", "sync", "events"].map((name) => `home/${name}.js`)], className: "Home" },
    library: { files: ["library/default.js"], className: "Library" },
    favorites: { files: ["favorites/browse.js"], className: "Favorites" },
    playlists: { files: ["playlists/browse.js"], className: "Playlists" },
    createPlaylist: { files: ["playlists/create.js"], className: "CreatePlaylist" },
    editPlaylist: { files: ["playlists/edit.js"], className: "EditPlaylist" },
    artist: { files: ["artist.js"], className: "Artists" },
    "404": { files: ["error.js"], className: "Error404" },
  });
  const pending = new Map();

  async function importRoute(page) {
    const definition = definitions[page] ?? definitions["404"];
    // Modules have global compatibility exports (window.Home, window.Library, etc).
    // Home methods must be installed AFTER its class facade is evaluated.
    // Home's class must exist before any extension module installs methods.
    // Independent extensions can then load in parallel.
    await import(new URL(definition.files[0], root).href);
    await Promise.all(definition.files.slice(1).map((file) =>
      import(new URL(file, root).href)
    ));
    const Class = window[definition.className];
    if (typeof Class !== "function") {
      throw new Error(`[RouteLoader] ${definition.className} did not register for ${page}`);
    }
    // Install grouped APIs only after Home's dynamic method extensions finish.
    if (page === "home" && !Class.prototype.events) {
      window.MethodNamespaces.install(Class, {
  "data": [
    "buildSongs",
    "buildAlbums",
    "buildGenres",
    "pickFeatured",
    "getCounts",
    "getDiscoverArtists",
    "getRecent",
    "getMostPlayed",
    "getFavSummary"
  ],
  "utils": [
    "shuffle",
    "esc",
    "iconChevronLeft",
    "iconChevronRight",
    "iconShuffle",
    "sectionIconDiscover",
    "sectionIconCollections",
    "sectionIconGenres",
    "musicNoteSvg",
    "sectionTitle",
    "actionButton",
    "emptyNote"
  ],
  "views": [
    "genreTile",
    "renderHeader",
    "playFeatured",
    "renderGenres",
    "songRow",
    "rankRow",
    "renderRecentlyPlayed",
    "recentsEmptyState",
    "renderNewRelease",
    "renderMostPlayed",
    "renderLibraryCard",
    "favoritesCardInner",
    "renderFavoritesCard",
    "render"
  ],
  "loading": [
    "bootstrap",
    "refreshLoadedCards",
    "bootstrapNewRelease",
    "bootstrapDiscover",
    "bootstrapRecent",
    "bootstrapMostPlayed",
    "bootstrapFavorites",
    "patchCard"
  ],
  "discover": [
    "discoverSongRow",
    "discoverArtistCard",
    "discoverNav",
    "renderDiscover",
    "moveDiscover",
    "syncDiscover",
    "rebuildDiscoverCard"
  ],
  "collections": [
    "collectionCard",
    "collectionsInner",
    "renderCollections",
    "syncCollections"
  ],
  "sync": [
    "syncGenreFocus",
    "clearGenreFocus",
    "openGenre",
    "isActive",
    "onRecentlyPlayed",
    "syncNowPlaying",
    "syncFavorites",
    "syncMostPlayed"
  ],
  "events": [
    "bindWhenReady",
    "getRoot",
    "bindEvents",
    "hydrateRow",
    "bindLiveUpdates",
    "handleCardFocus",
    "clearCardFocus"
  ]
});
    }
    return Class;
  }

  window.RouteLoader = Object.freeze({
    load(page) {
      const key = Object.hasOwn(definitions, page) ? page : "404";
      if (!pending.has(key)) {
        const promise = importRoute(key).catch((error) => {
          pending.delete(key);
          throw error;
        });
        pending.set(key, promise);
      }
      return pending.get(key);
    },
    preload(page) {
      return this.load(page);
    },
    getLoaded(page) {
      return pending.get(page) ?? null;
    },
  });
})();
