// Home discover methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeDiscoverMethods {
  discoverSongRow(song, index) {
    const isPlaying = String(this.ui.state.currentSong?.id) === String(song.id);
    const title = this.esc(song.title || "Unknown Title");
    const album = this.esc(song.album || "");

    return `
      <button type="button" class="discoverSong${isPlaying ? " is-playing" : ""}" data-song-id="${this.esc(song.id)}" data-artist-id="${this.esc(song.artistId ?? "")}" data-album-id="${this.esc(song.albumId ?? "")}" aria-label="Play ${title}">
        <span class="discoverSongIndex" aria-hidden="true">${index + 1}</span>
        <span class="discoverSongArt" aria-hidden="true"><img src="${this.esc(song.coverUrl || "")}" alt="" loading="lazy"></span>
        <span class="discoverSongInfo"><span class="discoverSongTitle">${title}</span><span class="discoverSongAlbum">${album}</span></span>
        <span class="discoverSongPlay" aria-hidden="true">${Icons.player.play(14)}</span>
      </button>
    `;
  }

  discoverArtistCard(artist) {
    const name = this.esc(artist.artistName);
    return `
      <div class="discoverArtist" data-artist-id="${this.esc(artist.artistId)}">
        <div class="discoverArtistHead">
          <div class="discoverArtistArt"><img src="${this.esc(artist.imageUrl || "")}" alt="${name}" loading="lazy"></div>
          <div class="discoverArtistMeta"><span class="discoverArtistName">${name}</span><span class="discoverArtistGenre">${this.esc(artist.genre || "Artist")}</span></div>
          <button type="button" class="discoverArtistOpen" data-artist-open="${this.esc(artist.artistId)}" aria-label="Open ${name}">${this.iconChevronRight(15)}</button>
        </div>
        <div class="discoverSongList">${artist.songs.map((s, i) => this.discoverSongRow(s, i)).join("")}</div>
      </div>
    `;
  }

  discoverNav(index, total) {
    return `
      <div class="discoverNav">
        <button type="button" class="cardAction" data-discover-refresh aria-label="Shuffle discoveries">${this.iconShuffle(15)}</button>
        <span class="discoverCounter" data-discover-counter>${index + 1} / ${total}</span>
        <button type="button" class="cardAction" data-discover-prev aria-label="Previous artist" ${index <= 0 ? "disabled" : ""}>${this.iconChevronLeft(16)}</button>
        <button type="button" class="cardAction" data-discover-next aria-label="Next artist" ${index >= total - 1 ? "disabled" : ""}>${this.iconChevronRight(16)}</button>
      </div>
    `;
  }

  renderDiscover(state) {
    const artists = this.getDiscoverArtists(state);
    if (!artists.length) return "";

    let index = Number.isFinite(this.discoverIndex) ? this.discoverIndex : 0;
    index = Math.max(0, Math.min(artists.length - 1, index));
    this.discoverIndex = index;

    return `
      <article class="musicCard discoverCard" data-card="discover">
        ${this.sectionTitle({
          icon: this.sectionIconDiscover(),
          title: "Discover",
          notes: [this.musicNoteSvg(2)],
          action: this.discoverNav(index, artists.length),
        })}
        <div class="discoverViewport"><div class="discoverTrack" style="transform: translateX(-${index * 100}%)">${artists.map((a) => this.discoverArtistCard(a)).join("")}</div></div>
      </article>
    `;
  }

  moveDiscover(delta) {
    const artists = this.discoverCache || [];
    if (!artists.length) return;

    const current = Math.max(0, Math.min(artists.length - 1, this.discoverIndex || 0));
    const next = Math.max(0, Math.min(artists.length - 1, current + delta));
    if (next === current) return;

    this.discoverIndex = next;
    this.syncDiscover();
  }

  syncDiscover() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const track = root.querySelector(".discoverTrack");
    if (!track) return;

    const total = track.children.length;
    if (!total) return;

    const index = Math.max(0, Math.min(total - 1, this.discoverIndex || 0));
    this.discoverIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;

    const prev = root.querySelector("[data-discover-prev]");
    const next = root.querySelector("[data-discover-next]");
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= total - 1;

    const counter = root.querySelector("[data-discover-counter]");
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }

  rebuildDiscoverCard() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const card = root.querySelector('[data-card="discover"]');
    const html = this.renderDiscover(this.ui.state);

    if (!card) {
      if (!html) return;
      const grid = root.querySelector(".bentoGrid");
      if (!grid) return;
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      if (fresh) grid.appendChild(fresh);
      this.syncNowPlaying();
      return;
    }

    if (!html) {
      card.remove();
      return;
    }

    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const fresh = tpl.content.firstElementChild;
    if (!fresh) return;
    card.replaceWith(fresh);
    this.syncNowPlaying();
  }

  // ----------------------------------------------
  // Genres
  // ----------------------------------------------
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeDiscoverMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
