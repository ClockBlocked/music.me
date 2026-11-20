// Home data methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeDataMethods {
  buildSongs(state) {
    return window.pagesActions?.buildSongs() || [];
  }

  buildAlbums(state) {
    return window.pagesActions?.buildAlbums() || [];
  }

  buildGenres(state) {
    const index = window.MusicStore?.index || [];
    const map = new Map();
    index.forEach((entry) => {
      const name = (entry.genre || "").trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, count: 0, coverUrl: "" });
      map.get(name).count += 1;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  pickFeatured(state) {
    return this._featuredRelease || null;
  }

  getCounts(state) {
    const index = window.MusicStore?.index || [];
    return {
      songs: window.MusicStore?.songCache?.size || 0,
      albums: Array.from(window.MusicStore?.albumCache?.values() || []).filter((a) => !a._discographyOnly).length,
      artists: index.length,
      playlists: (state.playlists || []).length,
    };
  }

  getDiscoverArtists(state) {
    return this.discoverCache || [];
  }

  getRecent(state) {
    return (state.recentlyPlayed || [])
      .slice(0, this.recentLimit)
      .map((song) => state.getSongById(song.id) || song)
      .filter(Boolean);
  }

  getMostPlayed(state) {
    const songs =
      typeof state.getMostPlayed === "function" ? state.getMostPlayed(this.mostPlayedLimit) : [];
    return songs.map((song) => ({
      song,
      plays: state.getPlayCount ? state.getPlayCount(song.id) : 0,
    }));
  }

  getFavSummary(state) {
    const songCount = (state.favoriteSongs || []).length;
    const albumCount = (state.favoriteAlbums || []).length;
    const artistCount = (state.favoriteArtists || []).length;

    let coverUrl = "";
    const latestSongId = [...(state.favoriteSongs || [])].pop();
    const latestSong = latestSongId != null ? state.getSongById(latestSongId) : null;

    if (latestSong?.coverUrl) {
      coverUrl = latestSong.coverUrl;
    } else {
      const latestAlbumId = [...(state.favoriteAlbums || [])].pop();
      const latestAlbum = latestAlbumId != null ? state.getAlbumById(latestAlbumId) : null;
      if (latestAlbum?.coverUrl) coverUrl = latestAlbum.coverUrl;
    }

    return { songCount, albumCount, artistCount, coverUrl };
  }
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeDataMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
