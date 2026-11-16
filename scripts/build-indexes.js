// scripts/build-indexes.js (run locally or in CI)
const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..", "library");
const readJSON = (p) => fs.readFile(p, "utf8").then(JSON.parse);

(async () => {
  const artistIds = await fs.readdir(path.join(ROOT, "artists"));
  const artists = [], albums = [], songs = [];

  for (const id of artistIds) {
    const dir = path.join(ROOT, "artists", id);
    const artist = await readJSON(path.join(dir, "artist.json"));
    const disc  = await readJSON(path.join(dir, "discography.json")).catch(() => ({ albums: [] }));

    artists.push({
      id: artist.id ?? id,
      artist: artist.artist,
      genre: artist.genre ?? "Unknown",
      imageUrl: `library/artists/${id}/portraits/portrait.jpg`,
      albumCount: disc.albums?.length ?? 0,
      songCount: (disc.albums || []).reduce((n, a) => n + (a.songCount || 0), 0),
    });

    for (const a of disc.albums || []) {
      albums.push({
        id: a.id, artistId: artist.id ?? id, artistName: artist.artist,
        title: a.title ?? a.album, year: a.year,
        coverUrl: `library/artists/${id}/albums/${a.id}/cover.jpg`,
        songCount: a.songCount ?? 0,
      });
      // songs-index: only if you want it
      // const alb = await readJSON(path.join(dir, "albums", String(a.id), "album.json"));
      // for (const s of alb.songs || []) songs.push({...});
    }
  }

  await fs.writeFile(path.join(ROOT, "index.json"),          JSON.stringify(artists));
  await fs.writeFile(path.join(ROOT, "albums-index.json"),   JSON.stringify(albums));
  // await fs.writeFile(path.join(ROOT, "songs-index.json"), JSON.stringify(songs));
})();