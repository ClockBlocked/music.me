




(function () {
  const script = document.currentScript;
  window.__MYBEATS_BASE__ =
    window.__MYBEATS_BASE__ ||
    (script && script.src ? script.src : window.location.href);
})();

// ////////////////////////////////////////////////////////////////////////
// Config
// ////////////////////////////////////////////////////////////////////////
const Config = {
  IMAGE_BASE: {
    artist:
      "https://mybeats.cloud/content/artistPortraits/",
    album:
      "https://mybeats.cloud/content/albumCovers/",
  },
  FAVOURITES: {
    favSongs: "Songs",
    favArtists: "Artists",
    favAlbums: "Albums",
    favPlaylists: "FavPlaylists",
    playlists: "Playlists",
  },
  DEFAULT_COVER:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ccircle cx="50" cy="50" r="30" fill="%23666"/%3E%3C/svg%3E',
  QUEUE: { recentMax: 30 },
  VOLUME: { default: 1 },
};

// ////////////////////////////////////////////////////////////////////////
// Utils
// ////////////////////////////////////////////////////////////////////////
class Utils {
  static slug(name) {
    return name
      ? name
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase()
          .trim() || "default"
      : "default";
  }

  static clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  static shuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static fmtTime(seconds) {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  static id(val) {
    return val == null ? "" : String(val);
  }

  static newId(prefix = "id") {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  static esc(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  static fmtDuration(raw) {
    if (raw === null || raw === undefined || raw === "") return "";
    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return "";
      if (text.includes(":") || /[a-zA-Z]/.test(text)) return text;
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) return text;
      return Utils.fmtTime(parsed);
    }
    if (!Number.isFinite(raw) || raw <= 0) return String(raw);
    return Utils.fmtTime(raw);
  }

  static albumQueue(state, artistId, albumId) {
    const artist = state.getArtistById(artistId);
    const album = artist?.albums.find((a) => Utils.id(a.id) === Utils.id(albumId));
    if (!artist || !album) return [];
    return album.songs.map((song) => ({
      ...song,
      artistId: artist.id,
      albumId: album.id,
      artist: artist.artist,
      album: album.album,
      coverUrl: album.coverUrl,
      artistImageUrl: artist.imageUrl,
    }));
  }
}

// ////////////////////////////////////////////////////////////////////////
// Prefs
// ////////////////////////////////////////////////////////////////////////
class Prefs {
  static KEY = "mybeats.prefs.v1";
  static prefCache = null;

  static THEMES = {
    dark: {
      label: "Dark",
      dark: true,
      preview: { bg: "53 59 69", card: "44 49 60", text: "171 178 191", accent: "198 120 221" },
    },
    onedark: {
      label: "One Dark",
      dark: true,
      preview: { bg: "41 48 60", card: "36 42 54", text: "176 186 202", accent: "170 126 218" },
    },
    mocha: {
      label: "Mocha",
      dark: true,
      preview: { bg: "58 58 61", card: "49 49 52", text: "188 188 191", accent: "168 142 200" },
    },
    tokoyonight: {
      label: "Tokoyo Night",
      dark: true,
      preview: { bg: "49 62 55", card: "42 53 46", text: "180 193 181", accent: "109 168 129" },
    },
    moon: {
      label: "Moon",
      dark: true,
      preview: { bg: "232 224 212", card: "226 218 206", text: "38 30 22", accent: "148 102 130" },
    },
    light: {
      label: "Light",
      dark: false,
      preview: { bg: "218 228 240", card: "212 222 235", text: "16 24 38", accent: "72 118 190" },
    },
    bloom: {
      label: "Bloom",
      dark: false,
      preview: { bg: "236 222 204", card: "230 215 196", text: "44 34 20", accent: "172 112 68" },
    },
  };
  static DEFAULT_THEME = "dark";
  static DEFAULT_LIGHT = "light";

  static loadPrefs() {
    if (Prefs.prefCache) return Prefs.prefCache;
    try {
      const raw = localStorage.getItem(Prefs.KEY);
      Prefs.prefCache = raw ? JSON.parse(raw) : {};
    } catch {
      Prefs.prefCache = {};
    }
    return Prefs.prefCache;
  }

