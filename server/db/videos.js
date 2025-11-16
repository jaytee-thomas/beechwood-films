// videos shim -> postgres
export * from "./videos.pg.js";
export default undefined;

export async function getRelatedVideosFor(videoId, limit = 10) {
  return [];
}
