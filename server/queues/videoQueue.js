import { Queue } from "bullmq";
import { redisConnection, isRedisEnabled } from "../lib/redis.js";
import { processVideoJob } from "../workers/processVideoJob.js";
import {
  logEnqueued,
  logStarted,
  logCompleted,
  logFailed,
  getRecent
} from "../db/videoJobs.js";

const QUEUE_NAME = "videoQueue";

const queue = isRedisEnabled
  ? new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: Number(process.env.WEBHOOK_MAX_RETRIES || 3),
        backoff: { type: "exponential", delay: 1000 }
      }
    })
  : null;

const queueEnabled = Boolean(queue);

const enqueueQueueJob = async ({
  type,
  payload,
  requestedBy,
  requestedById,
  videoId,
  queueOptions = {}
}) => {
  const job = await queue.add(
    type,
    payload,
    Object.assign(
      {},
      {
        removeOnComplete: 1000,
        removeOnFail: 1000
      },
      queueOptions
    )
  );

  await logEnqueued({
    jobId: job.id,
    jobType: type,
    requestedBy,
    requestedById,
    videoId,
    payload
  });

  return { mode: "queue", jobId: job.id, job };
};

const runInlineJob = async ({
  type,
  payload,
  requestedBy,
  requestedById,
  videoId
}) => {
  const inlineId = `inline:${Date.now()}`;
  await logEnqueued({
    jobId: inlineId,
    jobType: type,
    requestedBy,
    requestedById,
    videoId,
    payload
  });
  await logStarted({ jobId: inlineId, attempts: 1 });
  const startedAt = Date.now();
  try {
    const result = await processVideoJob(payload);
    await logCompleted({ jobId: inlineId, startedAt, result });
    return { mode: "inline", jobId: inlineId, inline: true, result };
  } catch (error) {
    await logFailed({ jobId: inlineId, startedAt, error });
    throw error;
  }
};

export const enqueueVideoJob = async ({
  type = "recomputeVideoSignals",
  payload = {},
  requestedBy,
  requestedById,
  videoId,
  queueOptions = {}
} = {}) => {
  if (queueEnabled) {
    return enqueueQueueJob({
      type,
      payload,
      requestedBy,
      requestedById,
      videoId,
      queueOptions
    });
  }

  return runInlineJob({
    type,
    payload,
    requestedBy,
    requestedById,
    videoId
  });
};

export const addVideoJob = (name, payload = {}, options = {}) =>
  enqueueVideoJob({ type: name, payload, queueOptions: options });

export const getVideoQueue = () => queue;
export const isVideoQueueInline = () => !queueEnabled;
export const videoQueueName = QUEUE_NAME;
export const getRecentJobs = getRecent;