  static savePrefs(prefs) {
    Prefs.prefCache = prefs;
    try {
      localStorage.setItem(Prefs.KEY, JSON.stringify(prefs));
    } catch {}
  }

  static get(key, fallback = null) {
    const prefs = Prefs.loadPrefs();
    return key in prefs ? prefs[key] : fallback;
  }

  static set(key, value) {
    const prefs = Prefs.loadPrefs();
    prefs[key] = value;
    Prefs.savePrefs(prefs);
  }

  static isValidTheme(name) {
    return !!Prefs.THEMES[name];
  }

  static theme() {
    const saved = Prefs.get("theme", null);
    return Prefs.isValidTheme(saved) ? saved : Prefs.DEFAULT_THEME;
  }

  static listThemes() {
    return Object.entries(Prefs.THEMES).map(([key, config]) => ({ key, ...config }));
  }

  static applyTheme(name, { persist = true } = {}) {
    if (!Prefs.isValidTheme(name)) name = Prefs.DEFAULT_THEME;
    const config = Prefs.THEMES[name];

    document.documentElement.setAttribute("data-theme", name);
    document.body.classList.toggle("dark", config.dark);
    document
      .querySelectorAll(".theme-toggle-btn")
      .forEach((button) => button.classList.toggle("dark", config.dark));

    if (persist) {
      Prefs.set("theme", name);
      if (config.dark) Prefs.set("lastDarkTheme", name);
      else Prefs.set("lastLightTheme", name);
      try {
        localStorage.setItem("theme", config.dark ? "dark" : "light");
      } catch {}
    }

    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme: name, dark: config.dark } })
    );
  }

  static nextToggle() {
    const current = Prefs.theme();
    const config = Prefs.THEMES[current];
    if (config.dark) {
      const lastLight = Prefs.get("lastLightTheme", null);
      return Prefs.isValidTheme(lastLight) && !Prefs.THEMES[lastLight].dark
        ? lastLight
        : Prefs.DEFAULT_LIGHT;
    }
    const lastDark = Prefs.get("lastDarkTheme", null);
    return Prefs.isValidTheme(lastDark) && Prefs.THEMES[lastDark].dark
      ? lastDark
      : Prefs.DEFAULT_THEME;
  }

  static init() {
    const savedTheme = Prefs.get("theme", null);
    const theme = Prefs.isValidTheme(savedTheme) ? savedTheme : Prefs.DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", theme);
    Prefs.set("theme", theme);

    const savedAccent = Prefs.get("accent", "coral");
    document.documentElement.setAttribute("data-accent", savedAccent);
    Prefs.set("accent", savedAccent);
  }
}

// ////////////////////////////////////////////////////////////////////////
// IdUtils
// ////////////////////////////////////////////////////////////////////////
class IdUtils {
  static norm(value) {
    return Utils.id(value);
  }

  static sample(arr, count) {
    return Utils.shuffle(arr).slice(0, count);
  }

  static hslToRgb(hslString) {
    // Accepts "h s% l%" or {h,s,l} or "h s l"
    let h, s, l;

    if (typeof hslString === "string") {
      const parts = hslString.split(" ").map((part) => parseFloat(part));
      h = parts[0];
      s = parts[1];
      l = parts[2];
    } else if (hslString && typeof hslString === "object") {
      h = hslString.h;
      s = hslString.s;
      l = hslString.l;
    } else {
      return { r: 255, g: 107, b: 107 };
    }

    h = ((h % 360) + 360) % 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }
}

