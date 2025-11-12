const handleJob = async (payload = {}) => {
  // TODO: implement actual analytics/event hook logic.
  return { handled: true, payload };
};

export const processVideoJob = async (payload = {}, context = {}) => {
  console.log(
    `[videoQueue] processing job "${context?.jobId || "inline"}"`,
    payload
  );
  return handleJob(payload);
};
