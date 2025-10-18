import { readData } from "./dataStore.js";

/**
 * In a production setup this would enqueue an email/push notification.
 * For now we log to the server console so you can wire a real provider later.
 */
export const notifyUsersOfNewVideo = async (video) => {
  const { users = [] } = await readData();
  const recipients = users.filter(
    (user) => user.notifyOnNewVideo && user.email
  );

  if (!recipients.length) return;

  console.log(
    `[notify] Would notify ${recipients.length} subscriber(s) about "${video.title}"`
  );
};

