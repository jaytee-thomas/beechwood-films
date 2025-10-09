import { create } from "zustand";

const ADMIN_PIN = "2468"; // <-- change this to your real PIN

const useAdmin = create((set, get) => ({
  isAdmin: false,

  login: async () => {
    const pin = window.prompt("Enter admin PIN:");
    if (pin === ADMIN_PIN) {
      set({ isAdmin: true });
      alert("Admin unlocked ✅");
    } else if (pin != null) {
      alert("Incorrect PIN ❌");
    }
  },

  logout: () => {
    set({ isAdmin: false });
    alert("Admin locked 🔒");
  },
}));

export default useAdmin;
