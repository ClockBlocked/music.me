import { Icons } from "./icons.js";

const CONFIRM_MS = 5e3;

const REMOVE_MS = 500;

export class HeartButton {
  constructor(el, type, id, manager) {
    this.el = el;
    this.type = type;
    this.id = String(id);
    this.manager = manager;
    this.isHovering = false;
    this.phase = null;
    this._timer = null;
    this._onEnter = () => {
      this.isHovering = true;
      this.render();
    };
    this._onLeave = () => {
      this.isHovering = false;
      this.render();
    };
    this._onClick = e => this._handleClick(e);
    el.addEventListener("mouseenter", this._onEnter);
    el.addEventListener("mouseleave", this._onLeave);
    el.addEventListener("click", this._onClick);
    el.classList.add("heart-bound");
    this.render();
  }
  get isLiked() {
    return this.manager.store.isFavorite(this.type, this.id);
  }
  _icon() {
    const H = Icons.hearts;
    if (this.phase === "confirm") return H.likedConfirmation();
    if (this.phase === "remove") return H.likedRemove();
    if (this.isLiked) return this.isHovering ? H.likedError() : H.liked();
    return this.isHovering ? H.likedHover() : H.notLiked();
  }
  render() {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }
    this.el.innerHTML = this._icon();
    const liked = this.isLiked;
    this.el.classList.toggle("favorited", liked);
    this.el.classList.toggle("is-favorite", liked);
    this.el.classList.toggle("heart-busy", this.phase !== null);
    this.el.setAttribute("aria-pressed", String(liked));
    this.el.setAttribute("title", liked ? "Remove from favorites" : "Add to favorites");
  }
  _handleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (this.phase) return;
    if (this.isLiked) {
      this.manager.setFavorite(this.type, this.id, false);
      this.phase = "remove";
      this.render();
      this._timer = setTimeout(() => {
        this.phase = null;
        this._timer = null;
        this.render();
      }, REMOVE_MS);
    } else {
      this.manager.setFavorite(this.type, this.id, true);
      this.phase = "confirm";
      this.render();
      this._timer = setTimeout(() => {
        this.phase = null;
        this._timer = null;
        this.render();
      }, CONFIRM_MS);
    }
  }
  sync() {
    if (this.phase) return;
    this.render();
  }
  destroy() {
    clearTimeout(this._timer);
    this._timer = null;
    this.el.removeEventListener("mouseenter", this._onEnter);
    this.el.removeEventListener("mouseleave", this._onLeave);
    this.el.removeEventListener("click", this._onClick);
    this.el.classList.remove("heart-bound");
    this.manager._instances.delete(this.el);
  }
}

export class FavoritesStore {
  constructor(favoritesPlaylists, state) {
    this.fav = favoritesPlaylists;
    this.state = state;
  }
  isFavorite(type, id) {
    const f = this.fav;
    switch (type) {
     case "song":
      return f.isSongFavorite(id);

     case "artist":
      return f.isArtistFavorite(id);

     case "album":
      return f.isAlbumFavorite(id);

     case "playlist":
      return typeof f.isPlaylistFavorite === "function" ? f.isPlaylistFavorite(id) : false;

     default:
      return false;
    }
  }
  setFavorite(type, id, value) {
    if (this.isFavorite(type, id) === value) return;
    const f = this.fav;
    switch (type) {
     case "song":
      {
        const song = this.state.getSongById(id);
        if (song) f.toggleFavoriteSong(song);
        break;
      }

     case "artist":
      f.toggleFavoriteArtist(id);
      break;

     case "album":
      f.toggleFavoriteAlbum(id);
      break;

     case "playlist":
      if (typeof f.toggleFavoritePlaylist === "function") f.toggleFavoritePlaylist(id);
      break;
    }
  }
}

export class HeartButtonManager {
  constructor(favoritesPlaylists, state) {
    this.store = new FavoritesStore(favoritesPlaylists, state);
    this._instances = new Map;
    window.addEventListener("mybeats:favorites-changed", e => {
      const {type: type, id: id} = e.detail || {};
      if (type && id != null) this._syncEntity(type, String(id)); else this._syncAll();
    });
    this._observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) this.bindAll(node);
        }
      }
    });
    const startObserving = () => this._observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    if (document.body) startObserving(); else document.addEventListener("DOMContentLoaded", startObserving, {
      once: true
    });
  }
  static describe(el) {
    const d = el.dataset || {};
    if (d.heartType && d.heartId) return {
      type: d.heartType,
      id: d.heartId
    };
    if (d.favSong) return {
      type: "song",
      id: d.favSong
    };
    if (d.artistHeart) return {
      type: "artist",
      id: d.artistHeart
    };
    if (d.heartPlaylist) return {
      type: "playlist",
      id: d.heartPlaylist
    };
    if (d.action === "toggle-favorite-album" && d.albumId) return {
      type: "album",
      id: d.albumId
    };
    return null;
  }
  static get SELECTOR() {
    return [ "[data-heart-type][data-heart-id]", "[data-fav-song]", "[data-artist-heart]", "[data-heart-playlist]", '[data-action="toggle-favorite-album"][data-album-id]' ].join(",");
  }
  bindAll(root = document) {
    if (root instanceof HTMLElement && root.matches?.(HeartButtonManager.SELECTOR)) {
      this._bindOne(root);
    }
    const els = root.querySelectorAll ? root.querySelectorAll(HeartButtonManager.SELECTOR) : [];
    els.forEach(el => this._bindOne(el));
  }
  _bindOne(el) {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === "") return;
    const existing = this._instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) {
        existing.sync();
        return;
      }
      existing.destroy();
    }
    this._instances.set(el, new HeartButton(el, info.type, info.id, this));
  }
  _syncEntity(type, id) {
    for (const hb of this._instances.values()) {
      if (hb.type === type && hb.id === id) hb.sync();
    }
  }
  _syncAll() {
    for (const hb of this._instances.values()) hb.sync();
  }
  toggle(type, id) {
    const sid = String(id);
    const next = !this.store.isFavorite(type, sid);
    this.store.setFavorite(type, sid, next);
    this.notifyChanged(type, sid);
  }
  notifyChanged(type, id) {
    window.dispatchEvent(new CustomEvent("mybeats:favorites-changed", {
      detail: {
        type: type,
        id: String(id)
      }
    }));
  }
  prune() {
    for (const hb of [ ...this._instances.values() ]) {
      if (!hb.el.isConnected) hb.destroy();
    }
  }
  destroy() {
    this._observer.disconnect();
    for (const hb of [ ...this._instances.values() ]) hb.destroy();
    this._instances.clear();
  }
  setFavorite(type, id, value) {
    this.store.setFavorite(type, id, value);
    this.notifyChanged(type, id);
  }
}
