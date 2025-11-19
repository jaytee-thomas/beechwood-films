import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  fetchRecentJobs,
  recomputeAllSignals,
  createJobsEventSource,
} from "../api/queues";
import type { QueueJob } from "../api/queues";
import useAuth from "../store/useAuth.js";

type SseEvent = {
  id: string;
  event: string;
  data: unknown;
  at: number;
};

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  running: 1,
  queued: 2,
  succeeded: 3,
};

const formatEpoch = (value: string | null) => {
  if (!value) return "—";
  const ms = Number(value);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString();
};

const formatDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return "—";
  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return "—";
  const diff = e - s;
  if (diff < 1000) return `${diff} ms`;
  return `${Math.round(diff / 1000)} s`;
};

export const AdminJobsMonitor: React.FC = () => {
  const token = useAuth((state) => state.token) as string | null | undefined;

  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "queued" | "running" | "succeeded" | "failed"
  >("all");

  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [recomputeBusy, setRecomputeBusy] = useState<boolean>(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);

  // ----- Load jobs (Refresh button + initial load) -----
  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecentJobs(token || undefined);
      setJobs(data.jobs ?? []);
    } catch (err: any) {
      console.error("Failed to load queue jobs", err);
      setError(err?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  // ----- SSE: live job events stream -----
  useEffect(() => {
    // If there is no token yet, don’t try to connect
    if (!token) {
      setSseConnected(false);
      return;
    }

    const es = createJobsEventSource(token);
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    const pushEvent = (event: string, data: string) => {
      let parsed: unknown = data;
      try {
        parsed = JSON.parse(data);
      } catch {
        // keep as raw string
      }

      setEvents((prev) => {
        const next: SseEvent[] = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            event,
            data: parsed,
            at: Date.now(),
          },
          ...prev,
        ];
        return next.slice(0, 50);
      });
    };

    es.onmessage = (evt) => pushEvent(evt.type || "message", (evt as MessageEvent).data as string);
    es.addEventListener("hello", (evt) =>
      pushEvent("hello", (evt as MessageEvent).data as string),
    );
    es.addEventListener("ping", (evt) =>
      pushEvent("ping", (evt as MessageEvent).data as string),
    );
    es.addEventListener("job", (evt) =>
      pushEvent("job", (evt as MessageEvent).data as string),
    );

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [token]);

  // ----- Derived views -----
  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    if (statusFilter !== "all") {
      list = list.filter((job) => job.status === statusFilter);
    }

    list.sort((a, b) => {
      const sa = STATUS_PRIORITY[a.status] ?? 99;
      const sb = STATUS_PRIORITY[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      return Number(b.created_at ?? 0) - Number(a.created_at ?? 0);
    });

    return list;
  }, [jobs, statusFilter]);

  const lastRecomputeJob = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;
    const recomputeJobs = jobs.filter(
      (job) => job.type === "recomputeVideoSignals",
    );
    if (recomputeJobs.length === 0) return null;

    const sorted = [...recomputeJobs].sort((a, b) => {
      const aTime = Number(a.finished_at ?? a.created_at ?? 0);
      const bTime = Number(b.finished_at ?? b.created_at ?? 0);
      return bTime - aTime;
    });

    return sorted[0];
  }, [jobs]);

  // ----- Actions -----
  const handleRecomputeAll = async () => {
    try {
      setRecomputeBusy(true);
      setRecomputeMessage(null);
      const result = await recomputeAllSignals(token || undefined);
      setRecomputeMessage(
        `Recompute enqueued (job ${result.jobId}, mode: ${result.mode ?? "default"}).`,
      );
      await loadJobs();
    } catch (err: any) {
      console.error("Failed to enqueue recompute-all job", err);
      setRecomputeMessage(
        err?.message ?? "Failed to enqueue recompute-all job",
      );
    } finally {
      setRecomputeBusy(false);
    }
  };

  // ----- Render -----
  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Admin · Jobs Monitor
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Live view of <code>video</code> queue jobs and server-side events.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => void loadJobs()}
          disabled={loading}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: 999,
            border: "1px solid #ccc",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>

        <button
          onClick={() => void handleRecomputeAll()}
          disabled={recomputeBusy}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: 999,
            border: "1px solid #444",
            backgroundColor: "#111",
            color: "#fff",
            cursor: recomputeBusy ? "default" : "pointer",
            fontSize: "0.85rem",
          }}
        >
          {recomputeBusy ? "Enqueuing…" : "Recompute all signals"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "all"
                  | "queued"
                  | "running"
                  | "succeeded"
                  | "failed",
              )
            }
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: 999,
              border: "1px solid #ccc",
              fontSize: "0.85rem",
            }}
          >
            {["all", "queued", "running", "succeeded", "failed"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>

        {lastRecomputeJob && (
          <span style={{ fontSize: "0.8rem", color: "#555" }}>
            Last recompute:{" "}
            {formatEpoch(
              lastRecomputeJob.finished_at || lastRecomputeJob.created_at,
            )}
          </span>
        )}

        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.85rem",
            padding: "0.25rem 0.6rem",
            borderRadius: 999,
            backgroundColor: sseConnected ? "#e6ffed" : "#ffecec",
            border: `1px solid ${sseConnected ? "#34c759" : "#ff3b30"}`,
          }}
        >
          SSE: {sseConnected ? "connected" : "disconnected"}
        </span>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            backgroundColor: "#ffecec",
            border: "1px solid #ff3b30",
            color: "#900",
          }}
        >
          {error}
        </div>
      )}

      {recomputeMessage && (
        <div
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            padding: "0.4rem 0.6rem",
            borderRadius: 8,
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
          }}
        >
          {recomputeMessage}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}
      >
        {/* Jobs table */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #ddd",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Recent Jobs</strong>
            <span style={{ fontSize: "0.85rem", color: "#666" }}>
              {jobs.length} total
            </span>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead
                style={{ position: "sticky", top: 0, background: "#fafafa" }}
              >
                <tr>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Job ID
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Type
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Video
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Started → Finished
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Duration
                  </th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: "#777",
                      }}
                    >
                      No jobs yet.
                    </td>
                  </tr>
                )}
                {filteredJobs.map((job) => (
                  <tr key={`${job.queue}-${job.job_id}`}>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      <code>{job.job_id}</code>
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                        textTransform: "capitalize",
                      }}
                    >
                      {job.status}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {job.type}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {job.video_id ? (
                        <code>{job.video_id}</code>
                      ) : (
                        <span style={{ color: "#aaa" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      <div>{formatEpoch(job.started_at)}</div>
                      <div
                        style={{
                          color: "#999",
                          fontSize: "0.8rem",
                        }}
                      >
                        → {formatEpoch(job.finished_at)}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {formatDuration(job.started_at, job.finished_at)}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: "1px solid #f3f3f3",
                        textAlign: "center",
                      }}
                    >
                      {job.attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Event stream panel */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #ddd",
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #eee",
              background: "#fafafa",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong>Job Event Stream</strong>
            <span style={{ fontSize: "0.8rem", color: "#666" }}>
              Showing last {events.length} events
            </span>
          </div>
          <div
            style={{
              flex: 1,
              maxHeight: 400,
              overflow: "auto",
              padding: "0.5rem 0.75rem",
              fontFamily: "Menlo, Monaco, Consolas, monospace",
              fontSize: "0.8rem",
              backgroundColor: "#fafafa",
            }}
          >
            {events.length === 0 && (
              <div style={{ color: "#888", padding: "0.25rem 0" }}>
                Waiting for events…
              </div>
            )}
            {events.map((evt) => (
              <div
                key={evt.id}
                style={{
                  marginBottom: "0.4rem",
                  borderBottom: "1px dashed #ececec",
                  paddingBottom: "0.3rem",
                }}
              >
                <div style={{ color: "#555" }}>
                  <strong>{evt.event}</strong>{" "}
                  <span style={{ color: "#999", fontSize: "0.75rem" }}>
                    {new Date(evt.at).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: "#333", whiteSpace: "pre-wrap" }}>
                  {typeof evt.data === "string"
                    ? evt.data
                    : JSON.stringify(evt.data, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};