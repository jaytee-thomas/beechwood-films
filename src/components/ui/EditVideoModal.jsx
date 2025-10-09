import React, { useEffect, useMemo, useState } from "react";

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const path = u.pathname.split("/");
      const idx = path.findIndex((p) => p === "shorts" || p === "embed");
      if (idx >= 0 && path[idx + 1]) return path[idx + 1];
    }
  } catch {}
  return null;
}

function parseVimeoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts.pop();
      if (id && /^\d+$/.test(id)) return id;
    }
  } catch {}
  return null;
}

function detectProvider(url) {
  if (!isHttpUrl(url))
    return {
      provider: null,
      providerId: null,
      embedUrl: null,
      defaultThumb: null,
      kind: "invalid",
    };

  const lower = url.toLowerCase();

  const yt = parseYouTubeId(url);
  if (yt) {
    return {
      provider: "youtube",
      providerId: yt,
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      defaultThumb: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      kind: "stream",
    };
  }

  const vm = parseVimeoId(url);
  if (vm) {
    return {
      provider: "vimeo",
      providerId: vm,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
      defaultThumb: null,
      kind: "stream",
    };
  }

  const isFile = [".mp4", ".mov", ".webm", ".m3u8"].some((ext) =>
    lower.includes(ext)
  );
  if (isFile) {
    return {
      provider: "file",
      providerId: null,
      embedUrl: url,
      defaultThumb: null,
      kind: "file",
    };
  }

  return {
    provider: null,
    providerId: null,
    embedUrl: null,
    defaultThumb: null,
    kind: "unknown",
  };
}

function looksLikeVideoUrl(url) {
  const info = detectProvider(url);
  return (
    info.provider === "youtube" ||
    info.provider === "vimeo" ||
    info.provider === "file"
  );
}

export default function EditVideoModal({ open, onClose, onSave, video }) {
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
    if (open && video) {
      setTitle(video.title || "");
      setThumbnail(video.thumbnail || "");
      setDuration(video.duration || "");
      setVideoUrl(video.videoUrl || "");
      setPreviewOk(false);
      setTouched({ title: false, thumbnail: false, videoUrl: false });
    }
  }, [open, video]);

  const info = useMemo(() => detectProvider(videoUrl.trim()), [videoUrl]);

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

  if (!open || !video) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (hasErrors) return;

    const finalThumb = thumbnail.trim() || info.defaultThumb || "";

    onSave({
      id: video.id,
      updates: {
        title: title.trim(),
        thumbnail: finalThumb,
        duration: duration.trim(),
        videoUrl: videoUrl.trim(),
        provider: info.provider,
        providerId: info.providerId,
        embedUrl: info.embedUrl,
      },
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
          <h3>Edit Video</h3>
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
              aria-invalid={!!errors.thumbnail}
            />
          </label>

          {/* Live Thumbnail Preview */}
          <div className='bf-thumbPreviewWrap'>
            {thumbnail ? (
              <img
                className={`bf-thumbPreview ${previewOk ? "is-ok" : ""}`}
                src={thumbnail}
                alt='Thumbnail preview'
                onLoad={() => setPreviewOk(true)}
                onError={() => setPreviewOk(false)}
              />
            ) : (
              <div className='bf-thumbPreview bf-thumbPreview--placeholder'>
                {info.provider === "youtube"
                  ? "YouTube detected — we’ll auto-use the official thumbnail if you leave this blank."
                  : "Paste a thumbnail URL to preview"}
              </div>
            )}
          </div>

          {touched.thumbnail && errors.thumbnail && (
            <div className='bf-error'>{errors.thumbnail}</div>
          )}

          <div className='bf-help'>
            Recommended aspect ratio ~16:9 (we’ll cover-fit).
          </div>

          <label className='bf-label'>
            Duration
            <input
              className='bf-input'
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
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
            {/* Provider badge */}
            {videoUrl.trim() && (
              <div className='bf-providerBadge'>
                {info.provider === "youtube" && (
                  <>
                    Detected: <b>YouTube</b> (ID: {info.providerId})
                  </>
                )}
                {info.provider === "vimeo" && (
                  <>
                    Detected: <b>Vimeo</b> (ID: {info.providerId})
                  </>
                )}
                {info.provider === "file" && (
                  <>
                    Detected: <b>Direct File</b>
                  </>
                )}
                {info.provider === null && (
                  <>
                    Provider: <b>Unknown</b>
                  </>
                )}
              </div>
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
