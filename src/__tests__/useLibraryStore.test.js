import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import useLibraryStore from "../store/useLibraryStore.js";
import useAuth from "../store/useAuth.js";
import useAdminPanel from "../store/useAdminPanel.js";

const originalAlert =
  typeof globalThis.alert === "function" ? globalThis.alert : () => {};
const { openLogin: baseOpenLogin, openRegister: baseOpenRegister } =
  useAdminPanel.getState();

const resetLibraryState = () => {
  useLibraryStore.setState({
    videos: [],
    videosReady: false,
    videosError: null,
    loadingVideos: false,
    favorites: [],
    progress: {},
    durations: {},
    lastWatched: {}
  });
};

const resetAuthState = () => {
  useAuth.setState({
    token: null,
    user: null,
    status: "idle",
    error: null
  });
};

const resetAdminPanel = () => {
  useAdminPanel.setState({
    showAuth: false,
    authView: "login",
    showUpload: false,
    showContentEditor: false,
    openLogin: baseOpenLogin,
    openRegister: baseOpenRegister
  });
};

describe("useLibraryStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
    globalThis.alert = vi.fn();
    localStorage.clear();
    resetLibraryState();
    resetAuthState();
    resetAdminPanel();
  });

  afterEach(() => {
    globalThis.alert = originalAlert;
  });

  it("refreshVideos normalizes NSFW videos from the API", async () => {
    const payload = {
      videos: [
        {
          id: "9",
          title: "Night Edit",
          embedUrl: "https://cdn.example/video.mp4",
          library: "NSFW",
          tags: "nsfw, highlight "
        }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload)
    });

    await useLibraryStore.getState().refreshVideos();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/videos$/);
    expect(options).toMatchObject({
      headers: expect.objectContaining({
        "Content-Type": "application/json"
      })
    });

    const state = useLibraryStore.getState();
    expect(state.videosReady).toBe(true);
    expect(state.loadingVideos).toBe(false);
    expect(state.videos).toHaveLength(1);
    expect(state.videos[0].id).toBe(9);
    expect(state.videos[0].library).toBe("NSFW");
    expect(state.videos[0].tags).toEqual(["nsfw", "highlight"]);
  });

  it("saveFallback posts snapshot when admin token exists", async () => {
    useAuth.setState({
      token: "token-123",
      user: { id: "admin-1", role: "admin" },
      status: "authenticated",
      error: null
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204
    });

    await useLibraryStore.getState().saveFallback();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/videos\/fallback$/);
    expect(options).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer token-123"
      })
    });
  });

  it("saveFallback throws when admin token missing", async () => {
    await expect(
      useLibraryStore.getState().saveFallback()
    ).rejects.toThrow("Admin access required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("toggleFavorite prompts guests to authenticate", async () => {
    const openLogin = vi.fn();
    useAdminPanel.setState({ openLogin });

    useAuth.setState({
      token: null,
      user: { id: "guest-1", role: "guest" },
      status: "authenticated",
      error: null
    });

    await useLibraryStore.getState().toggleFavorite(42);

    expect(globalThis.alert).toHaveBeenCalledWith(
      "Sign in to save favorites across devices."
    );
    expect(openLogin).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("toggleFavorite syncs favorites for authenticated users", async () => {
    useAdminPanel.setState({ openLogin: vi.fn() });
    useAuth.setState({
      token: "abc-token",
      user: { id: "user-1", role: "user" },
      status: "authenticated",
      error: null
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ videoId: 7 })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204
      });

    await useLibraryStore.getState().toggleFavorite(7);
    const [firstUrl, firstOptions] = global.fetch.mock.calls[0];
    expect(firstUrl).toMatch(/\/api\/favorites\/7$/);
    expect(firstOptions).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer abc-token"
      })
    });
    expect(useLibraryStore.getState().favorites).toEqual([7]);
    expect(JSON.parse(localStorage.getItem("bf_favs_v1") || "[]")).toEqual([
      7
    ]);

    await useLibraryStore.getState().toggleFavorite(7);
    const [secondUrl, secondOptions] = global.fetch.mock.calls[1];
    expect(secondUrl).toMatch(/\/api\/favorites\/7$/);
    expect(secondOptions).toMatchObject({
      method: "DELETE",
      headers: expect.objectContaining({
        Authorization: "Bearer abc-token"
      })
    });
    expect(useLibraryStore.getState().favorites).toEqual([]);
    expect(JSON.parse(localStorage.getItem("bf_favs_v1") || "[]")).toEqual([]);
  });
});
