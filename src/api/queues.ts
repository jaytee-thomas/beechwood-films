// src/api/queues.ts

export type QueueJob = {
  job_id: string;
  queue: string;
  status: "queued" | "running" | "succeeded" | "failed";
  type: string;
  video_id?: string | null;
  attempts: number;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type JobsResponse = { jobs: QueueJob[] };

type RecomputeResponse = {
  jobId: string;
  mode?: string;
};

// ---- API base + token helpers ---------------------------------------------

const API_ORIGIN =
  (typeof import.meta !== "undefined" &&
    // cast to any so TS stops complaining about .env / VITE_API_ORIGIN
    (import.meta as any).env?.VITE_API_ORIGIN) ||
  (typeof window !== "undefined" ? window.location.origin : "");

const API_BASE = `${(API_ORIGIN || "").replace(/\/$/, "")}/api/queues`;

function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem("bf-auth-v1");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // matches what we store in useAuth
    return parsed?.state?.token ?? parsed?.token ?? undefined;
  } catch {
    return undefined;
  }
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const t = resolveToken(token);
  if (t) headers["Authorization"] = `Bearer ${t}`;
  return headers;
}

async function handleError(url: string, res: Response): Promise<never> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    // ignore
  }
  throw new Error(
    `Request ${url} failed: ${res.status} ${res.statusText}${
      text ? ` - ${text}` : ""
    }`,
  );
}

// ---- API functions --------------------------------------------------------

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
  const t = resolveToken(token);
  const url = new URL(`${API_BASE}/jobs/stream`);
  if (t) url.searchParams.set("token", t);
  return new EventSource(url.toString(), { withCredentials: true });
}