import React, { useEffect, useMemo, useRef, useState } from "react";
import useLibraryStore from "../store/useLibraryStore";
import AdminBar from "./AdminBar";
import AddVideoModal from "./AddVideoModal";
import AdminUnlockModal from "./AdminUnlockModal";
import ConfirmModal from "./ConfirmModal";
import ChangePinModal from "./ChangePinModal";
import ForgotPinModal from "./ForgotPinModal";

const DEFAULT_ADMIN_PIN = "2468";
const ADMIN_KEY = "bf_admin_unlocked";
const ADMIN_PIN_KEY = "bf_admin_pin";
const MASTER_CODE =
  import.meta?.env?.VITE_MASTER_CODE || "BEECHWOOD-RESET-2468";

export default function Library() {
  // Store
  const videos = useLibraryStore((s) => s.videos);
  const progress = useLibraryStore((s) => s.progress);
  const setProgress = useLibraryStore((s) => s.setProgress);
  const clearProgress = useLibraryStore((s) => s.clearProgress);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  // UI state
  const [search, setSearch] = useState("");
  const [view, setView] = useState("library"); // "library" | "favorites"
  const [playing, setPlaying] = useState(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Refs
  const lastSavedSecondRef = useRef(-1);
  const videoRef = useRef(null);

  // Bootstrap admin unlocked flag
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_KEY);
      if (saved === "1") setIsAdmin(true);
    } catch {}
  }, []);

  const list = Array.isArray(videos) ? videos : [];

  // --- Admin PIN helpers ---
  function getEffectivePin() {
    try {
      return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
    } catch {
      return DEFAULT_ADMIN_PIN;
    }
  }
  function setEffectivePin(newPin) {
    try {
      localStorage.setItem(ADMIN_PIN_KEY, newPin);
    } catch {}
  }

  // --- Continue Watching (ordered by last updated) ---
  const continueList = useMemo(() => {
    return list
      .map((v) => ({ v, p: progress?.[v.id] }))
      .filter((x) => x.p && x.p.t > 0)
      .sort((a, b) => (b.p.updatedAt || 0) - (a.p.updatedAt || 0))
      .map((x) => x.v);
  }, [list, progress]);

  // --- Filter by view + search ---
  const filtered = useMemo(() => {
    const base = view === "favorites" ? list.filter((v) => v.favorite) : list;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((v) => (v.title || "").toLowerCase().includes(q));
  }, [list, view, search]);

  // --- Admin flows ---
  function requestUnlock() {
    setShowUnlock(true);
  }
  async function verifyPinAndUnlock(pin) {
    const ok = pin === getEffectivePin();
    if (ok) {
      setIsAdmin(true);
      try {
        localStorage.setItem(ADMIN_KEY, "1");
      } catch {}
    }
    return ok;
  }
  function requestLock() {
    setShowLockConfirm(true);
  }
  function doLock() {
    setIsAdmin(false);
    try {
      localStorage.removeItem(ADMIN_KEY);
    } catch {}
    setShowLockConfirm(false);
  }
  function requestChangePin() {
    setShowChangePin(true);
  }
  function applyChangePin(newPin) {
    setEffectivePin(newPin);
  }
  function requestForgotPin() {
    setShowForgotPin(true);
  }
  function resetPinFromMaster(newPin) {
    setEffectivePin(newPin);
    setIsAdmin(true);
    try {
      localStorage.setItem(ADMIN_KEY, "1");
    } catch {}
  }

  // --- Player handlers ---
  function handleLoadedMetadata(e) {
    const el = e.currentTarget;
    if (!playing || !el) return;
    const saved = progress?.[playing.id]?.t || 0;
    if (saved > 0 && Number.isFinite(saved)) {
      try {
        el.currentTime = saved;
      } catch {}
    }
  }
  function handleTimeUpdate(e) {
    const el = e.currentTarget;
    if (!playing || !el) return;
    const s = Math.floor(el.currentTime || 0);
    // Save every 5 seconds
    if (s >= 0 && s !== lastSavedSecondRef.current && s % 5 === 0) {
      lastSavedSecondRef.current = s;
      setProgress(playing.id, s);
    }
  }
  function handleEnded() {
    if (playing) clearProgress(playing.id);
  }

  function resumeVideo(v) {
    setPlaying(v);
  }

  return (
    <div className='bf-page'>
      <div className='bf-container'>
        {/* HEADER (YouTube-lite: logo | centered search | right actions) */}
        <header className='bf-header'>
          <div className='bf-logo'>🎬 Beechwood Films</div>

          <div className='bf-searchWrap'>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search'
              className='bf-search'
            />
            <button className='bf-searchBtn' aria-label='Search'>
              🔍
            </button>
          </div>

          <div className='bf-actions'>
            <div className='bf-viewToggle'>
              <button
                className={`bf-navBtn ${view === "library" ? "is-active" : ""}`}
                onClick={() => setView("library")}
              >
                Library
              </button>
              <button
                className={`bf-navBtn ${
                  view === "favorites" ? "is-active" : ""
                }`}
                onClick={() => setView("favorites")}
              >
                Favorites
              </button>
            </div>

            <AdminBar
              isAdmin={isAdmin}
              onAdd={() => setShowAdd(true)}
              onUnlock={requestUnlock}
              onLock={requestLock}
              onChangePin={requestChangePin}
            />
          </div>
        </header>

        {/* CONTINUE WATCHING (horizontal shelf) */}
        {view === "library" && continueList.length > 0 && (
          <section className='bf-cont'>
            <div className='bf-contHeader'>
              <div className='bf-hl'>⏸ Continue Watching</div>
            </div>

            <div className='favs-scroll'>
              {continueList.map((v) => (
                <div key={`cw-${v.id}`} className='bf-contCard'>
                  <button
                    className='bf-cardClear'
                    title='Remove from Continue Watching'
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProgress(v.id);
                    }}
                  >
                    ✕
                  </button>

                  <div
                    className='bf-favThumbWrap'
                    onClick={() => resumeVideo(v)}
                  >
                    <img
                      src={
                        v.thumbnail ||
                        "https://via.placeholder.com/640x360?text=No+Thumbnail"
                      }
                      alt={v.title || "Untitled"}
                      className='bf-favThumb'
                    />
                  </div>
                  <div className='bf-favMeta'>
                    <div className='bf-favTitle' title={v.title}>
                      {v.title || "Untitled"}
                    </div>
                    <button
                      className='bf-btn bf-btn--ghost'
                      onClick={(e) => {
                        e.stopPropagation();
                        resumeVideo(v);
                      }}
                    >
                      ► Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LIBRARY GRID */}
        <div id='library-grid' className='bf-grid'>
          {filtered.length === 0 ? (
            <div className='bf-empty'>
              {view === "favorites"
                ? "No favorites yet. Tap ♡ to add."
                : "No films found."}
            </div>
          ) : (
            filtered.map((v) => {
              const hasProgress = !!progress?.[v.id]?.t;
              return (
                <div key={v.id} className='bf-card'>
                  <div className='bf-thumbWrap' onClick={() => setPlaying(v)}>
                    <img
                      src={
                        v.thumbnail ||
                        "https://via.placeholder.com/800x450?text=No+Thumbnail"
                      }
                      alt={v.title || "Untitled"}
                      className='bf-thumb'
                    />
                    {v.duration ? (
                      <span className='bf-badge'>{v.duration}</span>
                    ) : null}
                  </div>

                  <div className='bf-cardBody'>
                    <div className='bf-titleRow'>
                      <div className='bf-cardTitle'>
                        {v.title || "Untitled"}
                      </div>
                      <div className='bf-titleActions'>
                        {hasProgress && (
                          <button
                            className='bf-pillResume'
                            onClick={(e) => {
                              e.stopPropagation();
                              resumeVideo(v);
                            }}
                          >
                            ► Resume
                          </button>
                        )}
                        <button
                          className={`bf-favBtn ${
                            v.favorite ? "is-active" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(v.id);
                          }}
                          aria-label='Toggle favorite'
                          title={
                            v.favorite
                              ? "Remove from Favorites"
                              : "Add to Favorites"
                          }
                        >
                          {v.favorite ? "♥" : "♡"}
                        </button>
                      </div>
                    </div>

                    {Array.isArray(v.tags) && v.tags.length > 0 ? (
                      <div className='bf-meta'>#{v.tags.join(" #")}</div>
                    ) : null}

                    <button
                      className='bf-watchBtn'
                      onClick={() => setPlaying(v)}
                    >
                      ▶︎ Watch
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PLAYER OVERLAY */}
      {playing && (
        <div className='bf-overlay' onClick={() => setPlaying(null)}>
          <div className='bf-player' onClick={(e) => e.stopPropagation()}>
            <video
              ref={videoRef}
              key={playing.src}
              src={playing.src}
              className='bf-video'
              controls
              autoPlay
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={() =>
                alert("Unable to play this video. Check the source URL.")
              }
            />
            <div className='bf-playerBar'>
              <div>{playing.title || "Untitled"}</div>
              <button className='bf-close' onClick={() => setPlaying(null)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAdd && isAdmin && (
        <AddVideoModal onClose={() => setShowAdd(false)} />
      )}

      {showUnlock && (
        <AdminUnlockModal
          onClose={() => setShowUnlock(false)}
          onSubmit={verifyPinAndUnlock}
          onForgot={() => {
            setShowUnlock(false);
            setShowForgotPin(true);
          }}
        />
      )}

      {showLockConfirm && (
        <ConfirmModal
          title='Lock Admin?'
          message='Hide admin controls until the PIN is re-entered.'
          confirmText='Lock'
          cancelText='Cancel'
          onConfirm={doLock}
          onCancel={() => setShowLockConfirm(false)}
        />
      )}

      {showChangePin && (
        <ChangePinModal
          onClose={() => setShowChangePin(false)}
          getCurrentPin={getEffectivePin}
          onChangePin={applyChangePin}
        />
      )}

      {showForgotPin && (
        <ForgotPinModal
          onClose={() => setShowForgotPin(false)}
          masterCode={MASTER_CODE}
          onResetPin={resetPinFromMaster}
        />
      )}
    </div>
  );
}
