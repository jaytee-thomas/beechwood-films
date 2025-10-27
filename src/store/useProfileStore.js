import { create } from "zustand";
import useAuth from "./useAuth.js";
import useAdminPanel from "./useAdminPanel.js";
import { createDefaultProfile } from "../../shared/defaultProfile.js";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:4000";

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

const initialState = {
  profile: createDefaultProfile(),
  profileReady: false,
  loading: false,
  saving: false,
  error: null
};

const useProfileStore = create((set, get) => ({
  ...initialState,

  loadProfile: async (force = false) => {
    if (get().loading) return get().profile;
    if (get().profileReady && !force) return get().profile;

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/profile`);
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      const nextProfile = {
        ...createDefaultProfile(),
        ...(data?.profile || {})
      };
      set({ profile: nextProfile, profileReady: true, loading: false, error: null });
      return nextProfile;
    } catch (error) {
      console.warn("Failed to load profile", error);
      set({ loading: false, error: error.message, profileReady: true });
      return get().profile;
    }
  },

  saveProfile: async (updates) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/profile`, {
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
          const { openLogin } = useAdminPanel.getState();
          if (typeof openLogin === "function") {
            openLogin();
          }
        }
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      const nextProfile = {
        ...createDefaultProfile(),
        ...(data?.profile || {})
      };
      set({ profile: nextProfile, profileReady: true, saving: false, error: null });
      return nextProfile;
    } catch (error) {
      console.error("Failed to save profile", error);
      set({ saving: false, error: error.message });
      throw error;
    }
  },

  resetProfileState: () => set({ ...initialState, profile: createDefaultProfile() })
}));

export default useProfileStore;
