import React, { useEffect } from "react";
import useLibraryStore from "../store/useLibraryStore.js";

function VideosLibrary() {
  const {
    videos,
    videosReady,
    loadingVideos,
    videosError,
    refreshVideos
  } = useLibraryStore();

  useEffect(() => {
    if (!videosReady && !loadingVideos) {
      refreshVideos();
    }
  }, [videosReady, loadingVideos, refreshVideos]);

  return (
    <main className="library-page">
      <header className="library-header">
        <h1 className="library-title">Videos Library</h1>
        <p className="library-subtitle">
          All the long-form stories and behind-the-scenes features.
        </p>
      </header>

      {loadingVideos && !videosReady && (
        <p className="library-status">Loading videos…</p>
      )}

      {videosError && (
        <p className="library-status error">
          Error loading videos: {videosError}
        </p>
      )}

      {!loadingVideos && videosReady && videos.length === 0 && (
        <p className="library-status">No videos are published yet.</p>
      )}

      {!loadingVideos && videos.length > 0 && (
        <section className="videos-grid">
          {videos.map((video) => (
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
