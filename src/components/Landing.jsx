import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import useSettingsStore from "../store/useSettingsStore";
import useContentStore from "../store/useContentStore";
import useAdminPanel from "../store/useAdminPanel";
import useAuth from "../store/useAuth";
import { testimonials, clientLogos } from "../data/testimonials";
import logoVariation5 from "../assets/logo-variation5.svg";

const FEATURED_SETS = [
  {
    id: "set-docs",
    label: "Videos",
    blurb: "Long-form stories from the Beechwood archive.",
    to: "/vids",
  },
  {
    id: "set-reels",
    label: "Reels",
    blurb: "Quick-cut highlights built for socials.",
    to: "/reels",
  },
  {
    id: "set-nsfw",
    label: "NSFW Classified",
    blurb: "Explicit, classified, or adults-only catalog (requires login).",
    to: "/nsfw",
  },
  {
    id: "set-about",
    label: "About",
    blurb: "Meet the mind behind Beechwood Films.",
    to: "/about",
  },
];

export default function Landing() {
  const homeWallpaper = useSettingsStore((state) => state.settings.homeWallpaper || "/WP1.jpg");
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const content = useContentStore((state) => state.content);
  const loadContent = useContentStore((state) => state.loadContent);
  const openContentEditor = useAdminPanel((state) => state.openContentEditor);
  const user = useAuth((state) => state.user);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadSettings().catch(() => {});
    loadContent().catch(() => {});
  }, [loadSettings, loadContent]);

  const eyebrow = content.homeEyebrow?.trim() || "Beechwood Films";
  const title =
    content.homeTitle?.trim() ||
    "Stories in motion for people, places, and everyday life";
  const lead =
    content.homeLead?.trim() ||
    "Capturing the heartbeat of Nashville and beyond—performances, behind-the-scenes moments, and the people that make them resonate.";
  const ctaLabel = content.homeCtaLabel?.trim() || "Explore Library";
  const ctaLink = content.homeCtaLink?.trim() || "/library";

  const landingStyle = homeWallpaper
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(7, 8, 18, 0.72), rgba(7, 8, 18, 0.6)), url("${homeWallpaper}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }
    : {};

  const quickLinks = [
    {
      id: "quick-1",
      label: content.homeQuickLinkOneLabel?.trim(),
      href: content.homeQuickLinkOneHref?.trim() || "/vids"
    },
    {
      id: "quick-2",
      label: content.homeQuickLinkTwoLabel?.trim(),
      href: content.homeQuickLinkTwoHref?.trim() || "/reels"
    },
    {
      id: "quick-3",
      label: content.homeQuickLinkThreeLabel?.trim(),
      href: content.homeQuickLinkThreeHref?.trim() || "/about"
    }
  ].filter((item) => item.label);

  return (
    <main className={`landing${homeWallpaper ? " landing--hasWallpaper" : ""}`} style={landingStyle}>
      <section className='landing__hero'>
        <div className='landing__copy'>
          <span className='landing__eyebrow'>{eyebrow}</span>
          <h1 className='landing__title'>{title}</h1>
          <p className='landing__lead'>{lead}</p>
          <div className='landing__cta'>
            <Link className='landing__btn landing__btn--primary' to={ctaLink || "/library"}>
              {ctaLabel || "Explore Library"}
            </Link>
            {isAdmin && (
              <button
                type='button'
                className='landing__editBtn'
                onClick={openContentEditor}
              >
                Edit hero & links
              </button>
            )}
          </div>
        </div>
        <aside className='landing__logoPreview' aria-label='Beechwood Films badge preview'>
          <img src={logoVariation5} alt='Beechwood Films badge logo preview' loading='lazy' />
          <span className='landing__logoCaption'>Badge preview · variation 5</span>
        </aside>
      </section>

      {quickLinks.length > 0 ? (
        <section className='landing__sections' aria-label='Quick Links'>
          {quickLinks.map((link) => (
            <Link className='landing__card' to={link.href} key={link.id}>
              <span className='landing__cardLabel'>{link.label}</span>
              <span className='landing__cardArrow' aria-hidden='true'>→</span>
            </Link>
          ))}
        </section>
      ) : (
        <section className='landing__sections' aria-label='Library Sections'>
          {FEATURED_SETS.map((set) => (
            <Link className='landing__card' to={set.to} key={set.id}>
              <span className='landing__cardLabel'>{set.label}</span>
              <p className='landing__cardBlurb'>{set.blurb}</p>
              <span className='landing__cardArrow' aria-hidden='true'>→</span>
            </Link>
          ))}
        </section>
      )}

      <section className='landing__testimonials' aria-label='Testimonials and clients'>
        <div className='landing__testimonialsHead'>
          <span className='landing__testimonialsEyebrow'>Trusted Collaborators</span>
          <h2 className='landing__testimonialsTitle'>Stories that resonate with the people who matter</h2>
          <p className='landing__testimonialsLead'>
            From touring artists to civic partners, Beechwood Films brings cinematic craft, technical precision,
            and agile storytelling to every engagement.
          </p>
        </div>

        <div className='landing__testimonialGrid'>
          {testimonials.map((item) => (
            <article className='landing__testimonialCard' key={item.name}>
              <p className='landing__testimonialQuote'>“{item.quote}”</p>
              <div className='landing__testimonialMeta'>
                <span className='landing__testimonialName'>{item.name}</span>
                <span className='landing__testimonialTitle'>{item.title}</span>
              </div>
            </article>
          ))}
        </div>

        <div className='landing__clientStrip' aria-label='Client partners'>
          {clientLogos.map((client) => (
            <span key={client} className='landing__clientBadge'>
              {client}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
