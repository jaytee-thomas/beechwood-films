import React, { useState, useEffect } from "react";
import useLibraryStore from "../store/useLibraryStore";
import useAdmin from "../store/useAdmin";

export default function Library() {
  const {
    videos,
    favorites,
    toggleFavorite,
    progress,
    setProgress,
    addVideo,
    updateVideo,
    removeVideo,
  } = useLibraryStore();

  const { isAdmin, login, logout } = useAdmin();

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

  // --- Admin quick actions (prompt-based to keep it simple) ---
  function handleAddVideo() {
    if (!isAdmin) return alert("Admin only");
    const title = prompt("Title?");
    if (!title) return;
    const thumbnail = prompt("Thumbnail URL? (https://...)") || "";
    const duration = prompt("Duration? (e.g., 12:34)") || "";
    const videoUrl = prompt("Video URL? (mp4, YouTube, etc.)") || "";
    addVideo({ title, thumbnail, duration, videoUrl });
    alert("Video added ✅");
  }

  function handleEditVideo(v) {
    if (!isAdmin) return alert("Admin only");
    const title = prompt("New title:", v.title) ?? v.title;
    const thumbnail = prompt("New thumbnail URL:", v.thumbnail) ?? v.thumbnail;
    const duration = prompt("New duration:", v.duration ?? "") ?? v.duration;
    const videoUrl = prompt("New video URL:", v.videoUrl ?? "") ?? v.videoUrl;
    updateVideo(v.id, { title, thumbnail, duration, videoUrl });
    alert("Video updated ✅");
  }

  function handleDeleteVideo(id) {
    if (!isAdmin) return alert("Admin only");
    if (confirm("Delete this video? This cannot be undone.")) {
      removeVideo(id);
      alert("Video deleted 🗑️");
    }
  }

  return (
    <div className='bf-container'>
      {/* ===== HEADER (unchanged) ===== */}
      <header className='bf-header'>
        <div className='bf-leftCluster'>
          {/* Hamburger */}
          <button
            className='bf-hamburger'
            onClick={() => setDrawerOpen(true)}
            aria-label='Open menu'
          >
            ☰
          </button>

          {/* Logo */}
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

        {/* Search */}
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

        {/* Header actions */}
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
          {/* Tiny badge when admin on */}
          {isAdmin && (
            <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>Admin On</span>
          )}
        </div>
      </header>

      {/* ===== DRAWER + OVERLAY ===== */}
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

              {/* Admin controls in drawer */}
              {!isAdmin ? (
                <li>
                  <button
                    className='bf-drawerItem'
                    onClick={() => {
                      login();
                      setDrawerOpen(false);
                    }}
                  >
                    🔓 Admin Login
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <button
                      className='bf-drawerItem'
                      onClick={() => {
                        handleAddVideo();
                        setDrawerOpen(false);
                      }}
                    >
                      ⬆ Upload / Add Video
                    </button>
                  </li>
                  <li>
                    <button
                      className='bf-drawerItem'
                      onClick={() => {
                        if (confirm("Clear all Continue Watching progress?")) {
                          setProgress({});
                        }
                        setDrawerOpen(false);
                      }}
                    >
                      🧹 Clear All Progress
                    </button>
                  </li>
                  <li>
                    <button
                      className='bf-drawerItem'
                      onClick={() => {
                        logout();
                        setDrawerOpen(false);
                      }}
                    >
                      🔒 Admin Logout
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      )}

      {/* ===== VIDEO GRID ===== */}
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
                <div style={{ display: "flex", gap: 8 }}>
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
                  {/* Edit/Delete visible only in Admin */}
                  {isAdmin && (
                    <>
                      <button
                        className='bf-watchBtn'
                        style={{
                          background: "#2a6df1",
                          borderColor: "#2a6df1",
                        }}
                        onClick={() => handleEditVideo(video)}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className='bf-watchBtn'
                        style={{ background: "#444", borderColor: "#444" }}
                        onClick={() => handleDeleteVideo(video.id)}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
