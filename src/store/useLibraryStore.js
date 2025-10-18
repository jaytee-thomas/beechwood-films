import { create } from "zustand";
import useAuth from "./useAuth.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** Storage keys */
const KEY_FAVORITES = "bf_favs_v1";
const KEY_PROGRESS = "bf_progress_v1"; // { [videoId]: seconds }
const KEY_DURATIONS = "bf_durations_v1"; // { [videoId]: seconds }
const KEY_LAST = "bf_last_v1"; // { [videoId]: timestamp }

/** Helpers */
const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const loadFavorites = () => read(KEY_FAVORITES, []);
const saveFavorites = (value) => write(KEY_FAVORITES, value);

const loadProgress = () => read(KEY_PROGRESS, {});
const saveProgress = (value) => write(KEY_PROGRESS, value);

const loadDurations = () => read(KEY_DURATIONS, {});
const saveDurations = (value) => write(KEY_DURATIONS, value);

const loadLast = () => read(KEY_LAST, {});
const saveLast = (value) => write(KEY_LAST, value);

const fallbackVideos = [
  {
    id: 1001,
    title: "Roots of Beechwood — A Short Doc",
    provider: "youtube",
    providerId: "dQw4w9WgXcQ",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
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
    src: "https://player.vimeo.com/video/76979871",
    thumbnail: "https://picsum.photos/seed/bf2/640/360",
    library: "Shorts",
    source: "seed"
  },
  {
    id: 1003,
    title: "Behind the Lens — Director’s Cut",
    provider: "file",
    embedUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    src: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    thumbnail: "https://picsum.photos/seed/bf3/640/360",
    library: "Documentaries",
    source: "seed"
  },
  {
    id: 1004,
    title: "Hometown Stories",
    provider: "file",
    embedUrl: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    thumbnail: "https://picsum.photos/seed/bf4/640/360",
    library: "Shorts",
    source: "seed"
  }
];

const parseError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error || response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
};

const apiRequest = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (networkError) {
    throw new Error(networkError.message || "Network request failed");
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return null;
  return response.json();
};

const authHeaders = () => {
  const token = useAuth.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

const useLibraryStore = create((set, get) => ({
  /** Remote video catalog */
  videos: [],
  videosReady: false,
  videosError: null,
  loadingVideos: false,

  /** Personal data */
  favorites: loadFavorites(),
  progress: loadProgress(),
  durations: loadDurations(),
  lastWatched: loadLast(),

  refreshVideos: async () => {
    set({ loadingVideos: true, videosError: null });
    try {
      const data = await apiRequest("/api/videos");
      const fromServer = Array.isArray(data?.videos) ? data.videos : [];
      const videos = fromServer.length
        ? fromServer.map((video) => ({
            ...video,
            id: Number(video.id) || video.id,
            src: video.src || video.embedUrl || "",
            tags: Array.isArray(video.tags)
              ? video.tags
              : typeof video.tags === "string"
              ? video.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
              : []
          }))
        : fallbackVideos;
      set({ videos, loadingVideos: false, videosReady: true });
      return videos;
    } catch (error) {
      console.warn("Failed to load videos", error);
      if (!get().videos.length) {
        set({ videos: fallbackVideos });
      }
      set({ loadingVideos: false, videosError: error.message, videosReady: true });
      return fallbackVideos;
    }
  },

  addVideo: async (video) => {
    const headers = authHeaders();
    if (!headers.Authorization) {
      throw new Error("Admin access required");
    }
    const payload = await apiRequest("/api/videos", {
      method: "POST",
      headers,
      body: JSON.stringify(video)
    });
    const created = payload.video;
    if (!created) return null;
    const normalised = {
      ...created,
      id: Number(created.id) || created.id,
      src: created.src || created.embedUrl || "",
      tags: Array.isArray(created.tags) ? created.tags : []
    };
    set({ videos: [...get().videos, normalised] });
    return normalised;
  },

  updateVideo: async (id, updates) => {
    const headers = authHeaders();
    if (!headers.Authorization) {
      throw new Error("Admin access required");
    }
    const payload = await apiRequest(`/api/videos/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates)
    });
    const updated = payload.video;
    if (!updated) return null;
    const normalised = {
      ...updated,
      id: Number(updated.id) || updated.id,
      src: updated.src || updated.embedUrl || "",
      tags: Array.isArray(updated.tags) ? updated.tags : []
    };
    const videos = get().videos.map((video) =>
      Number(video.id) === Number(id) ? normalised : video
    );
    set({ videos });
    return normalised;
  },

  removeVideo: async (id) => {
    const headers = authHeaders();
    if (!headers.Authorization) {
      throw new Error("Admin access required");
    }
    await apiRequest(`/api/videos/${id}`, {
      method: "DELETE",
      headers
    });

    const videos = get().videos.filter((video) => Number(video.id) !== Number(id));
    const { progress, durations, lastWatched, favorites } = get();
    const nextProgress = { ...progress };
    const nextDurations = { ...durations };
    const nextLast = { ...lastWatched };
    const key = String(id);
    delete nextProgress[key];
    delete nextDurations[key];
    delete nextLast[key];
    const nextFavorites = favorites.filter((fid) => Number(fid) !== Number(id));

    saveProgress(nextProgress);
    saveDurations(nextDurations);
    saveLast(nextLast);
    saveFavorites(nextFavorites);

    set({
      videos,
      progress: nextProgress,
      durations: nextDurations,
      lastWatched: nextLast,
      favorites: nextFavorites
    });
    return true;
  },

  /** Favorites */
  toggleFavorite: (id) => {
    const key = Number(id);
    const favorites = get().favorites.includes(key)
      ? get().favorites.filter((value) => value !== key)
      : [...get().favorites, key];
    saveFavorites(favorites);
    set({ favorites });
  },

  /** Playback progress */
  setProgress: (id, seconds) => {
    const progress = {
      ...get().progress,
      [id]: Math.max(0, Math.floor(seconds || 0))
    };
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
    const durations = {
      ...get().durations,
      [id]: Math.floor(seconds)
    };
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
