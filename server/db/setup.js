import db from "./client.js";
import { createDefaultProfile, profileFields } from "../../shared/defaultProfile.js";
import { seedVideosFromFallback } from "./fallback.js";

const PROFILE_ID = "default_profile";
const shouldSeedSampleVideos = process.env.SEED_SAMPLE_VIDEOS === "true";
const SAMPLE_PROFILE_PHOTOS = [
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80"
];
const SAMPLE_WALLPAPERS = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80"
];

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      notify_on_new_video INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      embed_url TEXT NOT NULL,
      src TEXT,
      provider TEXT,
      provider_id TEXT,
      thumbnail TEXT,
      library TEXT,
      source TEXT,
      duration TEXT,
      date TEXT,
      description TEXT,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, video_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      name TEXT,
      bio TEXT,
      hometown TEXT,
      photo TEXT,
      wallpaper TEXT,
      phone TEXT,
      email TEXT,
      whatsapp TEXT,
      youtube TEXT,
      tiktok TEXT,
      instagram TEXT,
      facebook TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fallback_videos (
      title TEXT,
      embed_url TEXT NOT NULL,
      src TEXT,
      provider TEXT,
      provider_id TEXT,
      thumbnail TEXT,
      library TEXT,
      source TEXT,
      duration TEXT,
      date TEXT,
      description TEXT,
      tags TEXT,
      file_name TEXT
    );
  `);
};

const seedVideosIfEmpty = () => {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM videos").get();
  if (countRow.count > 0) return;

  const now = Date.now();
  const fallbackVideos = [
    {
      title: "Roots of Beechwood — A Short Doc",
      provider: "youtube",
      provider_id: "dQw4w9WgXcQ",
      embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      library: "Documentaries",
      source: "seed",
      tags: JSON.stringify([]),
    },
    {
      title: "The Grove (Short Film)",
      provider: "vimeo",
      provider_id: "76979871",
      embed_url: "https://player.vimeo.com/video/76979871",
      src: "https://player.vimeo.com/video/76979871",
      thumbnail: "https://picsum.photos/seed/bf2/640/360",
      library: "Shorts",
      source: "seed",
      tags: JSON.stringify([]),
    },
    {
      title: "Behind the Lens — Director’s Cut",
      provider: "file",
      embed_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      src: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnail: "https://picsum.photos/seed/bf3/640/360",
      library: "Documentaries",
      source: "seed",
      provider_id: null,
      tags: JSON.stringify([]),
    },
    {
      title: "Hometown Stories",
      provider: "file",
      embed_url: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
      src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
      thumbnail: "https://picsum.photos/seed/bf4/640/360",
      library: "Shorts",
      source: "seed",
      provider_id: null,
      tags: JSON.stringify([]),
    }
  ];

  const insert = db.prepare(`
    INSERT INTO videos (
      title, embed_url, src, provider, provider_id, thumbnail, library,
      source, duration, date, description, tags, created_at, updated_at
    )
    VALUES (
      @title, @embed_url, @src, @provider, @provider_id, @thumbnail, @library,
      @source, @duration, @date, @description, @tags, @created_at, @updated_at
    )
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run({
        ...item,
        duration: null,
        date: null,
        description: null,
        created_at: now,
        updated_at: now
      });
    }
  });

  insertMany(fallbackVideos);
};

const seedProfileIfMissing = () => {
  const row = db.prepare("SELECT COUNT(*) as count FROM profile WHERE id = ?").get(PROFILE_ID);
  if (row.count > 0) return;

  const defaults = createDefaultProfile();
  const now = Date.now();
  const columns = profileFields
    .map((field) => `"${field}"`)
    .join(", ");
  const placeholders = profileFields.map((field) => `@${field}`).join(", ");

  db.prepare(
    `INSERT INTO profile (id, ${columns}, updated_at)
     VALUES (@id, ${placeholders}, @updated_at)`
  ).run({
    id: PROFILE_ID,
    updated_at: now,
    ...defaults
  });
};

const ensureProfileColumns = () => {
  const columns = db.prepare("PRAGMA table_info(profile)").all();
  const columnNames = columns.map((column) => column.name);
  if (!columnNames.includes("wallpaper")) {
    db.prepare("ALTER TABLE profile ADD COLUMN wallpaper TEXT").run();
  }
};

const purgeSampleProfileMedia = () => {
  if (SAMPLE_PROFILE_PHOTOS.length) {
    const placeholders = SAMPLE_PROFILE_PHOTOS.map(() => "?").join(", ");
    db.prepare(
      `UPDATE profile SET photo = '' WHERE id = ? AND photo IN (${placeholders})`
    ).run(PROFILE_ID, ...SAMPLE_PROFILE_PHOTOS);
  }

  if (SAMPLE_WALLPAPERS.length) {
    const placeholders = SAMPLE_WALLPAPERS.map(() => "?").join(", ");
    db.prepare(
      `UPDATE profile SET wallpaper = '' WHERE id = ? AND wallpaper IN (${placeholders})`
    ).run(PROFILE_ID, ...SAMPLE_WALLPAPERS);
  }
};

const purgeSeedVideos = () => {
  db.prepare(
    "DELETE FROM favorites WHERE video_id IN (SELECT id FROM videos WHERE source = 'seed')"
  ).run();
  db.prepare("DELETE FROM videos WHERE source = 'seed'").run();
};

export const initializeDatabase = () => {
  createTables();
  ensureProfileColumns();
  if (shouldSeedSampleVideos) {
    seedVideosIfEmpty();
  }
  seedProfileIfMissing();
  purgeSampleProfileMedia();
  if (!shouldSeedSampleVideos) {
    purgeSeedVideos();
  }
  seedVideosFromFallback();
};
