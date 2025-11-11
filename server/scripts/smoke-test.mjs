#!/usr/bin/env node
/**
 * Beechwood Films API smoke test (safe, robust).
 *
 * Requires:
 *   SMOKE_EMAIL, SMOKE_PASSWORD
 * Optional:
 *   SMOKE_BASE_URL (default https://api.beechwoodfilms.org)
 *   SMOKE_TIMEOUT_MS (per-request, default 10000)
 *   SMOKE_RETRIES (for 502/503/504/429, default 2)
 */
import crypto from "node:crypto";

const rawBase =
  process.env.SMOKE_BASE_URL ||
  process.env.API_URL ||
  "https://api.beechwoodfilms.org";
const baseUrl = rawBase.replace(/\/+$/, ""); // strip trailing slash
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const PER_REQ_TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS ?? 10000);
const RETRIES = Number(process.env.SMOKE_RETRIES ?? 2);

if (!email || !password) {
  console.error("SMOKE_EMAIL and SMOKE_PASSWORD environment variables are required.");
  process.exit(1);
}

const log = (label, data) => {
  console.log(`\n--- ${label} ---`);
  if (data === undefined) return console.log("(no data)");
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(method, path, { token, body } = {}) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), PER_REQ_TIMEOUT);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(id);

      const text = await res.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        // leave payload as raw text if not JSON
        payload = text || null;
      }

      if (!res.ok) {
        const transient = [429, 502, 503, 504].includes(res.status);
        lastErr = new Error(`HTTP ${res.status} on ${method} ${path}`);
        lastErr.status = res.status;
        lastErr.payload = payload;
        if (transient && attempt < RETRIES) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw lastErr;
      }

      return payload;
    } catch (err) {
      clearTimeout(id);
      // AbortError or network error: retry if we have attempts left
      const isAbort = err?.name === "AbortError";
      const canRetry = attempt < RETRIES;
      if ((isAbort || !err?.status) && canRetry) {
        lastErr = err;
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Unknown fetch error");
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
};

async function run() {
  log("Config", { baseUrl, email });

  // Health
  const health = await fetchJson("GET", "/health");
  log("Health", health);
  assert(health?.status === "ok" && health?.ready === true, "API not ready");

  // Login
  const auth = await fetchJson("POST", "/api/auth/login", { body: { email, password } });
  // redact token in logs
  log("Login", { ...auth, token: auth?.token ? "[REDACTED]" : undefined });
  assert(auth?.token, "Missing token from login response");
  const token = auth.token;

  // /me
  const me = await fetchJson("GET", "/api/auth/me", { token });
  log("Current User", me);
  assert(me?.user?.role === "admin", "Smoke tests require an admin user");

  // List
  const videos = await fetchJson("GET", "/api/videos", { token });
  log("Video List", { page: videos?.page, count: videos?.items?.length });
  assert(Array.isArray(videos?.items), "Videos response is missing items[]");

  // Create
  const sampleTitle = `Smoke ${new Date().toISOString()}`;
  const createBody = {
    title: sampleTitle,
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    tags: ["smoke", "deploy", crypto.randomUUID()],
  };

  let createdId = null;
  try {
    const created = await fetchJson("POST", "/api/videos", { token, body: createBody });
    // Accept either { video: {...} } or a flat object
    const videoObj = created?.video ?? created;
    log("Created Video", { id: videoObj?.id, title: videoObj?.title });
    assert(videoObj?.id, "Create video response missing id");
    assert(videoObj?.title === sampleTitle, "Created video title mismatch");
    createdId = videoObj.id;
  } finally {
    // Cleanup if created
    if (createdId) {
      try {
        await fetchJson("DELETE", `/api/videos/${createdId}`, { token });
        log("Cleanup", { deleted: createdId });
      } catch (e) {
        console.warn("Cleanup failed (continuing):", e?.message || e);
      }
    }
  }

  console.log("\nSmoke test completed successfully ✅");
}

run().catch((err) => {
  console.error("\nSmoke test failed ❌");
  console.error(err?.message || err);
  if (err?.payload !== undefined) {
    console.error(
      typeof err.payload === "string"
        ? err.payload
        : JSON.stringify(err.payload, null, 2)
    );
  }
  process.exit(1);
});