// ////////////////////////////////////////////////////////////////////////
// ColorExtractor
// ////////////////////////////////////////////////////////////////////////
class ColorExtractor {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultColors = { primary: "20 20 40", secondary: "28 32 52", accent: "220 38 38" };
    this.settings = {
      sampleRate: 10,
      skipThreshold: 30,
      whiteThreshold: 225,
      colorQuantize: 10,
      dominantColorCount: 3,
      ...options,
    };
  }

  async extract(imageUrl) {
    if (!imageUrl) return { ...this.defaultColors };
    if (this.cache.has(imageUrl)) return this.cache.get(imageUrl);

    try {
      const img = await this.loadImage(imageUrl);
      const pixels = this.getPixels(img);
      const colors = this.dominantColors(pixels);
      this.cache.set(imageUrl, colors);
      return colors;
    } catch (err) {
      console.warn("[ColorExtractor] Extraction failed, using defaults.", err);
      return { ...this.defaultColors };
    }
  }

  applyPlayer(colors) {
    const root = document.documentElement;
    root.style.setProperty("--borderPrimary", colors.primary);
    root.style.setProperty("--textOthers", colors.secondary);
    root.style.setProperty("--playerAccent", colors.accent);
    root.style.setProperty(
      "--player-gradient",
      `linear-gradient(135deg, rgb(var(--player-primary)), rgb(var(--player-secondary)))`
    );
    root.style.setProperty("--player-glow", this.toRgba(colors.accent, 0.25));
    root.style.setProperty("--player-glow-strong", this.toRgba(colors.accent, 0.5));
    root.style.setProperty("--player-tint", this.mixBlack(colors.primary, 0.65));

    window.dispatchEvent(new CustomEvent("themechange", { detail: { ...colors } }));
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load error"));
      img.src = url;
    });
  }

  getPixels(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const maxSize = 100;

    let { width, height } = img;
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }

    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  dominantColors(pixelData) {
    const colorMap = new Map();

    for (let i = 0; i < pixelData.length; i += this.settings.sampleRate * 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      if (a < 128) continue;

      const brightness = (r + g + b) / 3;
      if (brightness < this.settings.skipThreshold || brightness > this.settings.whiteThreshold) continue;

      const colorKey = `${Math.floor(r / this.settings.colorQuantize)},${Math.floor(g / this.settings.colorQuantize)},${Math.floor(b / this.settings.colorQuantize)}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.settings.dominantColorCount);

    const palette = sorted.map(([colorKey]) => {
      const [r, g, b] = colorKey
        .split(",")
        .map((part) => parseInt(part) * this.settings.colorQuantize);
      return { r, g, b };
    });

    return this.buildScheme(palette);
  }

  buildScheme(palette) {
    if (!palette.length) return { ...this.defaultColors };

    const hslPalette = palette.map((color) => this.rgbToHsl(color));

    const primaryHSL = {
      h: hslPalette[0].h,
      s: Math.min(hslPalette[0].s, 40),
      l: Math.max(hslPalette[0].l, 80),
    };
    const secondaryHSL = {
      h: hslPalette[0].h,
      s: Math.min(hslPalette[0].s, 30),
      l: Math.min(hslPalette[0].l, 70),
    };

    const vibrant = hslPalette.reduce((a, b) => (a.s > b.s ? a : b));
    const accentHSL = {
      h: vibrant.h,
      s: Math.min(vibrant.s + 20, 100),
      l: Math.round((45 + 55) / 2),
    };

    return {
      primary: this.hslToRgbString(primaryHSL),
      secondary: this.hslToRgbString(secondaryHSL),
      accent: this.hslToRgbString(accentHSL),
    };
  }

  hslToRgbString({ h, s, l }) {
    const rgb = this.hslToRgb(h, s, l);
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  }

  hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    } else {
      h = s = 0;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  mixBlack(rgbString, ratio) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return rgbString;
    return `${Math.round(r * (1 - ratio))} ${Math.round(g * (1 - ratio))} ${Math.round(b * (1 - ratio))}`;
  }

  toRgba(rgbString, alpha) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return `rgba(0,0,0,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

// ////////////////////////////////////////////////////////////////////////
// Spinner
// ////////////////////////////////////////////////////////////////////////
class Spinner {
  static #CSS_INJECTED = false;

  static #injectStyles() {
    if (Spinner.#CSS_INJECTED) return;
    const style = document.createElement("style");
    style.id = "spnr-styles";
    style.textContent = `
      @keyframes spnr-spin { to { transform: rotate(360deg); } }
      .spnr-circle { width: 2.5rem; height: 2.5rem; border: 0.25rem solid rgba(255,255,255,0.2); border-top-color: #dc143c; border-radius: 9999px; animation: spnr-spin 0.75s linear infinite; }
      .spnr-overlay { display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 10000; transition: opacity 0.3s ease; }
      .spnr-overlay.show { opacity: 1; pointer-events: auto; }
      .spnr-overlay.hide { opacity: 0; pointer-events: none; }
      .spnr-overlay--page { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
      .spnr-overlay--area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: inherit; }
      .spnr-inline { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.25s ease; pointer-events: none; }
      .spnr-inline .spnr-circle { width: 1.25rem; height: 1.25rem; border-width: 0.18rem; }
      .spnr-inline.show { opacity: 1; }
      .spnr-inline.hide { opacity: 0; }
    `;
    document.head.appendChild(style);
    Spinner.#CSS_INJECTED = true;
  }

  constructor({ type = "page", container } = {}) {
    Spinner.#injectStyles();
    this.type = type;
    this.container = container || document.body;
    this.el = null;
    this.#build();
  }

  #build() {
    if (this.type === "page" || this.type === "area") this.#buildOverlay();
    else if (this.type === "inline") this.#buildInline();
    else throw new Error(`Unknown spinner type: ${this.type}`);
    this.el.classList.add("hide");
  }

  #buildOverlay() {
    const overlay = document.createElement("div");
    overlay.classList.add("spnr-overlay");
    overlay.classList.add(this.type === "page" ? "spnr-overlay--page" : "spnr-overlay--area");

    const circle = document.createElement("div");
    circle.classList.add("spnr-circle");
    overlay.appendChild(circle);

    if (this.type === "page") {
      document.body.appendChild(overlay);
    } else {
      if (!this.container) throw new Error('"area" spinner requires a container element.');
      if (window.getComputedStyle(this.container).position === "static") {
        this.container.style.position = "relative";
      }
      this.container.appendChild(overlay);
    }

    this.el = overlay;
  }

  #buildInline() {
    if (!this.container) throw new Error('"inline" spinner requires a container element.');
    if (window.getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }

    const inline = document.createElement("span");
    inline.classList.add("spnr-inline");

    const circle = document.createElement("div");
    circle.classList.add("spnr-circle");
    inline.appendChild(circle);

    this.container.appendChild(inline);
    this.el = inline;
  }

  show() {
    if (!this.el) return;
    this.el.classList.remove("hide");
    this.el.classList.add("show");
    this.container?.setAttribute?.("aria-busy", "true");
  }

  hide() {
    if (!this.el) return;
    this.el.classList.remove("show");
    this.el.classList.add("hide");
    this.container?.removeAttribute?.("aria-busy");
  }

  remove() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}

