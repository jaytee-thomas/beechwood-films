import React, { useMemo, useState } from "react";
import useLibraryStore from "../store/useLibraryStore";

export default function Favorites() {
  const videos = useLibraryStore((s) => s.videos);
  const progress = useLibraryStore((s) => s.progress);
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState(null);

  const list = Array.isArray(videos) ? videos : [];

  const filtered = useMemo(() => {
    return list
      .filter((v) => v.favorite)
      .filter((v) =>
        (v.title || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [list, search]);

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
                          <span className='bf-pillResume' title='Has progress'>
                            ► Resume
                          </span>
                        )}
                        <span
                          className='bf-favBtn is-active'
                          aria-label='Favorite'
                        >
                          ♥
                        </span>
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
