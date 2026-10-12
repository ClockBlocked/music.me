(async function initLibrary() {
  if (!window.MusicStore || !window.MusicStore.index) {
    const errDiv = document.createElement("div");
    errDiv.style.cssText =
      "color:#ff6b6b;font-family:monospace;padding:2rem;white-space:pre-wrap;";
    errDiv.textContent =
      "Initialization failed:\nwindow.MusicStore.index is missing. Ensure the index is loaded before boot.js.";
    document.body.appendChild(errDiv);
    return;
  }

  window.MusicStore.artists = window.MusicStore.artists || {};
  window.MusicStore.songCache = new Map();
  window.MusicStore.albumCache = new Map();

  // In-flight promise caches so concurrent callers share one fetch.
  const _artistInflight = new Map();
  const _albumInflight = new Map();

  const json = async (url) => {
    const r = await fetch(url, { cache: "default" });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  };

  // ------------------------------------------------------------------
  // loadArtist(artistId)  ->  { id, name, genre, portrait, albums:[…] }
  //   Fetches artist.json + discography.json on demand.
  //   Seeds albumCache with lightweight records (no songs yet).
  // ------------------------------------------------------------------
  window.MusicStore.loadArtist = async function (artistId) {
    const id = String(artistId);

    if (window.MusicStore.artists[id]) return window.MusicStore.artists[id];
    if (_artistInflight.has(id)) return _artistInflight.get(id);

    const promise = (async () => {
      const base = `/content/artists/${id}`;
      const [artist, discography] = await Promise.all([
        json(`${base}/artist.json`),
        json(`${base}/discography.json`).catch(() => ({ albums: [] })),
      ]);

      const merged = {
        ...artist,
        id: artist.id ?? id,
        artist: artist.name ?? artist.artist ?? "",
        albums: discography.albums || [],
      };

      // Seed album cache with what discography knows. Songs are NOT loaded here.
      for (const a of merged.albums) {
        const aid = String(a.id);
        if (!window.MusicStore.albumCache.has(aid)) {
          window.MusicStore.albumCache.set(aid, {
            id: a.id,
            title: a.title ?? a.album ?? "",
            year: a.year,
            artwork: a.artwork,
            artistId: merged.id,
            artistName: merged.artist,
            songCount: a.songCount,
            _discographyOnly: true, // marker so loadAlbum knows to fetch full data
          });
        }
      }

      window.MusicStore.artists[id] = merged;
      _artistInflight.delete(id);
      return merged;
    })();

    _artistInflight.set(id, promise);
    return promise;
  };

  // ------------------------------------------------------------------
  // loadAlbum(artistId, albumId)  ->  full album with songs[]
  //   Fetches album.json on demand and hydrates songCache.
  // ------------------------------------------------------------------
  window.MusicStore.loadAlbum = async function (artistId, albumId) {
    const aid = String(albumId);

    const cached = window.MusicStore.albumCache.get(aid);
    if (cached && !cached._discographyOnly) return cached;
    if (_albumInflight.has(aid)) return _albumInflight.get(aid);

    const promise = (async () => {
      const url = `/content/artists/${artistId}/albums/${aid}/album.json`;
      const album = await json(url);

      // Make sure we have the artist record for names/genre/portrait.
      const artist = await window.MusicStore.loadArtist(artistId).catch(
        () => null,
      );

      const record = {
        ...album,
        id: album.id ?? aid,
        artistId: album.artistId ?? artistId,
        artistName: artist?.artist ?? "",
        title: album.title ?? album.album ?? "",
        _discographyOnly: false,
      };

      window.MusicStore.albumCache.set(aid, record);

      for (const song of record.songs || []) {
        const sources = song.sources || [];
        window.MusicStore.songCache.set(String(song.id), {
          ...song,
          artistId: record.artistId,
          albumId: record.id,
          artist: record.artistName,
          album: record.title,
          artwork: record.artwork,
          portrait: artist?.portrait,
          genre: artist?.genre || "Unknown",
          // Provide `source` (first URL) for legacy callers, plus the full array.
          source: sources[0]?.src || "",
          sources,
        });
      }

      _albumInflight.delete(aid);
      return record;
    })();

    _albumInflight.set(aid, promise);
    return promise;
  };

  // Prefetch a list of albums for an artist (e.g. on hover).
  window.MusicStore.prefetchAlbums = function (artistId, albumIds) {
    for (const id of albumIds) {
      window.MusicStore.loadAlbum(artistId, id).catch(() => {});
    }
  };

  window.metadata = window.MusicStore.index;
  window.state.enrichedLibrary = window.MusicStore.index;

  window.uiManager = new UIManager(
    window.state,
    window.audioPlayer,
    window.favoritesPlaylists,
  );
  window.popups.ui = window.uiManager;
  window.heartManager.store.state = window.state;
})();

// ------------------------------------------------------------------
// URL helpers for the new shapes
// ------------------------------------------------------------------
function artworkUrl(artwork, size = 320) {
  if (!artwork) return "";
  if (typeof artwork === "string") return artwork;
  return (
    artwork[size] || artwork["320"] || artwork["640"] || artwork["160"] || ""
  );
}

function portraitUrl(portrait, size = 160) {
  if (!portrait) return "";
  if (typeof portrait === "string") return portrait;
  return (
    portrait[size] ||
    portrait["160"] ||
    portrait["320"] ||
    portrait["640"] ||
    ""
  );
}

function pickSource(sources) {
  if (!sources || !sources.length) return "";
  return sources[0].src || "";
}

// ------------------------------------------------------------------
// pagesActions (unchanged signatures + new helpers)
// ------------------------------------------------------------------
window.pagesActions = {
  buildSongs() {
    if (!window.MusicStore?.songCache) return [];
    return Array.from(window.MusicStore.songCache.values());
  },

  getSongById(id) {
    if (!window.MusicStore?.songCache) return null;
    return window.MusicStore.songCache.get(String(id)) || null;
  },

  getArtistById(id) {
    const sid = String(id);
    if (window.MusicStore?.artists?.[sid])
      return window.MusicStore.artists[sid];
    return (
      window.MusicStore?.index?.find(
        (a) => String(a.id) === sid || a.artist === sid,
      ) || null
    );
  },

  getAlbumById(id) {
    if (!window.MusicStore?.albumCache) return null;
    return window.MusicStore.albumCache.get(String(id)) || null;
  },

  getAllSongs() {
    if (!window.MusicStore?.songCache) return [];
    return Array.from(window.MusicStore.songCache.values());
  },

  // New helpers, so callers don't need to know about the shapes.
  artworkUrl,
  portraitUrl,
  pickSource,
};
