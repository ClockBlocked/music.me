



(function () {
  "use strict";

  class ID3v2Writer {
    constructor() {
      this.frames = [];
    }

    // ----------------------------------------------
    // Byte-level primitives
    // ----------------------------------------------
    u32(value) {
      return new Uint8Array([
        (value >>> 24) & 255,
        (value >>> 16) & 255,
        (value >>> 8) & 255,
        value & 255,
      ]);
    }

    synch(value) {
      return new Uint8Array([
        (value >>> 21) & 127,
        (value >>> 14) & 127,
        (value >>> 7) & 127,
        value & 127,
      ]);
    }

    latin(value) {
      const text = String(value == null ? "" : value);
      const out = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 255;
      return out;
    }

    utf16(value) {
      const text = String(value == null ? "" : value);
      const out = new Uint8Array(2 + text.length * 2);
      out[0] = 0xff;
      out[1] = 0xfe;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        out[2 + i * 2] = code & 255;
        out[3 + i * 2] = (code >>> 8) & 255;
      }
      return out;
    }

    cat(chunks) {
      let total = 0;
      for (const chunk of chunks) total += chunk.length;

      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out;
    }

    writeFrame(id, data) {
      this.frames.push(
        this.cat([
          this.latin(id),
          this.u32(data.length),
          new Uint8Array([0, 0]),
          data,
        ])
      );
    }

    // ----------------------------------------------
    // High-level tag writers
    // ----------------------------------------------
    text(id, value) {
      const v = value == null ? "" : String(value).trim();
      if (!v) return this;
      this.writeFrame(id, this.cat([new Uint8Array([0x01]), this.utf16(v)]));
      return this;
    }

    comment(text, description = "", lang = "eng") {
      const v = text == null ? "" : String(text);
      if (!v.trim()) return this;

      this.writeFrame(
        "COMM",
        this.cat([
          new Uint8Array([0x01]),
          this.latin(lang).slice(0, 3),
          this.utf16(description),
          new Uint8Array([0x00, 0x00]),
          this.utf16(v),
        ])
      );
      return this;
    }

    picture(bytes, mime = "image/jpeg", type = 0x03, description = "") {
      if (!bytes || !bytes.length) return this;

      const mimeBytes = this.cat([this.latin(mime), new Uint8Array([0])]);
      const descBytes = this.cat([this.latin(description), new Uint8Array([0])]);

      this.writeFrame(
        "APIC",
        this.cat([
          new Uint8Array([0x00]),
          mimeBytes,
          new Uint8Array([type]),
          descBytes,
          bytes,
        ])
      );
      return this;
    }

    build() {
      const body = this.cat(this.frames);
      const header = this.cat([
        new Uint8Array([0x49, 0x44, 0x33]), // "ID3"
        new Uint8Array([0x03, 0x00]), // v2.3.0
        new Uint8Array([0x00]), // flags
        this.synch(body.length),
      ]);
      return this.cat([header, body]);
    }
  }

  function stripExistingID3(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const size =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);
      return arrayBuffer.slice(10 + size);
    }
    return arrayBuffer;
  }
  function sanitizeFilename(value, fallback = "song") {
    const text = String(value == null ? "" : value)
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text || fallback;
  }
  function triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
  }
  function triggerDownloadUrl(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 400);
  }
  function guessMime(url) {
    const path = String(url || "").split("?")[0].toLowerCase();
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".webp")) return "image/webp";
    if (path.endsWith(".gif")) return "image/gif";
    if (path.endsWith(".avif")) return "image/avif";
    return "image/jpeg";
  }


  
  class YouTubeService {
    constructor() {
      this.cache = new Map();
      this.apiPromise = null;
      this.player = null;
    }

    static get apiKey() {
      return (window.Prefs && Prefs.get("youtubeApiKey", "")) || window.MYBEATS_YT_API_KEY || "";
    }

    get available() {
      return !!YouTubeService.apiKey;
    }

    // ----------------------------------------------
    // Search
    // ----------------------------------------------
    async search(query) {
      const key = String(query || "").trim().toLowerCase();
      if (!key) return null;
      if (this.cache.has(key)) return this.cache.get(key);

      const apiKey = YouTubeService.apiKey;
      if (!apiKey) {
        throw new Error("YouTube API key not configured. Open Settings → YouTube.");
      }

      const url =
        "https://www.googleapis.com/youtube/v3/search" +
        `?part=snippet&type=video&maxResults=1&videoEmbeddable=true&safeSearch=none&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);

      const data = await res.json();
      const item = data.items && data.items[0];
      if (!item || !item.id || !item.id.videoId) return null;

      const thumbs = item.snippet.thumbnails || {};
      const result = {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: (thumbs.high || thumbs.medium || thumbs.default || {}).url || "",
      };

      this.cache.set(key, result);
      return result;
    }

    findMusicVideo(song) {
      if (!song) return null;
      const parts = [song.title, song.artist, "official music video"].filter(Boolean);
      return this.search(parts.join(" "));
    }

    // ----------------------------------------------
    // IFrame API player
    // ----------------------------------------------
    loadApi() {
      if (window.YT && window.YT.Player) return Promise.resolve();
      if (this.apiPromise) return this.apiPromise;

      this.apiPromise = new Promise((resolve, reject) => {
        const prior = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = () => {
          if (typeof prior === "function") {
            try {
              prior();
            } catch {}
          }
          resolve();
        };

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
        document.head.appendChild(script);
      });

      return this.apiPromise;
    }

    async createPlayer(hostEl, videoId, opts = {}) {
      await this.loadApi();
      this.destroyPlayer();

      return new Promise((resolve) => {
        const player = new window.YT.Player(hostEl, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: opts.autoplay ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            fs: 1,
          },
          events: {
            onReady: (e) => {
              try {
                if (opts.autoplay) e.target.playVideo();
              } catch {}
              resolve(e.target);
            },
            onError: () => resolve(null),
          },
        });
        this.player = player;
      });
    }

    destroyPlayer() {
      if (this.player) {
        try {
          this.player.destroy();
        } catch {}
        this.player = null;
      }
    }
  }


  class DownloadSheet {
    constructor(ui, options = {}) {
      this.ui = ui;
      this.song = options.song || null;
      this.playlist = options.playlist || null;
      this.onComplete = options.onComplete || null;
      this.el = null;
      this.metadata = null;
      this.busy = false;
    }

    // ----------------------------------------------
    // Metadata defaults
    // ----------------------------------------------
    initialMetadata(song) {
      return {
        title: song?.title || "",
        artist: song?.artist || song?._artistName || "",
        album: song?.album || song?._albumName || "",
        albumArtist: song?.artist || song?._artistName || "",
        genre: song?.genre || "",
        year: String(song?.year || new Date().getFullYear()),
        track: song?.track ? String(song.track) : "",
        disc: song?.disc ? String(song.disc) : "",
        composer: song?.composer || "",
        comment: "",
        coverUrl: song?.coverUrl || "",
      };
    }

    // ----------------------------------------------
    // Lifecycle
    // ----------------------------------------------
    open() {
      this.metadata = this.initialMetadata(this.song);
      this.el = document.createElement("div");
      this.el.className = "dsheet-overlay";
      this.el.setAttribute("data-download-sheet", "");
      this.el.innerHTML = this.render();
      document.body.appendChild(this.el);
      document.documentElement.classList.add("dsheet-lock");

      requestAnimationFrame(() => this.el.classList.add("is-open"));

      this.bindEvents();
      setTimeout(
        () => this.el?.querySelector("[data-dsheet-field='title']")?.focus(),
        260
      );
      return this;
    }

    close() {
      if (!this.el || this.busy) return;

      const el = this.el;
      el.classList.remove("is-open");
      document.documentElement.classList.remove("dsheet-lock");
      document.removeEventListener("keydown", this.escHandler, true);
      setTimeout(() => el.remove(), 320);
      this.el = null;
    }

    // ----------------------------------------------
    // Render helpers
    // ----------------------------------------------
    renderField(label, key, value, required = false, type = "text") {
      return `
        <label class="dsheet-field">
          <span class="dsheet-field-label">${label}${required ? " <em>*</em>" : ""}</span>
          <input class="dsheet-input" type="${type}" data-dsheet-field="${key}" value="${Utils.esc(value)}">
        </label>`;
    }

    render() {
      const m = this.metadata;
      const batchCount = this.playlist ? this.playlist.songs?.length || 0 : 0;

      return `
        <div class="dsheet-scrim" data-dsheet-close></div>
        <div class="dsheet-panel" role="dialog" aria-modal="true" aria-label="Download options">
          <div class="dsheet-handle" aria-hidden="true"><span></span></div>
          <header class="dsheet-header">
            <div class="dsheet-header-text">
              <h3 class="dsheet-title">${this.playlist ? `Download playlist - ${Utils.esc(this.playlist.name)}` : "Download song"}</h3>
              <p class="dsheet-sub">${
                this.playlist
                  ? `${batchCount} track${batchCount === 1 ? "" : "s"} - title/genre edits apply to each track, per-track number preserved.`
                  : "Edit the metadata below. The downloaded file will be tagged like an iTunes purchase."
              }</p>
            </div>
            <button type="button" class="dsheet-close" data-dsheet-close aria-label="Close">${Icons.general.close(20)}</button>
          </header>
          <div class="dsheet-body scroll-contain">
            <div class="dsheet-art">
              <div class="dsheet-art-frame">
                <img class="dsheet-art-img" data-dsheet-art src="${Utils.esc(m.coverUrl)}" alt="Cover art" onerror="this.style.opacity='0'">
              </div>
              <div class="dsheet-art-controls">
                <label class="dsheet-art-pick">
                  <input type="file" accept="image/*" data-dsheet-cover-file hidden>
                  <span>Upload artwork</span>
                </label>
                <input class="dsheet-input" type="url" data-dsheet-field="coverUrl" value="${Utils.esc(m.coverUrl)}" placeholder="...or paste an image URL">
              </div>
            </div>
            <div class="dsheet-grid">
              ${this.renderField("Title", "title", m.title, true)}
              ${this.renderField("Artist", "artist", m.artist, true)}
              ${this.renderField("Album", "album", m.album)}
              ${this.renderField("Album Artist", "albumArtist", m.albumArtist)}
              ${this.renderField("Genre", "genre", m.genre)}
              ${this.renderField("Year", "year", m.year, false, "number")}
              ${this.renderField("Track #", "track", m.track)}
              ${this.renderField("Disc #", "disc", m.disc)}
              ${this.renderField("Composer", "composer", m.composer)}
            </div>
            <label class="dsheet-field dsheet-field-wide">
              <span class="dsheet-field-label">Comment</span>
              <textarea class="dsheet-input dsheet-textarea" rows="2" data-dsheet-field="comment">${Utils.esc(m.comment)}</textarea>
            </label>
          </div>
          <footer class="dsheet-footer">
            <div class="dsheet-progress" data-dsheet-progress hidden>
              <div class="dsheet-progress-track"><span class="dsheet-progress-fill" data-dsheet-progress-fill></span></div>
              <span class="dsheet-progress-label" data-dsheet-progress-label>Preparing...</span>
            </div>
            <div class="dsheet-actions">
              <button type="button" class="dsheet-btn ghost" data-dsheet-close>Cancel</button>
              <button type="button" class="dsheet-btn primary" data-dsheet-confirm>
                ${Icons.general.checkBadge(16)} <span>Download${this.playlist ? ` (${batchCount})` : ""}</span>
              </button>
            </div>
          </footer>
        </div>`;
    }

    // ----------------------------------------------
    // Event binding
    // ----------------------------------------------
    bindEvents() {
      const el = this.el;

      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-dsheet-close]")) {
          e.preventDefault();
          this.close();
        }
      });

      el.querySelectorAll("[data-dsheet-field]").forEach((input) => {
        input.addEventListener("input", () => {
          this.metadata[input.dataset.dsheetField] = input.value;

          if (input.dataset.dsheetField === "coverUrl") {
            const art = el.querySelector("[data-dsheet-art]");
            if (art) {
              art.src = input.value;
              art.style.opacity = "1";
            }
          }
        });
      });

      el.querySelector("[data-dsheet-cover-file]")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          this.metadata.coverUrl = dataUrl;

          const urlInput = el.querySelector("[data-dsheet-field='coverUrl']");
          if (urlInput) urlInput.value = dataUrl;

          const art = el.querySelector("[data-dsheet-art]");
          if (art) {
            art.src = dataUrl;
            art.style.opacity = "1";
          }
        };
        reader.readAsDataURL(file);
      });

      el.querySelector("[data-dsheet-confirm]")?.addEventListener("click", () => this.handleDownload());

      this.escHandler = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          this.close();
        }
      };
      document.addEventListener("keydown", this.escHandler, true);
    }

    // ----------------------------------------------
    // Progress display
    // ----------------------------------------------
    setProgress(pct, label) {
      const wrap = this.el?.querySelector("[data-dsheet-progress]");
      const fill = this.el?.querySelector("[data-dsheet-progress-fill]");
      const lbl = this.el?.querySelector("[data-dsheet-progress-label]");

      if (wrap) wrap.hidden = false;
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (lbl && label) lbl.textContent = label;
    }

    // ----------------------------------------------
    // Download
    // ----------------------------------------------
    async handleDownload() {
      if (this.busy) return;

      const m = this.metadata;
      if (!m.title.trim() || !m.artist.trim()) {
        this.ui.state.showToast?.("Title and Artist are required", "warning");
        return;
      }

      this.busy = true;
      const btn = this.el.querySelector("[data-dsheet-confirm]");
      if (btn) btn.disabled = true;

      try {
        if (this.playlist) {
          const songs = this.playlist.songs
            .map((id) => this.ui.state.getSongById(id))
            .filter(Boolean);

          for (let i = 0; i < songs.length; i++) {
            const total = songs.length;
            this.setProgress((i / total) * 100, `Downloading ${i + 1} / ${total}`);

            await DownloadManager.downloadOne(
              songs[i],
              { ...m, title: songs[i].title || m.title, track: String(i + 1) },
              {
                onProgress: (p) =>
                  this.setProgress(((i + p / 100) / total) * 100, `Downloading ${i + 1} / ${total}`),
              }
            );
          }

          this.setProgress(100, "Done");
          this.ui.state.showToast?.(
            `Downloaded ${songs.length} track${songs.length === 1 ? "" : "s"}`,
            "success"
          );
        } else {
          this.setProgress(2, "Fetching audio...");
          await DownloadManager.downloadOne(this.song, m, {
            onProgress: (p) => this.setProgress(p * 0.9, "Fetching audio..."),
          });
          this.setProgress(100, "Done");
          this.ui.state.showToast?.("Download ready", "success");
        }

        this.onComplete?.();
        this.busy = false;
        if (btn) btn.disabled = false;
        this.close();
      } catch (err) {
        console.error("[DownloadSheet] failed:", err);
        this.busy = false;
        if (btn) btn.disabled = false;

        this.setProgress(0, err?.message || "Download failed");
        this.ui.state.showToast?.(err?.message || "Download failed", "error");
      }
    }
  } 
  const DownloadManager = {
    openSheet(song, options = {}) {
      if (!song) return;
      new DownloadSheet(window.uiManager, { song, ...options }).open();
    },

    openPlaylistSheet(playlist) {
      if (!playlist) return;
      new DownloadSheet(window.uiManager, { playlist }).open();
    },

    async downloadOne(song, metadata, opts = {}) {
      const onProgress = opts.onProgress || (() => {});
      const audioUrl = this.audioUrl(song);
      if (!audioUrl) throw new Error("Audio source not found");

      let raw;
      onProgress(4);
      try {
        const res = await fetch(audioUrl, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        raw = await res.arrayBuffer();
      } catch (err) {
        // CORS blocked or offline - fall back to a raw link download.
        console.warn("[Download] Tagged download failed, falling back to direct link:", err);
        triggerDownloadUrl(audioUrl, this.makeFilename(metadata));
        throw new Error("Server blocked cross-origin access - downloaded raw file instead of tagged.");
      }
      onProgress(55);

      const audioBuf = stripExistingID3(raw);
      const writer = new ID3v2Writer();
      writer
        .text("TIT2", metadata.title)
        .text("TPE1", metadata.artist)
        .text("TPE2", metadata.albumArtist || metadata.artist)
        .text("TALB", metadata.album)
        .text("TYER", metadata.year)
        .text("TCON", metadata.genre)
        .text("TRCK", metadata.track)
        .text("TPOS", metadata.disc)
        .text("TCOM", metadata.composer)
        .text("TENC", "MyBeats")
        .text("TSSE", "MyBeats")
        .comment(metadata.comment || "");
      onProgress(70);

      const cover = await this.coverBytes(metadata);
      if (cover) writer.picture(cover.bytes, cover.mime, 0x03, "");
      onProgress(85);

      const tag = writer.build();
      const out = new Uint8Array(tag.length + audioBuf.byteLength);
      out.set(tag, 0);
      out.set(new Uint8Array(audioBuf), tag.length);

      triggerDownloadBlob(new Blob([out], { type: "audio/mpeg" }), this.makeFilename(metadata));
      onProgress(100);
    },

    audioUrl(song) {
      const base = window.AUDIO_CDN_BASE;
      if (!base || !song?.id) return song?.downloadPath || "";
      return `${base}/${song.id}.mp3`;
    },

    async coverBytes(metadata) {
      const url = metadata?.coverUrl;
      if (!url) return null;

      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) return null;

        const buf = new Uint8Array(await res.arrayBuffer());
        const mime = res.headers.get("content-type") || guessMime(url);
        return { bytes: buf, mime };
      } catch (e) {
        console.warn("[Download] Cover fetch failed:", e);
        return null;
      }
    },

    makeFilename(metadata) {
      const artist = sanitizeFilename(metadata.artist, "Unknown Artist");
      const title = sanitizeFilename(metadata.title, "Untitled");
      const track = sanitizeFilename(metadata.track, "");
      const prefix = track ? `${track.padStart(2, "0")} ` : "";
      return `${artist} - ${prefix}${title}.mp3`.replace(/\s+/g, " ").trim();
    },
  };


  const videoSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none"/><path d="M16 10l5-3v10l-5-3"/></svg>`;
  class VideoController {
    constructor(ui) {
      this.ui = ui;
      this.service = new YouTubeService();
      this.player = null;
      this.activeVideoId = null;
      this.busy = false;
    }

    get isActive() {
      return !!this.ui.state.isVideoOpen;
    }

    // ----------------------------------------------
    // Public API
    // ----------------------------------------------
    toggle(song) {
      if (this.isActive) return this.close();
      return this.open(song || this.ui.state.currentSong);
    }

    async open(song) {
      if (!song || this.busy) return;

      const wrapper = document.getElementById("album-wrapper");
      if (!wrapper) return;

      this.busy = true;
      wrapper.classList.add("video-mode", "is-loading");
      wrapper.innerHTML = `<div class="video-loading"><div class="spnr-circle"></div><span>Finding music video...</span></div>`;

      let result = null;
      let err = null;

      try {
        result = await this.service.findMusicVideo(song);
      } catch (e) {
        err = e;
      }

      if (!result) {
        wrapper.classList.remove("is-loading");

        const msg = err ? Utils.esc(err.message) : "No matching video found.";
        wrapper.innerHTML = `
          <div class="video-error">
            <p class="video-error-title">Video unavailable</p>
            <p class="video-error-msg">${msg}</p>
            <p class="video-error-hint">Add a YouTube Data API key in Settings → YouTube to enable video search.</p>
            <div class="video-error-actions">
              <button type="button" class="dsheet-btn ghost" data-video-retry>Try again</button>
              <button type="button" class="dsheet-btn ghost" data-video-close>Back to artwork</button>
            </div>
          </div>`;

        wrapper
          .querySelector("[data-video-retry]")
          ?.addEventListener("click", () => {
            this.busy = false;
            this.open(song);
          });

        wrapper
          .querySelector("[data-video-close]")
          ?.addEventListener("click", () => {
            this.busy = false;
            this.restoreArtwork();
            this.updateDrawerUI();
          });

        this.busy = false;
        return;
      }

      this.activeVideoId = result.videoId;
      this.ui.state.isVideoOpen = true;
      this.ui.state.videoInfo = {
        videoId: result.videoId,
        title: result.title,
        channel: result.channel,
      };
      this.updateDrawerUI();

      // Pause the audio track while the video plays.
      if (this.ui.state.isPlaying) this.ui.audioPlayer.togglePlay();

      wrapper.classList.remove("is-loading");
      wrapper.innerHTML = `<div class="yt-player-host" id="yt-player-host"></div>`;

      const host = wrapper.querySelector("#yt-player-host");
      this.player = await this.service.createPlayer(host, result.videoId, { autoplay: true });
      this.busy = false;
    }

    close({ resumeAudio = true } = {}) {
      this.service.destroyPlayer();
      this.player = null;
      this.activeVideoId = null;
      this.ui.state.isVideoOpen = false;
      this.ui.state.videoInfo = null;
      this.busy = false;

      this.restoreArtwork();
      this.updateDrawerUI();

      if (resumeAudio && this.ui.state.currentSong && !this.ui.state.isPlaying) {
        this.ui.audioPlayer.togglePlay();
      }
    }

    onSongChange() {
      if (this.isActive) this.close({ resumeAudio: false });
      else this.updateDrawerUI();
    }

    // ----------------------------------------------
    // Internal UI sync
    // ----------------------------------------------
    restoreArtwork() {
      const wrapper = document.getElementById("album-wrapper");
      if (!wrapper) return;

      const song = this.ui.state.currentSong;
      wrapper.classList.remove("video-mode", "is-loading");

      if (!song) {
        wrapper.innerHTML = "";
        return;
      }

      wrapper.innerHTML = `<img src="${Utils.esc(song.coverUrl)}" alt="${Utils.esc(song.title)}" class="album-art">`;
    }

    updateDrawerUI() {
      const btn = document.getElementById("video-btn");
      if (btn) {
        const active = this.isActive;
        btn.classList.toggle("active", active);
        btn.setAttribute("title", active ? "Listen to Audio" : "Watch Video");
        btn.setAttribute("aria-label", active ? "Listen to Audio" : "Watch Video");
        btn.innerHTML = active ? Icons.player.play(18) : videoSvg;
      }

      const wrapper = document.getElementById("album-wrapper");
      if (wrapper) wrapper.classList.toggle("video-mode", this.isActive);
    }
  }



  
  function ensureController() {
    const ui = window.uiManager;
    if (!ui) return null;

    if (!ui.videoController) ui.videoController = new VideoController(ui);

    if (!ui.downloadSheet) {
      ui.downloadSheet = {
        open: (song, opts) => DownloadManager.openSheet(song, opts),
        openPlaylist: (pl) => DownloadManager.openPlaylistSheet(pl),
      };
    }
    return ui;
  }
  function installDelegates() {
    if (document.mbDownloadDelegated) return;
    document.mbDownloadDelegated = true;

    // Capture phase so we beat song-row click handlers.
    document.addEventListener(
      "click",
      (e) => {
        const dl = e.target.closest('[data-action="download-song"]');
        if (dl) {
          e.preventDefault();
          e.stopPropagation();

          const song = window.uiManager?.state?.getSongById(dl.dataset.songId);
          if (song) {
            ensureController();
            DownloadManager.openSheet(song);
          } else {
            window.uiManager?.state?.showToast?.("Song not found", "error");
          }
          return;
        }

        const dlPl = e.target.closest('[data-action="download-playlist"]');
        if (dlPl) {
          e.preventDefault();
          e.stopPropagation();

          const state = window.uiManager?.state;
          const playlist =
            state?.playlists?.find((p) => p.name === state.selectedPlaylistName) ||
            state?.playlists?.find((p) => String(p.id) === String(state.selectedPlaylistId));

          if (playlist) {
            ensureController();
            DownloadManager.openPlaylistSheet(playlist);
          } else {
            state?.showToast?.("Playlist not found", "error");
          }
        }
      },
      true
    );
  }

  installDelegates();
  ensureController();

  const iv = setInterval(() => {
    if (window.uiManager) {
      ensureController();
      clearInterval(iv);
    }
  }, 250);

  window.addEventListener("load", ensureController);


  
  window.ID3v2Writer = ID3v2Writer;
  window.YouTubeService = YouTubeService;
  window.DownloadSheet = DownloadSheet;
  window.DownloadManager = DownloadManager;
  window.VideoController = VideoController;

  window.MyBeats = window.MyBeats || {};
  window.MyBeats.Downloads = {
    ID3v2Writer,
    YouTubeService,
    DownloadSheet,
    DownloadManager,
    VideoController,
    install: ensureController,
  };
})();