// ////////////////////////////////////////////////////////////////////////
// SearchUtils
// ////////////////////////////////////////////////////////////////////////
class SearchUtils {
  static recentKey = "mybeats.recentSearches";
  static maxRecent = 10;

  static fuzzy(text, query) {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }

  static getRecent() {
    try {
      const raw = localStorage.getItem(this.recentKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addRecent(query) {
    if (!query || query.trim() === "") return;
    const recent = this.getRecent();
    const clean = query.trim();
    const filtered = recent.filter((q) => q !== clean);
    filtered.unshift(clean);
    const trimmed = filtered.slice(0, this.maxRecent);
    try {
      localStorage.setItem(this.recentKey, JSON.stringify(trimmed));
    } catch {}
  }

  static clearRecent() {
    try {
      localStorage.removeItem(this.recentKey);
    } catch {}
  }
}

// ////////////////////////////////////////////////////////////////////////
// PersistenceManager
// ////////////////////////////////////////////////////////////////////////
class PersistenceManager {
  static STORAGE_KEYS = {
    LAST_SONG: "mybeats_last_song",
    QUEUE: "mybeats_queue",
    QUEUE_INDEX: "mybeats_queue_index",
    CURRENT_TIME: "mybeats_current_time",
    IS_PLAYING: "mybeats_is_playing",
    VOLUME: "mybeats_volume",
    MUTED: "mybeats_muted",
    PLAYBACK_RATE: "mybeats_playback_rate",
    REPEAT_MODE: "mybeats_repeat_mode",
    SHUFFLED: "mybeats_shuffled",
    RECENTLY_PLAYED: "mybeats_recently_played",
  };

  constructor(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.saveThrottle = null;
    this.lastSavedTime = 0;
    this.hasRestored = false;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.restore());
    } else {
      setTimeout(() => this.restore(), 50);
    }
    this.bind();
  }

  // ----------------------------------------------
  // Lifecycle
  // ----------------------------------------------
  restore() {
    if (this.hasRestored) return;
    this.hasRestored = true;

    try {
      const vol = localStorage.getItem(PersistenceManager.STORAGE_KEYS.VOLUME);
      if (vol !== null) {
        this.state.volume = parseFloat(vol);
        this.audioPlayer.setVolume(this.state.volume);
      }

      const muted = localStorage.getItem(PersistenceManager.STORAGE_KEYS.MUTED);
      if (muted !== null) {
        this.state.isMuted = muted === "true";
        if (this.state.isMuted) this.audioPlayer.audio.volume = 0;
        else this.audioPlayer.audio.volume = this.state.volume;
      }

      const rate = localStorage.getItem(PersistenceManager.STORAGE_KEYS.PLAYBACK_RATE);
      if (rate !== null) {
        this.state.playbackRate = parseFloat(rate);
        this.audioPlayer.audio.playbackRate = this.state.playbackRate;
      }

      const repeat = localStorage.getItem(PersistenceManager.STORAGE_KEYS.REPEAT_MODE);
      if (repeat !== null) this.state.repeatMode = repeat;

      const shuffled = localStorage.getItem(PersistenceManager.STORAGE_KEYS.SHUFFLED);
      if (shuffled !== null) this.state.isShuffled = shuffled === "true";

      const savedQueue = localStorage.getItem(PersistenceManager.STORAGE_KEYS.QUEUE);
      const savedIdx = localStorage.getItem(PersistenceManager.STORAGE_KEYS.QUEUE_INDEX);
      const lastSong = localStorage.getItem(PersistenceManager.STORAGE_KEYS.LAST_SONG);

      if (savedQueue && savedIdx !== null && lastSong) {
        const queue = JSON.parse(savedQueue);
        const song = JSON.parse(lastSong);
        const idx = parseInt(savedIdx, 10);

        if (queue.length && idx >= 0 && idx < queue.length && song.id == queue[idx]?.id) {
          this.state.queue = queue;
          this.state.queueIndex = idx;
          this.state.currentSong = song;

          const savedTime = parseFloat(
            localStorage.getItem(PersistenceManager.STORAGE_KEYS.CURRENT_TIME) || "0"
          );
          const wasPlaying =
            localStorage.getItem(PersistenceManager.STORAGE_KEYS.IS_PLAYING) === "true";

          this.audioPlayer.restorePlaybackState(song, queue, savedTime, wasPlaying);
        }
      }

      const recent = localStorage.getItem(PersistenceManager.STORAGE_KEYS.RECENTLY_PLAYED);
      if (recent) {
        try {
          this.state.recentlyPlayed = JSON.parse(recent);
        } catch (e) {}
      }

      if (window.uiManager) {
        if (this.state.isDrawerOpen) window.uiManager.updateFullPlayer();
        window.uiManager.updateMiniPlayer();
      }
    } catch (e) {
      console.warn("[Persistence] Restore error:", e);
    }
  }

  bind() {
    const audio = this.audioPlayer.audio;

    audio.addEventListener("play", () => this.save());
    audio.addEventListener("pause", () => this.save());

    audio.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - this.lastSavedTime > 2000) {
        this.lastSavedTime = now;
        this.saveTime();
      }
    });

    window.addEventListener("beforeunload", () => this.save(true));

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.save(true);
    });

    this.wrap("playSong", () => this.save());
    this.wrap("skipForward", () => this.save());
    this.wrap("skipBack", () => this.save());
    this.wrap("setVolume", () => this.saveVolume());
    this.wrap("toggleMute", () => this.saveVolume());
    this.wrap("cycleRepeat", () => this.saveMode());
    this.wrap("toggleShuffle", () => this.saveMode());
  }

  wrap(methodName, afterHook) {
    const original = this.audioPlayer[methodName];
    if (typeof original !== "function") return;
    this.audioPlayer[methodName] = function (...args) {
      const result = original.apply(this, args);
      afterHook();
      return result;
    };
  }

  // ----------------------------------------------
  // Save
  // ----------------------------------------------
  save(immediate = false) {
    if (!this.state.currentSong) return;

    const doSave = () => {
      try {
        localStorage.setItem(
          PersistenceManager.STORAGE_KEYS.LAST_SONG,
          JSON.stringify(this.state.currentSong)
        );
        localStorage.setItem(
          PersistenceManager.STORAGE_KEYS.QUEUE,
          JSON.stringify(this.state.queue)
        );
        localStorage.setItem(
          PersistenceManager.STORAGE_KEYS.QUEUE_INDEX,
          this.state.queueIndex.toString()
        );
        localStorage.setItem(
          PersistenceManager.STORAGE_KEYS.IS_PLAYING,
          this.state.isPlaying.toString()
        );
        localStorage.setItem(
          PersistenceManager.STORAGE_KEYS.RECENTLY_PLAYED,
          JSON.stringify(this.state.recentlyPlayed)
        );

        this.saveTime();
        this.saveVolume();
        this.saveMode();
      } catch (e) {
        console.warn("[Persistence] Save failed:", e);
      }
    };

    if (immediate) {
      doSave();
    } else {
      clearTimeout(this.saveThrottle);
      this.saveThrottle = setTimeout(doSave, 200);
    }
  }

  saveTime() {
    if (this.audioPlayer.audio) {
      localStorage.setItem(
        PersistenceManager.STORAGE_KEYS.CURRENT_TIME,
        this.audioPlayer.audio.currentTime.toString()
      );
    }
  }

  saveVolume() {
    localStorage.setItem(
      PersistenceManager.STORAGE_KEYS.VOLUME,
      this.state.volume.toString()
    );
    localStorage.setItem(
      PersistenceManager.STORAGE_KEYS.MUTED,
      this.state.isMuted.toString()
    );
    localStorage.setItem(
      PersistenceManager.STORAGE_KEYS.PLAYBACK_RATE,
      this.state.playbackRate.toString()
    );
  }

  saveMode() {
    localStorage.setItem(
      PersistenceManager.STORAGE_KEYS.REPEAT_MODE,
      this.state.repeatMode
    );
    localStorage.setItem(
      PersistenceManager.STORAGE_KEYS.SHUFFLED,
      this.state.isShuffled.toString()
    );
  }
}

