const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "https://api.beechwoodfilms.org";

async function getJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("API error", res.status, path, text);
    throw new Error(`API ${path} failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchVideoSignals(id) {
  if (!id) throw new Error("fetchVideoSignals: id is required");
  return getJson(`/api/videos/${id}/signals`);
}

export async function fetchRelatedVideos(id) {
  if (!id) throw new Error("fetchRelatedVideos: id is required");
  return getJson(`/api/videos/${id}/related`);
}
