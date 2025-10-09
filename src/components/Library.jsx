import React, { useState, useEffect } from "react";
import useLibraryStore from "../store/useLibraryStore";
import useAdmin from "../store/useAdmin";
import AddVideoModal from "./ui/AddVideoModal";
import EditVideoModal from "./ui/EditVideoModal";

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

  // modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setShowAdd(false);
        setShowEdit(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered =
    view === "favorites"
      ? videos
          .filter((v) => favorites.includes(v.id))
          .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
      : videos.filter((v) =>
          v.title.toLowerCase().includes(search.toLowerCase())
        );

  function handleAddSave(payload) {
    addVideo(payload);
    setShowAdd(false);
  }

  function handleEditOpen(v) {
    setEditingVideo(v);
    setShowEdit(true);
  }

  function handleEditSave({ id, updates }) {
    updateVideo(id, updates);
    setShowEdit(false);
    setEditingVideo(null);
  }

  function handleDelete(id) {
    if (!isAdmin) return alert("Admin only");
    if (confirm("Delete this video?")) {
      removeVideo(id);
    }
  }

  return (
    <div className='bf-container'>
      {/* ===== HEADER ===== */}
      <header className='bf-header'>
        <div className='bf-leftCluster'>
          <button
            className='bf-hamburger'
            onClick={() => setDrawerOpen(true)}
            aria-label='Open menu'
          >
            ☰
          </button>

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
          {isAdmin && (
            <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>Admin On</span>
          )}
        </div>
      </header>

      {/* ===== DRAWER ===== */}
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
                        setShowAdd(true);
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
                        if (confirm("Clear all Continue Watching progress?"))
                          setProgress({});
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

      {/* ===== GRID ===== */}
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

                  {isAdmin && (
                    <>
                      <button
                        className='bf-watchBtn'
                        style={{
                          background: "#2a6df1",
                          borderColor: "#2a6df1",
                        }}
                        onClick={() => handleEditOpen(video)}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className='bf-watchBtn'
                        style={{ background: "#444", borderColor: "#444" }}
                        onClick={() => handleDelete(video.id)}
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

      {/* ===== MODALS ===== */}
      <AddVideoModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAddSave}
      />

      <EditVideoModal
        open={showEdit}
        onClose={() => {
          setShowEdit(false);
          setEditingVideo(null);
        }}
        onSave={handleEditSave}
        video={editingVideo}
      />
    </div>
  );
}
