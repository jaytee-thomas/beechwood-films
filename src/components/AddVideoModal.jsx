import React, { useState, useEffect, useMemo } from "react";

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseYouTubeId(url) {
  // Supports: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, with extra params
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      // Shorts or embed patterns
      const path = u.pathname.split("/");
      const idx = path.findIndex((p) => p === "shorts" || p === "embed");
      if (idx >= 0 && path[idx + 1]) return path[idx + 1];
    }
  } catch {}
  return null;
}

function parseVimeoId(url) {
  // Basic: https://vimeo.com/12345678 or /video/12345678
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
      defaultThumb: null, // Vimeo requires API for thumbs; leave null
      kind: "stream",
    };
  }

  // direct file?
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

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:4000";

export default function AddVideoModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mode, setMode] = useState("link"); // 'link' | 'upload'
  const [uploadState, setUploadState] = useState({
    fileName: "",
    uploading: false,
    error: "",
  });

  const [previewOk, setPreviewOk] = useState(false);
  const [touched, setTouched] = useState({
    title: false,
    thumbnail: false,
    videoUrl: false,
  });

  const info = useMemo(() => detectProvider(videoUrl.trim()), [videoUrl]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setThumbnail("");
      setDuration("");
      setVideoUrl("");
      setMode("link");
      setUploadState({ fileName: "", uploading: false, error: "" });
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
    if (mode === "link") {
      if (!videoUrl.trim()) {
        e.videoUrl = "Video URL is required.";
      } else if (!looksLikeVideoUrl(videoUrl.trim())) {
        e.videoUrl =
          "Enter a direct video (.mp4/.mov/.webm/.m3u8) or a YouTube/Vimeo URL.";
      }
    } else if (mode === "upload") {
      if (!videoUrl.trim()) {
        e.videoUrl = "Upload a video file to continue.";
      }
    }
    return e;
  }, [title, thumbnail, videoUrl, mode]);

  const hasErrors = Object.keys(errors).length > 0;

  if (!open) return null;

  const handleUpload = async (file) => {
    if (!file) return;
    const MAX_MB = 1024 * 1024 * 1024; // 1GB soft limit
    if (file.size > MAX_MB) {
      setUploadState({
        fileName: file.name,
        uploading: false,
        error: "File is larger than 1 GB. Please upload a smaller video.",
      });
      return;
    }

    setUploadState({ fileName: file.name, uploading: true, error: "" });
    try {
      const res = await fetch(`${API_BASE}/api/uploads/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to request upload URL.");
      }

      const { uploadUrl, fileUrl, headers } = await res.json();
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers || {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      setVideoUrl(fileUrl);
      setUploadState({ fileName: file.name, uploading: false, error: "" });
    } catch (error) {
      console.error("Upload failed", error);
      setUploadState({
        fileName: file.name,
        uploading: false,
        error: error.message || "Upload failed.",
      });
      setVideoUrl("");
    }
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (hasErrors) return;

    // If YouTube and no thumbnail provided, auto-fill
    const finalThumb = thumbnail.trim() || info.defaultThumb || "";

    onSave({
      title: title.trim(),
      thumbnail: finalThumb,
      duration: duration.trim(),
      videoUrl: videoUrl.trim(),
      provider: info.provider, // "youtube" | "vimeo" | "file" | null
      providerId: info.providerId, // e.g., YouTube ID
      embedUrl: info.embedUrl, // ready for iframe or player
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
              placeholder={
                info.provider === "youtube" && !thumbnail
                  ? `(will use YouTube thumbnail automatically)`
                  : "https://…"
              }
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
                  {info.provider === "youtube"
                    ? "YouTube detected — we’ll auto-use the official thumbnail if you leave this blank."
                    : "Paste a thumbnail URL to preview"}
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

          <label className='bf-label bf-label--inline'>
            <span>Source</span>
            <div className='bf-radioRow'>
              <label>
                <input
                  type='radio'
                  name='bf-video-source'
                  value='link'
                  checked={mode === "link"}
                  onChange={() => {
                    setMode("link");
                    setVideoUrl("");
                    setUploadState({ fileName: "", uploading: false, error: "" });
                  }}
                />
                Link (YouTube/Vimeo/File URL)
              </label>
              <label>
                <input
                  type='radio'
                  name='bf-video-source'
                  value='upload'
                  checked={mode === "upload"}
                  onChange={() => {
                    setMode("upload");
                    setVideoUrl("");
                    setUploadState({ fileName: "", uploading: false, error: "" });
                  }}
                />
                Upload file
              </label>
            </div>
          </label>

          <label className='bf-label'>
            Video URL
            <input
              className='bf-input'
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, videoUrl: true }))}
              placeholder={
                mode === "upload"
                  ? "Upload a file or paste a direct link"
                  : "https://… (mp4/mov/webm/m3u8 or YouTube/Vimeo)"
              }
              aria-invalid={!!errors.videoUrl}
              disabled={mode === "upload"}
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

          {mode === "upload" && (
            <label className='bf-label'>
              Upload from device
              <input
                type='file'
                accept='video/*'
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleUpload(file);
                  }
                }}
              />
              {uploadState.fileName && (
                <div className='bf-help'>
                  {uploadState.uploading
                    ? `Uploading ${uploadState.fileName}…`
                    : uploadState.error
                    ? `Upload failed: ${uploadState.error}`
                    : `Uploaded ${uploadState.fileName}`}
                </div>
              )}
            </label>
          )}

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
