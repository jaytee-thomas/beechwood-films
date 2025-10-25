import React, { useEffect, useRef, useState } from "react";
import { Share2, Heart, Trash2, Play } from "lucide-react";

function noop() {}

export default function ReelsCard({
  video = {},
  onPlay = noop,
  onToggleFavorite = noop,
  onDelete = noop,
  onShare = noop,
  isFavorite = false,
  showDelete = false,
  stats = null,
}) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewRef = useRef(null);
  const previewTimer = useRef(null);

  const {
    title = "Untitled Reel",
    poster,
    duration,
    creator,
  } = video;
  const previewSrc = video.previewSrc || video.hoverSrc || video.streamPreview || video.src;
  const canPreview = Boolean(previewSrc);

  useEffect(() => {
    if (!isPreviewing || !previewRef.current) return undefined;
    const player = previewRef.current;
    player.currentTime = 0;
    const start = async () => {
      try {
        await player.play();
      } catch {
        setIsPreviewing(false);
      }
    };
    start();
    previewTimer.current = setTimeout(() => {
      player.pause();
      setIsPreviewing(false);
    }, 7000);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      player.pause();
      player.currentTime = 0;
    };
  }, [isPreviewing]);

  const startPreview = () => {
    if (!canPreview) return;
    setIsPreviewing(true);
  };

  const stopPreview = () => {
    if (!canPreview) return;
    setIsPreviewing(false);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.currentTime = 0;
    }
  };

  const handlePlay = () => {
    stopPreview();
    onPlay(video);
  };

  return (
    <article className='reel-card' onClick={handlePlay}>
      <div
        className='reel-card__media'
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        onFocus={startPreview}
        onBlur={stopPreview}
      >
        {isPreviewing && canPreview ? (
          <video
            ref={previewRef}
            className='reel-card__preview'
            src={previewSrc}
            muted
            loop
            playsInline
            preload='metadata'
          />
        ) : poster ? (
          <img src={poster} alt={title} loading='lazy' />
        ) : (
          <div className='reel-card__fallback'>No Poster</div>
        )}
        <button
          type='button'
          className='reel-card__play'
          aria-label={`Play ${title}`}
        >
          <Play size={18} strokeWidth={2.4} />
        </button>
        {showDelete && (
          <button
            type='button'
            className='reel-card__delete'
            onClick={(event) => {
              event.stopPropagation();
              onDelete(video);
            }}
            aria-label={`Delete ${title}`}
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          type='button'
          className={`reel-card__fav ${isFavorite ? "is-on" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(video);
          }}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>
      <footer className='reel-card__footer'>
        <div className='reel-card__meta'>
          <span className='reel-card__duration'>{duration || "--"}</span>
          <button
            type='button'
            className='reel-card__share'
            onClick={(event) => {
              event.stopPropagation();
              onShare(video);
            }}
            aria-label={`Share ${title}`}
          >
            <Share2 size={15} strokeWidth={1.6} />
          </button>
        </div>
        <h3 className='reel-card__title'>{title}</h3>
        <p className='reel-card__creator'>{creator || "Beechwood Reels"}</p>
        {stats && (stats.views || stats.age) && (
          <div className='reel-card__stats'>
            {stats.views && <span>{stats.views}</span>}
            {stats.age && <span>{stats.age}</span>}
          </div>
        )}
      </footer>
    </article>
  );
}
