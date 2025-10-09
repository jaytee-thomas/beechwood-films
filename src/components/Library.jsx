import React, { useState, useEffect } from "react";
import useLibraryStore from "../store/useLibraryStore";

export default function Library() {
  const { videos, favorites, toggleFavorite, progress, setProgress } =
    useLibraryStore();

  const [search, setSearch] = useState("");
  const [view, setView] = useState("library");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    if (drawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Filtered list
  const filtered =
    view === "favorites"
      ? videos
          .filter((v) => favorites.includes(v.id))
          .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
      : videos.filter((v) =>
          v.title.toLowerCase().includes(search.toLowerCase())
        );

  return (
    <div className='bf-container'>
      {/* ===== HEADER (unchanged) ===== */}
      <header className='bf-header'>
        <div className='bf-leftCluster'>
          {/* Hamburger (unchanged) */}
          <button
            className='bf-hamburger'
            onClick={() => setDrawerOpen(true)}
            aria-label='Open menu'
          >
            ☰
          </button>

          {/* Logo (unchanged, inherits color) */}
          <div className='bf-logoGroup'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              className='bf-logoIcon'
              aria-hidden='true'
            >
              <path
                fill='currentColor'
                d='M17 10.5V7c0-.55-.45-1-1-1H4C3.45 6 3 6.45 3 7v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z'
              />
            </svg>
            <span className='bf-logoText'>Beechwood Films</span>
          </div>
        </div>

        {/* Search (unchanged) */}
        <div className='bf-searchWrap'>
          <input
            type='text'
            className='bf-search'
            placeholder='Search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className='bf-searchIcon' aria-hidden='true'>
            🔍
          </span>
        </div>

        {/* Header actions (unchanged) */}
        <div className='bf-actions'>
          <button
            className={`bf-navBtn ${view === "library" ? "is-active" : ""}`}
            onClick={() => setView("library")}
          >
            Library
          </button>
          <button
            className={`bf-navBtn ${view === "favorites" ? "is-active" : ""}`}
            onClick={() => setView("favorites")}
          >
            Favorites
          </button>
        </div>
      </header>

      {/* ===== DRAWER + OVERLAY (unchanged behavior) ===== */}
      {drawerOpen && (
        <div
          className='bf-overlay show'
          onClick={() => setDrawerOpen(false)}
          aria-hidden='true'
        >
          <nav
            className='bf-drawer open'
            onClick={(e) => e.stopPropagation()}
            role='navigation'
            aria-label='Main'
          >
            <div className='bf-drawerHead'>
              <div className='bf-drawerTitle'>Menu</div>
              <button
                className='bf-drawerClose'
                onClick={() => setDrawerOpen(false)}
                aria-label='Close menu'
              >
                ✕
              </button>
            </div>

            <ul className='bf-drawerList'>
              <li>
                <button
                  className={`bf-drawerItem ${
                    view === "library" ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setView("library");
                    setDrawerOpen(false);
                  }}
                >
                  🏠 Home
                </button>
              </li>
              <li>
                <button
                  className={`bf-drawerItem ${
                    view === "favorites" ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setView("favorites");
                    setDrawerOpen(false);
                  }}
                >
                  ⭐ Favorites
                </button>
              </li>

              <li>
                <hr className='bf-drawerSep' />
              </li>

              <li>
                <button
                  className='bf-drawerItem'
                  onClick={() => {
                    setDrawerOpen(false);
                    alert("Upload coming soon (admin only).");
                  }}
                >
                  ⬆ Upload Video
                </button>
              </li>

              <li>
                <button
                  className='bf-drawerItem'
                  onClick={() => {
                    setDrawerOpen(false);
                    if (confirm("Clear all Continue Watching progress?")) {
                      setProgress({});
                    }
                  }}
                >
                  🧹 Clear All Progress
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* ===== VIDEO GRID — IMPORTANT: direct element with class 'bf-grid' ===== */}
      <main className='bf-grid'>
        {filtered.length === 0 ? (
          <p className='bf-empty'>No videos found</p>
        ) : (
          filtered.map((video) => (
            <div key={video.id} className='bf-card'>
              <div className='bf-thumbWrap'>
                <img src={video.thumbnail} alt={video.title} />
              </div>
              <div className='bf-meta'>
                <div className='bf-title'>{video.title}</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className='bf-watchBtn'
                    onClick={() => alert(`Playing: ${video.title}`)}
                  >
                    ▶ Watch
                  </button>
                  <button
                    className='bf-watchBtn'
                    style={{
                      background: favorites.includes(video.id)
                        ? "#20222a"
                        : "#e50914",
                    }}
                    onClick={() => toggleFavorite(video.id)}
                    aria-label={
                      favorites.includes(video.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    {favorites.includes(video.id) ? "★" : "☆"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