// ////////////////////////////////////////////////////////////////////////
// NProgress
// ////////////////////////////////////////////////////////////////////////
class NProgress {
  static settings = {
    minimum: 0.08,
    easing: "ease",
    positionUsing: "",
    speed: 200,
    trickle: true,
    trickleRate: 0.02,
    trickleSpeed: 800,
    showSpinner: true,
    barSelector: '[role="bar"]',
    spinnerSelector: '[role="spinner"]',
    parent: "body",
    template:
      '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>',
  };
  static status = null;
  static pending = [];
  static initial = 0;
  static current = 0;

  static configure(options) {
    for (const key in options) {
      if (options[key] !== undefined && this.settings.hasOwnProperty(key)) {
        this.settings[key] = options[key];
      }
    }
    return this;
  }

  static set(n) {
    const started = this.isStarted();
    n = this.clamp(n, this.settings.minimum, 1);
    this.status = n === 1 ? null : n;

    const progress = this.render(!started);
    const bar = progress.querySelector(this.settings.barSelector);
    const speed = this.settings.speed;
    const ease = this.settings.easing;

    progress.offsetWidth;

    this.queue(
      function (next) {
        if (this.settings.positionUsing === "") {
          this.settings.positionUsing = this.getPositioningCSS();
        }
        this.css(bar, this.barPositionCSS(n, speed, ease));

        if (n === 1) {
          this.css(progress, { transition: "none", opacity: 1 });
          progress.offsetWidth;
          setTimeout(() => {
            this.css(progress, {
              transition: "all " + speed + "ms linear",
              opacity: 0,
            });
            setTimeout(() => {
              this.remove();
              next();
            }, speed);
          }, speed);
        } else {
          setTimeout(next, speed);
        }
      }.bind(this)
    );

    return this;
  }

