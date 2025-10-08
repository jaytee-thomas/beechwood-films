import React, { useEffect, useMemo, useState } from "react";
import useLibraryStore from "../store/useLibraryStore";
import AdminBar from "./AdminBar";
import AddVideoModal from "./AddVideoModal";

const ADMIN_PIN = "2468";
const ADMIN_KEY = "bf_admin_unlocked";

export default function Library() {
  const videos = useLibraryStore((s) => s.videos);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const [search, setSearch] = useState("");
  const [view, setView] = useState("library"); // library | favorites
  const [playing, setPlaying] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_KEY);
      if (saved === "1") setIsAdmin(true);
    } catch {}
  }, []);

  const list = Array.isArray(videos) ? videos : [];
  const filtered = useMemo(() => {
    const base = view === "favorites" ? list.filter((v) => v.favorite) : list;
    return base.filter((v) =>
      (v.title || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [list, view, search]);

  function handleUnlock() {
    const input = window.prompt("Enter Admin PIN:");
    if (input === ADMIN_PIN) {
      setIsAdmin(true);
      try {
        localStorage.setItem(ADMIN_KEY, "1");
      } catch {}
    } else if (input !== null) {
      alert("Incorrect PIN.");
    }
  }

  function handleLock() {
    setIsAdmin(false);
    try {
      localStorage.removeItem(ADMIN_KEY);
    } catch {}
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🎬 Beechwood Films</div>

        <div style={styles.searchWrap}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search your library...'
            style={styles.search}
          />
        </div>

        <div style={styles.actions}>
          <AdminBar
            isAdmin={isAdmin}
            onAdd={() => setShowAdd(true)}
            onUnlock={handleUnlock}
            onLock={handleLock}
          />
        </div>
      </header>

      {/* Nav */}
      <nav style={styles.nav}>
        <button
          style={{
            ...styles.navBtn,
            ...(view === "library" ? styles.navBtnActive : null),
          }}
          onClick={() => setView("library")}
        >
          Library
        </button>
        <button
          style={{
            ...styles.navBtn,
            ...(view === "favorites" ? styles.navBtnActive : null),
          }}
          onClick={() => setView("favorites")}
        >
          Favorites
        </button>
      </nav>

      {/* Grid */}
      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            {view === "favorites"
              ? "No favorites yet. Tap ♡ to add."
              : "No films found."}
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              style={styles.card}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1.0)")
              }
            >
              <div style={styles.thumbWrap} onClick={() => setPlaying(v)}>
                <img
                  src={
                    v.thumbnail ||
                    "https://via.placeholder.com/800x450?text=No+Thumbnail"
                  }
                  alt={v.title || "Untitled"}
                  style={styles.thumb}
                />
                {v.duration ? (
                  <span style={styles.badge}>{v.duration}</span>
                ) : null}
              </div>

              <div style={styles.cardBody}>
                <div style={styles.titleRow}>
                  <div style={styles.cardTitle}>{v.title || "Untitled"}</div>
                  <button
                    style={{
                      ...styles.favBtn,
                      ...(v.favorite ? styles.favBtnActive : null),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(v.id);
                    }}
                    title={
                      v.favorite ? "Remove from Favorites" : "Add to Favorites"
                    }
                  >
                    {v.favorite ? "♥" : "♡"}
                  </button>
                </div>

                {Array.isArray(v.tags) && v.tags.length > 0 ? (
                  <div style={styles.meta}>#{v.tags.join(" #")}</div>
                ) : null}

                <button style={styles.watchBtn} onClick={() => setPlaying(v)}>
                  ▶︎ Watch
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Player Overlay */}
      {playing && (
        <div style={styles.overlay} onClick={() => setPlaying(null)}>
          <div style={styles.player} onClick={(e) => e.stopPropagation()}>
            <video
              key={playing.src}
              src={playing.src}
              style={styles.video}
              controls
              autoPlay
              playsInline
              onError={() =>
                alert("Unable to play this video. Check the source URL.")
              }
            />
            <div style={styles.playerBar}>
              <div>{playing.title || "Untitled"}</div>
              <button style={styles.close} onClick={() => setPlaying(null)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && isAdmin && (
        <AddVideoModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "#0b0b0f",
    minHeight: "100vh",
    color: "#fff",
    padding: 16,
  },

  header: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  logo: { color: "#f3c969", fontWeight: "bold", fontSize: 22 },
  searchWrap: { display: "flex", justifyContent: "center" },
  search: {
    width: "100%",
    maxWidth: 420,
    background: "#121218",
    color: "#fff",
    border: "1px solid #22232b",
    borderRadius: 8,
    padding: "10px 12px",
  },
  actions: { display: "flex", justifyContent: "flex-end" },

  nav: { display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 },
  navBtn: {
    border: "1px solid #22232b",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: "bold",
    background: "#121218",
    color: "#fff",
    cursor: "pointer",
  },
  navBtnActive: {
    borderColor: "#f3c969",
    background: "#f3c969",
    color: "#0b0b0f",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  empty: { textAlign: "center", color: "#9aa0a6", gridColumn: "1 / -1" },

  card: {
    border: "1px solid #22232b",
    borderRadius: 12,
    background: "#121218",
    overflow: "hidden",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },
  thumbWrap: {
    position: "relative",
    aspectRatio: "16/9",
    cursor: "pointer",
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s ease",
  },
  badge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    background: "rgba(0,0,0,0.7)",
    padding: "4px 8px",
    borderRadius: 8,
    fontSize: 12,
  },

  cardBody: { padding: 12 },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { fontWeight: 700, fontSize: 16 },
  favBtn: {
    border: "1px solid #22232b",
    background: "#121218",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    lineHeight: 1,
    minWidth: 38,
  },
  favBtnActive: {
    border: "1px solid #f3c969",
    color: "#f3c969",
    background: "#111015",
  },
  meta: { color: "#9aa0a6", fontSize: 12, marginBottom: 10 },
  watchBtn: {
    border: "1px solid #f3c969",
    background: "#f3c969",
    color: "#0b0b0f",
    borderRadius: 8,
    fontWeight: 800,
    padding: "8px 12px",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  player: {
    width: "100%",
    maxWidth: 980,
    background: "#0b0b0f",
    border: "1px solid #22232b",
    borderRadius: 12,
    overflow: "hidden",
  },
  video: { width: "100%", height: "auto", background: "#000" },
  playerBar: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderTop: "1px solid #22232b",
  },
  close: {
    border: "1px solid #f3c969",
    background: "transparent",
    color: "#f3c969",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
  },
};
