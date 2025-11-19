export type QueueJob = {
  job_id: string;
  queue: string;
  type: string;
  status: string;
  actor_email: string | null;
  actor_user_id: string | null;
  video_id: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  attempts: number;
};

export type RecentJobsResponse = {
  jobs: QueueJob[];
};

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_ORIGIN?.replace(/\/+$/, "")) ||
  "";

function apiUrl(path: string): string {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

async function getJson<T>(path: string, token?: string): Promise<T> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

async function postJson(path: string, body: unknown, token?: string): Promise<void> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body ?? {})
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
}

export async function fetchRecentJobs(token?: string): Promise<QueueJob[]> {
  const data = await getJson<RecentJobsResponse>("/api/queues/jobs/recent", token);
  return data.jobs ?? [];
}

export async function recomputeAllSignals(token?: string): Promise<void> {
  await postJson("/api/queues/video/recompute", {}, token);
}

export async function recomputeSignalsForVideo(
  videoId: string,
  token?: string
): Promise<void> {
  if (!videoId) throw new Error("recomputeSignalsForVideo: videoId is required");
  await postJson("/api/queues/video/recompute", { id: videoId }, token);
}
