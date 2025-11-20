import React, { useState } from "react";
import "./ContactForm.css";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_ORIGIN?.replace(/\/+$/, "")) ||
  "";

function apiUrl(path) {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

const PROJECT_TYPES = [
  { value: "", label: "Select project type..." },
  { value: "commercial", label: "Commercial" },
  { value: "music-video", label: "Music Video" },
  { value: "documentary", label: "Documentary" },
  { value: "event-coverage", label: "Event Coverage" },
  { value: "corporate", label: "Corporate" },
  { value: "wedding", label: "Wedding" },
  { value: "other", label: "Other" },
];

const BUDGET_RANGES = [
  { value: "", label: "Select budget range..." },
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-10k", label: "$5,000 - $10,000" },
  { value: "10k-25k", label: "$10,000 - $25,000" },
  { value: "25k-50k", label: "$25,000 - $50,000" },
  { value: "50k-plus", label: "$50,000+" },
  { value: "discuss", label: "Let's discuss" },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "",
    budgetRange: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.projectType) {
      newErrors.projectType = "Project type is required";
    }

    if (!formData.budgetRange) {
      newErrors.budgetRange = "Budget range is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitStatus("success");
      // Reset form
      setFormData({
        name: "",
        email: "",
        company: "",
        projectType: "",
        budgetRange: "",
        message: "",
      });
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitStatus("error");
      // Clear error message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contact-form-section">
      <div className="contact-form__head">
        <span className="contact-form__eyebrow">Get in Touch</span>
        <h2 className="contact-form__title">Let's bring your vision to life</h2>
        <p className="contact-form__lead">
          Ready to start your next project? Share your ideas and we'll craft something extraordinary together.
        </p>
      </div>

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="contact-form__grid">
          <div className="contact-form__field">
            <label htmlFor="name" className="contact-form__label">
              Name <span className="contact-form__required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`contact-form__input ${errors.name ? "contact-form__input--error" : ""}`}
              placeholder="Your full name"
            />
            {errors.name && <span className="contact-form__error">{errors.name}</span>}
          </div>

          <div className="contact-form__field">
            <label htmlFor="email" className="contact-form__label">
              Email <span className="contact-form__required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`contact-form__input ${errors.email ? "contact-form__input--error" : ""}`}
              placeholder="your.email@example.com"
            />
            {errors.email && <span className="contact-form__error">{errors.email}</span>}
          </div>

          <div className="contact-form__field">
            <label htmlFor="company" className="contact-form__label">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="contact-form__input"
              placeholder="Company name (optional)"
            />
          </div>

          <div className="contact-form__field">
            <label htmlFor="projectType" className="contact-form__label">
              Project Type <span className="contact-form__required">*</span>
            </label>
            <select
              id="projectType"
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className={`contact-form__select ${errors.projectType ? "contact-form__input--error" : ""}`}
            >
              {PROJECT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.projectType && <span className="contact-form__error">{errors.projectType}</span>}
          </div>

          <div className="contact-form__field">
            <label htmlFor="budgetRange" className="contact-form__label">
              Budget Range <span className="contact-form__required">*</span>
            </label>
            <select
              id="budgetRange"
              name="budgetRange"
              value={formData.budgetRange}
              onChange={handleChange}
              className={`contact-form__select ${errors.budgetRange ? "contact-form__input--error" : ""}`}
            >
              {BUDGET_RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.budgetRange && <span className="contact-form__error">{errors.budgetRange}</span>}
          </div>

          <div className="contact-form__field contact-form__field--full">
            <label htmlFor="message" className="contact-form__label">
              Message <span className="contact-form__required">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              className={`contact-form__textarea ${errors.message ? "contact-form__input--error" : ""}`}
              placeholder="Tell us about your project, timeline, and any specific requirements..."
            />
            {errors.message && <span className="contact-form__error">{errors.message}</span>}
          </div>
        </div>

        {submitStatus === "success" && (
          <div className="contact-form__message contact-form__message--success">
            ✓ Message sent successfully! We'll get back to you soon.
          </div>
        )}

        {submitStatus === "error" && (
          <div className="contact-form__message contact-form__message--error">
            ✗ Failed to send message. Please try again or contact us directly.
          </div>
        )}

        <div className="contact-form__actions">
          <button
            type="submit"
            className="contact-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}

