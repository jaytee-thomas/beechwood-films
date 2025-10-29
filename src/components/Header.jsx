import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Shield, Upload, LogOut, UserPlus, Bell, BellRing, X } from "lucide-react";
import useAdminPanel from "../store/useAdminPanel";
import useAuth from "../store/useAuth";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/library", label: "Library" },
  { to: "/reels", label: "Reels" },
  { to: "/vids", label: "Vids" },
  { to: "/favorites", label: "Favorites" },
  { to: "/nsfw", label: "NSFW Classified" },
  { to: "/about", label: "Meet the Mind Behind Beechwood Films" },
];

export default function Header({ search, setSearch }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openLogin, openRegister, openUpload } = useAdminPanel();
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const updatePreferences = useAuth((state) => state.updatePreferences);

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";
  const isGuest = user?.role === "guest";
  const displayName = user?.name || user?.email || (isGuest ? "Guest" : "");
  const notifyEnabled = Boolean(user?.notifyOnNewVideo);
  const canToggleNotifications = isAuthenticated && user?.role !== "guest";
  const [notifPending, setNotifPending] = useState(false);

  const toggleNotifications = async () => {
    if (!canToggleNotifications) return;
    setNotifPending(true);
    try {
      await updatePreferences({ notifyOnNewVideo: !notifyEnabled });
    } catch (error) {
      window.alert(error.message || "Could not update notifications");
    } finally {
      setNotifPending(false);
    }
  };

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
            <svg className='bf-logoIcon' viewBox='0 0 34 24' fill='currentColor'>
              <path d='M2 9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v1.11l5.105-2.553A1 1 0 0 1 31 8.47v7.06a1 1 0 0 1-1.895.553L24 13.53V15a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5z' />
              <circle cx='12' cy='6' r='3' />
              <circle cx='6' cy='6' r='3' />
            </svg>
            <span className='bf-logoText'>Beechwood Films</span>
          </div>
        </div>

        {showSearch ? (
          <div className='bf-searchWrap'>
            <input
              type='search'
              className='bf-search'
              placeholder='Search…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Search library'
              inputMode='search'
              enterKeyHint='search'
              autoComplete='off'
              spellCheck='false'
            />
            <span className='bf-searchIcon'>🔎</span>
          </div>
        ) : (
          <div aria-hidden='true' className='bf-searchSpacer' />
        )}

        <div className='bf-actions'>
          {!isAuthenticated && (
            <>
              <button
                type='button'
                className='bf-actionBtn bf-actionBtn--ghost'
                onClick={openLogin}
                aria-label='Sign in'
              >
                <Shield size={16} />
                <span>Sign In</span>
              </button>
              <button
                type='button'
                className='bf-actionBtn bf-actionBtn--admin'
                onClick={openRegister}
                aria-label='Create account'
              >
                <UserPlus size={16} />
                <span>Join</span>
              </button>
            </>
          )}

          {isAuthenticated && (
            <>
              {isAdmin && (
                <button
                  type='button'
                  className='bf-actionBtn bf-actionBtn--accent'
                  onClick={openUpload}
                  aria-label='Add new video'
                >
                  <Upload size={16} />
                  <span>Upload</span>
                </button>
              )}
              {canToggleNotifications && (
                <button
                  type='button'
                  className='bf-actionBtn bf-actionBtn--ghost'
                  onClick={toggleNotifications}
                  disabled={notifPending}
                  aria-label={notifyEnabled ? "Disable notifications" : "Enable notifications"}
                >
                  {notifyEnabled ? <BellRing size={16} /> : <Bell size={16} />}
                  <span>{notifyEnabled ? "Notifications on" : "Notify me"}</span>
                </button>
              )}
              <button
                type='button'
                className='bf-actionBtn bf-actionBtn--ghost'
                onClick={logout}
                aria-label='Sign out'
              >
                <LogOut size={16} />
                <span>{displayName ? `Logout ${displayName}` : "Logout"}</span>
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
