import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Shield, Upload, LogOut, X } from "lucide-react";
import useAdminPanel from "../store/useAdminPanel";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/library", label: "Library" },
  { to: "/reels", label: "Reels" },
  { to: "/vids", label: "Vids" },
  { to: "/favorites", label: "Favorites" },
  { to: "/about", label: "About" },
];

export default function Header({ search, setSearch }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    isAuthed,
    openLogin,
    openUpload,
    clearAuthed,
  } = useAdminPanel();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showSearch = pathname !== "/";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className='bf-header' role='banner'>
        <div className='bf-leftCluster'>
          <button
            type='button'
            className='bf-hamburger'
            aria-label='Open navigation menu'
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className='bf-logoGroup' aria-label='Beechwood Films'>
            <svg className='bf-logoIcon' viewBox='0 0 24 24'>
              <path
                fill='currentColor'
                d='M4 7a2 2 0 0 1 2-2h5l1.2 1.8h3.6L18 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm6 9 6-4-6-4v8z'
              />
            </svg>
            <span className='bf-logoText'>Beechwood Films</span>
          </div>
        </div>

        {showSearch ? (
          <div className='bf-searchWrap'>
            <input
              className='bf-search'
              placeholder='Search…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Search library'
            />
            <span className='bf-searchIcon'>🔎</span>
          </div>
        ) : (
          <div aria-hidden='true' className='bf-searchSpacer' />
        )}

        <div className='bf-actions'>
          {!isAuthed ? (
            <button
              type='button'
              className='bf-actionBtn bf-actionBtn--admin'
              onClick={openLogin}
              aria-label='Open admin access'
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          ) : (
            <>
              <button
                type='button'
                className='bf-actionBtn bf-actionBtn--accent'
                onClick={openUpload}
                aria-label='Add new video'
              >
                <Upload size={16} />
                <span>Upload</span>
              </button>
              <button
                type='button'
                className='bf-actionBtn bf-actionBtn--ghost'
                onClick={clearAuthed}
                aria-label='Sign out of admin mode'
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div
        className={`bf-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        role='presentation'
      />
      <aside
        className={`bf-drawer ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
        aria-label='Site navigation'
      >
        <div className='bf-drawerHead'>
          <span className='bf-drawerTitle'>Navigate</span>
          <button
            type='button'
            className='bf-drawerClose'
            onClick={() => setMenuOpen(false)}
            aria-label='Close navigation'
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label='Primary navigation'>
          <ul className='bf-drawerList'>
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`bf-drawerItem ${
                    isActive(link.to) ? "is-active" : ""
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
