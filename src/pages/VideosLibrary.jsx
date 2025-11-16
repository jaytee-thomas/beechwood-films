import React, { useEffect, useMemo, useState } from "react";
import useLibraryStore from "../store/useLibraryStore.js";

function VideosLibrary() {
  const {
    videos,
    videosReady,
    loadingVideos,
    videosError,
    refreshVideos
  } = useLibraryStore();
  const [sortMode, setSortMode] = useState("smart");

  useEffect(() => {
    if (!videosReady && !loadingVideos) {
      refreshVideos();
    }
  }, [videosReady, loadingVideos, refreshVideos]);

  const sortedVideos = useMemo(() => {
    if (!Array.isArray(videos)) return [];
    const copy = [...videos];
    if (sortMode === "recent") {
      return copy.sort(
        (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
      );
    }
    return copy.sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
  }, [videos, sortMode]);

  return (
    <main className="library-page">
      <header className="library-header">
        <h1 className="library-title">Videos Library</h1>
        <p className="library-subtitle">
          All the long-form stories and behind-the-scenes features.
        </p>
        <div className="videos-sort-toggle">
          <span>Sort:</span>
          <button
            type="button"
            className={sortMode === "smart" ? "active" : ""}
            onClick={() => setSortMode("smart")}
          >
            Smart
          </button>
          <button
            type="button"
            className={sortMode === "recent" ? "active" : ""}
            onClick={() => setSortMode("recent")}
          >
            Recent
          </button>
        </div>
      </header>

      {loadingVideos && !videosReady && (
        <p className="library-status">Loading videos…</p>
      )}

      {videosError && (
        <p className="library-status error">
          Error loading videos: {videosError}
        </p>
      )}

      {!loadingVideos && videosReady && sortedVideos.length === 0 && (
        <p className="library-status">No videos are published yet.</p>
      )}

      {!loadingVideos && sortedVideos.length > 0 && (
        <section className="videos-grid">
          {sortedVideos.map((video) => (
            <article key={video.id} className="video-card">
              <div className="video-thumb">
                {video.src ? (
                  <iframe
                    title={video.title}
                    src={video.src}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="video-thumb-placeholder">No preview</div>
                )}
              </div>
              <h2 className="video-title">{video.title}</h2>
              {video.tags && video.tags.length > 0 && (
                <p className="video-tags">{video.tags.join(" • ")}</p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default VideosLibrary;
// deploy marker – safe no-op change
// force vercel rebuild Thu Nov 13 21:38:04 CST 2025