  static isStarted() {
    return typeof this.status === "number";
  }

  static start() {
    if (!this.status) this.set(0);

    const work = () => {
      setTimeout(() => {
        if (!this.status) return;
        this.trickle();
        work();
      }, this.settings.trickleSpeed);
    };

    if (this.settings.trickle) work();
    return this;
  }

  static done(force) {
    if (!force && !this.status) return this;
    return this.inc(0.3 + 0.5 * Math.random()).set(1);
  }

  static inc(amount) {
    let n = this.status;
    if (!n) return this.start();
    if (typeof amount !== "number") {
      amount = (1 - n) * this.clamp(Math.random() * n, 0.1, 0.95);
    }
    n = this.clamp(n + amount, 0, 0.994);
    return this.set(n);
  }

  static trickle() {
    return this.inc(Math.random() * this.settings.trickleRate);
  }

  static promise($promise) {
    if (!$promise || $promise.state() === "resolved") return this;

    if (this.current === 0) this.start();
    this.initial++;
    this.current++;

    $promise.always(() => {
      this.current--;
      if (this.current === 0) {
        this.initial = 0;
        this.done();
      } else {
        this.set((this.initial - this.current) / this.initial);
      }
    });

    return this;
  }

  static render(fromStart) {
    if (this.isRendered()) return document.getElementById("nprogress");

    this.addClass(document.documentElement, "nprogress-busy");

    const progress = document.createElement("div");
    progress.id = "nprogress";
    progress.innerHTML = this.settings.template;

    const bar = progress.querySelector(this.settings.barSelector);
    const perc = fromStart ? "-100" : this.toBarPerc(this.status || 0);
    const parent = document.querySelector(this.settings.parent);

    this.css(bar, {
      transition: "all 0 linear",
      transform: "translate3d(" + perc + "%,0,0)",
    });

    if (!this.settings.showSpinner) {
      const spinner = progress.querySelector(this.settings.spinnerSelector);
      spinner && this.removeElement(spinner);
    }

    if (parent != document.body) {
      this.addClass(parent, "nprogress-custom-parent");
    }

    parent.appendChild(progress);
    return progress;
  }

