import { listVideos, getVideoById } from "../db/videos.pg.js";
import {
  deleteSignalsForVideo,
  insertVideoSignals,
  insertVideoTagSignals,
  upsertVideoScore
} from "../db/videoSignals.js";

const DEFAULT_BATCH_LIMIT = 500;

const normalizeString = (value) => (typeof value === "string" ? value : "");
const normalizeTags = (value) =>
  Array.isArray(value) ? value.filter((tag) => typeof tag === "string" && tag.trim().length > 0) : [];

export async function recomputeVideoSignals({ videoId } = {}, { logger } = {}) {
  const log = logger || console;
  let videos = [];

  if (videoId) {
    const video = await getVideoById(videoId);
    if (!video) {
      log.warn(`[recomputeVideoSignals] Video not found for id=${videoId}`);
      return { ok: true, updated: 0, videoId, reason: "not-found" };
    }
    videos = [video];
  } else {
    const { items } = await listVideos({ page: 1, pageSize: DEFAULT_BATCH_LIMIT });
    videos = items;
  }

  for (const video of videos) {
    if (!video) continue;

    await deleteSignalsForVideo(video.id);

    const title = normalizeString(video.title);
    const description = normalizeString(video.description);
    const tags = normalizeTags(video.tags);

    const signals = [
      { signalType: "has_embed_url", score: video.embedUrl ? 1 : 0 },
      { signalType: "has_src", score: video.src ? 1 : 0 },
      { signalType: "title_length", score: title.length },
      { signalType: "description_length", score: description.length },
      { signalType: "tag_count", score: tags.length }
    ];

    const tagSignals = tags.map((tag) => ({ tag, weight: 1 }));

    if (signals.length) {
      await insertVideoSignals(video.id, signals);
    }
    if (tagSignals.length) {
      await insertVideoTagSignals(video.id, tagSignals);
    }

    const overallScore = tags.length * 1 + title.length * 0.01;
    await upsertVideoScore(video.id, overallScore);

    log.info(
      `[recomputeVideoSignals] videoId=${video.id} tags=${tags.length} titleLen=${title.length} score=${overallScore.toFixed(
        2
      )}`
    );
  }

  return { ok: true, updated: videos.length };
}

export async function processVideoJob(job, { logger } = {}) {
  const type = job?.name || job?.type || "recomputeVideoSignals";
  const payload = job?.data || job?.payload || {};

  if (type !== "recomputeVideoSignals") {
    (logger || console).warn(`[processVideoJob] Unknown job type: ${type}`);
    return { ok: false, type, reason: "unknown-type" };
  }

  return recomputeVideoSignals(
    { videoId: payload.videoId ?? payload.id ?? null },
    { logger }
  );
}
