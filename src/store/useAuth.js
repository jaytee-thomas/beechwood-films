import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data?.error || response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
};

const request = async (path, options = {}) => {
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

const withAuthHeaders = (token, headers = {}) =>
  token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    : headers;

const initialState = {
  token: null,
  user: null,
  status: "idle",
  error: null
};

const createAuthSlice = (set, get) => ({
  ...initialState,

  setSession: ({ token, user }) => {
    set({
      token,
      user,
      status: token ? "authenticated" : "anonymous",
      error: null
    });
  },

  setError: (error) => set({ error, status: "error" }),

  resetError: () => set({ error: null }),

  clearSession: () => set({ ...initialState, status: "anonymous" }),

  refresh: async () => {
    const token = get().token;
    if (!token) {
      set({ status: "anonymous" });
      return null;
    }
    set({ status: "loading", error: null });
    try {
      const data = await request("/api/auth/session", {
        headers: withAuthHeaders(token)
      });
      set({
        status: "authenticated",
        user: data.user,
        error: null
      });
      return data.user;
    } catch (error) {
      console.warn("Session refresh failed", error);
      set({ ...initialState, status: "anonymous" });
      return null;
    }
  },

  login: async ({ email, password }) => {
    set({ status: "loading", error: null });
    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      get().setSession({ token: data.token, user: data.user });
      return { user: data.user };
    } catch (error) {
      get().setError(error.message);
      throw error;
    }
  },

  register: async ({ email, password, name, subscribe = true }) => {
    set({ status: "loading", error: null });
    try {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, subscribe })
      });
      get().setSession({ token: data.token, user: data.user });
      return { user: data.user };
    } catch (error) {
      get().setError(error.message);
      throw error;
    }
  },

  guest: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await request("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({})
      });
      get().setSession({ token: data.token, user: data.user });
      return { user: data.user };
    } catch (error) {
      get().setError(error.message);
      throw error;
    }
  },

  logout: async () => {
    const token = get().token;
    try {
      if (token) {
        await request("/api/auth/logout", {
          method: "POST",
          headers: withAuthHeaders(token)
        });
      }
    } finally {
      get().clearSession();
    }
  },

  updatePreferences: async (prefs) => {
    const token = get().token;
    if (!token) throw new Error("Not authenticated");
    try {
      const data = await request("/api/auth/me/preferences", {
        method: "PATCH",
        headers: withAuthHeaders(token),
        body: JSON.stringify(prefs)
      });
      get().setSession({ token: data.token, user: data.user });
      return data.user;
    } catch (error) {
      get().setError(error.message);
      throw error;
    }
  }
});

const useAuth = create(
  persist(
    (set, get) => createAuthSlice(set, get),
    {
      name: "bf-auth-v1",
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);

export default useAuth;
