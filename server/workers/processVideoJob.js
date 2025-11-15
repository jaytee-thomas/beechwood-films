// server/workers/processVideoJob.js
import { getVideoById, listVideos } from "../db/videos.pg.js";
import {
  deleteSignalsForVideo,
  insertVideoSignals,
  insertVideoTagSignals,
  upsertVideoScore
} from "../db/videoSignals.js";

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

/**
 * Recompute all analytics signals for one video or for all videos.
 * data = { videoId?: string }
 */
export async function recomputeVideoSignals({ videoId } = {}) {
  // 1) Decide which videos to process
  let videos = [];

  if (videoId) {
    const one = await getVideoById(videoId);
    if (one) videos = [one];
  } else {
    // simple: grab first 500 videos; you can fancy this up later
    const page = await listVideos({ page: 1, pageSize: 500 });
    videos = page.items || [];
  }

  let updated = 0;

  for (const v of videos) {
    if (!v || !v.id) continue;

    const tags = Array.isArray(v.tags) ? v.tags : [];
    const title = v.title || "";
    const description = v.description || "";

    // 2) Clear any existing signals for this video
    await deleteSignalsForVideo(v.id);

    // 3) Compute raw signals in JS
    const signals = [];

    // presence
    signals.push({
      signalType: "has_embed_url",
      score: v.embedUrl ? 1 : 0
    });
    signals.push({
      signalType: "has_src",
      score: v.src ? 1 : 0
    });

    // text lengths
    signals.push({
      signalType: "title_length",
      score: title.length
    });
    signals.push({
      signalType: "description_length",
      score: description.length
    });

    // tags
    signals.push({
      signalType: "tag_count",
      score: tags.length
    });

    // 4) Per-tag weights (simple v1: all weight = 1)
    const tagSignals = tags.map((tag) => ({
      tag,
      weight: 1
    }));

    // 5) Persist signals
    await insertVideoSignals(v.id, signals);
    if (tagSignals.length > 0) {
      await insertVideoTagSignals(v.id, tagSignals);
    }

    // 6) Overall score (very simple v1 heuristic)
    const overallScore =
      tags.length * 1 + // 1 point per tag
      title.length * 0.01 + // tiny bonus for longer titles
      (v.embedUrl ? 1 : 0); // 1 point if embeddable

    await upsertVideoScore(v.id, overallScore);

    updated += 1;
  }

  return { updated };
}
