import React, { useEffect, useMemo, useState } from "react";
import { fetchRecentJobs, type QueueJob } from "../api/queues";

type SseEvent = {
  id: string;
  event: string;
  data: unknown;
  at: number;
};

const STATUS_ORDER = ["failed", "succeeded", "running", "queued"];

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
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [sseConnected, setSseConnected] = useState(false);
  const [events, setEvents] = useState<SseEvent[]>([]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const incoming = await fetchRecentJobs();
      setJobs(incoming);
    } catch (err: any) {
      console.error("Failed to fetch queue jobs", err);
      setError(err?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/queues/jobs/stream", { withCredentials: true });
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    const pushEvent = (event: string, data: string) => {
      let parsed: unknown = data;
      try {
        parsed = JSON.parse(data);
      } catch {
        /* ignore */
      }
      setEvents((prev) => {
        const next: SseEvent[] = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            event,
            data: parsed,
            at: Date.now()
          },
          ...prev
        ];
        return next.slice(0, 50);
      });
    };

    es.onmessage = (evt) => pushEvent(evt.type || "message", evt.data);
    es.addEventListener("hello", (evt) => pushEvent("hello", (evt as MessageEvent).data));
    es.addEventListener("ping", (evt) => pushEvent("ping", (evt as MessageEvent).data));
    es.addEventListener("job", (evt) => pushEvent("job", (evt as MessageEvent).data));

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== "all") {
      list = list.filter((job) => job.status === statusFilter);
    }
    list.sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0));
    return list;
  }, [jobs, statusFilter]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
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
          marginBottom: "1rem"
        }}
      >
        <button
          onClick={loadJobs}
          disabled={loading}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: 999,
            border: "1px solid #ccc",
            cursor: loading ? "default" : "pointer"
          }}
        >
          {loading ? "Refreshing…" : "Refresh jobs"}
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Status:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "0.25rem 0.5rem", borderRadius: 999 }}
          >
            <option value="all">All</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.85rem",
            padding: "0.25rem 0.6rem",
            borderRadius: 999,
            backgroundColor: sseConnected ? "#e6ffed" : "#ffecec",
            border: `1px solid ${sseConnected ? "#34c759" : "#ff3b30"}`
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
            color: "#900"
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #ddd",
            overflow: "hidden",
            backgroundColor: "#fff"
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <strong>Recent Jobs</strong>
            <span style={{ fontSize: "0.85rem", color: "#666" }}>{jobs.length} total</span>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fafafa" }}>
                <tr>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Job ID</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Status</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Type</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Video</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Started → Finished</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Duration</th>
                  <th style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#777" }}>
                      No jobs yet.
                    </td>
                  </tr>
                )}
                {filteredJobs.map((job) => (
                  <tr key={`${job.queue}-${job.job_id}`}>
                    <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid #f3f3f3" }}>
                      <code>{job.job_id}</code>
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
