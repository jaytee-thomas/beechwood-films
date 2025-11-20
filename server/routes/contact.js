import { Router } from "express";

const router = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || NOTIFY_FROM_EMAIL;

const PROJECT_TYPE_LABELS = {
  commercial: "Commercial",
  "music-video": "Music Video",
  documentary: "Documentary",
  "event-coverage": "Event Coverage",
  corporate: "Corporate",
  wedding: "Wedding",
  other: "Other",
};

const BUDGET_RANGE_LABELS = {
  "under-5k": "Under $5,000",
  "5k-10k": "$5,000 - $10,000",
  "10k-25k": "$10,000 - $25,000",
  "25k-50k": "$25,000 - $50,000",
  "50k-plus": "$50,000+",
  discuss: "Let's discuss",
};

const buildContactEmailHtml = (data) => {
  const projectTypeLabel = PROJECT_TYPE_LABELS[data.projectType] || data.projectType;
  const budgetRangeLabel = BUDGET_RANGE_LABELS[data.budgetRange] || data.budgetRange;
  const companySection = data.company
    ? `<p><strong>Company:</strong> ${data.company}</p>`
    : "";

  return `
    <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;color:#111;padding:24px;line-height:1.6;max-width:600px;margin:0 auto;background:#fff;">
      <h1 style="margin:0 0 20px;font-size:24px;color:#111;border-bottom:2px solid #e5e5e5;padding-bottom:12px;">
        🎬 New Contact Form Submission
      </h1>
      
      <div style="background:#f9f9f9;padding:20px;border-radius:12px;margin-bottom:20px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Contact Information</h2>
        <p style="margin:0 0 12px;"><strong>Name:</strong> ${data.name}</p>
        <p style="margin:0 0 12px;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color:#2563eb;text-decoration:none;">${data.email}</a></p>
        ${companySection}
      </div>

      <div style="background:#f9f9f9;padding:20px;border-radius:12px;margin-bottom:20px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Project Details</h2>
        <p style="margin:0 0 12px;"><strong>Project Type:</strong> ${projectTypeLabel}</p>
        <p style="margin:0 0 12px;"><strong>Budget Range:</strong> ${budgetRangeLabel}</p>
      </div>

      <div style="background:#f9f9f9;padding:20px;border-radius:12px;margin-bottom:20px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Message</h2>
        <p style="margin:0;white-space:pre-wrap;color:#333;">${data.message}</p>
      </div>

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e5e5;text-align:center;">
        <p style="margin:0;font-size:13px;color:#666;">
          This message was sent from the Beechwood Films contact form.
        </p>
        <p style="margin:8px 0 0;">
          <a href="mailto:${data.email}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
            Reply to ${data.name}
          </a>
        </p>
      </div>
    </div>
  `;
};

const sendContactEmail = async (data) => {
  if (!RESEND_API_KEY || !NOTIFY_FROM_EMAIL || !CONTACT_TO_EMAIL) {
    console.warn("[contact] RESEND_API_KEY/NOTIFY_FROM_EMAIL/CONTACT_TO_EMAIL missing; logging only.");
    console.log("[contact] Would send contact form submission:", {
      from: data.email,
      name: data.name,
      projectType: data.projectType,
      budgetRange: data.budgetRange,
    });
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: NOTIFY_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        reply_to: data.email,
        subject: `🎬 New Contact: ${data.name} - ${PROJECT_TYPE_LABELS[data.projectType] || data.projectType}`,
        html: buildContactEmailHtml(data),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[contact] Resend API error", response.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[contact] Error sending email:", error);
    return false;
  }
};

const validateContactData = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.email || typeof data.email !== "string" || data.email.trim().length === 0) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push("Invalid email format");
  }

  if (!data.projectType || typeof data.projectType !== "string" || data.projectType.trim().length === 0) {
    errors.push("Project type is required");
  }

  if (!data.budgetRange || typeof data.budgetRange !== "string" || data.budgetRange.trim().length === 0) {
    errors.push("Budget range is required");
  }

  if (!data.message || typeof data.message !== "string" || data.message.trim().length === 0) {
    errors.push("Message is required");
  } else if (data.message.trim().length < 10) {
    errors.push("Message must be at least 10 characters");
  }

  // Optional field validation
  if (data.company && typeof data.company !== "string") {
    errors.push("Company must be a string");
  }

  return errors;
};

router.post("/contact", async (req, res) => {
  try {
    const data = req.body;

    // Validate input
    const validationErrors = validateContactData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    // Sanitize and prepare data
    const contactData = {
      name: (data.name || "").trim(),
      email: (data.email || "").trim().toLowerCase(),
      company: (data.company || "").trim(),
      projectType: (data.projectType || "").trim(),
      budgetRange: (data.budgetRange || "").trim(),
      message: (data.message || "").trim(),
    };

    // Send email
    const sent = await sendContactEmail(contactData);

    if (sent) {
      console.log(`[contact] Contact form submission received from ${contactData.email} (${contactData.name})`);
      return res.status(200).json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!",
      });
    } else {
      // Even if email fails, we still return success to the user
      // (we don't want to expose email delivery issues)
      console.log(`[contact] Contact form submission received from ${contactData.email} (${contactData.name}) - email not sent (missing config)`);
      return res.status(200).json({
        success: true,
        message: "Your message has been received. We'll get back to you soon!",
      });
    }
  } catch (error) {
    console.error("[contact] Error processing contact form:", error);
    return res.status(500).json({
      error: "Failed to process contact form submission",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
});

export default router;

