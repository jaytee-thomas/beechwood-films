export const processVideoJob = async (job) => {
  const name = job?.name || "video.job";
  const data = job?.data || {};
  console.log(`[videoQueue] processing job "${name}"`, data);
  // Placeholder for future analytics / hooks.
  return { handled: true, name };
};
