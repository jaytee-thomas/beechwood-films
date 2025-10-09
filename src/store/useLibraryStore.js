import { create } from "zustand";

const KEY = "bf_videos_v1";

const defaultVideos = [
  {
    id: 1,
    title: "Harlem Dancers",
    thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
    duration: "10:21",
  },
  {
    id: 2,
    title: "South Side Stories",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    duration: "22:05",
  },
  {
    id: 3,
    title: "Lakefront",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    duration: "14:47",
  },
  {
    id: 4,
    title: "Echoes of the City",
    thumbnail: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29",
    duration: "18:12",
  },
  {
    id: 5,
    title: "Desert Mirage",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    duration: "09:58",
  },
  {
    id: 6,
    title: "Midnight Roads",
    thumbnail: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    duration: "11:44",
  },
];

function loadVideos() {
  const stored = localStorage.getItem(KEY);
  return stored ? JSON.parse(stored) : defaultVideos;
}

function saveVideos(videos) {
  localStorage.setItem(KEY, JSON.stringify(videos));
}

const useLibraryStore = create((set, get) => ({
  videos: loadVideos(),
  favorites: [],
  progress: {},

  toggleFavorite: (id) => {
    const { favorites } = get();
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    set({ favorites: updated });
  },

  setProgress: (progress) => set({ progress }),
  clearProgress: () => set({ progress: {} }),
}));

export default useLibraryStore;
