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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRecentJobs(): Promise<QueueJob[]> {
  const data = await getJson<RecentJobsResponse>("/api/queues/jobs/recent");
  return data.jobs ?? [];
}
