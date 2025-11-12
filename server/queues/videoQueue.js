import { Queue } from "bullmq";
import { redisConnection, isRedisEnabled } from "../lib/redis.js";
import { processVideoJob } from "../workers/processVideoJob.js";

const QUEUE_NAME = "videoQueue";

const queue = isRedisEnabled
  ? new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    })
  : null;

export const addVideoJob = async (name, payload = {}, options = {}) => {
  if (queue) {
    return queue.add(name, payload, options);
  }
  // Inline fallback when Redis is not configured.
  await processVideoJob({
    id: `inline-${Date.now()}`,
    name,
    data: payload,
    opts: options,
    attemptsMade: 0
  });
  return { id: `inline-${Date.now()}`, name, data: payload, inline: true };
};

export const getVideoQueue = () => queue;
export const isVideoQueueInline = () => !queue;
export const videoQueueName = QUEUE_NAME;
export const enqueueVideoJob = addVideoJob;
