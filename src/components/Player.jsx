import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useLibraryStore from "../store/useLibraryStore";
import useAuth from "../store/useAuth";
import useAdminPanel from "../store/useAdminPanel";
import Header from "./Header";
import MCard from "./MCard.jsx";
import { isDashSource, isHlsSource } from "../utils/streaming.js";
import { fetchVideoSignals, fetchRelatedVideos } from "../api/videos.js";
import { recomputeSignalsForVideo } from "../api/queues";
import useAuth from "../store/useAuth.js";

const VIDEO_MIME_TYPES = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  f4v: "video/x-f4v",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  mp2: "video/mpeg",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  m3u8: "application/x-mpegURL",
  mpd: "application/dash+xml"
};

const inferExtension = (url = "") => {
  if (!url) return "";
  const clean = url.split("?")[0].split("#")[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

const inferMimeFromExtension = (ext = "") => {
  if (!ext) return undefined;
  return VIDEO_MIME_TYPES[ext];
};

const inferMimeFromQuery = (url = "") => {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(url, base);
    const param =
      parsed.searchParams.get("contentType") ||
      parsed.searchParams.get("ContentType") ||
      parsed.searchParams.get("mime") ||
      parsed.searchParams.get("MimeType");
    if (param && param.toLowerCase().startsWith("video/")) {
      return param;
    }
  } catch {
    /* ignore malformed URLs */
  }
  return undefined;
};

export default function Player() {
  const token = useAuth((state) => state.token);
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
  const [signalsData, setSignalsData] = useState(null);
  const [relatedFromApi, setRelatedFromApi] = useState([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [signalsError, setSignalsError] = useState(null);
  const [relatedError, setRelatedError] = useState(null);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState("");
  const [recomputeError, setRecomputeError] = useState(null);

  const provider = (video?.provider || "").toLowerCase();
  const isYouTube = provider === "youtube";
  const isVimeo = provider === "vimeo";
  const isFile = provider === "file" || (!provider && video);

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

  useEffect(() => {
    if (!video?.id) {
      setSignalsData(null);
      setRelatedFromApi([]);
      setSignalsError(null);
      setRelatedError(null);
      setRecomputeMessage("");
      setRecomputeError(null);
      return;
    }
    setRecomputeMessage("");
    setRecomputeError(null);
    let cancelled = false;
    const load = async () => {
      setSignalsError(null);
      setLoadingSignals(true);
      try {
        const data = await fetchVideoSignals(video.id);
        if (!cancelled) setSignalsData(data);
      } catch (err) {
        console.error("Failed to load video signals", err);
        if (!cancelled) {
          setSignalsData(null);
          setSignalsError("Could not load signals");
        }
      } finally {
        if (!cancelled) setLoadingSignals(false);
      }

      setRelatedError(null);
      setLoadingRelated(true);
      try {
        const rel = await fetchRelatedVideos(video.id);
        if (!cancelled) setRelatedFromApi(rel?.items || []);
      } catch (err) {
        console.error("Failed to load related videos", err);
        if (!cancelled) {
          setRelatedFromApi([]);
          setRelatedError("Could not load related videos");
        }
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [video?.id]);

  // --- Save progress for file videos ---
  const videoRef = useRef(null);
  const lastSentRef = useRef(0);
  const [filePlaybackError, setFilePlaybackError] = useState(false);

  const normaliseCandidate = useCallback((value, typeHint) => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed === "about:blank") return null;
      const extension = inferExtension(trimmed);
      const type =
        typeHint ||
        inferMimeFromExtension(extension) ||
        inferMimeFromQuery(trimmed);
      return { url: trimmed, type, extension };
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalised = normaliseCandidate(item, typeHint);
        if (normalised) return normalised;
      }
      return null;
    }
    if (typeof value === "object") {
      const objectType =
        value.type ||
        value.mimeType ||
        value.mimetype ||
        value.contentType ||
        typeHint;
      const direct =
        normaliseCandidate(value.url, objectType) ||
        normaliseCandidate(value.src, objectType) ||
        normaliseCandidate(value.href, objectType);
      if (direct) return direct;
      if (Array.isArray(value.sources)) {
        const nested = normaliseCandidate(value.sources, objectType);
        if (nested) return nested;
      }
      if (Array.isArray(value.files)) {
        const nested = normaliseCandidate(value.files, objectType);
        if (nested) return nested;
      }
    }
    return null;
  }, []);

  const fileSource = useMemo(() => {
    if (!video) return null;
    const candidates = [
      [video.hlsUrl, "application/x-mpegURL"],
      [video.dashUrl, "application/dash+xml"],
      [video.streamUrl, video.streamType],
      [video.embedUrl, video.mimeType || video.mimetype],
      [video.src, video.mimeType || video.mimetype],
      [video.downloadUrl, video.downloadType],
      [video.fileUrl],
      [video.fallbackSrc],
      [video.previewSrc],
    ];

    for (const [value, hint] of candidates) {
      const normalised = normaliseCandidate(value, hint);
      if (normalised) return normalised;
    }

    if (Array.isArray(video?.sources)) {
      const normalised = normaliseCandidate(video.sources);
      if (normalised) return normalised;
    }
    if (Array.isArray(video?.formats)) {
      const normalised = normaliseCandidate(video.formats);
      if (normalised) return normalised;
    }
    if (Array.isArray(video?.files)) {
      const normalised = normaliseCandidate(video.files);
      if (normalised) return normalised;
    }

    for (const [key, value] of Object.entries(video || {})) {
      if (!value) continue;
      if (/(src|url)$/i.test(key) || /^(src|url)/i.test(key)) {
        const normalised = normaliseCandidate(value);
        if (normalised) return normalised;
      }
    }

    return null;
  }, [normaliseCandidate, video]);

  const streamSource = fileSource && (isHlsSource(fileSource) || isDashSource(fileSource)) ? fileSource : null;
  const playableFileSource = streamSource ? null : fileSource;

  useEffect(() => {
    setFilePlaybackError(false);
  }, [playableFileSource?.url, streamSource?.url]);

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
    const targetId = typeof vid === "string" ? vid : vid?.id;
    if (!targetId) return;
    navigate(`/watch/${targetId}`);
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

  const handleRecomputeSignals = async () => {
    if (!video?.id || recomputeBusy) return;
    setRecomputeBusy(true);
    setRecomputeMessage("");
    setRecomputeError(null);
    try {
      const result = await recomputeSignalsForVideo(String(video.id), token);
      setRecomputeMessage(
        `Recompute enqueued (job ${result.jobId}, mode: ${result.mode}).`
      );
    } catch (err) {
      console.error("Failed to enqueue recompute job for video", err);
      setRecomputeError("Could not enqueue recompute job for this video.");
    } finally {
      setRecomputeBusy(false);
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
                  {isFile && playableFileSource?.url && !filePlaybackError && (
                    <video
                      ref={videoRef}
                      className='bf-playerVideo'
                      autoPlay
                      controls
                      playsInline
                      key={`${video.id}-${playableFileSource.url}`}
                      onLoadedMetadata={onLoadedMeta}
                      onTimeUpdate={onTimeUpdate}
                      onEnded={onEnded}
                      onError={() => setFilePlaybackError(true)}
                    >
                      <source
                        src={playableFileSource.url}
                        type={playableFileSource.type || undefined}
                      />
                    </video>
                  )}
                  {isFile && (!playableFileSource?.url || filePlaybackError) && (
                    <div className='bf-playerNotFound'>
                      {streamSource ? (
                        <p>
                          This video uses a streaming format ({isHlsSource(streamSource) ? "HLS" : "MPEG-DASH"}). Open it in a compatible player or convert it to MP4/WebM:
                          {" "}
                          <a href={streamSource.url} target='_blank' rel='noreferrer noopener'>
                            {streamSource.url}
                          </a>
                          .
                        </p>
                      ) : (
                        <p>
                          This video format isn’t supported by your browser. Try uploading an MP4/WebM version for widest compatibility.
                        </p>
                      )}
                    </div>
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

                <div className='player-insights'>
                  <section className='player-signals'>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        marginBottom: "0.35rem"
                      }}
                    >
                      <h3 style={{ margin: 0 }}>Signals</h3>
                      {isAdmin && video?.id && (
                        <button
                          type='button'
                          onClick={handleRecomputeSignals}
                          disabled={recomputeBusy}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: 999,
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                            cursor: recomputeBusy ? "default" : "pointer",
                            opacity: recomputeBusy ? 0.7 : 1
                          }}
                        >
                          {recomputeBusy ? "Enqueuing…" : "Recompute signals"}
                        </button>
                      )}
                    </div>

                    {recomputeMessage && (
                      <p className='muted' style={{ marginBottom: "0.35rem" }}>
                        {recomputeMessage}
                      </p>
                    )}
                    {recomputeError && (
                      <p className='error-text' style={{ marginBottom: "0.35rem" }}>
                        {recomputeError}
                      </p>
                    )}

                    {loadingSignals && <p className='muted'>Loading signals…</p>}
                    {!loadingSignals && signalsError && (
                      <p className='error-text'>{signalsError}</p>
                    )}
                    {!loadingSignals && !signalsError && !signalsData && (
                      <p className='muted'>No signals yet for this video.</p>
                    )}
                    {!loadingSignals && signalsData && (
                      <>
                        <div className='signals-score-row'>
                          <span className='signals-score-label'>Signal score</span>
                          <span className='signals-score-pill'>
                            {signalsData.score ?? 0}
                          </span>
                        </div>
                        {signalsData.tagSignals?.length > 0 && (
                          <div className='signals-tags'>
                            <h4>Tag signals</h4>
                            <div className='signals-tag-chips'>
                              {signalsData.tagSignals.map((tag) => (
                                <span key={`${tag.tag}-${tag.created_at}`} className='signal-chip'>
                                  {tag.tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {signalsData.signals?.length > 0 && (
                          <div className='signals-raw'>
                            <h4>Raw signals</h4>
                            <ul>
                              {signalsData.signals.map((sig, idx) => (
                                <li key={`${sig.signal_type || sig.type}-${idx}`}>
                                  <span className='signal-type'>{sig.signal_type || sig.type}</span>
                                  <span className='signal-score'>{sig.score ?? 0}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </section>

                  <section className='player-related'>
                    <h3>Related videos</h3>
                    {loadingRelated && <p className='muted'>Finding related videos…</p>}
                    {!loadingRelated && relatedError && (
                      <p className='error-text'>{relatedError}</p>
                    )}
                    {!loadingRelated &&
                      !relatedError &&
                      (!relatedFromApi || relatedFromApi.length === 0) && (
                        <p className='muted'>No related videos yet.</p>
                      )}
                    {!loadingRelated && relatedFromApi.length > 0 && (
                      <ul className='related-list'>
                        {relatedFromApi.map((item) => (
                          <li
                            key={item.id}
                            className='related-item'
                            onClick={() => playVideoById(item.id)}
                          >
                            <div className='related-main'>
                              <span className='related-title'>{item.title}</span>
                              {item.score != null && (
                                <span className='related-score-pill'>score {item.score}</span>
                              )}
                            </div>
                            {item.tag_overlap_count && (
                              <div className='related-meta'>
                                <span className='muted'>
                                  shared tags: {item.tag_overlap_count}
                                </span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
