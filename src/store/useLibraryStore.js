import { create } from "zustand";

const KEY = "bf_videos_v1";

function loadVideos() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = [
    {
      id: 1,
      title: "Harlem Dancers",
      thumbnail: "https://picsum.photos/seed/harlem/800/450",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      duration: "10:21",
      tags: ["dance", "short"],
      favorite: false,
    },
    {
      id: 2,
      title: "South Side Stories",
      thumbnail: "https://picsum.photos/seed/southside/800/450",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      duration: "22:05",
      tags: ["doc", "community"],
      favorite: false,
    },
    {
      id: 3,
      title: "Lakefront",
      thumbnail: "https://picsum.photos/seed/lakefront/800/450",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      duration: "14:47",
      tags: ["doc", "short"],
      favorite: false,
    },
  ];
  try { localStorage.setItem(KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

function saveVideos(videos) {
  try { localStorage.setItem(KEY, JSON.stringify(videos)); } catch {}
}

const useLibraryStore = create((set, get) => ({
  videos: loadVideos(),

  addVideo: (video) => {
    const next = { id: Date.now(), favorite: false, ...video };
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
    set({ videos });
  },

  toggleFavorite: (id) => {
    const videos = get().videos.map((v) =>
      v.id === id ? { ...v, favorite: !v.favorite } : v
    );
    saveVideos(videos);
    set({ videos });
  },
}));

export default useLibraryStore;
