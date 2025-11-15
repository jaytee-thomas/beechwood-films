// server/workers/processVideoJob.js
import { recomputeVideoSignals } from "../db/videoSignals.js";

/**
 * Entry point called by the worker for each BullMQ job.
 * job.name should be "recomputeVideoSignals".
 */
export async function processVideoJob(job) {
  const { name, data } = job;

  switch (name) {
    case "recomputeVideoSignals":
      return recomputeVideoSignals(data || {});
    default:
      // Nothing to do for unknown job types (keeps worker future-proof).
      return null;
  }
}
