// /////////////////////////////////////////////////
// Playlists
// /////////////////////////////////////////////////
/***
class Playlists {
  constructor(ui) {
    this.ui = ui;
  }

  viewPlaylist(name) {
    this.ui.state.selectedPlaylistName = name;
    this.ui.render();
  }

  render() {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;

    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || "Playlists"}</h1>
          ${
            !viewing
              ? `<button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.openCreateModal()">+ New</button>`
              : `<button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.viewPlaylist(null)">&larr; Back</button>`
          }
        </header>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>
    `;
  }
  openCreateModal() {
    const btn = document.querySelector('[data-page="playlists"] .action-btn.primary');
    const sp = new Spinner({
      container: btn || document.querySelector('[data-page="playlists"]'),
      blur: 8,
      dim: 0.4,
      size: 20,
      minDuration: 400,
      delay: 80,
    });
    sp.show();

    setTimeout(() => {
      const modal = document.getElementById("create-playlist-modal");
      modal?.classList.remove("hidden");
      sp.hide();
      setTimeout(() => sp.remove(), 400);
    }, this.ui.fragmentLoadDelay || 800);
  }

  playlistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length) {
      return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    }

    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists
          .map((playlist) => {
            const covers = playlist.songs
              .map((id) => state.getSongById(id))
              .filter(Boolean)
              .slice(0, 4)
              .map((song) => song.coverUrl);

            return `
            <div class="playlist-card" onclick="window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(playlist.name)}')">
              <div class="mosaic-wrap">
                ${covers.length ? covers.map((cover) => `<img src="${cover}">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                <button class="playlist-play-btn" data-playlist-play="${playlist.id}" onclick="event.stopPropagation();">${Icons.player.play(20)}</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="min-width: 0;">
                  <span style="font-weight: 700; font-size: 1rem; color: rgb(var(--textPrimary)); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.esc(playlist.name)}</span>
                  <span style="font-size: 0.8rem; color: rgba(var(--textSecondary)/1); display: block;">by You</span>
                </div>
                <button class="ui-more-btn" onclick="event.stopPropagation(); window.favoritesPlaylists.openModal()">${Icons.general.moreVert(18)}</button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  playlistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;

    const songs = playlist.songs.map((id) => state.getSongById(id)).filter(Boolean);

    return `
      <div class="animate-fadeInUp">
        <div class="viewer-header">
          <p style="color: rgba(var(--textSecondary)/1); font-size: 0.9rem;">Experience this playlist curated by you.<br>${songs.length} Songs</p>
          <div class="action-bar">
            <button class="action-btn" data-action="download-playlist" title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" onclick="window.uiManager.editPlaylist('${playlist.id}')" title="Edit"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="action-btn primary" data-playlist-play="${playlist.id}" style="width: 50px; height: 50px;" title="Play">${Icons.player.play(24)}</button>
            <button class="action-btn share-playlist-btn" data-playlist-id="${playlist.id}" title="Share"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="action-btn" title="More">${Icons.general.moreHoriz(18)}</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${songs
            .map(
              (song, i) => `
            <div class="list-row" data-song-id="${song.id}" data-playlist-id="${playlist.id}" data-play-source="playlist" style="cursor: pointer;" onclick="window.pagesActions.playSong(this.dataset.songId, 'playlist')">
              <span style="color: rgba(var(--textOthers)/1); font-size: 0.85rem; font-weight: 600; text-align: center;">${i + 1}</span>
              <img src="${song.coverUrl}" class="row-thumb">
              <div style="min-width: 0;"><span class="row-title">${Utils.esc(song.title)}</span><span class="row-sub">${Utils.esc(song.artist)} • ${Utils.esc(song.album)}</span></div>
              <button class="ui-more-btn" data-more-song="${song.id}" onclick="event.stopPropagation();">${Icons.general.moreHoriz(20)}</button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
}
***/


class Playlists {
  constructor(ui) {
    this.ui = ui;
  }

  viewPlaylist(name) {
    this.ui.state.selectedPlaylistName = name;
    this.ui.render();
  }

