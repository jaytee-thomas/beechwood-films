import pkg from "bullmq";
const { Queue, QueueScheduler } = pkg;
import IORedis from "ioredis";
import { getRedisConfig } from "../lib/redis.js";
import {
  logEnqueued,
  logStarted,
  logProgress,
  logCompleted,
  logFailed,
  getRecent as getRecentJobsFromDb
} from "../db/videoJobs.js";
import { bus } from "../lib/events.js";
import { processVideoJob } from "../workers/processVideoJob.js";

let queue = null;
let scheduler = null;
let mode = "inline";

const defaultQueueOpts = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 250 },
    removeOnComplete: 1000,
    removeOnFail: 2000
  },
  limiter: { max: 10, duration: 1000 },
  maxStalledCount: 2
};

const createConnection = () => {
  const cfg = getRedisConfig();
  if (!cfg.enabled || !cfg.url) return null;
  return new IORedis(cfg.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false
  });
};

export const getVideoQueue = () => {
  if (queue) return queue;
  const connection = createConnection();
  if (!connection) {
    mode = "inline";
    return null;
  }
  queue = new Queue("video", { connection, ...defaultQueueOpts });
  scheduler = scheduler ?? new QueueScheduler("video", { connection });
  mode = "queue";
  return queue;
};

export const getQueueMode = () => mode;

export const isVideoQueueInline = () => !getRedisConfig().enabled;

const emitJobEvent = (phase, payload) => {
  bus.emit("job:event", { phase, at: Date.now(), ...payload });
};

export const enqueueVideoJob = async ({
  type = "recomputeVideoSignals",
  payload = {},
  requestedBy,
  requestedById,
  videoId = null,
  queueOptions = {}
} = {}) => {
  const jobPayload = {
    ...payload,
    videoId,
    requestedBy: requestedBy ?? null,
    requestedById: requestedById ?? null
  };
  const q = getVideoQueue();

  if (q) {
    const job = await q.add(
      type,
      jobPayload,
      Object.assign(
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 250 }
        },
        queueOptions
      )
    );
    const jobId = String(job.id);
    await logEnqueued({
      jobId,
      queue: "video",
      type,
      videoId,
      actorEmail: requestedBy ?? null,
      actorUserId: requestedById ?? null,
      payload: jobPayload
    });
    emitJobEvent("enqueued", { jobId, type, videoId, requestedBy, requestedById });
    return { mode: "queue", jobId, job };
  }

  const syntheticId = `inline:${Date.now()}`;
  await logEnqueued({
    jobId: syntheticId,
    queue: "video",
    type,
    videoId,
    actorEmail: requestedBy ?? null,
    actorUserId: requestedById ?? null,
    payload: jobPayload
  });
  await logStarted({ jobId: syntheticId, attempts: 1 });
  emitJobEvent("started", {
    jobId: syntheticId,
    type,
    videoId,
    requestedBy,
    requestedById
  });

  const startedAt = Date.now();
  const progressHandler = async (pct) => {
    const progress = Math.max(0, Math.min(100, Math.round((Number(pct) || 0) * 100)));
    await logProgress({ jobId: syntheticId, progress });
    emitJobEvent("progress", {
      jobId: syntheticId,
      type,
      videoId,
      requestedBy,
      requestedById,
      progress
    });
  };

  try {
    const result = await processVideoJob(
      { id: syntheticId, name: type, data: jobPayload },
      { onProgress: progressHandler }
    );
    await logCompleted({ jobId: syntheticId, result });
    emitJobEvent("completed", {
      jobId: syntheticId,
      type,
      videoId,
      requestedBy,
      requestedById,
      result
    });
    return { mode: "inline", jobId: syntheticId, result };
  } catch (error) {
    await logFailed({ jobId: syntheticId, error });
    emitJobEvent("failed", {
      jobId: syntheticId,
      type,
      videoId,
      requestedBy,
      requestedById,
      error: error?.message || String(error)
    });
    throw error;
  }
};

export const addVideoJob = enqueueVideoJob;

export const getRecentJobs = getRecentJobsFromDb;

export const obliterateVideoQueue = async ({ force = false } = {}) => {
  const q = getVideoQueue();
  if (!q) return { ok: true, mode };
  await q.obliterate({ force: !!force });
  return { ok: true, mode: "queue" };
};
