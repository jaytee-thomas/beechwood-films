// src/api/queues.ts

export type QueueJob = {
  queue: string;
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | string;
  type: string;
  video_id: number | string | null;
  attempts: number;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type JobsResponse = {
  jobs: QueueJob[];
};

type RecomputeResponse = {
  jobId: string;
  mode?: string;
};

// Environment → API origin
const API_ORIGIN =
  (typeof window !== "undefined" && (window as any)?.VITE_API_ORIGIN) ||
  (typeof process !== "undefined" && process.env?.VITE_API_ORIGIN) ||
  (typeof window !== "undefined" ? window.location.origin : "");

const API_BASE = `${(API_ORIGIN || "").replace(/\/$/, "")}/api/queues`;

function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;

  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem("bf-auth-v1");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return typeof token === "string" && token.length ? token : undefined;
  } catch {
    return undefined;
  }
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const resolved = resolveToken(token);
  if (resolved) headers["Authorization"] = `Bearer ${resolved}`;

  return headers;
}

async function handleError(path: string, res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(
    `Request ${path} failed: ${res.status} ${res.statusText} ${text}`,
  );
}

export async function fetchRecentJobs(token?: string): Promise<JobsResponse> {
  const url = `${API_BASE}/jobs/recent`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token),
  });

  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export async function recomputeAllSignals(
  token?: string,
): Promise<RecomputeResponse> {
  const url = `${API_BASE}/video/recompute-all`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
  });

  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export async function recomputeSignalsForVideo(
  videoId: string,
  token?: string,
): Promise<RecomputeResponse> {
  const url = `${API_BASE}/video/recompute`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
    body: JSON.stringify({ id: videoId }),
  });

  if (!res.ok) throw await handleError(url, res);
  return res.json();
}

export function createJobsEventSource(token?: string): EventSource {
  const url = new URL(`${API_BASE}/jobs/stream`);
  const resolved = resolveToken(token);
  if (resolved) url.searchParams.set("token", resolved);

  return new EventSource(url.toString(), { withCredentials: true });
}