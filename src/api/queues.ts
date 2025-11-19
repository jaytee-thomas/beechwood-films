const apiUrl =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_API_ORIGIN || import.meta.env?.VITE_API_URL)) ||
  "";

function getAuthTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("bf-auth-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.state?.token === "string" && parsed.state.token.length) {
      return parsed.state.token;
    }
    if (typeof parsed?.token === "string" && parsed.token.length) {
      return parsed.token;
    }
    return null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(explicitToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const token = explicitToken || getAuthTokenFromStorage();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

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

export async function fetchRecentJobs(token?: string) {
  const res = await fetch(`${apiUrl}/queues/jobs/recent`, {
    method: "GET",
    headers: buildAuthHeaders(token),
    credentials: "include"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to load jobs (${res.status} ${res.statusText}) ${text || ""}`
    );
  }
  return res.json() as Promise<{ jobs: QueueJob[] }>;
}

export async function recomputeAllSignals(token?: string) {
  const res = await fetch(`${apiUrl}/queues/video/recompute-all`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    credentials: "include",
    body: JSON.stringify({})
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to enqueue recompute-all job (${res.status} ${res.statusText}) ${text || ""}`
    );
  }
  return res.json() as Promise<{ jobId: string; mode?: string }>;
}

export async function recomputeSignalsForVideo(videoId: string, token?: string) {
  if (!videoId) throw new Error("recomputeSignalsForVideo: videoId is required");
  const res = await fetch(`${apiUrl}/queues/video/recompute`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    credentials: "include",
    body: JSON.stringify({ id: videoId })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to enqueue recompute job (${res.status} ${res.statusText}) ${text || ""}`
    );
  }
  return res.json() as Promise<{ jobId: string; mode?: string }>;
}

export function openJobsEventSource(token?: string): EventSource {
  const url = new URL(`${apiUrl}/queues/jobs/stream`);
  const authToken = token || getAuthTokenFromStorage();
  if (authToken) {
    url.searchParams.set("token", authToken);
  }
  return new EventSource(url.toString(), { withCredentials: true });
}
