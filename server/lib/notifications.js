import { listUsersToNotify } from "../db/users.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL;

const buildEmailHtml = (video) => {
  const thumbnail = video.thumbnail
    ? `<img src="${video.thumbnail}" alt="${video.title}" style="max-width:100%;border-radius:12px;margin-bottom:16px;" />`
    : "";

  const watchLink = video.embedUrl || video.src || "#";

  return `
    <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;color:#111;padding:24px;line-height:1.6;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#111;">🎬 New release: ${video.title}</h1>
      ${thumbnail}
      <p style="margin:0 0 16px;">
        A fresh video just dropped in the Beechwood Films library.
        ${video.library ? `Filed under <strong>${video.library}</strong>.` : ""}
      </p>
      <p style="margin:0 0 24px;">
        <a href="${watchLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:999px;text-decoration:none;font-weight:600;">
          Watch now
        </a>
      </p>
      <p style="font-size:13px;color:#666;margin-top:24px;">
        You’re receiving this because you opted in to new video notifications.
      </p>
    </div>
  `;
};

const sendResendEmail = async (recipients, video) => {
  if (!RESEND_API_KEY || !NOTIFY_FROM_EMAIL) {
    console.warn("[notify] RESEND_API_KEY/NOTIFY_FROM_EMAIL missing; logging only.");
    return false;
  }

  const to = recipients.map((recipient) => recipient.email);
  if (!to.length) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: NOTIFY_FROM_EMAIL,
      to,
      subject: `🎬 New video: ${video.title}`,
      html: buildEmailHtml(video)
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[notify] Resend API error", response.status, text);
    return false;
  }

  return true;
};

/**
 * In a production setup this would enqueue an email/push notification.
 * For now we log to the server console so you can wire a real provider later.
 */
export const notifyUsersOfNewVideo = async (video) => {
  const recipients = listUsersToNotify();

  if (!recipients.length) return;

  const delivered = await sendResendEmail(recipients, video);

  if (delivered) {
    console.log(
      `[notify] Sent release email for "${video.title}" to ${recipients.length} subscriber(s)`
    );
  } else {
    console.log(
      `[notify] Would notify ${recipients.length} subscriber(s) about "${video.title}"`
    );
  }
};
