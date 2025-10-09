import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useLibraryStore from "../store/useLibraryStore";
import useAdmin from "../store/useAdmin";
import AddVideoModal from "./ui/AddVideoModal";
import EditVideoModal from "./ui/EditVideoModal";
import Header from "./Header";

export default function Library() {
  const {
    videos,
    favorites,
    toggleFavorite,
    addVideo,
    updateVideo,
    removeVideo,
  } = useLibraryStore();

  const { isAdmin, login, logout } = useAdmin();
  const navigate = useNavigate();

  // page UI state
  const [search, setSearch] = useState("");
  const [view, setView] = useState("library"); // library | favorites
  const [section, setSection] = useState("home"); // home | shorts | you
  const [previewId, setPreviewId] = useState(null);

  // modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setShowAdd(false);
        setShowEdit(false);
        setEditingVideo(null);
        setPreviewId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    let list = videos;
    if (section === "shorts") {
      list = list.filter((v) => (v.library || "").toLowerCase() === "shorts");
    } else if (section === "you") {
      list = list.filter((v) => favorites.includes(v.id));
    }
    if (view === "favorites") {
      list = list.filter((v) => favorites.includes(v.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.title.toLowerCase().includes(q));
    }
    return list;
  }, [videos, section, view, favorites, search]);

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
    if (confirm("Delete this video?")) removeVideo(id);
  }
  function playVideo(video) {
    navigate(`/watch/${video.id}`);
  }

  function getPreviewSrc(v) {
    if (v.provider === "youtube" && v.embedUrl) {
      const id = v.providerId || "";
      return `${v.embedUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&vq=small`;
    }
    if (v.provider === "vimeo" && v.embedUrl) {
      return `${v.embedUrl}?autoplay=1&muted=1&loop=1&background=1#t=0s`;
    }
    return null;
  }

  return (
    <div className='bf-container'>
      {/* Shared Header */}
      <Header
        search={search}
        onSearchChange={setSearch}
        view={view}
        onSetView={setView}
        isAdmin={isAdmin}
        onHamburgerClick={() => {}}
      />

      {/* Main: sidebar + grid */}
      <div className='bf-mainLayout'>
        <aside className='bf-sidebar' aria-label='Primary'>
          <button
            className={`bf-sideItem ${section === "home" ? "is-active" : ""}`}
            onClick={() => setSection("home")}
            title='Home'
          >
            <span className='bf-sideIcon' aria-hidden='true'>
              <svg viewBox='0 0 24 24'>
                <path
                  fill='currentColor'
                  d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
                />
              </svg>
            </span>
            <span className='bf-sideLabel'>Home</span>
          </button>

          <button
            className={`bf-sideItem ${section === "shorts" ? "is-active" : ""}`}
            onClick={() => setSection("shorts")}
            title='Shorts'
          >
            <span className='bf-sideIcon' aria-hidden='true'>
              <svg viewBox='0 0 24 24'>
                <path
                  fill='currentColor'
                  d='M10 16.5l6-4.5-6-4.5v9zM4 3h12a2 2 0 012 2v3l3-2v12l-3-2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z'
                />
              </svg>
            </span>
            <span className='bf-sideLabel'>Shorts</span>
          </button>

          <button
            className={`bf-sideItem ${section === "you" ? "is-active" : ""}`}
            onClick={() => setSection("you")}
            title='You'
          >
            <span className='bf-sideIcon' aria-hidden='true'>
              <svg viewBox='0 0 24 24'>
                <path
                  fill='currentColor'
                  d='M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z'
                />
              </svg>
            </span>
            <span className='bf-sideLabel'>You</span>
          </button>

          <div className='bf-sideSpacer' />
          {!isAdmin ? (
            <button className='bf-sideItem' onClick={login} title='Admin Login'>
              <span className='bf-sideIcon'>
                <svg viewBox='0 0 24 24'>
                  <path
                    fill='currentColor'
                    d='M10 17l5-5-5-5v10zM4 4h2v16H4z'
                  />
                </svg>
              </span>
              <span className='bf-sideLabel'>Admin</span>
            </button>
          ) : (
            <>
              <button
                className='bf-sideItem'
                onClick={() => setShowAdd(true)}
                title='Upload'
              >
                <span className='bf-sideIcon'>
                  <svg viewBox='0 0 24 24'>
                    <path
                      fill='currentColor'
                      d='M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z'
                    />
                  </svg>
                </span>
                <span className='bf-sideLabel'>Upload</span>
              </button>
              <button className='bf-sideItem' onClick={logout} title='Logout'>
                <span className='bf-sideIcon'>
                  <svg viewBox='0 0 24 24'>
                    <path
                      fill='currentColor'
                      d='M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L16.5 6l5 5-5 5-1.42-1.41zM3 6h4v2H5v8h2v2H3z'
                    />
                  </svg>
                </span>
                <span className='bf-sideLabel'>Logout</span>
              </button>
            </>
          )}
        </aside>

        <main className='bf-content'>
          {filtered.length === 0 ? (
            <p className='bf-empty'>No videos found</p>
          ) : (
            <div className='bf-grid three-across'>
              {filtered.map((video) => {
                const isPreviewing = previewId === video.id;
                const ytVmPreview = getPreviewSrc(video);

                return (
                  <div
                    key={video.id}
                    className='bf-card'
                    onMouseEnter={() => setPreviewId(video.id)}
                    onMouseLeave={() =>
                      setPreviewId((id) => (id === video.id ? null : id))
                    }
                    onClick={() => playVideo(video)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && playVideo(video)
                    }
                  >
                    <div className='bf-thumbWrap'>
                      <img src={video.thumbnail} alt={video.title} />
                      {isPreviewing && (
                        <div className='bf-previewLayer'>
                          {video.provider === "file" && video.embedUrl ? (
                            <video
                              src={video.embedUrl}
                              muted
                              playsInline
                              autoPlay
                              loop
                              preload='metadata'
                              className='bf-previewVideo'
                            />
                          ) : ytVmPreview ? (
                            <iframe
                              className='bf-previewFrame'
                              src={ytVmPreview}
                              title={`${video.title} preview`}
                              allow='autoplay; fullscreen; picture-in-picture'
                              allowFullScreen={false}
                              loading='eager'
                            />
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div
                      className='bf-meta'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className='bf-title' title={video.title}>
                        {video.title}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className='bf-watchBtn'
                          onClick={() => playVideo(video)}
                        >
                          ▶ Watch
                        </button>
                        <button
                          className='bf-watchBtn'
                          style={{
                            background: favorites.includes(video.id)
                              ? "#20222a"
                              : "#e50914",
                            borderColor: favorites.includes(video.id)
                              ? "#2f3240"
                              : "#e50914",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(video.id);
                          }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOpen(video);
                              }}
                            >
                              ✎ Edit
                            </button>
                            <button
                              className='bf-watchBtn'
                              style={{
                                background: "#444",
                                borderColor: "#444",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(video.id);
                              }}
                            >
                              🗑 Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
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
