
export const CONFIG = {
  IMAGE_BASE: {
    artist:
      "https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/artistPortraits/",
    album:
      "https://raw.githubusercontent.com/ClockBlocked/beats/refs/heads/ClockBlocked-patch-1/content/albumCovers/"
  },
  FAVOURITES: {
    favSongs: "Songs",
    favArtists: "Artists",
    favAlbums: "Albums",
    playlists: "Playlists"
  },
  DEFAULT_COVER:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ccircle cx="50" cy="50" r="30" fill="%23666"/%3E%3C/svg%3E',
  QUEUE: {
    recentMax: 30
  },
  VOLUME: {
    default: 1.0
  }
};

export const Utils = {
  slugify(name) {
    if (!name) return "default";
    return (
      name
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .trim() || "default"
    );
  },
  clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  },
  shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  formatTime(s) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  },
  id(val) {
    return val == null ? "" : String(val);
  },
  newId(prefix = "id") {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  },
  escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
  formatDuration(raw) {
    if (raw === null || raw === undefined || raw === "") return "";
    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return "";
      if (text.includes(":") || /[a-zA-Z]/.test(text)) return text;
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) return text;
      return Utils.formatTime(parsed);
    }
    if (!Number.isFinite(raw) || raw <= 0) return String(raw);
    return Utils.formatTime(raw);
  },
  buildAlbumQueue(state, artistId, albumId) {
    const artist = state.getArtistById(artistId);
    const album = artist?.albums.find(
      (a) => Utils.id(a.id) === Utils.id(albumId)
    );
    if (!artist || !album) return [];
    return album.songs.map((s) => ({
      ...s,
      artistId: artist.id,
      albumId: album.id,
      artist: artist.artist,
      album: album.album,
      coverUrl: album.coverUrl,
      artistImageUrl: artist.imageUrl
    }));
  }
};

export class Prefs {
  static KEY = 'mybeats.prefs.v1';
  static _cache = null;

  static THEMES = {
    dark: {
      label: 'Dark',
      dark: true,
      preview: { bg: '53 59 69', card: '44 49 60', text: '171 178 191', accent: '198 120 221' }
    },
    onedark: {
      label: 'One Dark',
      dark: true,
      preview: { bg: '41 48 60', card: '36 42 54', text: '176 186 202', accent: '170 126 218' }
    },
    mocha: {
      label: 'Mocha',
      dark: true,
      preview: { bg: '58 58 61', card: '49 49 52', text: '188 188 191', accent: '168 142 200' }
    },
    tokoyonight: {
      label: 'Tokoyo Night',
      dark: true,
      preview: { bg: '49 62 55', card: '42 53 46', text: '180 193 181', accent: '109 168 129' }
    },
    moon: {
      label: 'Moon',
      dark: true,
      preview: { bg: '232 224 212', card: '226 218 206', text: '38 30 22', accent: '148 102 130' }
    },
    light: {
      label: 'Light',
      dark: false,
      preview: { bg: '218 228 240', card: '212 222 235', text: '16 24 38', accent: '72 118 190' }
    },
    bloom: {
      label: 'Bloom',
      dark: false,
      preview: { bg: '236 222 204', card: '230 215 196', text: '44 34 20', accent: '172 112 68' }
    }
  };

  static DEFAULT_THEME = 'dark';
  static DEFAULT_LIGHT = 'light';

  static _read() {
    if (Prefs._cache) return Prefs._cache;
    try {
      const raw = localStorage.getItem(Prefs.KEY);
      Prefs._cache = raw ? JSON.parse(raw) : {};
    } catch {
      Prefs._cache = {};
    }
    return Prefs._cache;
  }

  static _write(data) {
    Prefs._cache = data;
    try {
      localStorage.setItem(Prefs.KEY, JSON.stringify(data));
    } catch {}
  }

  static get(key, fallback = null) {
    const data = Prefs._read();
    return key in data ? data[key] : fallback;
  }

  static set(key, value) {
    const data = Prefs._read();
    data[key] = value;
    Prefs._write(data);
  }

  // ---- theme API ----
  static isValidTheme(name) {
    return !!Prefs.THEMES[name];
  }

  static getTheme() {
    const saved = Prefs.get('theme', null);
    return Prefs.isValidTheme(saved) ? saved : Prefs.DEFAULT_THEME;
  }

  static listThemes() {
    return Object.entries(Prefs.THEMES).map(([key, cfg]) => ({ key, ...cfg }));
  }

