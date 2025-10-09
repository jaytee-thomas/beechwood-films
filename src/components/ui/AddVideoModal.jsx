import React, { useState, useEffect, useMemo } from "react";

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeVideoUrl(url) {
  if (!isHttpUrl(url)) return false;
  const lower = url.toLowerCase();
  const fileExt = [".mp4", ".mov", ".webm", ".m3u8"].some((ext) =>
    lower.includes(ext)
  );
  const isYouTube =
    lower.includes("youtube.com/watch") || lower.includes("youtu.be/");
  const isVimeo = lower.includes("vimeo.com/");
  return fileExt || isYouTube || isVimeo;
}

export default function AddVideoModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [previewOk, setPreviewOk] = useState(false);
  const [touched, setTouched] = useState({
    title: false,
    thumbnail: false,
    videoUrl: false,
  });

  useEffect(() => {
    if (open) {
      setTitle("");
      setThumbnail("");
      setDuration("");
      setVideoUrl("");
      setPreviewOk(false);
      setTouched({ title: false, thumbnail: false, videoUrl: false });
    }
  }, [open]);

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = "Title is required.";
    if (thumbnail.trim() && !isHttpUrl(thumbnail.trim())) {
      e.thumbnail = "Thumbnail must be an http/https URL.";
    }
    if (!videoUrl.trim()) {
      e.videoUrl = "Video URL is required.";
    } else if (!looksLikeVideoUrl(videoUrl.trim())) {
      e.videoUrl =
        "Enter a direct video (.mp4/.mov/.webm/.m3u8) or a YouTube/Vimeo URL.";
    }
    return e;
  }, [title, thumbnail, videoUrl]);

  const hasErrors = Object.keys(errors).length > 0;

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (hasErrors) return;
    onSave({
      title: title.trim(),
      thumbnail: thumbnail.trim(),
      duration: duration.trim(),
      videoUrl: videoUrl.trim(),
    });
  }

  return (
    <div
      className='bf-modalOverlay'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
    >
      <div className='bf-modal' onClick={(e) => e.stopPropagation()}>
        <div className='bf-modalHeader'>
          <h3>Add Video</h3>
          <button
            className='bf-modalClose'
            onClick={onClose}
            aria-label='Close'
          >
            ✕
          </button>
        </div>

        <form className='bf-form' onSubmit={handleSubmit} noValidate>
          <label className='bf-label'>
            Title
            <input
              className='bf-input'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              placeholder='My Documentary'
              aria-invalid={!!errors.title}
            />
            {touched.title && errors.title && (
              <div className='bf-error'>{errors.title}</div>
            )}
          </label>

          <label className='bf-label'>
            Thumbnail URL
            <input
              className='bf-input'
              value={thumbnail}
              onChange={(e) => {
                setThumbnail(e.target.value);
                setPreviewOk(false);
              }}
              onBlur={() => setTouched((t) => ({ ...t, thumbnail: true }))}
              placeholder='https://…'
              aria-invalid={!!errors.thumbnail}
            />
            {thumbnail ? (
              <div className='bf-thumbPreviewWrap'>
                <img
                  className={`bf-thumbPreview ${previewOk ? "is-ok" : ""}`}
                  src={thumbnail}
                  alt='Thumbnail preview'
                  onLoad={() => setPreviewOk(true)}
                  onError={() => setPreviewOk(false)}
                />
              </div>
            ) : (
              <div className='bf-thumbPreviewWrap'>
                <div className='bf-thumbPreview bf-thumbPreview--placeholder'>
                  Paste a thumbnail URL to preview
                </div>
              </div>
            )}
            {touched.thumbnail && errors.thumbnail && (
              <div className='bf-error'>{errors.thumbnail}</div>
            )}
          </label>

          <div className='bf-help'>
            Recommended aspect ratio ~16:9 (we’ll cover-fit).
          </div>

          <label className='bf-label'>
            Duration
            <input
              className='bf-input'
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder='12:34'
            />
          </label>

          <label className='bf-label'>
            Video URL
            <input
              className='bf-input'
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, videoUrl: true }))}
              placeholder='https://… (mp4/mov/webm/m3u8 or YouTube/Vimeo)'
              aria-invalid={!!errors.videoUrl}
            />
            {touched.videoUrl && errors.videoUrl && (
              <div className='bf-error'>{errors.videoUrl}</div>
            )}
          </label>

          <div className='bf-modalActions'>
            <button type='button' className='bf-btnSecondary' onClick={onClose}>
              Cancel
            </button>
            <button
              type='submit'
              className='bf-btnPrimary'
              disabled={hasErrors}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
