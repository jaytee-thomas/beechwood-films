import { apiUrl } from "./videos";

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

type RecomputeResponse = {
  enqueued: boolean;
  jobId: string;
  mode: string;
};

async function getJson<T>(path: string, token?: string): Promise<T> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRecentJobs(token?: string): Promise<QueueJob[]> {
  const data = await getJson<RecentJobsResponse>("/api/queues/jobs/recent", token);
  return data.jobs ?? [];
}

export async function recomputeAllSignals(token?: string): Promise<RecomputeResponse> {
  const url = apiUrl("/api/queues/video/recompute");
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RecomputeResponse>;
}

export async function recomputeSignalsForVideo(id: string, token?: string): Promise<RecomputeResponse> {
  const url = apiUrl("/api/queues/video/recompute");
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ id })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RecomputeResponse>;
}
