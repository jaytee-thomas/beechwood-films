const API_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN) ||
  (typeof window !== "undefined" ? window.location.origin : "");

const API_BASE = `${(API_ORIGIN || "").replace(/\/$/, "")}/api/queues`;

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleError(path: string, res: Response): Promise<never> {
  return res
    .text()
    .catch(() => "")
    .then((text) => {
      throw new Error(`Request ${path} failed: ${res.status} ${res.statusText} ${text}`);
    });
}

export async function fetchRecentJobs(token?: string): Promise<{ jobs: any[] }> {
  const url = `${API_BASE}/jobs/recent`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token)
  });
  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export async function recomputeAllSignals(
  token?: string
): Promise<{ jobId: string; mode?: string }> {
  const url = `${API_BASE}/video/recompute-all`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token)
  });
  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export async function recomputeSignalsForVideo(
  videoId: string,
  token?: string
): Promise<{ jobId: string; mode?: string }> {
  const url = `${API_BASE}/video/recompute`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
    body: JSON.stringify({ id: videoId })
  });
  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export function createJobsEventSource(token: string): EventSource {
  const url = new URL(`${API_BASE}/jobs/stream`);
  if (token) url.searchParams.set("token", token);
  return new EventSource(url.toString(), { withCredentials: true });
}
