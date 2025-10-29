import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import useSettingsStore from "../store/useSettingsStore";
import useContentStore from "../store/useContentStore";

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
    label: "NSFW",
    blurb: "Explicit or adults-only catalog (requires login).",
    to: "/nsfw",
  },
  {
    id: "set-about",
    label: "About",
    blurb: "Meet the team behind Beechwood Films.",
    to: "/about",
  },
];

export default function Landing() {
  const homeWallpaper = useSettingsStore((state) => state.settings.homeWallpaper || "/WP1.jpg");
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const content = useContentStore((state) => state.content);
  const loadContent = useContentStore((state) => state.loadContent);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadContent().catch(() => {});
  }, [loadSettings, loadContent]);

  const eyebrow = content.homeEyebrow?.trim() || "Beechwood Films";
  const title = content.homeTitle?.trim() || "Stories in motion for artists, venues, and dreamers.";
  const lead =
    content.homeLead?.trim() ||
    "We capture the heartbeat of Nashville and beyond—performances, behind-the-scenes moments, and the people that make them resonate.";
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

  const showFallbackImage = false;
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
          </div>
        </div>
        {showFallbackImage ? null : null}
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
    </main>
  );
}
