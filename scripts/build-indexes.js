const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..", "library");
const ARTISTS_DIR = path.join(ROOT, "artists");

async function safeReadJSON(filepath) {
  try {
    const raw = await fs.readFile(filepath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (e) {
    return null;
  }
}

(async () => {
  console.log(`Looking for artists in: ${ARTISTS_DIR}`);

  try {
    await fs.access(ARTISTS_DIR);
  } catch {
    console.error(`\n❌ Artists directory not found: ${ARTISTS_DIR}`);
    console.error(`   Expected: <repo-root>/library/artists/<artistId>/artist.json`);
    console.error(`   Check that "library" sits at the top level of the repo and is lowercase.`);
    process.exit(1);
  }

  const entries = await fs.readdir(ARTISTS_DIR, { withFileTypes: true });
  const artistIds = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  if (!artistIds.length) {
    console.error(`\n❌ No artist folders found inside ${ARTISTS_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${artistIds.length} artist folders`);

  const artists = [];
  const albums = [];
  const skippedArtists = [];
  const skippedAlbums = [];

  for (const id of artistIds) {
    const dir = path.join(ARTISTS_DIR, id);
    const artist = await safeReadJSON(path.join(dir, "artist.json"));

    if (!artist) {
      skippedArtists.push(id);
      continue;
    }

    const disc = (await safeReadJSON(path.join(dir, "discography.json"))) || { albums: [] };

    artists.push({
      id: artist.id ?? id,
      artist: artist.artist ?? artist.name ?? "Unknown",
      genre: artist.genre ?? "Unknown",
      imageUrl: `library/artists/${id}/portraits/portrait.jpg`,
      albumCount: disc.albums?.length ?? 0,
      songCount: (disc.albums || []).reduce((n, a) => n + (a.songCount || 0), 0),
    });

    for (const a of disc.albums || []) {
      if (a.id == null) {
        skippedAlbums.push(`${id}/<missing-id>`);
        continue;
      }
      albums.push({
        id: a.id,
        artistId: artist.id ?? id,
        artistName: artist.artist ?? artist.name ?? "Unknown",
        title: a.title ?? a.album ?? "Untitled",
        year: a.year,
        coverUrl: `library/artists/${id}/albums/${a.id}/cover.jpg`,
        songCount: a.songCount ?? 0,
      });
    }
  }

  if (skippedArtists.length) {
    console.warn(`\n⚠️  Skipped ${skippedArtists.length} artist folder(s) with no valid artist.json:`);
    for (const id of skippedArtists.slice(0, 20)) console.warn(`   - ${id}`);
    if (skippedArtists.length > 20) console.warn(`   ... and ${skippedArtists.length - 20} more`);
  }

  if (skippedAlbums.length) {
    console.warn(`\n⚠️  Skipped ${skippedAlbums.length} album(s) missing an "id" field.`);
  }

  if (!artists.length) {
    console.error(`\n❌ No artists could be indexed. Aborting.`);
    process.exit(1);
  }

  await fs.writeFile(path.join(ROOT, "index.json"), JSON.stringify(artists));
  await fs.writeFile(path.join(ROOT, "albums-index.json"), JSON.stringify(albums));

  console.log(`\n✅ Wrote library/index.json — ${artists.length} artists`);
  console.log(`✅ Wrote library/albums-index.json — ${albums.length} albums`);
})().catch((err) => {
  console.error("\n❌ Build failed:", err);
  process.exit(1);
});
