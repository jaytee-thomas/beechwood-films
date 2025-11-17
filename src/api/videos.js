const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_ORIGIN?.replace(/\/+$/, "")) ||
  "";

export function apiUrl(path) {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

async function handleJson(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${res.statusText || text || "Unknown error"}`);
  }
  return res.json();
}

export async function fetchVideoSignals(id) {
  if (!id) throw new Error("fetchVideoSignals: id is required");
  const res = await fetch(apiUrl(`/api/videos/${id}/signals`));
  if (res.status === 404) return null;
  return handleJson(res);
}

export async function fetchRelatedVideos(id) {
  if (!id) throw new Error("fetchRelatedVideos: id is required");
  const res = await fetch(apiUrl(`/api/videos/${id}/related`));
  return handleJson(res);
}
