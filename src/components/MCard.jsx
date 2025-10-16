import React, { useEffect, useRef, useState } from "react";
import { Share2, Heart, Trash2 } from "lucide-react";

function noop() {}

export default function MCard({
  video = {},
  onPlay = noop,
  onToggleFavorite = noop,
  onDelete = noop,
  onShare = noop,
  isFavorite = false,
  isPlaceholder = false,
  variant = "doc",
  stats = null,
  showFavorite = true,
  showDelete = false,
}) {
  const { title = "Untitled", thumbnail, date, duration } = video;
  const baseVariant =
    variant === "short"
      ? "m-card--short"
      : variant === "about"
      ? "m-card--about"
      : "m-card--doc";
  const hasStats = Boolean(stats && (stats.views || stats.age));
  const cardVariant = `${baseVariant}${hasStats ? " m-card--has-stats" : ""}`;
  const showShare = hasStats && !isPlaceholder;

  const previewSrc = video.previewSrc || video.src;
  const canPreview = Boolean(previewSrc) && !isPlaceholder;
  const [isPreviewing, setIsPreviewing] = useState(false);
  const videoRef = useRef(null);
  const previewTimer = useRef(null);

  useEffect(() => {
    if (!isPreviewing || !videoRef.current) return undefined;
    const player = videoRef.current;
    player.currentTime = 0;
    const startPlayback = async () => {
      try {
        await player.play();
      } catch {
        setIsPreviewing(false);
      }
    };
    startPlayback();
    previewTimer.current = setTimeout(() => {
      player.pause();
      setIsPreviewing(false);
    }, 5000);
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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handlePlay = () => {
    stopPreview();
    if (!isPlaceholder) onPlay(video);
  };

  return (
    <article
      className={`m-card ${cardVariant}${isPlaceholder ? " is-placeholder" : ""}`}
      onClick={handlePlay}
    >
      <div
        className='m-card__media'
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
      >
        {isPreviewing && canPreview ? (
          <video
            ref={videoRef}
            className='m-card__video'
            src={previewSrc}
            muted
            playsInline
          />
        ) : thumbnail ? (
          <img src={thumbnail} alt={title} loading='lazy' />
        ) : (
          <div className='m-card__fallback'>Thumbnail Unavailable</div>
        )}
        {showDelete && !isPlaceholder && (
          <button
            type='button'
            className='m-card__delete'
            onClick={(event) => {
              event.stopPropagation();
              onDelete(video);
            }}
            aria-label={`Delete ${title}`}
          >
            <Trash2 size={16} />
          </button>
        )}
        {showFavorite && !isPlaceholder && (
          <button
            type='button'
            className={`m-card__fav ${isFavorite ? "is-on" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(video);
            }}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={18}
              strokeWidth={1.8}
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>
      <footer className='m-card__footer'>
        <div className='m-card__titleRow'>
          <h3 className='m-card__title'>{title}</h3>
          {showShare && (
            <button
              type='button'
              className='m-card__share'
              onClick={(event) => {
                event.stopPropagation();
                onShare(video);
              }}
              aria-label={`Share ${title}`}
            >
              <Share2 size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
        {hasStats ? (
          <div className='m-card__stats'>
            {stats?.views && <span className='m-card__views'>{stats.views}</span>}
            {stats?.age && <span className='m-card__age'>{stats.age}</span>}
          </div>
        ) : (
          !isPlaceholder && (
            <div className='m-card__meta'>
              <span>{date || "--"}</span>
              <span>{duration || "--"}</span>
            </div>
          )
        )}
      </footer>
    </article>
  );
}