  static applyTheme(name, { persist = true } = {}) {
    if (!Prefs.isValidTheme(name)) name = Prefs.DEFAULT_THEME;
    const cfg = Prefs.THEMES[name];

    // The single source of truth for the stylesheet
    document.documentElement.setAttribute('data-theme', name);

    // Legacy compatibility: some older CSS/JS toggles body.dark
    document.body.classList.toggle('dark', cfg.dark);
    document.querySelectorAll('.theme-toggle-btn').forEach(b =>
      b.classList.toggle('dark', cfg.dark)
    );

    if (persist) {
      Prefs.set('theme', name);
      // Remember last dark + last light pick so toggleTheme() feels smart
      if (cfg.dark) Prefs.set('lastDarkTheme', name);
      else Prefs.set('lastLightTheme', name);
      // Legacy key so old boot code never fights us
      try { localStorage.setItem('theme', cfg.dark ? 'dark' : 'light'); } catch {}
    }

    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: name, dark: cfg.dark }
    }));
  }

  // Smart dark <-> light toggle that remembers your last pick in each family
  static nextToggleTarget() {
    const current = Prefs.getTheme();
    const cfg = Prefs.THEMES[current];
    if (cfg.dark) {
      const lastLight = Prefs.get('lastLightTheme', null);
      return Prefs.isValidTheme(lastLight) && !Prefs.THEMES[lastLight].dark
        ? lastLight
        : Prefs.DEFAULT_LIGHT;
    }
    const lastDark = Prefs.get('lastDarkTheme', null);
    return Prefs.isValidTheme(lastDark) && Prefs.THEMES[lastDark].dark
      ? lastDark
      : Prefs.DEFAULT_THEME;
  }
}

export class IdUtils {
  static normalize(v) {
    return Utils.id(v);
  }
  static sample(arr, n) {
    return Utils.shuffled(arr).slice(0, n);
  }
}