  static remove() {
    this.removeClass(document.documentElement, "nprogress-busy");
    this.removeClass(document.querySelector(this.settings.parent), "nprogress-custom-parent");
    const progress = document.getElementById("nprogress");
    progress && this.removeElement(progress);
  }

  static isRendered() {
    return !!document.getElementById("nprogress");
  }

  static getPositioningCSS() {
    const bodyStyle = document.body.style;
    const vendorPrefix =
      "WebkitTransform" in bodyStyle
        ? "Webkit"
        : "MozTransform" in bodyStyle
          ? "Moz"
          : "msTransform" in bodyStyle
            ? "ms"
            : "OTransform" in bodyStyle
              ? "O"
              : "";

    if (vendorPrefix + "Perspective" in bodyStyle) return "translate3d";
    else if (vendorPrefix + "Transform" in bodyStyle) return "translate";
    else return "margin";
  }

  static clamp(n, min, max) {
    return n < min ? min : n > max ? max : n;
  }

  static toBarPerc(n) {
    return (-1 + n) * 100;
  }

  static barPositionCSS(n, speed, ease) {
    let barCSS;
    if (this.settings.positionUsing === "translate3d") {
      barCSS = { transform: "translate3d(" + this.toBarPerc(n) + "%,0,0)" };
    } else if (this.settings.positionUsing === "translate") {
      barCSS = { transform: "translate(" + this.toBarPerc(n) + "%,0)" };
    } else {
      barCSS = { "margin-left": this.toBarPerc(n) + "%" };
    }
    barCSS.transition = "all " + speed + "ms " + ease;
    return barCSS;
  }

