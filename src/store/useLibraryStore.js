import { create } from "zustand";

/** Storage keys */
const KEY_VIDEOS    = "bf_videos_v1";
const KEY_FAVORITES = "bf_favs_v1";
const KEY_PROGRESS  = "bf_progress_v1";   // { [videoId]: seconds }
const KEY_DURATIONS = "bf_durations_v1";  // { [videoId]: seconds }
const KEY_LAST      = "bf_last_v1";       // { [videoId]: timestamp }

/** Helpers */
const read = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const loadVideos     = () => read(KEY_VIDEOS, []);
const saveVideos     = (v) => write(KEY_VIDEOS, v);

const loadFavorites  = () => read(KEY_FAVORITES, []);
const saveFavorites  = (v) => write(KEY_FAVORITES, v);

const loadProgress   = () => read(KEY_PROGRESS, {});
const saveProgress   = (v) => write(KEY_PROGRESS, v);

const loadDurations  = () => read(KEY_DURATIONS, {});
const saveDurations  = (v) => write(KEY_DURATIONS, v);

const loadLast       = () => read(KEY_LAST, {});
const saveLast       = (v) => write(KEY_LAST, v);

const seedIfEmpty = (arr) => {
  if (arr && arr.length) return arr;
  const demo = [
    {
      id: 1001,
      title: "Roots of Beechwood — A Short Doc",
      provider: "youtube",
      providerId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      library: "Documentaries"
    },
    {
      id: 1002,
      title: "The Grove (Short Film)",
      provider: "vimeo",
      providerId: "76979871",
      embedUrl: "https://player.vimeo.com/video/76979871",
      thumbnail: "https://picsum.photos/seed/bf2/640/360",
      library: "Shorts"
    },
    {
      id: 1003,
      title: "Behind the Lens — Director’s Cut",
      provider: "file",
      embedUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnail: "https://picsum.photos/seed/bf3/640/360",
      library: "Documentaries"
    },
    {
      id: 1004,
      title: "Hometown Stories",
      provider: "file",
      embedUrl: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
      thumbnail: "https://picsum.photos/seed/bf4/640/360",
      library: "Shorts"
    }
  ];
  saveVideos(demo);
  return demo;
};

const useLibraryStore = create((set, get) => ({
  /** Data */
  videos: seedIfEmpty(loadVideos()),
  favorites: loadFavorites(),
  progress: loadProgress(),      // { id: seconds }
  durations: loadDurations(),    // { id: seconds }
  lastWatched: loadLast(),       // { id: epochMs }

  /** CRUD: videos */
  addVideo: (video) => {
    const next = { id: Date.now(), source: "custom", ...video };
    const videos = [...get().videos, next];
    saveVideos(videos);
    set({ videos });
  },

  updateVideo: (id, updates) => {
    const videos = get().videos.map((v) =>
      v.id === id ? { ...v, ...updates } : v
    );
    saveVideos(videos);
    set({ videos });
  },

  removeVideo: (id) => {
    const videos = get().videos.filter((v) => v.id !== id);
    saveVideos(videos);
    // also clean up progress/duration/lastWatched
    const { progress, durations, lastWatched, favorites } = get();
    const np = { ...progress }; delete np[id];
    const nd = { ...durations }; delete nd[id];
    const nl = { ...lastWatched }; delete nl[id];
    const nf = favorites.filter((fid) => fid !== id);
    saveProgress(np); saveDurations(nd); saveLast(nl); saveFavorites(nf);
    set({ videos, progress: np, durations: nd, lastWatched: nl, favorites: nf });
  },

  /** Favorites */
  toggleFavorite: (id) => {
    const favorites = get().favorites.includes(id)
      ? get().favorites.filter((x) => x !== id)
      : [...get().favorites, id];
    saveFavorites(favorites);
    set({ favorites });
  },

  /** Playback progress */
  setProgress: (id, seconds) => {
    const progress = { ...get().progress, [id]: Math.max(0, Math.floor(seconds || 0)) };
    saveProgress(progress);
    set({ progress });
  },

  clearProgress: (id) => {
    const progress = { ...get().progress };
    delete progress[id];
    saveProgress(progress);
    set({ progress });
  },

  setDuration: (id, seconds) => {
    if (!seconds || !isFinite(seconds)) return;
    const durations = { ...get().durations, [id]: Math.floor(seconds) };
    saveDurations(durations);
    set({ durations });
  },

  /** “Continue watching” recency */
  recordWatch: (id) => {
    const lastWatched = { ...get().lastWatched, [id]: Date.now() };
    saveLast(lastWatched);
    set({ lastWatched });
  },

  clearAllProgress: () => {
    saveProgress({});
    set({ progress: {} });
  }
}));

export default useLibraryStore;
