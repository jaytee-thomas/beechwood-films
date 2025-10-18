import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useLibraryStore from "../store/useLibraryStore";
import useAuth from "../store/useAuth";
import useAdminPanel from "../store/useAdminPanel";
import Header from "./Header";
import MCard from "./MCard.jsx";

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    videos,
    favorites,
    toggleFavorite,
    progress,
    durations,
    setProgress,
    clearProgress,
    setDuration,
    recordWatch,
  } = useLibraryStore();
  const authUser = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const openLogin = useAdminPanel((state) => state.openLogin);
  const isAdmin = authUser?.role === "admin";
  const isAuthenticated = Boolean(authUser);
  const displayName = authUser?.name || authUser?.email || (authUser?.role === "guest" ? "Guest" : "Profile");

  // header states
  const [search, setSearch] = useState("");
  const [view, setView] = useState("library");

  // left rail section
  const [section, setSection] = useState("home");

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

  // record that this video was watched (for recency)
  useEffect(() => {
    if (video) recordWatch(video.id);
  }, [video, recordWatch]);

  // --- Save progress for file videos ---
  const videoRef = useRef(null);
  const lastSentRef = useRef(0);

  const onLoadedMeta = () => {
    if (!videoRef.current || !video) return;
    setDuration(video.id, videoRef.current.duration || 0);
    // If we have saved progress, resume near that time (+-1s guard)
    const saved = progress[video.id];
    if (saved && isFinite(saved)) {
      try {
        videoRef.current.currentTime = Math.max(
          0,
          Math.min(saved, videoRef.current.duration || saved)
        );
      } catch {}
    }
  };

  const onTimeUpdate = () => {
    if (!videoRef.current || !video) return;
    const now = performance.now();
    if (now - lastSentRef.current > 1000) {
      // throttle ~1s
      lastSentRef.current = now;
      setProgress(video.id, videoRef.current.currentTime || 0);
    }
  };

  const onEnded = () => {
    if (!video) return;
    clearProgress(video.id); // finished: remove from Continue list
  };

  // --- Related (Up next) ---
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

  // --- Continue watching (exclude current) ---
  const continueList = useMemo(() => {
    const ids = Object.keys(progress).map((k) => Number(k));
    const setIds = new Set(ids);
    const list = videos
      .filter((v) => setIds.has(v.id) && String(v.id) !== String(id))
      .slice(0, 6);
    return list;
  }, [videos, progress, id]);

  function playVideoById(vid) {
    navigate(`/watch/${vid.id}`);
  }

  // progress percent helper for cards
  const percentFor = (vid) => {
    const p = progress[vid.id];
    const d = durations[vid.id];
    if (!p || !d || d <= 0) return null;
    const pct = Math.max(0, Math.min(100, Math.round((p / d) * 100)));
    return pct;
  };

  const shareVideo = (videoItem) => {
    if (typeof navigator !== "undefined" && navigator?.share) {
      navigator
        .share({
          title: videoItem.title,
          url:
            typeof window !== "undefined"
              ? window.location.origin + `/watch/${videoItem.id}`
              : undefined,
        })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      window.alert(`Share "${videoItem.title}" with your collaborators!`);
    }
  };

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

      {/* Same two-column layout as Library */}
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
          {!isAuthenticated ? (
            <button className='bf-sideItem' onClick={openLogin} title='Sign in'>
              <span className='bf-sideIcon'>
                <svg viewBox='0 0 24 24'>
                  <path
                    fill='currentColor'
                    d='M10 17l5-5-5-5v10zM4 4h2v16H4z'
                  />
                </svg>
              </span>
              <span className='bf-sideLabel'>Sign In</span>
            </button>
          ) : (
            <>
              {isAdmin && (
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
              )}
              <button className='bf-sideItem' onClick={logout} title='Logout'>
                <span className='bf-sideIcon'>
                  <svg viewBox='0 0 24 24'>
                    <path
                      fill='currentColor'
                      d='M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L16.5 6l5 5-5 5-1.42-1.41zM3 6h4v2H5v8h2v2H3z'
                    />
                  </svg>
                </span>
                <span className='bf-sideLabel'>Logout {displayName}</span>
              </button>
            </>
          )}
        </aside>

        {/* --- MAIN: Player + Up Next + Continue Watching --- */}
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
                      ref={videoRef}
                      className='bf-playerVideo'
                      src={video.embedUrl}
                      autoPlay
                      controls
                      playsInline
                      onLoadedMetadata={onLoadedMeta}
                      onTimeUpdate={onTimeUpdate}
                      onEnded={onEnded}
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
                      // we can't easily track time in plain iframe; mark as started
                      onLoad={() =>
                        setProgress(video.id, progress[video.id] || 1)
                      }
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
                      onLoad={() =>
                        setProgress(video.id, progress[video.id] || 1)
                      }
                    />
                  )}
                </div>

                {/* ===== UP NEXT ===== */}
                {related.length > 0 && (
                  <section className='bf-upnext'>
                    <h3 className='bf-sectionTitle'>Up next</h3>
                    <div className='bf-grid three-across'>
                      {related.map((videoItem) => {
                        const durationLabel =
                          videoItem.duration ||
                          videoItem.runtime ||
                          videoItem.date ||
                          "";
                        const secondaryLabel =
                          videoItem.library ||
                          (Array.isArray(videoItem.tags) &&
                            videoItem.tags.length > 0
                            ? videoItem.tags[0]
                            : "") ||
                          "";
                        let stats = null;
                        if (durationLabel || secondaryLabel) {
                          stats = {
                            views: durationLabel || undefined,
                            age: secondaryLabel || undefined,
                          };
                        }
                        return (
                          <MCard
                            key={videoItem.id}
                            video={videoItem}
                            variant='short'
                            stats={stats}
                            onPlay={(selected) => playVideoById(selected)}
                            onToggleFavorite={(selected) =>
                              toggleFavorite(selected.id)
                            }
                            onShare={shareVideo}
                            isFavorite={favorites.includes(videoItem.id)}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* ===== CONTINUE WATCHING ===== */}
                {continueList.length > 0 && (
                  <section className='bf-continue'>
                    <h3 className='bf-sectionTitle'>Continue watching</h3>
                    <div className='bf-grid three-across'>
                      {continueList.map((videoItem) => {
                        const pct = percentFor(videoItem); // null if unknown
                        const stats =
                          pct !== null
                            ? {
                                views: `${pct}% watched`,
                                age: videoItem.duration || "",
                              }
                            : videoItem.duration
                            ? { views: videoItem.duration, age: "" }
                            : null;
                        return (
                          <div key={videoItem.id} className='bf-cardCell'>
                            <MCard
                              video={videoItem}
                              variant='short'
                              stats={stats}
                              onPlay={(selected) => playVideoById(selected)}
                              onToggleFavorite={(selected) =>
                                toggleFavorite(selected.id)
                              }
                              onShare={shareVideo}
                              isFavorite={favorites.includes(videoItem.id)}
                            />
                            {pct !== null && (
                              <button
                                type='button'
                                className='bf-cardAction'
                                onClick={() => clearProgress(videoItem.id)}
                              >
                                Clear progress
                              </button>
                            )}
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
