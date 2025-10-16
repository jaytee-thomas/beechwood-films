import React, { useMemo, useState } from "react";
import useLibraryStore from "../store/useLibraryStore";
import MCard from "./MCard.jsx";

export default function Favorites() {
  const {
    videos,
    progress,
    durations,
    favorites,
    toggleFavorite,
  } = useLibraryStore((state) => ({
    videos: state.videos,
    progress: state.progress,
    durations: state.durations,
    favorites: state.favorites,
    toggleFavorite: state.toggleFavorite,
  }));
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState(null);

  const favoriteSet = useMemo(
    () => new Set(Array.isArray(favorites) ? favorites : []),
    [favorites]
  );

  const favoriteVideos = useMemo(
    () => (Array.isArray(videos) ? videos : []).filter((video) => favoriteSet.has(video.id)),
    [videos, favoriteSet]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return favoriteVideos;
    return favoriteVideos.filter((video) =>
      (video.title || "").toLowerCase().includes(term)
    );
  }, [favoriteVideos, search]);

  const progressLabelFor = (video) => {
    const watched = progress?.[video.id];
    const durationSeconds = durations?.[video.id];
    if (!watched || !durationSeconds || durationSeconds <= 0) return null;
    const percent = Math.max(
      0,
      Math.min(100, Math.round((watched / durationSeconds) * 100))
    );
    return `${percent}% watched`;
  };

  return (
    <div className='bf-page'>
      <div className='bf-container'>
        {/* Header */}
        <header className='bf-header'>
          <div className='bf-logo'>♥ Favorites</div>

          <div className='bf-searchWrap'>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search favorites…'
              className='bf-search'
            />
          </div>

          <div className='bf-actions'>
            <a className='bf-link' href='/'>
              ← Back to Library
            </a>
          </div>
        </header>

        {/* Grid */}
        <div className='bf-grid'>
          {filtered.length === 0 ? (
            <div className='bf-empty'>
              No favorites yet. Tap ♡ on any film to add.
            </div>
          ) : (
            filtered.map((video) => {
              const progressLabel = progressLabelFor(video);
              const baseStats = progressLabel
                ? { views: progressLabel, age: video.duration || "" }
                : video.duration
                ? { views: video.duration, age: "" }
                : null;

              return (
                <MCard
                  key={video.id}
                  video={video}
                  variant='doc'
                  stats={baseStats}
                  isFavorite
                  onPlay={(selected) => setPlaying(selected)}
                  onToggleFavorite={(selected) => toggleFavorite(selected.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Minimal overlay (re-uses existing classes) */}
      {playing && (
        <div className='bf-overlay' onClick={() => setPlaying(null)}>
          <div className='bf-player' onClick={(e) => e.stopPropagation()}>
            <video
              key={playing.src}
              src={playing.src}
              className='bf-video'
              controls
              autoPlay
              playsInline
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
    </div>
  );
}
