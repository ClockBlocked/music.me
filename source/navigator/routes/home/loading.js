// Home loading methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeLoadingMethods {
  async bootstrap() {
    if (this._bootstrapPromise) return this._bootstrapPromise;

    this._bootstrapPromise = (async () => {
      try {
        await Promise.all([
          this.bootstrapNewRelease(),
          this.bootstrapDiscover(),
          this.bootstrapRecent(),
          this.bootstrapMostPlayed(),
          this.bootstrapFavorites(),
        ]);
      } catch (e) {
        console.error("[Home.bootstrap] error:", e);
      } finally {
        this._bootstrapPromise = null;
      }
      this.refreshLoadedCards();
    })();

    return this._bootstrapPromise;
  }

  refreshLoadedCards() {
    this.patchCard("releases",     this.renderNewRelease(this._featuredRelease));
    this.patchCard("discover",     this.renderDiscover(this.ui.state));
    this.patchCard("recents",      this.renderRecentlyPlayed(this.getRecent(this.ui.state)));
    this.patchCard("most-played",  this.renderMostPlayed(this.getMostPlayed(this.ui.state)));
    this.patchCard("favorites",    this.renderFavoritesCard());
  }

  async bootstrapNewRelease() {
    if (this._featuredRelease) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const pick = this.shuffle(index)[0];
    const artist = await window.MusicStore.loadArtist(pick.id).catch(() => null);
    if (!artist?.albums?.length) return;

    const albumStub = this.shuffle(artist.albums)[0];
    const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
    if (!album) return;

    this._featuredRelease = {
      artistId: artist.id,
      artistName: artist.artist,
      albumId: album.id,
      albumName: album.album,
      coverUrl: album.coverUrl,
    };
  }

  async bootstrapDiscover() {
    if (Array.isArray(this.discoverCache) && this.discoverCache.length) return;
    const index = window.MusicStore?.index || [];
    if (!index.length) return;

    const picked = this.shuffle(index).slice(0, this.discoverArtistLimit);
    const artists = await Promise.all(
      picked.map((a) => window.MusicStore.loadArtist(a.id).catch(() => null))
    );

    const loaded = await Promise.all(artists.map(async (artist) => {
      if (!artist?.albums?.length) return null;
      const albumStub = this.shuffle(artist.albums)[0];
      const album = await window.MusicStore.loadAlbum(artist.id, albumStub.id).catch(() => null);
      if (!album?.songs?.length) return null;
      return {
        artistId: artist.id,
        artistName: artist.artist,
        genre: artist.genre,
        imageUrl: artist.imageUrl,
        songs: this.shuffle(album.songs).slice(0, this.discoverSongsPerArtist),
      };
    }));

    this.discoverCache = loaded.filter(Boolean);
    this.discoverIndex = 0;
  }

  async bootstrapRecent() {
    const recent = (this.ui.state.recentlyPlayed || []).slice(0, this.recentLimit);
    if (!recent.length) return;

    const toLoad = new Map();
    for (const ref of recent) {
      if (window.MusicStore.songCache.has(String(ref.id))) continue;
      if (ref.artistId && ref.albumId) {
        toLoad.set(`${ref.artistId}/${ref.albumId}`, { a: ref.artistId, al: ref.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  async bootstrapMostPlayed() {
    const entries = this.getMostPlayed(this.ui.state);
    if (!entries.length) return;

    const toLoad = new Map();
    for (const { song } of entries) {
      if (!song) continue;
      if (window.MusicStore.songCache.has(String(song.id))) continue;
      if (song.artistId && song.albumId) {
        toLoad.set(`${song.artistId}/${song.albumId}`, { a: song.artistId, al: song.albumId });
      }
    }
    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  async bootstrapFavorites() {
    const state = this.ui.state;
    const toLoad = new Map();
    const scan = (arr) => {
      for (const f of arr || []) {
        if (typeof f === "object" && f.artistId && f.albumId &&
            !window.MusicStore.songCache.has(String(f.id))) {
          toLoad.set(`${f.artistId}/${f.albumId}`, { a: f.artistId, al: f.albumId });
        }
      }
    };
    scan(state.favoriteSongs);
    scan(state.favoriteAlbums);
    if (!toLoad.size) return;

    await Promise.all(
      Array.from(toLoad.values()).map(({ a, al }) =>
        window.MusicStore.loadAlbum(a, al).catch(() => null)
      )
    );
  }

  patchCard(cardKey, html) {
    if (!this.isActive()) {
      return;
    }
    const root = this.getRoot();
    if (!root) return;
    const grid = root.querySelector(".bentoGrid");
    if (!grid) return;

    const existing = grid.querySelector(`[data-card="${cardKey}"]`);
    if (!html) { existing?.remove(); return; }

    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;

    fresh.classList.add("card-patched");
    fresh.addEventListener("animationend", () => fresh.classList.remove("card-patched"), { once: true });

    if (existing) {
      existing.replaceWith(fresh);
    } else {
      const ORDER = ["releases", "recents", "library", "most-played", "favorites", "discover", "collections", "genres"];
      const idx = ORDER.indexOf(cardKey);
      let inserted = false;
      for (const child of grid.children) {
        if (ORDER.indexOf(child.dataset.card) > idx) {
          grid.insertBefore(fresh, child);
          inserted = true;
          break;
        }
      }
      if (!inserted) grid.appendChild(fresh);
    }
    this.syncNowPlaying();
    window.heartManager?.bindAll(fresh);
  }
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeLoadingMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
