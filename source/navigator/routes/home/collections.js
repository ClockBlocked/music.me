// Home collections methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeCollectionsMethods {
  collectionCard(playlist, index, state) {
    const songs = (playlist.songs || [])
      .map((id) => (typeof state.getSongById === "function" ? state.getSongById(id) : null))
      .filter(Boolean);

    const covers = songs.map((song) => song.coverUrl).filter(Boolean);
    const uniqueCovers = [...new Set(covers)];

    let art = "";
    if (uniqueCovers.length >= 4) {
      art = `<div class="collectionMosaic">${uniqueCovers
        .slice(0, 4)
        .map((cover) => `<img src="${this.esc(cover)}" alt="" loading="lazy">`)
        .join("")}</div>`;
    } else if (uniqueCovers.length >= 1) {
      art = `<img src="${this.esc(uniqueCovers[0])}" alt="" loading="lazy">`;
    } else {
      art = `<div class="collectionEmpty">${Icons.general.playlistAdd(30)}</div>`;
    }

    const name = this.esc(playlist.name);
    const count = songs.length;

    return `
      <div class="collection-card" data-playlist-id="${this.esc(playlist.id)}" data-playlist-name="${name}" role="button" tabindex="0" aria-label="Open collection ${name}">
        <div class="imgBx">${art}</div>
        <div class="content">
          <div class="contentBx"><h3>${name}<br><span>${count} song${count === 1 ? "" : "s"}</span></h3></div>
          <ul class="sci">
            <li style="--i:1"><button type="button" class="icon-btn" data-playlist-play="${this.esc(playlist.id)}" aria-label="Play collection">${Icons.player.play(18)}</button></li>
            <li style="--i:2"><button type="button" class="icon-btn" data-playlist-shuffle="${this.esc(playlist.id)}" aria-label="Shuffle collection">${this.iconShuffle(18)}</button></li>
            <li style="--i:3"><button type="button" class="icon-btn" data-playlist-more="${this.esc(playlist.id)}" aria-label="More options">${Icons.general.moreVert(18)}</button></li>
          </ul>
        </div>
      </div>
    `;
  }

  collectionsInner(state) {
    const playlists = (state.playlists || []).filter((p) => p && p.name);
    if (!playlists.length) {
      return this.emptyNote("No collections yet - create a playlist and it will show up here.");
    }
    return `<div class="collectionGrid">${playlists.map((pl, i) => this.collectionCard(pl, i, state)).join("")}</div>`;
  }

  renderCollections(state) {
    return `
      <article class="musicCard collectionsCard" data-card="collections">
        ${this.sectionTitle({
          icon: this.sectionIconCollections(),
          title: "Collections",
          notes: [this.musicNoteSvg(4), this.musicNoteSvg(3)],
          action: this.actionButton("open-playlists", "Open all collections"),
        })}
        <div class="cardContent" id="homeCollectionsWrap">${this.collectionsInner(state)}</div>
      </article>
    `;
  }

  syncCollections() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    if (!root) return;

    const wrap = root.querySelector("#homeCollectionsWrap");
    if (!wrap) return;

    wrap.innerHTML = this.collectionsInner(this.ui.state);
    wrap.classList.remove("hp-swap");
    void wrap.offsetWidth;
    wrap.classList.add("hp-swap");
  }

  // ----------------------------------------------
  // Rows / cards
  // ----------------------------------------------
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeCollectionsMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
