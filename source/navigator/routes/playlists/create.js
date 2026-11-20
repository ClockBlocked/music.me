// /////////////////////////////////////////////////
// Create Playlist
// /////////////////////////////////////////////////
class CreatePlaylist {
  constructor(ui) {
    this.ui = ui;
  }

  reset() {
    const count = (this.ui.state.playlists?.length || 0) + 1;
    this.ui.state.draftPlaylist = {
      name: `My Playlist #${count}`,
      description: "",
      tags: [],
      songs: [],
    };
    return this.ui.state.draftPlaylist;
  }

  render() {
    const state = this.ui.state;
    const draft = state.draftPlaylist || this.reset();

    const songs = draft.songs.map((id) => state.getSongById(id)).filter(Boolean);

    const totalDuration = songs.reduce((sum, song) => {
      const parts = song?.duration?.split(":") || ["0", "0"];
      if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return sum;
    }, 0);
    const durationText = Utils.fmtTime(totalDuration);

    const canCreate = draft.name.trim().length > 0;

    return `
      <div data-page="create-playlist" class="page animate-fadeInUp">
        <div class="edit-playlist-header">
          <button class="edit-playlist-back" data-action="back" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="edit-playlist-title">New Playlist</h1>
          <button class="edit-playlist-done" data-action="create" ${canCreate ? "" : "disabled"}>Create</button>
        </div>
        <div class="edit-playlist-hero">
          <div class="edit-playlist-cover">
            ${this.coverPreview(draft)}
            <button class="edit-playlist-cover-btn" data-action="change-cover" title="Change cover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
          <div class="edit-playlist-meta-fields">
            <div class="edit-playlist-field">
              <label for="create-pl-name">Name</label>
              <input type="text" id="create-pl-name" class="edit-playlist-input" value="${Utils.esc(draft.name)}" placeholder="Playlist name" maxlength="80" data-draft-field="name">
            </div>
            <div class="edit-playlist-field">
              <label for="create-pl-desc">Description</label>
              <textarea id="create-pl-desc" class="edit-playlist-textarea" rows="2" maxlength="240" placeholder="Add an optional description" data-draft-field="description">${Utils.esc(draft.description || "")}</textarea>
            </div>
            <div class="edit-playlist-field">
              <label>Tags</label>
              <div class="edit-playlist-tags" id="create-pl-tags">
                ${(draft.tags || [])
                  .map((tag) => `<span class="edit-playlist-tag" data-tag="${Utils.esc(tag)}">${Utils.esc(tag)}<button type="button" class="edit-playlist-tag-remove" data-tag="${Utils.esc(tag)}">×</button></span>`)
                  .join("")}
                <input type="text" class="edit-playlist-tag-input" placeholder="Add tag + Enter" maxlength="20">
              </div>
            </div>
            <p class="edit-playlist-stats">${songs.length} songs • ${durationText}</p>
          </div>
        </div>
        <div class="edit-playlist-toolbar">
          <button class="edit-playlist-tool" data-action="add-songs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Songs</button>
        </div>
        <div class="edit-playlist-songs" id="create-playlist-songs">
          ${songs
            .map(
              (song, i) => `
            <div class="edit-playlist-song-row" draggable="true" data-index="${i}" data-song-id="${song.id}">
              <div class="edit-playlist-drag" title="Drag to reorder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg></div>
              <img src="${song.coverUrl}" class="edit-playlist-song-thumb" alt="">
              <div class="edit-playlist-song-info"><p class="edit-playlist-song-title">${Utils.esc(song.title)}</p><p class="edit-playlist-song-artist">${Utils.esc(song.artist || "")} • ${Utils.esc(song.album || "")}</p></div>
              <span class="edit-playlist-song-time">${song.duration || ""}</span>
              <button class="edit-playlist-song-remove" data-action="remove-song" data-index="${i}" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          `
            )
            .join("")}
        </div>
        ${!songs.length ? `<div class="edit-playlist-empty"><div class="edit-playlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></svg></div><h3 class="edit-playlist-empty-title">No songs yet</h3><p class="edit-playlist-empty-desc">Add songs to start building your playlist.</p></div>` : ""}
      </div>
    `;
  }

  coverPreview(draft) {
    const state = this.ui.state;
    const songs = draft.songs
      .map((songId) => state.getSongById(songId))
      .filter(Boolean)
      .slice(0, 4);

    if (!songs.length) return `<div class="edit-cover-empty">${Icons.general.playlist(48)}</div>`;
    if (songs.length === 1) return `<img src="${songs[0].coverUrl}" class="edit-cover-img" alt="">`;
    return `<div class="edit-cover-mosaic">${songs.map((song) => `<img src="${song.coverUrl}" class="edit-cover-quarter" alt="">`).join("")}</div>`;
  }
}

window.CreatePlaylist = CreatePlaylist;