  openCreateModal() {
    if (window.favoritesPlaylists && typeof window.favoritesPlaylists.createNewPlaylist === "function") {
      window.favoritesPlaylists.createNewPlaylist();
      return;
    }

    if (window.uiManager && typeof window.uiManager.createPlaylist === "function") {
      window.uiManager.createPlaylist();
      return;
    }

    const modal = document.getElementById("create-playlist-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("is-open");
      return;
    }

    console.warn("[Playlists] No create playlist flow found.");
    if (window.popups && typeof window.popups.toast === "function") {
      window.popups.toast({
        type: "warning",
        message: "Playlist creation is unavailable right now."
      });
    }
  }

  render() {
    const state = this.ui.state;
    const viewing = state.selectedPlaylistName;

    return `
      <div data-page="playlists" class="page animate-fadeInUp">
        <header class="pageHeader">
          <h1 class="pageTitle">${viewing || "Playlists"}</h1>
          ${
            !viewing
              ? `<button class="action-btn primary" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.openCreateModal()">+ New</button>`
              : `<button class="action-btn" style="width: auto; padding: 0 1rem; border-radius: 999px; font-weight: 600;" onclick="window.uiManager.playlistsPage.viewPlaylist(null)">&larr; Back</button>`
          }
        </header>
        ${viewing ? this.playlistViewer(viewing) : this.playlistsGrid()}
      </div>
    `;
  }

  playlistsGrid() {
    const state = this.ui.state;
    if (!state.playlists.length) {
      return `<div style="text-align: center; padding: 4rem 0; color: rgba(var(--textSecondary)/1);">No playlists yet.</div>`;
    }

    return `
      <div class="playlist-grid animate-fadeInUp">
        ${state.playlists
          .map((playlist) => {
            const covers = playlist.songs
              .map((id) => state.getSongById(id))
              .filter(Boolean)
              .slice(0, 4)
              .map((song) => song.coverUrl);

            return `
              <div class="playlist-card" onclick="window.uiManager.playlistsPage.viewPlaylist('${Utils.esc(playlist.name)}')">
                <div class="mosaic-wrap">
                  ${covers.length ? covers.map((cover) => `<img src="${cover}">`).join("") : `<div class="mosaic-empty">${Icons.general.playlist(32)}</div>`}
                  <button class="playlist-play-btn" data-playlist-play="${playlist.id}" onclick="event.stopPropagation();">${Icons.player.play(20)}</button>
                </div>
                <div class="playlist-card-body">
                  <h3>${Utils.esc(playlist.name)}</h3>
                  <p>${Utils.esc(playlist.description || "")}</p>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  playlistViewer(name) {
    const state = this.ui.state;
    const playlist = state.playlists.find((p) => p.name === name);
    if (!playlist) return `<div>Playlist not found</div>`;

    const songs = playlist.songs.map((id) => state.getSongById(id)).filter(Boolean);

    return `
      <div class="animate-fadeInUp">
        <div class="viewer-header">
          <p style="color: rgba(var(--textSecondary)/1); font-size: 0.9rem;">Experience this playlist curated by you.<br>${songs.length} Songs</p>
          <div class="action-bar">
            <button class="action-btn" data-action="download-playlist" title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button class="action-btn" onclick="window.uiManager.editPlaylist('${playlist.id}')" title="Edit"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="action-btn primary" data-playlist-play="${playlist.id}" style="width: 50px; height: 50px;" title="Play">${Icons.player.play(24)}</button>
            <button class="action-btn share-playlist-btn" data-playlist-id="${playlist.id}" title="Share"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            <button class="action-btn" title="More">${Icons.general.moreHoriz(18)}</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${songs
            .map(
              (song, i) => `
            <div class="list-row" data-song-id="${song.id}" data-playlist-id="${playlist.id}" data-play-source="playlist" style="cursor: pointer;" onclick="window.pagesActions.playSong(this.dataset.songId, 'playlist')">
              <span style="color: rgba(var(--textOthers)/1); font-size: 0.85rem; font-weight: 600; text-align: center;">${i + 1}</span>
              <img src="${song.coverUrl}" class="row-thumb">
              <div style="min-width: 0;"><span class="row-title">${Utils.esc(song.title)}</span><span class="row-sub">${Utils.esc(song.artist)} • ${Utils.esc(song.album)}</span></div>
              <button class="ui-more-btn" data-more-song="${song.id}" onclick="event.stopPropagation();">${Icons.general.moreHoriz(20)}</button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
}


window.Playlists = Playlists;
