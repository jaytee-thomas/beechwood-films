import { create } from "zustand";
import useAuth from "./useAuth.js";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:4000";

const initialState = {
  content: {},
  ready: false,
  loading: false,
  saving: false,
  error: null
};

const parseError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error || response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
};

const authHeaders = () => {
  const token = useAuth.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

const useContentStore = create((set, get) => ({
  ...initialState,

  loadContent: async (force = false) => {
    if (get().loading) return get().content;
    if (get().ready && !force) return get().content;

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/content`);
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      const content = data?.content || {};
      set({ content, ready: true, loading: false, error: null });
      return content;
    } catch (error) {
      console.warn("Failed to load content", error);
      set({ loading: false, error: error.message, ready: true });
      return get().content;
    }
  },

  saveContent: async (updates) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          useAuth.getState().clearSession();
        }
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      const content = data?.content || {};
      set({ content, saving: false, error: null, ready: true });
      return content;
    } catch (error) {
      console.error("Failed to save content", error);
      set({ saving: false, error: error.message });
      throw error;
    }
  },

  resetContentState: () => set({ ...initialState })
}));

export default useContentStore;
