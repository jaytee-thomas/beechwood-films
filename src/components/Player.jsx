import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useLibraryStore from "../store/useLibraryStore";
import useAdmin from "../store/useAdmin";
import Header from "./Header";

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { videos, favorites, toggleFavorite } = useLibraryStore();
  const { isAdmin, login, logout } = useAdmin();

  // header states (kept for consistency)
  const [search, setSearch] = useState("");
  const [view, setView] = useState("library");

  // left-rail section state (just visual consistency)
  const [section, setSection] = useState("home"); // home | shorts | you

  // hover preview state for Up Next cards
  const [previewId, setPreviewId] = useState(null);

  const video = useMemo(
    () => videos.find((v) => String(v.id) === String(id)),
    [videos, id]
  );

  const isFile = video?.provider === "file";
  const isYouTube = video?.provider === "youtube";
  const isVimeo = video?.provider === "vimeo";

  const ytSrc =
    isYouTube && video?.embedUrl
      ? `${video.embedUrl}?autoplay=1&mute=0&controls=1&modestbranding=1&playsinline=1&rel=0`
      : null;

  const vimeoSrc =
    isVimeo && video?.embedUrl ? `${video.embedUrl}?autoplay=1` : null;

  // --- Build "Up next" list: prefer same library, then fill with others ---
  const related = useMemo(() => {
    const others = videos.filter((v) => String(v.id) !== String(id));
    if (!video) return others.slice(0, 6);

    const sameLib = others.filter(
      (v) =>
        (v.library || "").toLowerCase() === (video.library || "").toLowerCase()
    );
    const rest = others.filter(
      (v) =>
        (v.library || "").toLowerCase() !== (video.library || "").toLowerCase()
    );
    return [...sameLib, ...rest].slice(0, 6);
  }, [videos, video, id]);

  function playVideoById(vid) {
    navigate(`/watch/${vid.id}`);
  }

  function getPreviewSrc(v) {
    if (v.provider === "youtube" && v.embedUrl) {
      const pid = v.providerId || "";
      return `${v.embedUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${pid}&modestbranding=1&playsinline=1&rel=0&vq=small`;
    }
    if (v.provider === "vimeo" && v.embedUrl) {
      return `${v.embedUrl}?autoplay=1&muted=1&loop=1&background=1#t=0s`;
    }
    return null;
  }

  return (
    <div className='bf-container'>
      {/* Shared header on player page too */}
      <Header
        search={search}
        onSearchChange={setSearch}
        view={view}
        onSetView={setView}
        isAdmin={isAdmin}
        onHamburgerClick={() => {}}
      />

      {/* Same two-column layout as Library: left rail + main content */}
      <div className='bf-mainLayout'>
        {/* --- LEFT SIDEBAR (compact) --- */}
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
                onClick={() => navigate("/")}
                title='Back to Library'
              >
                <span className='bf-sideIcon'>
                  <svg viewBox='0 0 24 24'>
                    <path
                      fill='currentColor'
                      d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
                    />
                  </svg>
                </span>
                <span className='bf-sideLabel'>Library</span>
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

        {/* --- MAIN PLAYER CONTENT + UP NEXT --- */}
        <main className='bf-content'>
          <div className='bf-playerWrap' style={{ padding: 0 }}>
            {!video ? (
              <div className='bf-playerNotFound'>
                <p>Video not found.</p>
                <Link className='bf-navBtn' to='/'>
                  Go to Library
                </Link>
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: 12,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button className='bf-navBtn' onClick={() => navigate(-1)}>
                    ← Back
                  </button>
                  <div className='bf-playerTitle'>{video.title}</div>
                </div>

                <div className='bf-playerStage'>
                  {isFile && video.embedUrl && (
                    <video
                      className='bf-playerVideo'
                      src={video.embedUrl}
                      autoPlay
                      controls
                      playsInline
                    />
                  )}
                  {isYouTube && ytSrc && (
                    <iframe
                      className='bf-playerFrame'
                      src={ytSrc}
                      title={video.title}
                      allow='autoplay; fullscreen; picture-in-picture'
                      allowFullScreen
                      loading='eager'
                    />
                  )}
                  {isVimeo && vimeoSrc && (
                    <iframe
                      className='bf-playerFrame'
                      src={vimeoSrc}
                      title={video.title}
                      allow='autoplay; fullscreen; picture-in-picture'
                      allowFullScreen
                      loading='eager'
                    />
                  )}
                </div>

                {/* ===== UP NEXT / RELATED ===== */}
                {related.length > 0 && (
                  <section className='bf-upnext'>
                    <h3 className='bf-sectionTitle'>Up next</h3>
                    <div className='bf-grid three-across'>
                      {related.map((v) => {
                        const active = previewId === v.id;
                        const preview = getPreviewSrc(v);
                        return (
                          <div
                            key={v.id}
                            className='bf-card'
                            onMouseEnter={() => setPreviewId(v.id)}
                            onMouseLeave={() =>
                              setPreviewId((pid) => (pid === v.id ? null : pid))
                            }
                            onClick={() => playVideoById(v)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              playVideoById(v)
                            }
                          >
                            <div className='bf-thumbWrap'>
                              <img src={v.thumbnail} alt={v.title} />
                              {active && (
                                <div className='bf-previewLayer'>
                                  {v.provider === "file" && v.embedUrl ? (
                                    <video
                                      src={v.embedUrl}
                                      muted
                                      playsInline
                                      autoPlay
                                      loop
                                      preload='metadata'
                                      className='bf-previewVideo'
                                    />
                                  ) : preview ? (
                                    <iframe
                                      className='bf-previewFrame'
                                      src={preview}
                                      title={`${v.title} preview`}
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
                              <div className='bf-title' title={v.title}>
                                {v.title}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className='bf-watchBtn'
                                  onClick={() => playVideoById(v)}
                                >
                                  ▶ Watch
                                </button>
                                <button
                                  className='bf-watchBtn'
                                  style={{
                                    background: favorites.includes(v.id)
                                      ? "#20222a"
                                      : "#e50914",
                                    borderColor: favorites.includes(v.id)
                                      ? "#2f3240"
                                      : "#e50914",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(v.id);
                                  }}
                                  aria-label={
                                    favorites.includes(v.id)
                                      ? "Remove from favorites"
                                      : "Add to favorites"
                                  }
                                >
                                  {favorites.includes(v.id) ? "★" : "☆"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
