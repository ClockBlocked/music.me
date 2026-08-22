import { Utils, CONFIG, IdUtils } from "./utilities.js";
import { Icons } from "./icons.js";


export class PlayerManager {
  constructor(ui) {
    this.ui = ui;
    this._coverBufferVisible = false;
    this._sleepBadgeTimer = null;
    this._dragQueueIdx = null;
  }

  renderMiniPlayer() {
    const container = document.getElementById("player-bar-container");
    const state = this.ui.state;
    const currentSong = state.currentSong;
    const progress =
      currentSong && state.duration
        ? (state.currentTime / state.duration) * 100
        : 0;
    const pauseSVG = Icons.player.pause(22);
    const playSVG = Icons.player.play(22);
    const skipSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="20" height="20"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>`;
    const defaultCover = CONFIG.DEFAULT_COVER;
    const coverUrl = currentSong ? currentSong.coverUrl : defaultCover;
    const title = currentSong ? currentSong.title : "MyBeats";
    const artistDisplay = currentSong
      ? this.ui.artistNameTooltip(currentSong.artistId)
      : "Music";
    const isFav = currentSong
      ? this.ui.favorites.isSongFavorite(currentSong.id)
      : false;

    container.innerHTML = `
      <div data-player="mini" class="mini-player">
        <div class="mini-player-inner" id="open-drawer">
          <div class="track">
            <div class="mini-progress" id="mini-progress"
                 style="width: ${progress}%;"></div>
          </div>
          <div class="bar">
            <div class="mini-cover cover">
              <img src="${coverUrl}" class="mini-cover-img" onerror="this.style.display='none'">
            </div>
            <div class="info">
              <p class="title">${title}</p>
              <p class="sub">
                ${artistDisplay}
              </p>
            </div>
            <div class="actions">
              <button id="fav-mini" class="${isFav ? "favorited" : ""}" ${!currentSong ? "disabled" : ""}>
                ${currentSong ? this.ui.likeStatus("song", isFav, false, null) : Icons.hearts.notLiked()}
              </button>
              <button id="toggle-play-mini" class="toggle" ${!currentSong ? "disabled" : ""}>
                ${currentSong ? (state.isPlaying ? pauseSVG : playSVG) : playSVG}
              </button>
              <button id="skip-forward-mini" ${!currentSong ? "disabled" : ""}>
                ${skipSVG}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const openDrawerBtn = document.getElementById("open-drawer");
    if (openDrawerBtn) {
      openDrawerBtn.onclick = () => this.ui.openPlayerDrawer();
    }

    if (currentSong) {
      const favBtn = document.getElementById("fav-mini");
      if (favBtn) {
        favBtn.onclick = (e) => {
          e.stopPropagation();
          this.ui.toggleFavAndReRender(currentSong.id);
        };
      }
      const toggleBtn = document.getElementById("toggle-play-mini");
      if (toggleBtn) {
        toggleBtn.onclick = (e) => {
          e.stopPropagation();
          this.ui.audioPlayer.togglePlay();
        };
      }
      const skipBtn = document.getElementById("skip-forward-mini");
      if (skipBtn) {
        skipBtn.onclick = (e) => {
          e.stopPropagation();
          this.ui.audioPlayer.skipForward();
        };
      }
    }

    this.applyPlaybackErrorState();
    if (this._coverBufferVisible) this.showCoverBuffer();
  }

  updateProgressOnly() {
    const state = this.ui.state;
    const progress = state.duration
      ? (state.currentTime / state.duration) * 100
      : 0;
    const miniProgress = document.getElementById("mini-progress");
    if (miniProgress) miniProgress.style.width = `${progress}%`;
    const progressFill = document.getElementById("progress-fill");
    if (progressFill) progressFill.style.width = `${progress}%`;
    const currentTimeEl = document.getElementById("drawer-current-time");
    if (currentTimeEl)
      currentTimeEl.textContent = state.formatTime(state.currentTime);
    const totalTimeEl = document.getElementById("total-time");
    if (totalTimeEl) totalTimeEl.textContent = state.formatTime(state.duration);
  }

  showCoverBuffer() {
    this._coverBufferVisible = true;
    const cover = document.querySelector("#player-bar-container .mini-cover");
    if (!cover) return;
    if (cover.querySelector(".mini-cover-buffer")) return;
    const overlay = document.createElement("div");
    overlay.className = "mini-cover-buffer";
    const circle = document.createElement("div");
    circle.className = "spnr-circle";
    overlay.appendChild(circle);
    cover.appendChild(overlay);
  }

  hideCoverBuffer() {
    this._coverBufferVisible = false;
    document
      .querySelectorAll("#player-bar-container .mini-cover-buffer")
      .forEach((el) => el.remove());
  }

