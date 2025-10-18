import { create } from "zustand";

import useAuth from "./useAuth.js";

const useAdminPanel = create((set) => ({
  showAuth: false,
  authView: "login",
  showUpload: false,

  openLogin: () => set({ showAuth: true, authView: "login" }),
  openRegister: () => set({ showAuth: true, authView: "register" }),
  closeAuth: () => set({ showAuth: false }),
  setAuthView: (view) => set({ authView: view }),

  openUpload: () => {
    const user = useAuth.getState().user;
    if (!user || user.role !== "admin") {
      set({ showAuth: true, authView: "login" });
      return;
    }
    set({ showUpload: true });
  },
  closeUpload: () => set({ showUpload: false }),
}));

export default useAdminPanel;
