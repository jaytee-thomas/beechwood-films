import { access, mkdir, readFile, writeFile } from "fs/promises";
import { constants } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dataFile = path.join(dataDir, "db.json");

const seedData = {
  videos: [
    {
      id: 1001,
      title: "Roots of Beechwood — A Short Doc",
      provider: "youtube",
      providerId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      library: "Documentaries",
      source: "seed"
    },
    {
      id: 1002,
      title: "The Grove (Short Film)",
      provider: "vimeo",
      providerId: "76979871",
      embedUrl: "https://player.vimeo.com/video/76979871",
      thumbnail: "https://picsum.photos/seed/bf2/640/360",
      library: "Shorts",
      source: "seed"
    },
    {
      id: 1003,
      title: "Behind the Lens — Director’s Cut",
      provider: "file",
      embedUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnail: "https://picsum.photos/seed/bf3/640/360",
      library: "Documentaries",
      source: "seed"
    },
    {
      id: 1004,
      title: "Hometown Stories",
      provider: "file",
      embedUrl: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
      thumbnail: "https://picsum.photos/seed/bf4/640/360",
      library: "Shorts",
      source: "seed"
    }
  ],
  favorites: [],
  progress: {},
  durations: {},
  lastWatched: {},
  users: []
};

const ensureDir = async () => {
  try {
    await access(dataDir, constants.F_OK);
  } catch {
    await mkdir(dataDir, { recursive: true });
  }
};

export const ensureDataFile = async () => {
  await ensureDir();
  try {
    await access(dataFile, constants.F_OK);
  } catch {
    await writeFile(dataFile, JSON.stringify(seedData, null, 2), "utf8");
  }
};

const readJson = async () => {
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw);
};

const writeJson = (data) =>
  writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");

export const readData = async () => {
  await ensureDataFile();
  return readJson();
};

export const writeData = async (updater) => {
  const current = await readData();
  const next = typeof updater === "function" ? updater(current) : updater;
  await writeJson(next);
  return next;
};

export const getVideos = async () => {
  const data = await readData();
  return data.videos || [];
};

export const saveVideos = async (videos) =>
  writeData((data) => ({ ...data, videos }));

export const getUsers = async () => {
  const data = await readData();
  return data.users || [];
};

export const saveUsers = async (users) =>
  writeData((data) => ({ ...data, users }));

export const findUserByEmail = async (email) => {
  const users = await getUsers();
  return users.find(
    (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
  );
};

export const upsertUser = async (user) => {
  return writeData((data) => {
    const users = data.users || [];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      return { ...data, users: [...users, user] };
    }
    const next = [...users];
    next[idx] = user;
    return { ...data, users: next };
  });
};

export const getState = readData;