export class ColorExtractor {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultColors = {
      // fallback RGB values – same dark theme as your earlier :root
      primary: "20 20 40", // ≈ hsl(240, 28%, 18%) in RGB
      secondary: "28 32 52", // ≈ hsl(224, 48%, 20%)
      accent: "220 38 38" // ≈ hsl(350, 70%, 50%)  (coral-ish)
    };
    this.opts = {
      sampleRate: 10,
      skipThreshold: 30,
      whiteThreshold: 225,
      colorQuantize: 10,
      dominantColorCount: 3,
      ...options
    };
  }

  async extractColors(imageUrl) {
    if (!imageUrl) return { ...this.defaultColors };
    if (this.cache.has(imageUrl)) return this.cache.get(imageUrl);
    try {
      const img = await this._loadImage(imageUrl);
      const pixels = this._getPixels(img);
      const colors = this._dominantColors(pixels);
      this.cache.set(imageUrl, colors);
      return colors;
    } catch (err) {
      console.warn("[ColorExtractor] Extraction failed, using defaults.", err);
      return { ...this.defaultColors };
    }
  }

  applyThemeToPlayer(colors) {
    const root = document.documentElement;

    // Set the three main colours as space‑separated RGB triplets
    root.style.setProperty("--borderPrimary", colors.primary);
    root.style.setProperty("--textOthers", colors.secondary);
    root.style.setProperty("--playerAccent", colors.accent);

    // The gradient now uses rgb(var(--player-…)) so it auto‑updates with the variables
    root.style.setProperty(
      "--player-gradient",
      `linear-gradient(135deg, rgb(var(--player-primary)), rgb(var(--player-secondary)))`
    );

    // Pre‑computed glow values – you can either keep these or replace them in CSS with
    //  rgba(var(--player-accent), 0.25) etc. – here we generate actual rgba() strings
    root.style.setProperty("--player-glow", this._toRGBA(colors.accent, 0.25));
    root.style.setProperty(
      "--player-glow-strong",
      this._toRGBA(colors.accent, 0.5)
    );

    // Darker tint (mixing with black) – now an RGB triplet as well
    root.style.setProperty(
      "--player-tint",
      this._mixWithBlack(colors.primary, 0.65)
    );

    // transition (unchanged)
    root.style.setProperty(
      "--theme-transition",
      "background 0.6s ease, color 0.35s ease, box-shadow 0.5s ease, border-color 0.4s ease"
    );

    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { ...colors } })
    );
  }

  // ====================  PRIVATE HELPERS (unchanged logic, adapted output) ====================
  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load error"));
      img.src = url;
    });
  }

  _getPixels(img) {
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

  _dominantColors(pixelData) {
    const colorMap = new Map();
    for (let i = 0; i < pixelData.length; i += this.opts.sampleRate * 4) {
      const r = pixelData[i],
        g = pixelData[i + 1],
        b = pixelData[i + 2],
        a = pixelData[i + 3];
      if (a < 128) continue;
      const brightness = (r + g + b) / 3;
      if (
        brightness < this.opts.skipThreshold ||
        brightness > this.opts.whiteThreshold
      )
        continue;
      const key = `${Math.floor(r / this.opts.colorQuantize)},${Math.floor(g / this.opts.colorQuantize)},${Math.floor(b / this.opts.colorQuantize)}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    const sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.opts.dominantColorCount);
    const palette = sorted.map(([key]) => {
      const [r, g, b] = key
        .split(",")
        .map((v) => parseInt(v) * this.opts.colorQuantize);
      return { r, g, b };
    });
    return this._buildScheme(palette);
  }

  _buildScheme(palette) {
    if (!palette.length) return { ...this.defaultColors };

    // Convert to HSL for easier scheme construction
    const hslPalette = palette.map((c) => this._rgbToHsl(c));

    // Primary: use the most frequent colour, low saturation, medium lightness (≈ background)
    const primaryHSL = {
      h: hslPalette[0].h,
      s: Math.min(hslPalette[0].s, 40),
      l: Math.max(hslPalette[0].l, 80)
    };

    // Secondary: slightly darker
    const secondaryHSL = {
      h: hslPalette[0].h,
      s: Math.min(hslPalette[0].s, 30),
      l: Math.min(hslPalette[0].l, 70)
    };

    // Accent: the most vibrant colour, pushed toward full saturation
    const vibrant = hslPalette.reduce((a, b) => (a.s > b.s ? a : b));
    const accentHSL = {
      h: vibrant.h,
      s: Math.min(vibrant.s + 20, 100),
      l: Math.round((45 + 55) / 2) // clamp to 45-55, roughly
    };

    // Convert back to RGB and format as "R G B"
    return {
      primary: this._hslToRGBString(primaryHSL),
      secondary: this._hslToRGBString(secondaryHSL),
      accent: this._hslToRGBString(accentHSL)
    };
  }

  // ============  Conversion utilities (added / modified) ============
  /** HSL object → space‑separated RGB string (e.g. "30 33 36") */
  _hslToRGBString({ h, s, l }) {
    const rgb = this._hslToRgb(h, s, l);
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  }

  /** Standard HSL to RGB conversion (returns {r,g,b} 0-255) */
  _hslToRgb(h, s, l) {
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
      b: Math.round((b + m) * 255)
    };
  }

  /** RGB → HSL object (used for palette analysis) */
  _rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;
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
      l: Math.round(l * 100)
    };
  }

  /** Mix an RGB colour with black (darken). Expects "R G B" string, returns "R G B" */
  _mixWithBlack(rgbString, ratio) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return rgbString;
    return `${Math.round(r * (1 - ratio))} ${Math.round(g * (1 - ratio))} ${Math.round(b * (1 - ratio))}`;
  }

  /** Convert RGB string to an rgba() string (for glow effects) */
  _toRGBA(rgbString, alpha) {
    const [r, g, b] = rgbString.split(" ").map(Number);
    if (isNaN(r)) return `rgba(0,0,0,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export class Spinner {
  static #CSS_INJECTED = false;

  static #injectStyles() {
    if (Spinner.#CSS_INJECTED) return;
    const style = document.createElement("style");
    style.id = "spnr-styles";
    style.textContent = `
      @keyframes spnr-spin {
        to { transform: rotate(360deg); }
      }
      .spnr-circle {
        width: 2.5rem;
        height: 2.5rem;
        border: 0.25rem solid rgba(255, 255, 255, 0.2);
        border-top-color: #dc143c;
        border-radius: 9999px;
        animation: spnr-spin 0.75s linear infinite;
      }
      .spnr-overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 10000;
        transition: opacity 0.3s ease;
      }
      .spnr-overlay.show {
        opacity: 1;
        pointer-events: auto;
      }
      .spnr-overlay.hide {
        opacity: 0;
        pointer-events: none;
      }
      .spnr-overlay--page {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
      }
      .spnr-overlay--area {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: inherit;
      }
      .spnr-inline {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.25s ease;
        pointer-events: none;
      }
      .spnr-inline .spnr-circle {
        width: 1.25rem;
        height: 1.25rem;
        border-width: 0.18rem;
      }
      .spnr-inline.show {
        opacity: 1;
      }
      .spnr-inline.hide {
        opacity: 0;
      }
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
    if (this.type === "page" || this.type === "area") {
      this.#buildOverlay();
    } else if (this.type === "inline") {
      this.#buildInline();
    } else {
      throw new Error(`Unknown spinner type: ${this.type}`);
    }
    this.el.classList.add("hide");
  }

  #buildOverlay() {
    const overlay = document.createElement("div");
    overlay.classList.add("spnr-overlay");
    overlay.classList.add(
      this.type === "page" ? "spnr-overlay--page" : "spnr-overlay--area"
    );

    const circle = document.createElement("div");
    circle.classList.add("spnr-circle");
    overlay.appendChild(circle);

    if (this.type === "page") {
      document.body.appendChild(overlay);
    } else {
      if (!this.container) {
        throw new Error('"area" spinner requires a container element.');
      }
      if (window.getComputedStyle(this.container).position === "static") {
        this.container.style.position = "relative";
      }
      this.container.appendChild(overlay);
    }
    this.el = overlay;
  }

  #buildInline() {
    if (!this.container) {
      throw new Error('"inline" spinner requires a container element.');
    }
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

export class SearchUtils {
  static recentKey = 'mybeats.recentSearches';
  static maxRecent = 10;

  /** Simple fuzzy match: true if query is a substring (case‑insensitive) */
  static fuzzyMatch(text, query) {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }

  /** Get recent searches from localStorage */
  static getRecent() {
    try {
      const raw = localStorage.getItem(this.recentKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** Add a search query to recent list (de‑dup, max 10) */
  static addRecent(query) {
    if (!query || query.trim() === '') return;
    const recent = this.getRecent();
    const clean = query.trim();
    // Remove duplicates and add to front
    const filtered = recent.filter(q => q !== clean);
    filtered.unshift(clean);
    // Trim to max
    const trimmed = filtered.slice(0, this.maxRecent);
    try {
      localStorage.setItem(this.recentKey, JSON.stringify(trimmed));
    } catch {}
  }

  /** Clear all recent searches */
  static clearRecent() {
    try {
      localStorage.removeItem(this.recentKey);
    } catch {}
  }
}





(function () {
  "use strict";

 const STORAGE_KEYS = {
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
    RECENTLY_PLAYED: "mybeats_recently_played"
  };

 class PersistenceManager {
    constructor(state, audioPlayer) {
      this.state = state;
      this.audioPlayer = audioPlayer;
      this.saveThrottle = null;
      this.lastSavedTime = 0;
      this._restored = false;

      // Restore immediately when state is ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          this.restoreState()
        );
      } else {
        // Defer slightly so the rest of the app bootstraps first
        setTimeout(() => this.restoreState(), 50);
      }

      this.bindSaveEvents();
    }

    /* ================================================================
       RESTORE STATE — called once on page load
       ================================================================ */
    restoreState() {
      if (this._restored) return;
      this._restored = true;

      try {
        // 1. Volume & mute
        const vol = localStorage.getItem(STORAGE_KEYS.VOLUME);
        if (vol !== null) {
          this.state.volume = parseFloat(vol);
          this.audioPlayer.setVolume(this.state.volume);
        }
        const muted = localStorage.getItem(STORAGE_KEYS.MUTED);
        if (muted !== null) {
          this.state.isMuted = muted === "true";
          if (this.state.isMuted) this.audioPlayer.audio.volume = 0;
          else this.audioPlayer.audio.volume = this.state.volume;
        }

        // 2. Playback rate
        const rate = localStorage.getItem(STORAGE_KEYS.PLAYBACK_RATE);
        if (rate !== null) {
          this.state.playbackRate = parseFloat(rate);
          this.audioPlayer.audio.playbackRate = this.state.playbackRate;
        }

        // 3. Repeat & shuffle
        const repeat = localStorage.getItem(STORAGE_KEYS.REPEAT_MODE);
        if (repeat !== null) this.state.repeatMode = repeat;
        const shuffled = localStorage.getItem(STORAGE_KEYS.SHUFFLED);
        if (shuffled !== null) this.state.isShuffled = shuffled === "true";

        // 4. Queue, current song & playback position
        const savedQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
        const savedIdx = localStorage.getItem(STORAGE_KEYS.QUEUE_INDEX);
        const lastSong = localStorage.getItem(STORAGE_KEYS.LAST_SONG);

        if (savedQueue && savedIdx !== null && lastSong) {
          const queue = JSON.parse(savedQueue);
          const song = JSON.parse(lastSong);
          const idx = parseInt(savedIdx, 10);

          if (
            queue.length &&
            idx >= 0 &&
            idx < queue.length &&
            song.id == queue[idx]?.id
          ) {
            this.state.queue = queue;
            this.state.queueIndex = idx;
            this.state.currentSong = song;

            const savedTime = parseFloat(
              localStorage.getItem(STORAGE_KEYS.CURRENT_TIME) || "0"
            );
            const wasPlaying =
              localStorage.getItem(STORAGE_KEYS.IS_PLAYING) === "true";

            // Use the dedicated restore method — loads audio at saved time,
            // stays paused unless wasPlaying is true
            this.audioPlayer.restorePlaybackState(
              song,
              queue,
              savedTime,
              wasPlaying
            );
          }
        }

        // 5. Recently played
        const recent = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
        if (recent) {
          try {
            this.state.recentlyPlayed = JSON.parse(recent);
          } catch (e) {}
        }

        // 6. Update UI
        if (window.uiManager) {
          if (this.state.isDrawerOpen) {
            window.uiManager.updateFullPlayer();
          }
          window.uiManager.updateMiniPlayer();
        }
      } catch (e) {
        console.warn("[Persistence] Restore error:", e);
      }
    }

    /* ================================================================
       SAVE EVENT BINDINGS
       ================================================================ */
    bindSaveEvents() {
      const audio = this.audioPlayer.audio;

      // Save on play/pause
      audio.addEventListener("play", () => this.saveState());
      audio.addEventListener("pause", () => this.saveState());

      // Save current time (throttled to every 2 seconds)
      audio.addEventListener("timeupdate", () => {
        const now = Date.now();
        if (now - this.lastSavedTime > 2000) {
          this.lastSavedTime = now;
          this.saveCurrentTime();
        }
      });

      // Save before page unload
      window.addEventListener("beforeunload", () => this.saveState(true));

      // Also save on visibility change (user switches tabs)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.saveState(true);
        }
      });

      // Wrap key methods to save on changes
      this.wrapMethod("playSong", () => this.saveState());
      this.wrapMethod("skipForward", () => this.saveState());
      this.wrapMethod("skipBack", () => this.saveState());
      this.wrapMethod("setVolume", () => this.saveVolume());
      this.wrapMethod("toggleMute", () => this.saveVolume());
      this.wrapMethod("cycleRepeat", () => this.saveMode());
      this.wrapMethod("toggleShuffle", () => this.saveMode());
    }

    wrapMethod(methodName, afterHook) {
      const original = this.audioPlayer[methodName];
      if (typeof original !== "function") return;
      this.audioPlayer[methodName] = function (...args) {
        const result = original.apply(this, args);
        afterHook();
        return result;
      };
    }

    /* ================================================================
       SAVE METHODS
       ================================================================ */
    saveState(immediate = false) {
      if (!this.state.currentSong) return;

      const doSave = () => {
        try {
          localStorage.setItem(
            STORAGE_KEYS.LAST_SONG,
            JSON.stringify(this.state.currentSong)
          );
          localStorage.setItem(
            STORAGE_KEYS.QUEUE,
            JSON.stringify(this.state.queue)
          );
          localStorage.setItem(
            STORAGE_KEYS.QUEUE_INDEX,
            this.state.queueIndex.toString()
          );
          localStorage.setItem(
            STORAGE_KEYS.IS_PLAYING,
            this.state.isPlaying.toString()
          );
          localStorage.setItem(
            STORAGE_KEYS.RECENTLY_PLAYED,
            JSON.stringify(this.state.recentlyPlayed)
          );
          this.saveCurrentTime();
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

    saveCurrentTime() {
      if (this.audioPlayer.audio) {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_TIME,
          this.audioPlayer.audio.currentTime.toString()
        );
      }
    }

    saveVolume() {
      localStorage.setItem(STORAGE_KEYS.VOLUME, this.state.volume.toString());
      localStorage.setItem(STORAGE_KEYS.MUTED, this.state.isMuted.toString());
      localStorage.setItem(
        STORAGE_KEYS.PLAYBACK_RATE,
        this.state.playbackRate.toString()
      );
    }

    saveMode() {
      localStorage.setItem(STORAGE_KEYS.REPEAT_MODE, this.state.repeatMode);
      localStorage.setItem(
        STORAGE_KEYS.SHUFFLED,
        this.state.isShuffled.toString()
      );
    }
  }

  // Hook into the existing global objects after they are created
  function initPersistence() {
    if (window.state && window.audioPlayer && !window._persistence) {
      window._persistence = new PersistenceManager(
        window.state,
        window.audioPlayer
      );
    } else {
      setTimeout(initPersistence, 50);
    }
  }
  initPersistence();
})();


/**
____________________
Created by Cole


Copyright  ©  2 0 2 6
________________________________
*/