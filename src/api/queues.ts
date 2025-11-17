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

async function getJson<T>(path: string): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRecentJobs(): Promise<QueueJob[]> {
  const data = await getJson<RecentJobsResponse>("/queues/jobs/recent");
  return data.jobs ?? [];
}

export async function recomputeAllSignals(): Promise<RecomputeResponse> {
  const url = apiUrl("/queues/video/recompute");
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RecomputeResponse>;
}

export async function recomputeSignalsForVideo(id: string): Promise<RecomputeResponse> {
  const url = apiUrl("/queues/video/recompute");
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RecomputeResponse>;
}
