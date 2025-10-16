import React from "react";
import { Link } from "react-router-dom";

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
    id: "set-about",
    label: "About",
    blurb: "Meet the team behind Beechwood Films.",
    to: "/about",
  },
];

export default function Landing() {
  return (
    <main className='landing'>
      <section className='landing__hero'>
        <div className='landing__copy'>
          <span className='landing__eyebrow'>Beechwood Films</span>
          <h1 className='landing__title'>Stories in motion for artists, venues, and dreamers.</h1>
          <p className='landing__lead'>
            We capture the heartbeat of Nashville and beyond—performances, behind-the-scenes moments, and the people that make them resonate.
          </p>
          <div className='landing__cta'>
            <Link className='landing__btn landing__btn--primary' to='/library'>Explore Library</Link>
          </div>
        </div>
        <div className='landing__imageFrame' aria-hidden='true'>
          <img src='/lPic2.jpg' alt='' loading='lazy' />
        </div>
      </section>

      <section className='landing__sections' aria-label='Library Sections'>
        {FEATURED_SETS.map((set) => (
          <Link className='landing__card' to={set.to} key={set.id}>
            <span className='landing__cardLabel'>{set.label}</span>
            <p className='landing__cardBlurb'>{set.blurb}</p>
            <span className='landing__cardArrow' aria-hidden='true'>→</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
