import { create } from "zustand";

const useAdminPanel = create((set, get) => ({
  isAuthed: false,
  showLogin: false,
  showUpload: false,

  openLogin: () => set({ showLogin: true }),
  closeLogin: () => set({ showLogin: false }),

  openUpload: () => {
    if (!get().isAuthed) {
      set({ showLogin: true });
      return;
    }
    set({ showUpload: true });
  },
  closeUpload: () => set({ showUpload: false }),

  markAuthed: () => set({ isAuthed: true, showLogin: false }),
  clearAuthed: () => set({ isAuthed: false, showUpload: false }),
}));

export default useAdminPanel;