  static queue(fn) {
    const next = () => {
      const current = this.pending.shift();
      if (current) current(next);
    };

    this.pending.push(fn);
    if (this.pending.length == 1) next();
  }

  static css(element, properties) {
    const cssPrefixes = ["Webkit", "O", "Moz", "ms"];
    const cssProps = {};

    const camelCase = (string) =>
      string.replace(/^-ms-/, "ms-").replace(/-([\da-z])/gi, (match, letter) =>
        letter.toUpperCase()
      );

    const getVendorProp = (name) => {
      const style = document.body.style;
      if (name in style) return name;

      let i = cssPrefixes.length;
      const capName = name.charAt(0).toUpperCase() + name.slice(1);
      let vendorName;
      while (i--) {
        vendorName = cssPrefixes[i] + capName;
        if (vendorName in style) return vendorName;
      }

      return name;
    };

    const getStyleProp = (name) => {
      name = camelCase(name);
      return cssProps[name] || (cssProps[name] = getVendorProp(name));
    };

    const applyCss = (element, prop, value) => {
      prop = getStyleProp(prop);
      element.style[prop] = value;
    };

    if (arguments.length == 2) {
      for (const prop in properties) {
        const value = properties[prop];
        if (value !== undefined && properties.hasOwnProperty(prop)) {
          applyCss(element, prop, value);
        }
      }
    } else {
      applyCss(element, arguments[1], arguments[2]);
    }
  }

  static hasClass(element, name) {
    const list = typeof element == "string" ? element : this.classList(element);
    return list.indexOf(" " + name + " ") >= 0;
  }

  static addClass(element, name) {
    const oldList = this.classList(element);
    const newList = oldList + name;
    if (this.hasClass(oldList, name)) return;
    element.className = newList.substring(1);
  }

  static removeClass(element, name) {
    const oldList = this.classList(element);
    const newList = oldList.replace(" " + name + " ", " ");
    element.className = newList.substring(1, newList.length - 1);
  }

  static classList(element) {
    return (" " + (element.className || "") + " ").replace(/\s+/gi, " ");
  }

  static removeElement(element) {
    element && element.parentNode && element.parentNode.removeChild(element);
  }
}

// ////////////////////////////////////////////////////////////////////////
// Icons
// ////////////////////////////////////////////////////////////////////////
const Icons = {
  general: {
    close: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    heart: (size = 16, filled = false) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    playlistAdd: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    link: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    checkBadge: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    user: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/></svg>`,
    album: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
    search: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    moreVert: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
    moreHoriz: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
    arrowRight: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    plus: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    playlist: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    dragHandle: (size = 14) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`,
    eye: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    sparkles: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.8L20 12l-6.1 3.2L12 21l-1.9-5.8L4 12l6.1-3.2L12 3z"/></svg>`,
    grid: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    list: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    chevronDown: () =>
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
    artist: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 0v8m0 0v4m0-4H4m8 0h8"/></svg>`,
    musicNote: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  },
  player: {
    play: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><path d="M6 3L16 10L6 17V3Z"/></svg>`,
    pause: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="4" height="14" rx="1"/><rect x="11" y="3" width="4" height="14" rx="1"/></svg>`,
    shuffle: (size = 16) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
  },
};



window.Config = Config;
window.Utils = Utils;
window.Prefs = Prefs;
window.IdUtils = IdUtils;
window.ColorExtractor = ColorExtractor;
window.Spinner = Spinner;
window.SearchUtils = SearchUtils;
window.PersistenceManager = PersistenceManager;
window.NProgress = NProgress;
window.Icons = Icons;