  applyPlaybackErrorState() {
    const state = this.ui.state;
    const hasError = !!(
      state.audioError &&
      state.currentSong &&
      state.audioError === state.currentSong.id
    );
    if (hasError) this.hideCoverBuffer();
    const miniInner = document.querySelector(
      "#player-bar-container .mini-player-inner"
    );
    if (miniInner) miniInner.classList.toggle("audio-missing", hasError);
    [
      "toggle-play-mini",
      "skip-forward-mini",
      "play-pause-drawer",
      "prev-btn",
      "next-btn",
      "shuffle-btn",
      "like-btn"
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (hasError) btn.setAttribute("disabled", "");
      else if (state.currentSong) btn.removeAttribute("disabled");
    });
  }

  openDrawer() {
    this.ui.state.isDrawerOpen = true;
    document.getElementById("player-drawer-overlay").classList.add("open");
    this.renderFullPlayer();
  }

  closeDrawer() {
    this.ui.state.isDrawerOpen = false;
    this.ui.state.isQueueOpen = false;
    this.ui.state.isLyricsOpen = false;
    document.getElementById("player-drawer-overlay").classList.remove("open");
    const drawer = document.getElementById("full-player-drawer");
    if (drawer) {
      drawer.classList.remove("open");
      setTimeout(() => drawer.remove(), 500);
    }
  }

  renderFullPlayer() {
    const oldDrawer = document.getElementById("full-player-drawer");
    const state = this.ui.state;
    const song = state.currentSong;

    if (oldDrawer && song) {
      const oldImg = oldDrawer.querySelector(".album-art");
      if (oldImg) {
        const currentSrc = oldImg.getAttribute("src");
        if (currentSrc === song.coverUrl) {
          this.softUpdateDrawer(oldDrawer);
          this.attachFullPlayerEvents();
          return;
        }
      }
    }

    document.getElementById("full-player-drawer")?.remove();

    const defaultCover = CONFIG.DEFAULT_COVER;
    const title = song ? song.title : "MyBeats";
    const artistDisplay = song
      ? this.ui.artistNameTooltip(song.artistId)
      : "Music";
    const coverUrl = song ? song.coverUrl : defaultCover;
    const progress =
      song && state.duration ? (state.currentTime / state.duration) * 100 : 0;
    const isPlaying = song ? state.isPlaying : false;
    const isFav = song ? this.ui.favorites.isSongFavorite(song.id) : false;
    const disabledAttr = !song ? 'disabled style="opacity:0.5"' : "";
    const pauseSVG = Icons.player.pause(32);
    const playSVG = Icons.player.play(32);

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div data-player="full" class="player-drawer open" id="full-player-drawer">
        <div class="dot-pattern"></div>
        <div class="drawerUpper">
          <svg class="playerStripe" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.dev/svgjs" viewBox="0 0 1422 800">
              <g stroke-width="20" stroke="var(--playerBgSecondary)" fill="none" stroke-linecap="round">
                <path d="M 0 1998 Q 355.5 60 711 400 Q 1066.5 740 1422 1998"></path><path d="M 0 1980 Q 355.5 60 711 400 Q 1066.5 740 1422 1980"></path><path d="M 0 1962 Q 355.5 60 711 400 Q 1066.5 740 1422 1962"></path><path d="M 0 1944 Q 355.5 60 711 400 Q 1066.5 740 1422 1944"></path><path d="M 0 1926 Q 355.5 60 711 400 Q 1066.5 740 1422 1926"></path><path d="M 0 1908 Q 355.5 60 711 400 Q 1066.5 740 1422 1908"></path><path d="M 0 1890 Q 355.5 60 711 400 Q 1066.5 740 1422 1890"></path><path d="M 0 1872 Q 355.5 60 711 400 Q 1066.5 740 1422 1872"></path><path d="M 0 1854 Q 355.5 60 711 400 Q 1066.5 740 1422 1854"></path><path d="M 0 1836 Q 355.5 60 711 400 Q 1066.5 740 1422 1836"></path><path d="M 0 1818 Q 355.5 60 711 400 Q 1066.5 740 1422 1818"></path><path d="M 0 1800 Q 355.5 60 711 400 Q 1066.5 740 1422 1800"></path><path d="M 0 1782 Q 355.5 60 711 400 Q 1066.5 740 1422 1782"></path><path d="M 0 1764 Q 355.5 60 711 400 Q 1066.5 740 1422 1764"></path><path d="M 0 1746 Q 355.5 60 711 400 Q 1066.5 740 1422 1746"></path><path d="M 0 1728 Q 355.5 60 711 400 Q 1066.5 740 1422 1728"></path><path d="M 0 1710 Q 355.5 60 711 400 Q 1066.5 740 1422 1710"></path><path d="M 0 1692 Q 355.5 60 711 400 Q 1066.5 740 1422 1692"></path><path d="M 0 1674 Q 355.5 60 711 400 Q 1066.5 740 1422 1674"></path><path d="M 0 1656 Q 355.5 60 711 400 Q 1066.5 740 1422 1656"></path><path d="M 0 1638 Q 355.5 60 711 400 Q 1066.5 740 1422 1638"></path><path d="M 0 1620 Q 355.5 60 711 400 Q 1066.5 740 1422 1620"></path><path d="M 0 1602 Q 355.5 60 711 400 Q 1066.5 740 1422 1602"></path><path d="M 0 1584 Q 355.5 60 711 400 Q 1066.5 740 1422 1584"></path><path d="M 0 1566 Q 355.5 60 711 400 Q 1066.5 740 1422 1566"></path><path d="M 0 1548 Q 355.5 60 711 400 Q 1066.5 740 1422 1548"></path><path d="M 0 1530 Q 355.5 60 711 400 Q 1066.5 740 1422 1530"></path><path d="M 0 1512 Q 355.5 60 711 400 Q 1066.5 740 1422 1512"></path><path d="M 0 1494 Q 355.5 60 711 400 Q 1066.5 740 1422 1494"></path><path d="M 0 1476 Q 355.5 60 711 400 Q 1066.5 740 1422 1476"></path><path d="M 0 1458 Q 355.5 60 711 400 Q 1066.5 740 1422 1458"></path><path d="M 0 1440 Q 355.5 60 711 400 Q 1066.5 740 1422 1440"></path><path d="M 0 1422 Q 355.5 60 711 400 Q 1066.5 740 1422 1422"></path><path d="M 0 1404 Q 355.5 60 711 400 Q 1066.5 740 1422 1404"></path><path d="M 0 1386 Q 355.5 60 711 400 Q 1066.5 740 1422 1386"></path><path d="M 0 1368 Q 355.5 60 711 400 Q 1066.5 740 1422 1368"></path><path d="M 0 1350 Q 355.5 60 711 400 Q 1066.5 740 1422 1350"></path><path d="M 0 1332 Q 355.5 60 711 400 Q 1066.5 740 1422 1332"></path><path d="M 0 1314 Q 355.5 60 711 400 Q 1066.5 740 1422 1314"></path><path d="M 0 1296 Q 355.5 60 711 400 Q 1066.5 740 1422 1296"></path><path d="M 0 1278 Q 355.5 60 711 400 Q 1066.5 740 1422 1278"></path><path d="M 0 1260 Q 355.5 60 711 400 Q 1066.5 740 1422 1260"></path><path d="M 0 1242 Q 355.5 60 711 400 Q 1066.5 740 1422 1242"></path><path d="M 0 1224 Q 355.5 60 711 400 Q 1066.5 740 1422 1224"></path><path d="M 0 1206 Q 355.5 60 711 400 Q 1066.5 740 1422 1206"></path><path d="M 0 1188 Q 355.5 60 711 400 Q 1066.5 740 1422 1188"></path><path d="M 0 1170 Q 355.5 60 711 400 Q 1066.5 740 1422 1170"></path><path d="M 0 1152 Q 355.5 60 711 400 Q 1066.5 740 1422 1152"></path><path d="M 0 1134 Q 355.5 60 711 400 Q 1066.5 740 1422 1134"></path><path d="M 0 1116 Q 355.5 60 711 400 Q 1066.5 740 1422 1116"></path><path d="M 0 1098 Q 355.5 60 711 400 Q 1066.5 740 1422 1098"></path><path d="M 0 1080 Q 355.5 60 711 400 Q 1066.5 740 1422 1080"></path><path d="M 0 1062 Q 355.5 60 711 400 Q 1066.5 740 1422 1062"></path><path d="M 0 1044 Q 355.5 60 711 400 Q 1066.5 740 1422 1044"></path><path d="M 0 1026 Q 355.5 60 711 400 Q 1066.5 740 1422 1026"></path><path d="M 0 1008 Q 355.5 60 711 400 Q 1066.5 740 1422 1008"></path><path d="M 0 990 Q 355.5 60 711 400 Q 1066.5 740 1422 990"></path><path d="M 0 972 Q 355.5 60 711 400 Q 1066.5 740 1422 972"></path><path d="M 0 954 Q 355.5 60 711 400 Q 1066.5 740 1422 954"></path><path d="M 0 936 Q 355.5 60 711 400 Q 1066.5 740 1422 936"></path><path d="M 0 918 Q 355.5 60 711 400 Q 1066.5 740 1422 918"></path><path d="M 0 900 Q 355.5 60 711 400 Q 1066.5 740 1422 900"></path><path d="M 0 882 Q 355.5 60 711 400 Q 1066.5 740 1422 882"></path><path d="M 0 864 Q 355.5 60 711 400 Q 1066.5 740 1422 864"></path><path d="M 0 846 Q 355.5 60 711 400 Q 1066.5 740 1422 846"></path><path d="M 0 828 Q 355.5 60 711 400 Q 1066.5 740 1422 828"></path><path d="M 0 810 Q 355.5 60 711 400 Q 1066.5 740 1422 810"></path><path d="M 0 792 Q 355.5 60 711 400 Q 1066.5 740 1422 792"></path><path d="M 0 774 Q 355.5 60 711 400 Q 1066.5 740 1422 774"></path><path d="M 0 756 Q 355.5 60 711 400 Q 1066.5 740 1422 756"></path><path d="M 0 738 Q 355.5 60 711 400 Q 1066.5 740 1422 738"></path><path d="M 0 720 Q 355.5 60 711 400 Q 1066.5 740 1422 720"></path><path d="M 0 702 Q 355.5 60 711 400 Q 1066.5 740 1422 702"></path><path d="M 0 684 Q 355.5 60 711 400 Q 1066.5 740 1422 684"></path><path d="M 0 666 Q 355.5 60 711 400 Q 1066.5 740 1422 666"></path><path d="M 0 648 Q 355.5 60 711 400 Q 1066.5 740 1422 648"></path><path d="M 0 630 Q 355.5 60 711 400 Q 1066.5 740 1422 630"></path><path d="M 0 612 Q 355.5 60 711 400 Q 1066.5 740 1422 612"></path><path d="M 0 594 Q 355.5 60 711 400 Q 1066.5 740 1422 594"></path><path d="M 0 576 Q 355.5 60 711 400 Q 1066.5 740 1422 576"></path><path d="M 0 558 Q 355.5 60 711 400 Q 1066.5 740 1422 558"></path><path d="M 0 540 Q 355.5 60 711 400 Q 1066.5 740 1422 540"></path><path d="M 0 522 Q 355.5 60 711 400 Q 1066.5 740 1422 522"></path><path d="M 0 504 Q 355.5 60 711 400 Q 1066.5 740 1422 504"></path><path d="M 0 486 Q 355.5 60 711 400 Q 1066.5 740 1422 486"></path><path d="M 0 468 Q 355.5 60 711 400 Q 1066.5 740 1422 468"></path><path d="M 0 450 Q 355.5 60 711 400 Q 1066.5 740 1422 450"></path><path d="M 0 432 Q 355.5 60 711 400 Q 1066.5 740 1422 432"></path><path d="M 0 414 Q 355.5 60 711 400 Q 1066.5 740 1422 414"></path><path d="M 0 396 Q 355.5 60 711 400 Q 1066.5 740 1422 396"></path><path d="M 0 378 Q 355.5 60 711 400 Q 1066.5 740 1422 378"></path><path d="M 0 360 Q 355.5 60 711 400 Q 1066.5 740 1422 360"></path><path d="M 0 342 Q 355.5 60 711 400 Q 1066.5 740 1422 342"></path><path d="M 0 324 Q 355.5 60 711 400 Q 1066.5 740 1422 324"></path><path d="M 0 306 Q 355.5 60 711 400 Q 1066.5 740 1422 306"></path><path d="M 0 288 Q 355.5 60 711 400 Q 1066.5 740 1422 288"></path><path d="M 0 270 Q 355.5 60 711 400 Q 1066.5 740 1422 270"></path><path d="M 0 252 Q 355.5 60 711 400 Q 1066.5 740 1422 252"></path><path d="M 0 234 Q 355.5 60 711 400 Q 1066.5 740 1422 234"></path><path d="M 0 216 Q 355.5 60 711 400 Q 1066.5 740 1422 216"></path><path d="M 0 198 Q 355.5 60 711 400 Q 1066.5 740 1422 198"></path><path d="M 0 180 Q 355.5 60 711 400 Q 1066.5 740 1422 180"></path><path d="M 0 162 Q 355.5 60 711 400 Q 1066.5 740 1422 162"></path><path d="M 0 144 Q 355.5 60 711 400 Q 1066.5 740 1422 144"></path><path d="M 0 126 Q 355.5 60 711 400 Q 1066.5 740 1422 126"></path><path d="M 0 108 Q 355.5 60 711 400 Q 1066.5 740 1422 108"></path><path d="M 0 90 Q 355.5 60 711 400 Q 1066.5 740 1422 90"></path><path d="M 0 72 Q 355.5 60 711 400 Q 1066.5 740 1422 72"></path><path d="M 0 54 Q 355.5 60 711 400 Q 1066.5 740 1422 54"></path><path d="M 0 36 Q 355.5 60 711 400 Q 1066.5 740 1422 36"></path><path d="M 0 18 Q 355.5 60 711 400 Q 1066.5 740 1422 18"></path><path d="M 0 0 Q 355.5 60 711 400 Q 1066.5 740 1422 0"></path>
              </g>
            </svg>

          <div class="drawer-header">
            <button class="header-btn" id="close-drawer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="header-btn" id="queue-toggle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>

          <div class="album-art-wrapper" id="album-wrapper">
            <img src="${coverUrl}" alt="${title}" class="album-art">
          </div>

          <div class="meta">
            <h1 class="title">${title}</h1>
            <p class="sub">${artistDisplay}</p>
          </div>

          <canvas id="visualizer"></canvas>
        </div>

        <div class="control-panel">
          <div class="extra-controls">
            <button class="control-btn" id="share-btn" aria-label="Share" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="speed-btn" id="speed-btn" ${disabledAttr}>${state.playbackRate}x</button>
            <button class="control-btn" id="sleep-btn" aria-label="Sleep Timer" ${disabledAttr}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
          </div>

          <div class="progress-container" id="progress-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="progress-fill"
                   style="width: ${progress}%; background: var(--playerAccent);"></div>
            </div>
            <div class="time-display">
              <span id="drawer-current-time">${song ? state.formatTime(state.currentTime) : "0:00"}</span>
              <span id="total-time">${song ? state.formatTime(state.duration) : "0:00"}</span>
            </div>
          </div>

          <div class="controls">
            <button class="control-btn ${state.isShuffled ? "active" : ""}" id="shuffle-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path opacity=".4" fill="currentColor" d="M0 384c0 17.7 14.3 32 32 32l64 0c30.2 0 58.7-14.2 76.8-38.4L224 309.3c-13.3-17.8-26.7-35.6-40-53.3l-62.4 83.2c-6 8.1-15.5 12.8-25.6 12.8l-64 0c-17.7 0-32 14.3-32 32zM224 202.7c13.3 17.8 26.7 35.6 40 53.3l62.4-83.2c6-8.1 15.5-12.8 25.6-12.8l32 0 0 32c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l64-64c6-6 9.4-14.1 9.4-22.6s-3.4-16.6-9.4-22.6l-64-64c-9.2-9.2-22.9-11.9-34.9-6.9S384 51.1 384 64l0 32-32 0c-30.2 0-58.7 14.2-76.8 38.4L224 202.7z"/><path fill="currentColor" d="M352 416c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32S14.3 96 32 96l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2-9.2-22.9-11.9-34.9-6.9S384 460.9 384 448l0-32-32 0z"/></svg>
            </button>
            <button class="control-btn" id="prev-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M64 208.1l0 95.7 258 169.6c12.3 8.1 28 8.8 41 1.8s21-20.5 21-35.2l0-368c0-14.7-8.1-28.2-21-35.2s-28.7-6.3-41 1.8L64 208.1z"/><path fill="currentColor" d="M32 32l0 0C14.3 32 0 46.3 0 64L0 448c0 17.7 14.3 32 32 32l0 0c17.7 0 32-14.3 32-32L64 64c0-17.7-14.3-32-32-32z"/></svg>
            </button>
            <button class="play-btn ${isPlaying ? "playing" : ""}" id="play-pause-drawer" ${disabledAttr}>
              ${isPlaying ? pauseSVG : playSVG}
            </button>
            <button class="control-btn" id="next-btn" ${disabledAttr}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="28"><path opacity=".4" fill="currentColor" d="M0 72L0 440c0 14.7 8.1 28.2 21 35.2s28.7 6.3 41-1.8l258-169.6 0-95.7-258-169.6c-12.3-8.1-28-8.8-41-1.8S0 57.3 0 72z"/><path fill="currentColor" d="M352 32l0 0c17.7 0 32 14.3 32 32l0 384c0 17.7-14.3 32-32 32l0 0c-17.7 0-32-14.3-32-32l0-384c0-17.7 14.3-32 32-32z"/></svg>
            </button>
            <button class="control-btn ${isFav ? "favorited" : ""}" id="like-btn" data-song-id="${song?.id || ""}" ${disabledAttr}>
              ${song ? this.ui.likeStatus("song", isFav, false, null) : Icons.hearts.notLiked()}
            </button>
          </div>
        </div>

        <div class="queue-modal ${state.isQueueOpen ? "open" : ""}" id="queue-modal">
          <div class="drag-handle"></div>
          <div class="queue-header">
            <h3 class="title">Up Next</h3>
            <div class="queue-header-actions">
              <button class="queue-action-btn" id="queue-save-playlist" title="Save remaining queue as a playlist">Save as Playlist</button>
              <button class="queue-action-btn" id="queue-clear" title="Clear upcoming songs">Clear</button>
              <button class="control-btn" id="close-queue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="queue-list scroll-contain" id="queue-list"></div>
        </div>

        <div class="lyrics-overlay ${state.isLyricsOpen ? "visible" : ""}" id="lyrics-overlay">
          <div class="lyrics-text">
            <p>Lyrics will appear here</p>
            <p class="hint">Tap anywhere to close</p>
          </div>
        </div>
      </div>
    `
    );

    this.attachFullPlayerEvents();
    this.renderQueueList();

    if (song) {
      this.setupVisualizer();
    } else {
      const canvas = document.getElementById("visualizer");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  softUpdateDrawer(drawer) {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const state = this.ui.state;
    const progress = state.duration
      ? (state.currentTime / state.duration) * 100
      : 0;
    const fill = drawer.querySelector("#progress-fill");
    if (fill) fill.style.width = `${progress}%`;
    const curTime = drawer.querySelector("#drawer-current-time");
    const totTime = drawer.querySelector("#total-time");
    if (curTime) curTime.textContent = state.formatTime(state.currentTime);
    if (totTime) totTime.textContent = state.formatTime(state.duration);
    const playBtn = drawer.querySelector("#play-pause-drawer");
    if (playBtn) {
      playBtn.classList.toggle("playing", state.isPlaying);
      playBtn.innerHTML = state.isPlaying
        ? Icons.player.pause(32)
        : Icons.player.play(32);
    }
    const shuffleBtn = drawer.querySelector("#shuffle-btn");
    if (shuffleBtn) shuffleBtn.classList.toggle("active", state.isShuffled);
    const likeBtn = drawer.querySelector("#like-btn");
    if (likeBtn) {
      const isFav = this.ui.favorites.isSongFavorite(song.id);
      likeBtn.classList.toggle("favorited", isFav);
      likeBtn.innerHTML = this.ui.likeStatus("song", isFav, false, null);
    }
    this.applyPlaybackErrorState();
  }

  attachFullPlayerEvents() {
    this.ui.contentEvents.heartTimeouts.forEach(({ timeoutId }) =>
      clearTimeout(timeoutId)
    );
    this.ui.contentEvents.heartTimeouts.clear();

    const song = this.ui.state.currentSong;

    document
      .getElementById("close-drawer")
      ?.addEventListener("click", () => this.ui.closePlayerDrawer());
    document
      .getElementById("player-drawer-overlay")
      ?.addEventListener("click", () => this.ui.closePlayerDrawer());
    document
      .getElementById("queue-toggle")
      ?.addEventListener("click", () => this.toggleQueue());
    document
      .getElementById("close-queue")
      ?.addEventListener("click", () => this.closeQueue());
    document
      .getElementById("queue-clear")
      ?.addEventListener("click", () => this.clearQueue());
    document
      .getElementById("queue-save-playlist")
      ?.addEventListener("click", () => this.saveQueueAsPlaylist());

    if (song) {
      document
        .getElementById("play-pause-drawer")
        ?.addEventListener("click", () => this.ui.audioPlayer.togglePlay());
      document
        .getElementById("prev-btn")
        ?.addEventListener("click", () => this.ui.audioPlayer.skipBack());
      document
        .getElementById("next-btn")
        ?.addEventListener("click", () => this.ui.audioPlayer.skipForward());
      document
        .getElementById("shuffle-btn")
        ?.addEventListener("click", () => this.ui.audioPlayer.toggleShuffle());
      document
        .getElementById("share-btn")
        ?.addEventListener("click", () => this.toggleShare());
      document
        .getElementById("speed-btn")
        ?.addEventListener("click", () => this.cycleSpeed());
      document
        .getElementById("sleep-btn")
        ?.addEventListener("click", () => this.toggleSleepTimer());
      document
        .getElementById("album-wrapper")
        ?.addEventListener("click", () => this.ui.audioPlayer.togglePlay());
      document
        .getElementById("lyrics-overlay")
        ?.addEventListener("click", () => this.toggleLyrics());

      document
        .getElementById("progress-container")
        ?.addEventListener("click", (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          this.ui.audioPlayer.audio.currentTime =
            ((e.clientX - rect.left) / rect.width) * this.ui.state.duration;
        });

      const likeBtn = document.getElementById("like-btn");
      if (likeBtn) {
        const songId = likeBtn.dataset.songId;
        let tempState = null;
        let timeoutId = null;
        const updateIcon = (isHovered) => {
          likeBtn.innerHTML = this.ui.likeStatus(
            "song",
            this.ui.favorites.isSongFavorite(songId),
            isHovered,
            tempState
          );
        };
        likeBtn.addEventListener("mouseenter", () => updateIcon(true));
        likeBtn.addEventListener("mouseleave", () => updateIcon(false));
        likeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (timeoutId) clearTimeout(timeoutId);
          const currentSong = this.ui.state.currentSong;
          if (currentSong) this.ui.favorites.toggleFavoriteSong(currentSong);
          likeBtn.classList.toggle(
            "favorited",
            this.ui.favorites.isSongFavorite(songId)
          );
          tempState = "check";
          updateIcon(false);
          timeoutId = setTimeout(() => {
            tempState = null;
            updateIcon(false);
            timeoutId = null;
          }, 5000);
        });
      }

      const drawer = document.getElementById("full-player-drawer");
      let touchStartX = 0,
        touchStartY = 0,
        touchStartTime = 0;
      drawer.addEventListener(
        "touchstart",
        (e) => {
          const t = e.changedTouches[0];
          touchStartX = t.screenX;
          touchStartY = t.screenY;
          touchStartTime = performance.now();
        },
        { passive: true }
      );
      drawer.addEventListener(
        "touchend",
        (e) => {
          const t = e.changedTouches[0];
          const dx = t.screenX - touchStartX;
          const dy = t.screenY - touchStartY;
          const dt = performance.now() - touchStartTime;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          if (absDx > absDy && absDx > 50) {
            const velocity = absDx / dt;
            if (velocity > 0.4 || absDx > 120) {
              dx > 0
                ? this.ui.audioPlayer.skipBack()
                : this.ui.audioPlayer.skipForward();
            }
            return;
          }
          if (dy < -80 && absDy > absDx) {
            this.openQueue();
            return;
          }
          if (
            dy > 80 &&
            absDy > absDx &&
            touchStartY < drawer.getBoundingClientRect().top + 120
          ) {
            this.ui.closePlayerDrawer();
          }
        },
        { passive: true }
      );
    }

    this.ui.contentEvents.attachHeartEvents();
    this.applyPlaybackErrorState();
    this.updateSleepBadge();
  }

  renderQueueList() {
    const list = document.getElementById("queue-list");
    if (!list) return;
    const state = this.ui.state;
    list.innerHTML = "";
    if (!state.queue.length) {
      list.innerHTML = '<div class="empty">Queue is empty</div>';
      return;
    }
    state.queue.forEach((s, idx) => {
      const item = document.createElement("div");
      item.className = `queue-item ${idx === state.queueIndex ? "active" : ""}`;
      item.draggable = true;
      item.dataset.queueIdx = idx;
      item.onclick = (e) => {
        if (
          e.target.closest(".queue-item-remove") ||
          e.target.closest(".queue-drag-handle")
        )
          return;
        this.ui.audioPlayer.playSong(s, state.queue, true, "queue");
        this.closeQueue();
      };
      const indicator =
        idx === state.queueIndex
          ? `<div class="now-playing-indicator"><div class="bar-anim"></div><div class="bar-anim"></div><div class="bar-anim"></div></div>`
          : `<span class="num">${idx + 1}</span>`;
      item.innerHTML = `
        <span class="queue-drag-handle" title="Drag to reorder">${Icons.general.dragHandle(14)}</span>
        <img src="${s.coverUrl}" class="queue-item-thumb">
        <div class="queue-item-info">
          <div class="queue-item-title">${s.title}</div>
          <div class="queue-item-artist">${s.artist}</div>
        </div>
        ${indicator}
        <button class="queue-item-remove" title="Remove from queue">${Icons.general.close(12)}</button>
      `;
      item
        .querySelector(".queue-item-remove")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeQueueItem(idx);
        });
      item.addEventListener("dragstart", (e) => {
        this._dragQueueIdx = idx;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(idx));
        } catch (err) {}
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        this._dragQueueIdx = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        let from = this._dragQueueIdx;
        if (from == null) {
          const parsed = parseInt(e.dataTransfer.getData("text/plain"), 10);
          from = Number.isInteger(parsed) ? parsed : null;
        }
        if (from != null && from !== idx) this.moveQueueItem(from, idx);
      });
      list.appendChild(item);
    });
  }

  moveQueueItem(from, to) {
    const state = this.ui.state;
    if (
      from < 0 ||
      from >= state.queue.length ||
      to < 0 ||
      to >= state.queue.length
    )
      return;
    const [moved] = state.queue.splice(from, 1);
    state.queue.splice(to, 0, moved);
    if (state.queueIndex === from) state.queueIndex = to;
    else if (from < state.queueIndex && to >= state.queueIndex)
      state.queueIndex--;
    else if (from > state.queueIndex && to <= state.queueIndex)
      state.queueIndex++;
    this.renderQueueList();
  }

  removeQueueItem(idx) {
    const state = this.ui.state;
    if (idx < 0 || idx >= state.queue.length) return;
    const wasCurrent = idx === state.queueIndex;
    state.queue.splice(idx, 1);
    if (wasCurrent) {
      state.queueIndex = idx - 1;
    } else if (idx < state.queueIndex) {
      state.queueIndex--;
    }
    this.renderQueueList();
    state.showToast("Removed from queue");
  }

  clearQueue() {
    const state = this.ui.state;
    const current = state.queue[state.queueIndex] || state.currentSong;
    state.queue = current ? [current] : [];
    state.queueIndex = current ? 0 : -1;
    this.renderQueueList();
    state.showToast("Queue cleared");
  }

  saveQueueAsPlaylist() {
    const state = this.ui.state;
    const remaining = state.queue.slice(Math.max(0, state.queueIndex + 1));
    if (!remaining.length) {
      state.showToast("No upcoming songs to save");
      return;
    }
    state.modalOpen(`
      <div data-modal="save-queue" class="saveQueue">
        <div class="head">
          <h2 class="title">Save Queue as Playlist</h2>
          <button onclick="window.closeModal()" class="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="note">${remaining.length} upcoming song${remaining.length === 1 ? "" : "s"} will be saved.</p>
        <input type="text" id="save-queue-playlist-name" placeholder="Playlist name" class="input">
        <button id="save-queue-playlist-confirm" class="cta">
          Save Playlist
        </button>
      </div>
    `);
    document
      .getElementById("save-queue-playlist-confirm")
      ?.addEventListener("click", () => {
        const name = document
          .getElementById("save-queue-playlist-name")
          ?.value.trim();
        if (!name) return;
        state.playlists.push({
          id: Utils.newId("pl"),
          name,
          description: "",
          tags: [],
          songs: remaining.map((s) => Utils.id(s.id))
        });
        state.persist();
        state.modalClose();
        state.showToast(`Playlist "${name}" created`);
      });
  }

  toggleQueue() {
    this.ui.state.isQueueOpen = !this.ui.state.isQueueOpen;
    document
      .getElementById("queue-modal")
      ?.classList.toggle("open", this.ui.state.isQueueOpen);
    if (this.ui.state.isQueueOpen) this.renderQueueList();
  }

  openQueue() {
    if (this.ui.state.isQueueOpen) return;
    this.ui.state.isQueueOpen = true;
    document.getElementById("queue-modal")?.classList.add("open");
    this.renderQueueList();
  }

  closeQueue() {
    this.ui.state.isQueueOpen = false;
    document.getElementById("queue-modal")?.classList.remove("open");
  }

  toggleLyrics() {
    this.ui.state.isLyricsOpen = !this.ui.state.isLyricsOpen;
    document
      .getElementById("lyrics-overlay")
      ?.classList.toggle("visible", this.ui.state.isLyricsOpen);
  }

  toggleShare() {
    const song = this.ui.state.currentSong;
    if (!song) return;
    const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
    if (navigator.share) {
      navigator
        .share({
          title: song.title,
          text: `Listen to ${song.title} by ${song.artist}`,
          url
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(url)
        .then(() => this.ui.state.showToast("Link copied to clipboard"));
    }
  }

  cycleSpeed() {
    const speeds = [0.5, 1, 1.5, 2];
    const idx =
      (speeds.indexOf(this.ui.state.playbackRate) + 1) % speeds.length;
    this.ui.state.playbackRate = speeds[idx];
    this.ui.audioPlayer.audio.playbackRate = this.ui.state.playbackRate;
    const btn = document.getElementById("speed-btn");
    if (btn) {
      btn.textContent = this.ui.state.playbackRate + "x";
      btn.classList.toggle("active", this.ui.state.playbackRate !== 1);
    }
  }

  toggleSleepTimer() {
    this.openSleepMenu();
  }

  openSleepMenu() {
    const state = this.ui.state;
    const minutes = [5, 15, 30, 45, 60];
    const activeMin = state.sleepTimerEndsAt
      ? Math.round((state.sleepTimerEndsAt - Date.now()) / 60000)
      : null;
    state.modalOpen(`
      <div data-modal="sleep" class="sleep-menu">
        <div class="head">
          <h2 class="title">Sleep Timer</h2>
          <button onclick="window.closeModal()" class="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div data-list="options" class="sleep-options">
          ${minutes
            .map(
              (m) => `
            <button class="sleep-option ${activeMin === m ? "active" : ""}" data-sleep-min="${m}">
              <span class="sleep-option-label">${m} minutes</span>
            </button>
          `
            )
            .join("")}
          <button class="sleep-option ${state.sleepTimerTrackEnd ? "active" : ""}" data-sleep-track="1">
            <span class="sleep-option-label">End of current track</span>
          </button>
          <button class="sleep-option sleep-option-off" data-sleep-off="1">
            <span class="sleep-option-label">Off</span>
          </button>
        </div>
      </div>
    `);
    document.querySelectorAll("#modal [data-sleep-min]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.setSleepTimer(parseInt(btn.dataset.sleepMin, 10))
      );
    });
    document
      .querySelector("#modal [data-sleep-track]")
      ?.addEventListener("click", () => this.setSleepTrackEnd());
    document
      .querySelector("#modal [data-sleep-off]")
      ?.addEventListener("click", () => {
        this.clearSleepTimer();
        state.modalClose();
      });
  }

  setSleepTimer(minutes) {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
    state.sleepTimerId = setTimeout(
      () => this._fireSleepTimer(),
      minutes * 60 * 1000
    );
    document.getElementById("sleep-btn")?.classList.add("active");
    this._startSleepBadge();
    state.modalClose();
    state.showToast(`Sleep timer: ${minutes} min`);
  }

  setSleepTrackEnd() {
    const state = this.ui.state;
    this.clearSleepTimer({ silent: true });
    state.sleepTimerTrackEnd = true;
    document.getElementById("sleep-btn")?.classList.add("active");
    this.updateSleepBadge();
    state.modalClose();
    state.showToast("Sleep timer: stops after the current track");
  }

  clearSleepTimer({ silent = false } = {}) {
    const state = this.ui.state;
    if (state.sleepTimerId) clearTimeout(state.sleepTimerId);
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    state.sleepTimerTrackEnd = false;
    if (this._sleepBadgeTimer) {
      clearInterval(this._sleepBadgeTimer);
      this._sleepBadgeTimer = null;
    }
    document.getElementById("sleep-btn")?.classList.remove("active");
    this.updateSleepBadge();
    if (!silent) state.showToast("Sleep timer off");
  }

  _fireSleepTimer() {
    const state = this.ui.state;
    state.sleepTimerId = null;
    state.sleepTimerEndsAt = null;
    if (state.isPlaying) this.ui.audioPlayer.togglePlay();
    this.clearSleepTimer({ silent: true });
    state.showToast("Sleep timer ended");
  }

  _startSleepBadge() {
    if (this._sleepBadgeTimer) clearInterval(this._sleepBadgeTimer);
    this.updateSleepBadge();
    this._sleepBadgeTimer = setInterval(() => this.updateSleepBadge(), 1000);
  }

  updateSleepBadge() {
    const btn = document.getElementById("sleep-btn");
    if (!btn) return;
    const state = this.ui.state;
    let badge = btn.querySelector(".sleep-badge");
    const remaining = state.sleepTimerEndsAt
      ? Math.max(0, state.sleepTimerEndsAt - Date.now())
      : null;
    if (remaining == null && !state.sleepTimerTrackEnd) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "sleep-badge";
      btn.appendChild(badge);
    }
    badge.textContent = state.sleepTimerTrackEnd
      ? "track"
      : Utils.formatTime(Math.ceil(remaining / 1000));
  }

  setupVisualizer() {
    const canvas = document.getElementById("visualizer");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let width, height;
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let analyser,
      dataArray,
      audioConnected = false;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(
        this.ui.audioPlayer.audio
      );
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioConnected = true;
    } catch {}

    let barCount = 30;
    let barTargets = new Float32Array(barCount);
    let barCurrent = new Float32Array(barCount);
    let accentRGB = { r: 255, g: 107, b: 107 };

    window.addEventListener("themechange", (e) => {
      accentRGB = IdUtils.hslToRgb(e.detail.accent);
    });

    let animFrame;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (this.ui.state.isPlaying) {
        if (audioConnected && analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          const step = dataArray.length / barCount;
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            for (let j = start; j < end; j++) sum += dataArray[j];
            barTargets[i] = sum / Math.max(1, end - start) / 255;
          }
        } else {
          const t = performance.now() / 1000;
          for (let i = 0; i < barCount; i++) {
            barTargets[i] =
              Math.sin(t * 2 + i * 0.4) * 0.3 +
              Math.sin(t * 3.5 + i * 0.7) * 0.2 +
              Math.sin(t * 1.2 + i * 0.2) * 0.15 +
              0.35;
          }
        }
        const lerpFactor = 0.12;
        for (let i = 0; i < barCount; i++) {
          barCurrent[i] += (barTargets[i] - barCurrent[i]) * lerpFactor;
        }
        const halfBars = Math.floor(barCount / 2);
        const barWidth = width / barCount;
        const centerX = width / 2;
        for (let i = 0; i < halfBars; i++) {
          const h = barCurrent[i] * height * 0.85;
          if (h < 1) continue;
          const xLeft = centerX - (i + 1) * barWidth;
          const xRight = centerX + i * barWidth;
          const y = height - h;
          const gradient = ctx.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(
            0,
            `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0)`
          );
          gradient.addColorStop(
            0.5,
            `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.25)`
          );
          gradient.addColorStop(
            1,
            `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b}, 0.55)`
          );
          ctx.fillStyle = gradient;
          const w = barWidth - 2;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(xLeft, y, w, h, [3, 3, 0, 0]);
            ctx.roundRect(xRight, y, w, h, [3, 3, 0, 0]);
          } else {
            ctx.moveTo(xLeft + 3, y);
            ctx.lineTo(xLeft + w - 3, y);
            ctx.quadraticCurveTo(xLeft + w, y, xLeft + w, y + 3);
            ctx.lineTo(xLeft + w, y + h);
            ctx.lineTo(xLeft, y + h);
            ctx.lineTo(xLeft, y + 3);
            ctx.quadraticCurveTo(xLeft, y, xLeft + 3, y);

            ctx.moveTo(xRight + 3, y);
            ctx.lineTo(xRight + w - 3, y);
            ctx.quadraticCurveTo(xRight + w, y, xRight + w, y + 3);
            ctx.lineTo(xRight + w, y + h);
            ctx.lineTo(xRight, y + h);
            ctx.lineTo(xRight, y + 3);
            ctx.quadraticCurveTo(xRight, y, xRight + 3, y);
          }
          ctx.fill();
        }
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();

    const observer = new MutationObserver(() => {
      if (!document.getElementById("full-player-drawer")) {
        cancelAnimationFrame(animFrame);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

export class MediaSessionManager {
  constructor(state, audioPlayer) {
    this.state = state;
    this.audioPlayer = audioPlayer;
    this.audio = audioPlayer.audio;
    this._isSupported = "mediaSession" in navigator;
    if (!this._isSupported) {
      console.warn("[MediaSession] API not supported in this browser");
      return;
    }

    // Bound listeners for clean removal
    this._onPlay = () => this.updatePlaybackState();
    this._onPause = () => this.updatePlaybackState();
    this._onEnded = () => this.updatePlaybackState();
    this._onTimeUpdate = () => this._schedulePositionUpdate();
    this._onLoadedMetadata = () => this.updatePositionState();
    this._onRateChange = () => this.updatePositionState();

    this._positionUpdateScheduled = false;
    this._setupActionHandlers();
    this._attachAudioListeners();
  }

  // ==================== PUBLIC API ====================

  /**
   * Set full metadata for the currently playing song.
   *
   * CRITICAL ORDER FOR ANDROID:
   *   1. Set playbackState FIRST (some Android builds require this)
   *   2. Then set metadata
   *   3. Then set position state
   *
   * Provides multiple artwork sizes so the OS can pick the best one
   * for the notification shade, lock screen, smart watch, etc.
   */
  updateMetadata(songData) {
    if (!this._isSupported || !songData) {
      console.warn("[MediaSession] updateMetadata called with no songData");
      return;
    }

    const { title, artist, album } = songData;

    // Android's notification shade fetches artwork in its own OS process,
    // not the page's JS context — relative URLs won't reliably resolve there.
    const coverUrl = songData.coverUrl
      ? new URL(songData.coverUrl, window.location.origin).href
      : null;

    if (!title || !artist) {
      console.warn(
        "[MediaSession] Missing title or artist in songData:",
        songData
      );
    }

    // STEP 1: Set playback state FIRST (required by some Android builds)
    this.updatePlaybackState();

    // STEP 2: Build artwork array with multiple sizes
    const artwork = this._buildArtwork(coverUrl);

    // STEP 3: Set metadata
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "Unknown Title",
        artist: artist || "Unknown Artist",
        album: album || "",
        artwork: artwork
      });
      console.log("[MediaSession] Metadata set:", title, "-", artist, artwork);
    } catch (err) {
      console.error(
        "[MediaSession] Metadata with artwork failed, retrying without:",
        err
      );
      // Fallback: metadata without artwork (images might have CORS issues)
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || "Unknown Title",
          artist: artist || "Unknown Artist",
          album: album || ""
        });
        console.log(
          "[MediaSession] Metadata set (no artwork):",
          title,
          "-",
          artist
        );
      } catch (err2) {
        console.error("[MediaSession] Complete metadata failure:", err2);
      }
    }

    // STEP 4: Position state
    this.updatePositionState();

    // STEP 5: Attempt to preload artwork so the OS can cache it.
    // This helps on Android where the SystemUI fetches artwork asynchronously.
    if (coverUrl) {
      this._preloadArtwork(coverUrl);
    }
  }

  /** Reset media session when playback stops or queue is empty */
  clearMetadata() {
    if (!this._isSupported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    if ("setPositionState" in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: 0,
        playbackRate: 1,
        position: 0
      });
    }
  }

  updatePlaybackState() {
    if (!this._isSupported) return;
    const isPlaying = this.state.isPlaying;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }

  updatePositionState() {
    if (!this._isSupported || !this.state.currentSong) return;
    if ("setPositionState" in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: this.state.duration || 0,
        playbackRate: this.audio.playbackRate || 1,
        position: this.audio.currentTime || 0
      });
    }
  }

  /** Remove all listeners and stop pending updates. Call when the player is destroyed. */
  destroy() {
    if (!this._isSupported) return;

    this.audio.removeEventListener("play", this._onPlay);
    this.audio.removeEventListener("pause", this._onPause);
    this.audio.removeEventListener("ended", this._onEnded);
    this.audio.removeEventListener("timeupdate", this._onTimeUpdate);
    this.audio.removeEventListener("loadedmetadata", this._onLoadedMetadata);
    this.audio.removeEventListener("ratechange", this._onRateChange);

    if (this._rafId) cancelAnimationFrame(this._rafId);

    this.clearMetadata();
  }

  // ==================== PRIVATE ====================

  /**
   * Build artwork array with multiple sizes for the OS media session.
   * Android's media framework picks the closest size for the notification.
   */
  _buildArtwork(coverUrl) {
    if (!coverUrl) return [];

    const type = this._detectMimeType(coverUrl);

    // Provide a range of standard sizes. The browser/OS will pick
    // the best fit for the notification shade / lock screen.
    return [
      { src: coverUrl, sizes: "96x96", type },
      { src: coverUrl, sizes: "128x128", type },
      { src: coverUrl, sizes: "192x192", type },
      { src: coverUrl, sizes: "256x256", type },
      { src: coverUrl, sizes: "384x384", type },
      { src: coverUrl, sizes: "512x512", type }
    ];
  }

  /**
   * Preload artwork image so the OS media session can display it.
   * Android's SystemUI fetches artwork asynchronously, so preloading
   * helps ensure the image is ready when the notification is shown.
   */
  _preloadArtwork(url) {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => console.log("[MediaSession] Artwork preloaded:", url);
    img.onerror = () =>
      console.warn("[MediaSession] Artwork failed to preload:", url);
    img.src = url;
  }

  /** Detect MIME type from URL extension */
  _detectMimeType(url) {
    if (!url) return "image/png";
    const lower = url.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    return "image/png";
  }

  _setupActionHandlers() {
    const ms = navigator.mediaSession;
    if (!ms) return;

    const safeHandler = (action, fn) => {
      try {
        ms.setActionHandler(action, fn);
      } catch (e) {
        console.warn("[MediaSession] Action not supported:", action);
      }
    };

    safeHandler("play", () => this.audioPlayer.togglePlay?.());
    safeHandler("pause", () => this.audioPlayer.togglePlay?.());
    safeHandler("previoustrack", () => this.audioPlayer.skipBack?.());
    safeHandler("nexttrack", () => this.audioPlayer.skipForward?.());

    safeHandler("seekbackward", (details) => {
      const offset = details?.seekOffset || 10;
      this.audio.currentTime = Math.max(0, this.audio.currentTime - offset);
    });

    safeHandler("seekforward", (details) => {
      const offset = details?.seekOffset || 10;
      this.audio.currentTime = Math.min(
        this.state.duration,
        this.audio.currentTime + offset
      );
    });

    safeHandler("seekto", (details) => {
      if (details?.seekTime != null) {
        this.audio.currentTime = Math.min(
          this.state.duration,
          Math.max(0, details.seekTime)
        );
      }
    });

    safeHandler("stop", () => {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.state.isPlaying = false;
      this.clearMetadata();
    });
  }

  _attachAudioListeners() {
    this.audio.addEventListener("play", this._onPlay);
    this.audio.addEventListener("pause", this._onPause);
    this.audio.addEventListener("ended", this._onEnded);
    this.audio.addEventListener("timeupdate", this._onTimeUpdate);
    this.audio.addEventListener("loadedmetadata", this._onLoadedMetadata);
    this.audio.addEventListener("ratechange", this._onRateChange);
  }

  /** Throttled position state update using requestAnimationFrame */
  _schedulePositionUpdate() {
    if (this._positionUpdateScheduled) return;
    this._positionUpdateScheduled = true;
    this._rafId = requestAnimationFrame(() => {
      this._positionUpdateScheduled = false;
      this._rafId = null;
      this.updatePositionState();
    });
  }
}
