import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react-dom/test-utils";
import useAuth from "../store/useAuth.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = mockFetch;
  useAuth.getState().clearSession();
});

describe("useAuth store", () => {
  it("logs in and stores token/user", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: "abc123", user: { id: "u1", name: "Tester" } }),
      status: 200,
    });

    await act(async () => {
      await useAuth.getState().login({ email: "test@example.com", password: "pw" });
    });

    const state = useAuth.getState();
    expect(state.token).toBe("abc123");
    expect(state.user).toEqual({ id: "u1", name: "Tester" });
    expect(state.status).toBe("authenticated");
  });

  it("stores error when login fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid credentials" }),
      statusText: "Unauthorized",
    });

    await expect(
      useAuth.getState().login({ email: "nope@example.com", password: "pw" })
    ).rejects.toThrow("Invalid credentials");

    const state = useAuth.getState();
    expect(state.error).toBe("Invalid credentials");
    expect(state.status).toBe("error");
  });
});
