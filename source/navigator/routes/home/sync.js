// Home sync methods. Original implementations retained verbatim.
// Install descriptors to retain method names and this-binding compatibility.
(() => {
  class HomeSyncMethods {
  syncGenreFocus() {
    const root = this.getRoot();
    if (!root) return;

    const marquee = root.querySelector("[data-genre-marquee]");
    if (!marquee) return;

    const focused = this.focusedGenre;
    marquee.classList.toggle("has-focus", !!focused);

    marquee.querySelectorAll(".genreTile").forEach((tile) => {
      const isFocus = !!focused && tile.dataset.genre === focused;
      tile.classList.toggle("is-focused", isFocus);
      tile.setAttribute("aria-pressed", isFocus ? "true" : "false");
    });
  }

  clearGenreFocus() {
    if (!this.focusedGenre) return;
    this.focusedGenre = null;
    this.syncGenreFocus();
  }

  openGenre(name) {
    if (!name) return;

    if (window.pagesActions?.openGenre) {
      window.pagesActions.openGenre(name);
      return;
    }
    if (window.pagesActions?.playGenre) {
      window.pagesActions.playGenre(name);
      return;
    }
    this.ui.navigate("library");
  }

  // ----------------------------------------------
  // Collections
  // ----------------------------------------------

  isActive() {
    return this.ui.state.currentPage === "home" && !!this.getRoot();
  }

  onRecentlyPlayed(song) {
    if (!song || !this.isActive()) return;

    const resolved = this.ui.state.getSongById(song.id) || song;
    const list = this.getRoot().querySelector("#recentSongs");
    if (!list) return;

    list.querySelector(".hp-empty")?.remove();
    list.querySelector(".recentsEmpty")?.remove();

    const sel = `.song[data-song-id="${String(resolved.id).replace(/"/g, '\\"')}"]`;
    const existing = list.querySelector(sel);
    const kids = [...list.querySelectorAll(".song")];
    const tops = new Map(kids.map((k) => [k, k.getBoundingClientRect().top]));

    const animateSiblings = () => {
      kids.forEach((k) => {
        const delta = (tops.get(k) ?? 0) - k.getBoundingClientRect().top;
        if (!delta) return;
        k.style.transition = "none";
        k.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          k.style.transition = "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)";
          k.style.transform = "";
        });
      });
    };

    if (existing) {
      if (list.firstElementChild !== existing) {
        list.prepend(existing);
        animateSiblings();
      }
      existing.classList.remove("song-bump");
      void existing.offsetWidth;
      existing.classList.add("song-bump");
      setTimeout(() => existing.classList.remove("song-bump"), 900);
    } else {
      const tpl = document.createElement("template");
      tpl.innerHTML = this.songRow(resolved).trim();
      const row = tpl.content.firstElementChild;
      row.classList.add("song-enter");
      list.prepend(row);
      animateSiblings();
      this.hydrateRow(row);
      row.addEventListener("animationend", () => row.classList.remove("song-enter"), { once: true });
    }

    this.syncNowPlaying();

    const rows = [...list.querySelectorAll(".song")];
    rows.slice(this.recentLimit).forEach((row) => {
      row.classList.add("song-exit");
      row.addEventListener("animationend", () => row.remove(), { once: true });
      setTimeout(() => row.remove(), 400);
    });
  }

  syncNowPlaying() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    const id = this.ui.state.currentSong?.id;

    root
      .querySelectorAll(".song.is-playing, .rankItem.is-playing, .discoverSong.is-playing")
      .forEach((el) => el.classList.remove("is-playing"));

    if (id == null) return;

    const sel = `[data-song-id="${String(id).replace(/"/g, '\\"')}"]`;
    root
      .querySelectorAll(`.song${sel}, .rankItem${sel}, .discoverSong${sel}`)
      .forEach((el) => el.classList.add("is-playing"));
  }

  syncFavorites() {
    if (!this.isActive()) return;
    const root = this.getRoot();
    const card = root.querySelector("#homeFavoritesCard");
    if (!card) return;

    card.innerHTML = this.favoritesCardInner();
    card.classList.remove("hp-swap");
    void card.offsetWidth;
    card.classList.add("hp-swap");
  }

  syncMostPlayed() {
    if (!this.isActive()) return;

    const list = this.getRoot().querySelector("#mostPlayedSongs");
    if (!list) return;

    const entries = this.getMostPlayed(this.ui.state);
    list.innerHTML = entries.length
      ? entries.map((e, i) => this.rankRow(e, i)).join("")
      : this.emptyNote("Your most played songs will show up here once you start listening.");

    list.classList.remove("hp-swap");
    void list.offsetWidth;
    list.classList.add("hp-swap");
    this.syncNowPlaying();
  }

  // ----------------------------------------------
  // Card focus
  // ----------------------------------------------
  }
  const descriptors = Object.getOwnPropertyDescriptors(HomeSyncMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(Home.prototype, descriptors);
})();
