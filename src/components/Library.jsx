import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X, Pencil } from "lucide-react";
import useLibraryStore from "../store/useLibraryStore";
import useProfileStore from "../store/useProfileStore";
import useSettingsStore from "../store/useSettingsStore";
import useAuth from "../store/useAuth";
import useAdminPanel from "../store/useAdminPanel";
import MCard from "./MCard.jsx";
import ReelsCard from "./ReelsCard.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import { isDashSource, isHlsSource } from "../utils/streaming.js";

const DEFAULT_PROFILE_WALLPAPER = "/wpNash2.JPG";
const DEFAULT_PROFILE_PHOTO = "/IMG_2669.JPG";
const DEFAULT_HOME_WALLPAPER = "/WP1.jpg";
const DEFAULT_NAME = "Jaytee Thomas";
const DEFAULT_HOMETOWN = "Nashville, TN";
const DEFAULT_HANDLE = "@Jay_In_Nashvile";
const NSFW_CONSENT_KEY = "bf-nsfw-consent";

const YOUTUBE_PATTERNS = [
  /youtu\.be\/([^?&/]+)/i,
  /youtube\.com\/watch\?v=([^&]+)/i,
  /youtube\.com\/embed\/([^?&/]+)/i,
  /youtube\.com\/shorts\/([^?&/]+)/i,
  /youtube\.com\/live\/([^?&/]+)/i,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(?:video\/)?(\d+)/i,
  /player\.vimeo\.com\/video\/(\d+)/i,
];

const VIDEO_MIME_TYPES = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  f4v: "video/x-f4v",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  mp2: "video/mpeg",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  m3u8: "application/x-mpegURL",
  mpd: "application/dash+xml",
};

const isYouTube = (url = "") =>
  YOUTUBE_PATTERNS.some((pattern) => pattern.test(url));
const isVimeo = (url = "") =>
  VIMEO_PATTERNS.some((pattern) => pattern.test(url));

const getYouTubeId = (url = "") => {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return "";
};

const getVimeoId = (url = "") => {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return "";
};

const parseTimecode = (value = "") => {
  if (!value) return Number.NaN;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return Number.NaN;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const seconds = match[3] ? Number(match[3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const inferExtension = (url = "") => {
  if (!url) return "";
  const clean = url.split("?")[0].split("#")[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

const inferMimeFromExtension = (ext = "") => {
  if (!ext) return undefined;
  return VIDEO_MIME_TYPES[ext];
};

const inferMimeFromQuery = (url = "") => {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(url, base);
    const param =
      parsed.searchParams.get("contentType") ||
      parsed.searchParams.get("ContentType") ||
      parsed.searchParams.get("mime") ||
      parsed.searchParams.get("MimeType");
    if (param && param.toLowerCase().startsWith("video/")) {
      return param;
    }
  } catch {
    /* ignore malformed URLs */
  }
  return undefined;
};

const formatViews = (count) => {
  if (count == null || Number.isNaN(count)) return "--";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count.toLocaleString()} views`;
};

const formatAge = (value) => {
  if (!value) return "--";
  const posted = new Date(value);
  if (Number.isNaN(posted.getTime())) return "--";

  const now = Date.now();
  const diff = now - posted.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return "Just now";
  if (diff < hour) {
    const mins = Math.round(diff / minute);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < week) {
    const days = Math.round(diff / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (diff < month) {
    const weeks = Math.round(diff / week);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diff < year) {
    const months = Math.round(diff / month);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.round(diff / year);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const FALLBACK_REEL_DURATIONS = ["0:45", "0:38", "0:52"];

const parseAspectRatioValue = (input, fallbackWidth, fallbackHeight) => {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const direct = Number(trimmed);
      return Number.isFinite(direct) && direct > 0 ? direct : null;
    }
    const parts = trimmed.split(/[:/x]/i).filter(Boolean);
    if (parts.length === 2) {
      const [w, h] = parts.map((part) => Number(part));
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return w / h;
      }
    }
  }
  if (
    Number.isFinite(fallbackWidth) &&
    Number.isFinite(fallbackHeight) &&
    fallbackWidth > 0 &&
    fallbackHeight > 0
  ) {
    return fallbackWidth / fallbackHeight;
  }
  return null;
};

/* -------------------------
   Player Overlay (inline styles)
------------------------- */
function PlayerOverlay({ video, onClose }) {
  const sources = useMemo(() => {
    const map = new Map();
    const push = (value, typeHint) => {
      if (!value) return;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed === "about:blank") return;
        const existing = map.get(trimmed);
        const extension = inferExtension(trimmed);
        const mime =
          typeHint ||
          existing?.type ||
          inferMimeFromExtension(extension) ||
          inferMimeFromQuery(trimmed);
        if (existing) {
          if (!existing.type && mime) existing.type = mime;
          if (!existing.extension && extension) existing.extension = extension;
          map.set(trimmed, existing);
          return;
        }
        map.set(trimmed, {
          url: trimmed,
          type: mime,
          extension,
        });
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => push(item, typeHint));
        return;
      }
      if (typeof value === "object") {
        const objectType =
          value.type ||
          value.mimeType ||
          value.mimetype ||
          value.contentType ||
          typeHint;
        if (typeof value.url === "string") push(value.url, objectType);
        if (typeof value.src === "string") push(value.src, objectType);
        if (typeof value.href === "string") push(value.href, objectType);
        if (Array.isArray(value.sources)) push(value.sources, objectType);
        if (Array.isArray(value.files)) push(value.files, objectType);
      }
    };

    const candidatePairs = [
      [video?.src, video?.mimeType || video?.mimetype],
      [video?.embedUrl],
      [video?.streamUrl, video?.streamType],
      [video?.downloadUrl, video?.downloadType],
      [video?.fallbackSrc],
      [video?.previewSrc],
      [video?.hlsUrl, "application/x-mpegURL"],
      [video?.dashUrl, "application/dash+xml"],
      [video?.rawUrl],
      [video?.fileUrl],
    ];

    candidatePairs.forEach(([value, hint]) => push(value, hint));

    if (Array.isArray(video?.sources)) push(video.sources);
    if (Array.isArray(video?.formats)) push(video.formats);
    if (Array.isArray(video?.files)) push(video.files);
    if (video?.media) push(video.media);
    if (video?.assets) push(video.assets);

    Object.entries(video || {}).forEach(([key, value]) => {
      if (!value) return;
      if (/(src|url)$/i.test(key) || /^(src|url)/i.test(key)) {
        push(value);
      }
    });

    return Array.from(map.values());
  }, [video]);

  const normalizedSources = useMemo(() => {
    return sources
      .map((source) => {
        const extension = source.extension || inferExtension(source.url);
        const type =
          source.type ||
          inferMimeFromExtension(extension) ||
          inferMimeFromQuery(source.url);
        return {
          ...source,
          extension,
          type,
        };
      })
      .filter((source) => {
        const url = source.url || "";
        if (!url) return false;
        if (url.startsWith("blob:") || url.startsWith("data:video"))
          return true;
        if (!/^https?:/i.test(url)) return false;
        if (isYouTube(url) || isVimeo(url)) return false;
        return true;
      });
  }, [sources]);

  const streamingSources = useMemo(
    () =>
      normalizedSources.filter((src) => isHlsSource(src) || isDashSource(src)),
    [normalizedSources]
  );

  const fileSources = useMemo(
    () =>
      normalizedSources.filter(
        (src) => !isHlsSource(src) && !isDashSource(src)
      ),
    [normalizedSources]
  );

  const fileSourcesKey = useMemo(
    () => fileSources.map((item) => item.url).join("|"),
    [fileSources]
  );

  const youtubeId = useMemo(() => {
    if (
      typeof video?.provider === "string" &&
      video.provider.toLowerCase() === "youtube" &&
      video?.providerId
    ) {
      return String(video.providerId);
    }
    for (const source of sources) {
      const id = getYouTubeId(source.url);
      if (id) return id;
    }
    return "";
  }, [sources, video?.provider, video?.providerId]);

  const youtubeReferenceUrl = useMemo(() => {
    if (
      typeof video?.provider === "string" &&
      video.provider.toLowerCase() === "youtube" &&
      typeof video?.src === "string"
    ) {
      return video.src;
    }
    const match = sources.find((source) => isYouTube(source.url));
    return match?.url || "";
  }, [sources, video?.provider, video?.src]);

  const vimeoId = useMemo(() => {
    if (
      typeof video?.provider === "string" &&
      video.provider.toLowerCase() === "vimeo" &&
      video?.providerId
    ) {
      return String(video.providerId);
    }
    for (const source of sources) {
      const id = getVimeoId(source.url);
      if (id) return id;
    }
    return "";
  }, [sources, video?.provider, video?.providerId]);

  const vimeoReferenceUrl = useMemo(() => {
    if (
      typeof video?.provider === "string" &&
      video.provider.toLowerCase() === "vimeo" &&
      typeof video?.src === "string"
    ) {
      return video.src;
    }
    const match = sources.find((source) => isVimeo(source.url));
    return match?.url || "";
  }, [sources, video?.provider, video?.src]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!youtubeId) return "";
    let url = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    if (youtubeReferenceUrl) {
      try {
        const parsed = new URL(
          youtubeReferenceUrl,
          "https://www.youtube.com/watch?v=" + youtubeId
        );
        const startParam =
          parsed.searchParams.get("t") || parsed.searchParams.get("start");
        const playlist = parsed.searchParams.get("list");
        if (startParam) {
          const seconds = parseTimecode(startParam);
          if (!Number.isNaN(seconds) && seconds > 0) {
            url += `&start=${seconds}`;
          }
        }
        if (playlist) {
          url += `&list=${encodeURIComponent(playlist)}`;
        }
      } catch {
        /* ignore malformed youtube URLs */
      }
    }
    return url;
  }, [youtubeId, youtubeReferenceUrl]);

  const vimeoEmbedUrl = useMemo(() => {
    if (!vimeoId) return "";
    let url = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    if (vimeoReferenceUrl) {
      try {
        const parsed = new URL(
          vimeoReferenceUrl,
          "https://vimeo.com/" + vimeoId
        );
        const startParam =
          parsed.searchParams.get("t") ||
          parsed.hash?.replace(/^#t=/i, "") ||
          parsed.searchParams.get("start");
        if (startParam) {
          const seconds = parseTimecode(startParam);
          if (!Number.isNaN(seconds) && seconds > 0) {
            url += `#t=${seconds}s`;
          }
        }
      } catch {
        /* ignore malformed vimeo URLs */
      }
    }
    return url;
  }, [vimeoId, vimeoReferenceUrl]);

  useEffect(() => {
    if (!video) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, video]);

  const hasVideo = Boolean(video);
  const videoData = video || {};

  const tagTokens = Array.isArray(videoData.tags)
    ? videoData.tags
        .filter((tag) => typeof tag === "string")
        .join(" ")
        .toLowerCase()
    : typeof videoData.tags === "string"
    ? videoData.tags.toLowerCase()
    : "";
  const descriptorTokens = [
    videoData.library,
    videoData.variant,
    videoData.type,
    videoData.kind,
    videoData.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const aspectTokens = String(videoData.aspectRatio || videoData.aspect || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const orientationToken = (videoData.orientation || "").toLowerCase();

  const isVerticalAspect =
    aspectTokens.includes("9/16") ||
    aspectTokens.includes("9:16") ||
    aspectTokens.includes("9x16");
  const isReel =
    Boolean(videoData.isReel) ||
    descriptorTokens.includes("reel") ||
    tagTokens.includes("reel") ||
    isVerticalAspect ||
    orientationToken === "portrait";

  const rawAspect =
    videoData.aspectRatio ||
    videoData.aspect ||
    videoData.displayAspectRatio ||
    "";
  const numericAspect = useMemo(
    () =>
      parseAspectRatioValue(
        rawAspect,
        Number(videoData.width ?? videoData.videoWidth),
        Number(videoData.height ?? videoData.videoHeight)
      ),
    [
      rawAspect,
      videoData.height,
      videoData.videoHeight,
      videoData.width,
      videoData.videoWidth,
    ]
  );
  const defaultAspect = isVerticalAspect ? 9 / 16 : 16 / 9;
  const stageAspect = isReel ? 260 / 452 : numericAspect || defaultAspect;
  const stageAspectString = `${stageAspect.toFixed(4)}`;
  const stageMaxWidthRule = isReel ? "min(420px, 92vw)" : "min(960px, 92vw)";
  const stageMaxHeightRule = isReel ? "min(92vh, 92dvh)" : "min(82vh, 82dvh)";

  const hasNativeVideo = fileSources.length > 0;
  const [activeNativeIndex, setActiveNativeIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    setActiveNativeIndex(0);
    setPlaybackError(false);
  }, [fileSourcesKey, video?.id]);

  const handleNativeError = useCallback(() => {
    if (!hasNativeVideo) {
      setPlaybackError(true);
      return;
    }
    setActiveNativeIndex((current) => {
      const next = current + 1;
      if (next < fileSources.length) {
        setPlaybackError(false);
        return next;
      }
      setPlaybackError(true);
      return current;
    });
  }, [hasNativeVideo, fileSources]);

  const handleNativeLoadedData = useCallback(() => {
    setPlaybackError(false);
  }, []);

  const currentNativeSource =
    hasNativeVideo && fileSources[activeNativeIndex]
      ? fileSources[Math.min(activeNativeIndex, fileSources.length - 1)]
      : null;
  const poster =
    videoData.poster ||
    videoData.posterUrl ||
    videoData.thumbnail ||
    videoData.thumb ||
    videoData.previewImage ||
    "";

  const streamFallback = streamingSources.length ? streamingSources[0] : null;

  if (!hasVideo) {
    return null;
  }

  const backdropStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.7)",
    zIndex: 4000,
  };

  const wrapStyle = isReel
    ? {
        position: "fixed",
        inset: 0,
        margin: "auto",
        width: "min(420px, 92vw, calc(min(92vh, 92dvh) * 0.52))",
        maxWidth: 420,
        maxHeight: "min(92vh, 92dvh)",
        background: "#05060c",
        border: "1px solid #2f3240",
        borderRadius: 18,
        boxShadow: "0 20px 60px rgba(0,0,0,.65)",
        zIndex: 4001,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "22px 22px 18px",
        overflow: "hidden",
      }
    : {
        position: "fixed",
        inset: 0,
        margin: "auto",
        width: "clamp(320px, 96vw, 1040px)",
        maxHeight: "min(90vh, 90dvh)",
        background: "#05060c",
        border: "1px solid #2f3240",
        borderRadius: 18,
        boxShadow: "0 20px 70px rgba(0,0,0,.68)",
        zIndex: 4001,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        padding: "26px 32px 24px",
        overflow: "hidden",
      };

  const closeStyle = isReel
    ? {
        position: "absolute",
        top: 18,
        right: 18,
        border: "1px solid #2f3240",
        background: "rgba(15,16,26,0.88)",
        color: "#f5f5f5",
        borderRadius: 999,
        padding: "6px 8px",
        cursor: "pointer",
        zIndex: 4002,
      }
    : {
        position: "absolute",
        top: 8,
        right: 8,
        border: "1px solid #2f3240",
        background: "#1a1b21",
        color: "#e5e5e5",
        borderRadius: 8,
        padding: "6px 8px",
        cursor: "pointer",
        zIndex: 4002,
      };

  const stageStyle = isReel
    ? {
        position: "relative",
        width: "100%",
        aspectRatio: "260 / 452",
        background: "#000",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 18px 46px rgba(0,0,0,0.55)",
      }
    : {
        position: "relative",
        width: stageMaxWidthRule,
        aspectRatio: stageAspectString,
        maxHeight: stageMaxHeightRule,
        background: "#000",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  const metaStyle = isReel
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        padding: "0 4px 2px",
        color: "rgba(207, 211, 244, 0.86)",
      }
    : {
        alignSelf: "stretch",
        width: "100%",
        maxWidth: stageMaxWidthRule,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        color: "#d8dcff",
        padding: "0 4px 2px",
      };

  const titleStyle = isReel
    ? { margin: 0, fontSize: "1.03rem", fontWeight: 700, color: "#f5f7ff" }
    : { margin: 0, fontSize: "1.08rem", fontWeight: 700, color: "#f5f7ff" };

  const infoStyle = isReel
    ? {
        display: "flex",
        gap: 12,
        fontSize: "0.82rem",
        color: "rgba(167, 173, 214, 0.88)",
      }
    : {
        display: "flex",
        gap: 14,
        color: "rgba(207, 211, 244, 0.82)",
        fontSize: "0.9rem",
      };

  const fallbackStyle = isReel
    ? {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "#ddd",
        padding: 20,
        textAlign: "center",
      }
    : {
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "#ddd",
        padding: 20,
        textAlign: "center",
      };

  const mediaCommonStyle = isReel
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#000",
        border: 0,
      }
    : {
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        background: "#000",
        border: 0,
      };

  const videoStyle = {
    ...mediaCommonStyle,
    display: "block",
    objectFit: isReel ? "cover" : "contain",
  };

  const showNativePlayer = Boolean(currentNativeSource) && !playbackError;
  const showYouTube = !showNativePlayer && Boolean(youtubeEmbedUrl);
  const showVimeo = !showNativePlayer && !showYouTube && Boolean(vimeoEmbedUrl);

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={wrapStyle} role='dialog' aria-modal='true'>
        <button style={closeStyle} onClick={onClose} aria-label='Close'>
          <X size={20} />
        </button>
        <div style={stageStyle}>
          {showNativePlayer ? (
            <video
              controls
              autoPlay
              playsInline
              preload='auto'
              poster={poster || undefined}
              onError={handleNativeError}
              onLoadedData={handleNativeLoadedData}
              style={videoStyle}
              key={`${currentNativeSource.url}-${activeNativeIndex}`}
              crossOrigin='anonymous'
            >
              <source
                src={currentNativeSource?.url}
                type={currentNativeSource?.type || undefined}
              />
            </video>
          ) : showYouTube ? (
            <iframe
              title={video.title}
              src={youtubeEmbedUrl}
              allow='autoplay; fullscreen; picture-in-picture'
              referrerPolicy='strict-origin-when-cross-origin'
              style={{ ...mediaCommonStyle, border: 0 }}
              allowFullScreen
            />
          ) : showVimeo ? (
            <iframe
              title={video.title}
              src={vimeoEmbedUrl}
              allow='autoplay; fullscreen; picture-in-picture'
              referrerPolicy='strict-origin-when-cross-origin'
              style={{ ...mediaCommonStyle, border: 0 }}
              allowFullScreen
            />
          ) : (
            <div style={fallbackStyle}>
              {streamFallback ? (
                <p>
                  This video uses a streaming format (
                  {isHlsSource(streamFallback) ? "HLS" : "MPEG-DASH"}). Open it
                  in a compatible player:{" "}
                  <a
                    href={streamFallback.url}
                    target='_blank'
                    rel='noreferrer noopener'
                  >
                    {streamFallback.url}
                  </a>{" "}
                  or upload an MP4/WebM version for in-browser playback.
                </p>
              ) : (
                <p>
                  {playbackError
                    ? "We couldn’t play any of the uploaded formats in this browser. Try uploading an MP4/WebM version or provide a streamable link."
                    : "Cannot play this URL. Use a direct video file or a YouTube/Vimeo link."}
                </p>
              )}
            </div>
          )}
        </div>
        <div style={metaStyle}>
          <h3 style={titleStyle}>{videoData.title}</h3>
          <div style={infoStyle}>
            <span>{videoData.date || "--"}</span>
            <span>{videoData.duration || "--"}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------
   Edit Profile Modal
------------------------- */
function EditProfileModal({ open, onClose, profile, onSave }) {
  const settings = useSettingsStore((state) => state.settings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const [name, setName] = useState(profile?.name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [hometown, setHometown] = useState(profile?.hometown || "");
  const [photo, setPhoto] = useState(profile?.photo || "");
  const [wallpaper, setWallpaper] = useState(profile?.wallpaper || "");
  const [homeWallpaper, setHomeWallpaper] = useState(
    settings?.homeWallpaper || ""
  );
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [youtube, setYoutube] = useState(profile?.youtube || "");
  const [tiktok, setTiktok] = useState(profile?.tiktok || "");
  const [instagram, setInstagram] = useState(profile?.instagram || "");
  const [facebook, setFacebook] = useState(profile?.facebook || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open) {
      loadSettings().catch(() => {});
      setName(DEFAULT_NAME);
      setBio(profile?.bio || "");
      setHometown(DEFAULT_HOMETOWN);
      setPhoto(profile?.photo || DEFAULT_PROFILE_PHOTO);
      setWallpaper(DEFAULT_PROFILE_WALLPAPER);
      setHomeWallpaper(settings?.homeWallpaper || DEFAULT_HOME_WALLPAPER);
      setPhone(profile?.phone || "");
      setEmail(profile?.email || "");
      setWhatsapp(profile?.whatsapp || "");
      setYoutube(profile?.youtube || "");
      setTiktok(profile?.tiktok || "");
      setInstagram(profile?.instagram || "");
      setFacebook(profile?.facebook || "");
      setSaving(false);
      setSubmitError("");
    }
  }, [open, profile, loadSettings, settings?.homeWallpaper]);

  if (!open) return null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_BYTES = 3 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      window.alert("Please choose an image under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  const handleWallpaperFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      window.alert("Please choose a background image under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setWallpaper(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  const handleHomeWallpaperFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      window.alert("Please choose a home background under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHomeWallpaper(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        bio: bio.trim(),
        hometown: hometown.trim(),
        photo,
        phone: phone.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        youtube: youtube.trim(),
        tiktok: tiktok.trim(),
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        wallpaper,
      });
      await saveSettings({ homeWallpaper });
      setSaving(false);
      onClose();
    } catch (error) {
      setSubmitError(error.message || "Could not save profile.");
      setSaving(false);
    }
  };

  const S = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 3500,
    },
    modal: {
      position: "fixed",
      inset: 0,
      margin: "auto",
      width: "min(440px, 92vw)",
      maxHeight: "90vh",
      background: "#11121a",
      border: "1px solid #2f3240",
      borderRadius: 14,
      padding: 22,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      color: "#fff",
      zIndex: 3501,
      boxShadow: "0 24px 60px rgba(0,0,0,.55)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: { margin: 0, fontSize: "1.1rem" },
    body: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      overflowY: "auto",
      paddingRight: 2,
      marginRight: -2,
    },
    label: { display: "flex", flexDirection: "column", gap: 6 },
    input: {
      background: "#1a1b21",
      border: "1px solid #2f3240",
      borderRadius: 8,
      padding: "10px 12px",
      color: "#f7f7f7",
      fontSize: "0.95rem",
      outline: "none",
    },
    textarea: {
      minHeight: 110,
      resize: "vertical",
    },
    avatarPreview: {
      width: 96,
      height: 96,
      borderRadius: "50%",
      overflow: "hidden",
      border: "2px solid #2f3240",
      background: "#050505",
      alignSelf: "center",
    },
    wallpaperPreview: {
      width: "100%",
      aspectRatio: "16 / 9",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #2f3240",
      background: "#05060c",
      display: "grid",
      placeItems: "center",
      color: "#666",
      fontSize: "0.85rem",
    },
    homeWallpaperPreview: {
      width: "100%",
      aspectRatio: "16 / 9",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #2f3240",
      background: "#05060c",
      display: "grid",
      placeItems: "center",
      color: "#666",
      fontSize: "0.85rem",
    },
    help: {
      fontSize: "0.8rem",
      color: "#9194a6",
    },
    error: {
      color: "#ff8c8c",
      fontSize: "0.85rem",
      margin: 0,
      alignSelf: "flex-start",
    },
    footer: {
      marginTop: "auto",
      paddingTop: 12,
      borderTop: "1px solid rgba(47,50,64,0.6)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
    },
    btn: {
      padding: "8px 14px",
      borderRadius: 8,
      border: "1px solid #2f3240",
      background: "#20222a",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 600,
    },
    primary: {
      background: "var(--accent-gradient)",
      borderColor: "var(--accent-border)",
    },
    close: {
      background: "transparent",
      border: "none",
      color: "#888",
      cursor: "pointer",
      fontSize: "1rem",
    },
  };

  return (
    <>
      <div style={S.overlay} onClick={onClose} />
      <form style={S.modal} onSubmit={submit}>
        <div style={S.header}>
          <h3 style={S.title}>Edit Profile</h3>
          <button type='button' style={S.close} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={S.body}>
          <div style={S.avatarPreview}>
            {photo ? (
              <img
                src={photo}
                alt='Profile preview'
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.8rem",
                  color: "#666",
                }}
              >
                No Photo
              </div>
            )}
          </div>

          <label style={S.label}>
            <span>Upload Photo</span>
            <input
              type='file'
              accept='image/*'
              onChange={handleFile}
              style={{ ...S.input, padding: "10px" }}
            />
            <span style={S.help}>Select a JPG or PNG under 3 MB.</span>
          </label>

          <label style={S.label}>
            <span>Background Image</span>
            <div style={S.wallpaperPreview}>
              {wallpaper ? (
                <img
                  src={wallpaper}
                  alt='Background preview'
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>No background selected</span>
              )}
            </div>
            <input
              type='file'
              accept='image/*'
              onChange={handleWallpaperFile}
              style={{ ...S.input, padding: "10px" }}
            />
            <input
              style={S.input}
              value={wallpaper}
              onChange={(e) => setWallpaper(e.target.value)}
              placeholder='Paste an image URL'
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type='button'
                style={{ ...S.btn, padding: "6px 10px" }}
                onClick={() => setWallpaper("")}
              >
                Clear background
              </button>
            </div>
            <span style={S.help}>
              Use a wide image (16:9) for best results. Files up to 5 MB.
            </span>
          </label>

          <label style={S.label}>
            <span>Home Page Wallpaper</span>
            <div style={S.homeWallpaperPreview}>
              {homeWallpaper ? (
                <img
                  src={homeWallpaper}
                  alt='Home background preview'
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>No home background set</span>
              )}
            </div>
            <input
              type='file'
              accept='image/*'
              onChange={handleHomeWallpaperFile}
              style={{ ...S.input, padding: "10px" }}
            />
            <input
              style={S.input}
              value={homeWallpaper}
              onChange={(e) => setHomeWallpaper(e.target.value)}
              placeholder='Paste a home background image URL'
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type='button'
                style={{ ...S.btn, padding: "6px 10px" }}
                onClick={() => setHomeWallpaper("")}
              >
                Clear home background
              </button>
            </div>
            <span style={S.help}>
              Shown on the landing page. Wide images (16:9) look best. Up to 5
              MB.
            </span>
          </label>

          <label style={S.label}>
            <span>Name</span>
            <input
              style={S.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Your name'
            />
          </label>

          <label style={S.label}>
            <span>Hometown</span>
            <input
              style={S.input}
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              placeholder='City, State'
            />
          </label>

          <label style={S.label}>
            <span>Phone</span>
            <input
              style={S.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='(615) 555-0102'
            />
          </label>

          <label style={S.label}>
            <span>Email</span>
            <input
              style={S.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@example.com'
            />
          </label>

          <label style={S.label}>
            <span>WhatsApp</span>
            <input
              style={S.input}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder='+1 615 555 0102'
            />
          </label>

          <label style={S.label}>
            <span>Bio</span>
            <textarea
              style={{ ...S.input, ...S.textarea }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder='Share a short bio...'
            />
          </label>

          <label style={S.label}>
            <span>YouTube Handle</span>
            <input
              style={S.input}
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder='@channel_name'
            />
          </label>

          <label style={S.label}>
            <span>TikTok Handle</span>
            <input
              style={S.input}
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder='@tiktok_name'
            />
          </label>

          <label style={S.label}>
            <span>Instagram Handle</span>
            <input
              style={S.input}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder='@instagram_name'
            />
          </label>

          <label style={S.label}>
            <span>Facebook</span>
            <input
              style={S.input}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder='facebook.com/yourpage or @handle'
            />
          </label>
        </div>

        <div style={S.footer}>
          {submitError ? <p style={S.error}>{submitError}</p> : null}
          <div style={S.actions}>
            <button
              type='button'
              style={S.btn}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type='submit'
              style={{ ...S.btn, ...S.primary }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

/* -------------------------
   MAIN LIBRARY (keeps your header/sidebar layout)
------------------------- */
export default function Library({
  embedHeader = false,
  mode = "library",
  search = "",
}) {
  const navigate = useNavigate();
  const {
    videos,
    favorites = [],
    toggleFavorite,
    removeVideo,
  } = useLibraryStore();
  const profile = useProfileStore((state) => state.profile);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const profileReady = useProfileStore((state) => state.profileReady);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const saveFallback = useLibraryStore((state) => state.saveFallback);
  const authUser = useAuth((state) => state.user);
  const authStatus = useAuth((state) => state.status);
  const openLogin = useAdminPanel((state) => state.openLogin);
  const openRegister = useAdminPanel((state) => state.openRegister);
  const isAdmin = authUser?.role === "admin";
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fallbackPending, setFallbackPending] = useState(false);
  const [fallbackSaved, setFallbackSaved] = useState(false);
  const [nsfwConsent, setNsfwConsent] = useState(false);
  const [nsfwConsentReady, setNsfwConsentReady] = useState(false);

  useEffect(() => {
    if (!profileReady) {
      loadProfile().catch(() => {});
    }
    loadSettings().catch(() => {});
  }, [profileReady, loadProfile, loadSettings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setNsfwConsentReady(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(NSFW_CONSENT_KEY);
      setNsfwConsent(stored === "true");
    } catch (error) {
      console.warn("Failed to read NSFW consent flag", error);
    }
    setNsfwConsentReady(true);
  }, []);

  const enrichReel = useCallback((video, index = 0) => {
    const poster = video.poster || video.thumbnail;
    const rawViews =
      video.views ??
      video.playCount ??
      video.metrics?.views ??
      video.stats?.views ??
      null;
    const numericViews = Number(rawViews);
    const viewsLabel =
      Number.isFinite(numericViews) && numericViews > 0
        ? formatViews(numericViews)
        : typeof rawViews === "string"
        ? rawViews
        : undefined;
    const ageSource = video.postedAt || video.date || video.createdAt;
    const ageLabel = ageSource ? formatAge(ageSource) : undefined;
    const duration =
      video.duration ||
      FALLBACK_REEL_DURATIONS[index % FALLBACK_REEL_DURATIONS.length];

    return {
      ...video,
      isReel: true,
      poster,
      duration,
      creator: video.creator || video.channel || "Beechwood Reels",
      stats: {
        views: viewsLabel,
        age: ageLabel,
      },
      __fromLibrary: Boolean(video.source) || typeof video.id === "number",
    };
  }, []);

  const activeSection =
    mode === "vids"
      ? "vids"
      : mode === "reels"
      ? "reels"
      : mode === "favorites"
      ? "favorites"
      : mode === "nsfw"
      ? "nsfw"
      : mode === "about"
      ? "about"
      : "home";
  const [playing, setPlaying] = useState(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const buildSocialLink = (platform, label, value) => {
    if (!value) return null;
    const raw = value.trim();
    if (!raw) return null;
    const hasProtocol = /^https?:\/\//i.test(raw);
    let href = raw;
    let text = raw;

    const extractHandle = (input) => {
      const matchHandle = input.match(/@[\w.-]+/);
      if (matchHandle) return matchHandle[0].replace(/^@+/, "");
      const cleaned = input
        .replace(/^https?:\/\/(www\.)?/i, "")
        .split(/[/?#]/)
        .filter(Boolean)
        .pop();
      return cleaned ? cleaned.replace(/^@+/, "") : "";
    };

    if (!hasProtocol) {
      const handle = raw.replace(/^@+/, "") || extractHandle(raw);
      if (!handle) return null;
      switch (platform) {
        case "youtube":
          href = `https://www.youtube.com/@${handle}`;
          break;
        case "tiktok":
          href = `https://www.tiktok.com/@${handle}`;
          break;
        case "instagram":
          href = `https://www.instagram.com/${handle}`;
          break;
        case "facebook":
          href = `https://www.facebook.com/${handle}`;
          break;
        default:
          href = raw;
      }
      text = `@${handle}`;
    } else {
      const match = raw.match(/@[\w.-]+/);
      if (match) text = match[0];
      else {
        const handle = extractHandle(raw);
        text = handle ? `@${handle}` : raw.replace(/^https?:\/\/(www\.)?/i, "");
      }
    }

    return { label, text, href };
  };

  const enrichVideo = useCallback((video) => {
    const thumbnail = video.thumbnail || video.poster || null;
    const durationLabel =
      video.duration || video.runtime || video.metrics?.runtime || null;
    const publishedAt =
      video.date ||
      video.postedAt ||
      video.createdAt ||
      video.updatedAt ||
      null;
    const ageLabel = publishedAt ? formatAge(publishedAt) : undefined;
    const stats =
      durationLabel || ageLabel
        ? {
            views: durationLabel || undefined,
            age: ageLabel,
          }
        : null;

    return {
      ...video,
      thumbnail,
      stats,
      __fromLibrary: Boolean(video.source) || typeof video.id === "number",
    };
  }, []);

  const showcaseVideos = useMemo(() => {
    if (!Array.isArray(videos)) return [];
    return [...videos]
      .filter((video) => (video.library || "").toLowerCase() !== "reels")
      .sort(
        (a, b) =>
          (Number(b.createdAt) || new Date(b.date || 0).getTime()) -
          (Number(a.createdAt) || new Date(a.date || 0).getTime())
      )
      .slice(0, 4);
  }, [videos]);

  const showcaseCards = useMemo(
    () => showcaseVideos.map((video) => enrichVideo(video)),
    [showcaseVideos, enrichVideo]
  );
  const socialLinks = useMemo(() => {
    const links = [];
    const push = (platform, label, value) => {
      const link = buildSocialLink(platform, label, value);
      if (link) links.push(link);
    };
    push("youtube", "YouTube", profile?.youtube);
    push("tiktok", "TikTok", profile?.tiktok);
    push("instagram", "Instagram", profile?.instagram);
    push("facebook", "Facebook", profile?.facebook);
    return links;
  }, [profile]);
  const sanitizePhone = useCallback(
    (value = "") => value.replace(/[^\d+]/g, ""),
    []
  );
  const contactItems = useMemo(() => {
    const phoneValue = profile?.phone?.trim() || "";
    const emailValue = profile?.email?.trim() || "";
    const whatsappValue = profile?.whatsapp?.trim() || "";
    const whatsappSanitized = sanitizePhone(whatsappValue).replace(/^\+/, "");
    return [
      {
        label: "Phone",
        value: phoneValue,
        href: phoneValue ? `tel:${sanitizePhone(phoneValue)}` : null,
        placeholder: "Add your phone",
      },
      {
        label: "Email",
        value: emailValue,
        href: emailValue ? `mailto:${emailValue}` : null,
        placeholder: "Add your email",
      },
      {
        label: "WhatsApp",
        value: whatsappValue,
        href:
          whatsappValue && whatsappSanitized
            ? `https://wa.me/${whatsappSanitized}`
            : null,
        placeholder: "Add your WhatsApp",
      },
    ];
  }, [profile, sanitizePhone]);
  const aboutHandle = DEFAULT_HANDLE;
  const hometownDisplay = DEFAULT_HOMETOWN;
  const displayName = DEFAULT_NAME;
  const profilePhoto = profile?.photo?.trim() || DEFAULT_PROFILE_PHOTO;
  const profileWallpaper = DEFAULT_PROFILE_WALLPAPER;
  const profileBio =
    "Jaytee is a visionary filmmaker, designer, and software engineer who merges cinematic storytelling with modern technology. His background in React development, AI/ML, and cinematic editing allows him to bridge art and engineering — transforming powerful ideas into immersive, intelligent visual stories that inspire, inform, and connect audiences around the world.";
  const aboutWallpaperStyle = useMemo(
    () =>
      profileWallpaper
        ? { "--about-wallpaper": `url("${profileWallpaper}")` }
        : {
            "--about-wallpaper":
              "linear-gradient(135deg, rgba(23, 25, 42, 0.92), rgba(10, 11, 20, 0.94))",
          },
    [profileWallpaper]
  );

  const shareVideo = useCallback((video) => {
    if (typeof navigator !== "undefined" && navigator?.share) {
      navigator
        .share({
          title: video.title,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      window.alert(`Share "${video.title}" with your team!`);
    }
  }, []);

  const handleSetFallback = useCallback(async () => {
    if (!isAdmin) return;
    if (!videos.length) {
      window.alert("Upload a video first before saving it as fallback.");
      return;
    }
    setFallbackPending(true);
    try {
      await saveFallback();
      window.alert(
        "Current library saved as fallback. It will preload on a fresh deploy."
      );
      setFallbackSaved(true);
    } catch (error) {
      console.error("Failed to save fallback", error);
      window.alert(
        error.message || "Could not save fallback. Please try again."
      );
      setFallbackSaved(false);
    } finally {
      setFallbackPending(false);
    }
  }, [isAdmin, saveFallback, videos.length]);

  useEffect(() => {
    setFallbackSaved(false);
  }, [videos]);

  const filtered = useMemo(() => {
    let list = videos || [];
    if (activeSection === "vids")
      list = list.filter((v) => {
        const tag = (v.library || "").toLowerCase();
        return (
          tag === "vids" ||
          tag === "videos" ||
          tag === "docs" ||
          tag === "documentaries"
        );
      });
    else if (activeSection === "reels")
      list = list.filter((v) => (v.library || "").toLowerCase() === "reels");
    else if (activeSection === "favorites")
      list = list.filter((v) => favorites.includes(v.id));
    else if (activeSection === "nsfw")
      list = list.filter((v) => (v.library || "").toLowerCase() === "nsfw");
    else if (activeSection === "home")
      list = list.filter((v) => {
        const tag = (v.library || "").toLowerCase();
        return tag !== "reels" && tag !== "nsfw";
      });

    if (search?.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          (v.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [videos, activeSection, favorites, search]);

  const reelCards = useMemo(() => {
    return (videos || [])
      .filter((video) => (video.library || "").toLowerCase() === "reels")
      .sort(
        (a, b) =>
          (Number(b.createdAt) || new Date(b.date || 0).getTime()) -
          (Number(a.createdAt) || new Date(a.date || 0).getTime())
      )
      .slice(0, 6)
      .map((video, index) => enrichReel(video, index));
  }, [videos, enrichReel]);

  const reelsPageCards = useMemo(() => {
    if (activeSection !== "reels") return [];
    if (filtered.length > 0) {
      return filtered.map((video, index) => enrichReel(video, index));
    }
    if (search?.trim()) return [];
    return reelCards;
  }, [activeSection, filtered, enrichReel, reelCards, search]);

  const vidsPageCards = useMemo(() => {
    if (activeSection !== "vids") return [];
    return filtered.map((video) => enrichVideo(video));
  }, [activeSection, filtered, enrichVideo]);

  const favoritesPageCards = useMemo(() => {
    if (activeSection !== "favorites") return [];
    return filtered.map((video, index) => {
      const type =
        (video.library || "").toLowerCase() === "reels" ? "reel" : "video";
      return {
        type,
        data: type === "reel" ? enrichReel(video, index) : enrichVideo(video),
      };
    });
  }, [activeSection, filtered, enrichReel, enrichVideo]);

  const mixedCards = useMemo(() => {
    return filtered.map((video, index) => {
      const type =
        (video.library || "").toLowerCase() === "reels" ? "reel" : "video";
      return {
        type,
        data: type === "reel" ? enrichReel(video, index) : enrichVideo(video),
      };
    });
  }, [filtered, enrichReel, enrichVideo]);

  const nsfwPageCards = useMemo(() => {
    if (activeSection !== "nsfw") return [];
    return filtered.map((video) => enrichVideo(video));
  }, [activeSection, filtered, enrichVideo]);

  const isLibraryVideo = useCallback(
    (video) =>
      Boolean(video) &&
      (typeof video.id === "number" ||
        video.source === "custom" ||
        video.__fromLibrary),
    []
  );

  const requestDelete = useCallback(
    (video) => {
      if (!isAdmin) return;
      if (!isLibraryVideo(video)) return;
      setDeleteTarget(video);
    },
    [isAdmin, isLibraryVideo]
  );

  const handleNsfwConsent = useCallback(() => {
    setNsfwConsent(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(NSFW_CONSENT_KEY, "true");
      } catch (error) {
        console.warn("Failed to persist NSFW consent flag", error);
      }
    }
  }, []);

  const handleNsfwExit = useCallback(() => {
    navigate("/library", { replace: true });
  }, [navigate]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await removeVideo(deleteTarget.id);
      if (playing && playing.id === deleteTarget.id) {
        setPlaying(null);
      }
      setDeleteTarget(null);
    } catch (error) {
      window.alert(
        error.message || "Could not delete video. Check your admin access."
      );
    }
  }, [deleteTarget, removeVideo, playing, setPlaying]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <div className='bf-app'>
      {/* keep your existing header as-is elsewhere; embedHeader is off by default */}
      {embedHeader && (
        <header className='bf-header'>
          <div className='bf-logoGroup'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='bf-logoIcon'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M23 7l-7 5 7 5V7z' />
              <rect x='1' y='5' width='15' height='14' rx='2' ry='2' />
            </svg>
            <span className='bf-logoText'>Beechwood Films</span>
          </div>
          <input
            className='bf-search'
            placeholder='Search...'
            style={{ maxWidth: 320 }}
          />
          <div className='bf-actions'>
            <button className='bf-navBtn is-active'>Library</button>
            <button className='bf-navBtn'>Favorites</button>
          </div>
        </header>
      )}

      <main
        className={`bf-libraryMain${
          activeSection === "about" ? " is-about" : ""
        }`}
        role='main'
      >
        {isAdmin && (
          <div className='bf-adminActionsRow'>
            <label
              className={`bf-toggle ${fallbackPending ? "is-disabled" : ""}`}
            >
              <input
                type='checkbox'
                className='bf-toggle__input'
                onChange={handleSetFallback}
                checked={fallbackSaved}
                disabled={fallbackPending || videos.length === 0}
              />
              <span className='bf-toggle__track'>
                <span className='bf-toggle__thumb' />
              </span>
              <span className='bf-toggle__label'>
                {fallbackPending
                  ? "Saving fallback…"
                  : fallbackSaved
                  ? "Fallback saved"
                  : "Snapshot current uploads as fallback"}
              </span>
            </label>
          </div>
        )}
        {activeSection === "about" ? (
          <section
            className='bf-aboutWallpaperSection'
            style={aboutWallpaperStyle}
            aria-label='About portrait'
          >
            {isAdmin && (
              <button
                type='button'
                className='bf-aboutEditBtn is-floating'
                onClick={() => setShowProfileEdit(true)}
              >
                <Pencil size={16} />
                <span>Edit Profile</span>
              </button>
            )}
            <div className='bf-aboutWallpaperContent'>
              <section
                className='bf-aboutSection is-full'
                aria-label='About profile'
              >
                <div className='bf-aboutProfileCard'>
                  <div className='bf-aboutAvatarFlow'>
                    {profilePhoto ? (
                      <img src={profilePhoto} alt={`${displayName} portrait`} />
                    ) : (
                      <div className='bf-aboutAvatarPlaceholder'>Add photo</div>
                    )}
                  </div>
                  <div className='bf-aboutProfileStack'>
                    <span className='bf-aboutPrimaryHandle'>{aboutHandle}</span>
                    <h1 className='bf-aboutName'>{displayName}</h1>
                    <p className='bf-aboutSubline'>
                      Based in {hometownDisplay}
                    </p>
                  </div>
                </div>
                <div className='bf-aboutColumnsFlow'>
                  <section aria-label='Bio card'>
                    <h3>Bio</h3>
                    <p>
                      {profileBio || "Use the edit button to tell your story."}
                    </p>
                  </section>
                  <section aria-label='Contact information'>
                    <h3>Contact</h3>
                    <ul>
                      {contactItems.map((item) => (
                        <li key={item.label}>
                          <span>{item.label}</span>
                          {item.value ? (
                            item.href ? (
                              <a href={item.href}>{item.value}</a>
                            ) : (
                              <span>{item.value}</span>
                            )
                          ) : (
                            <span className='bf-aboutPlaceholder'>
                              {item.placeholder}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section aria-label='Social links'>
                    <h3>Social</h3>
                    {socialLinks.length > 0 ? (
                      <ul>
                        {socialLinks.map((link) => (
                          <li key={link.label}>
                            <span>{link.label}</span>
                            <a
                              href={link.href}
                              target='_blank'
                              rel='noreferrer noopener'
                            >
                              {link.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className='bf-aboutPlaceholder'>{aboutHandle}</span>
                    )}
                  </section>
                </div>
              </section>
            </div>
          </section>
        ) : activeSection === "home" ? (
          <>
            <section
              className='bf-showcase'
              aria-label='Library spotlight videos'
            >
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>Library Spotlight</h2>
                <p className='bf-showcase__subtitle'>
                  Fresh pulls from the Beechwood catalog for quick sharing
                </p>
              </div>
              {showcaseCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {showcaseCards.map((video) => (
                    <MCard
                      key={video.id}
                      video={video}
                      variant='doc'
                      showFavorite={favorites.includes(video.id)}
                      isFavorite={favorites.includes(video.id)}
                      showDelete={isAdmin && isLibraryVideo(video)}
                      onDelete={requestDelete}
                      onPlay={setPlaying}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onShare={shareVideo}
                      stats={video.stats}
                    />
                  ))}
                </div>
              ) : (
                <div className='bf-showcase__empty'>No feature videos yet.</div>
              )}
            </section>

            <section
              className='bf-showcase bf-showcase--reels'
              aria-label='Latest reels'
            >
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>Reels</h2>
                <p className='bf-showcase__subtitle'>
                  Quick-hit edits ready to share with clients
                </p>
              </div>
              {reelCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {reelCards.map((video) => (
                    <ReelsCard
                      key={`reel-${video.id}`}
                      video={video}
                      isFavorite={favorites.includes(video.id)}
                      showDelete={isAdmin && isLibraryVideo(video)}
                      onPlay={setPlaying}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onDelete={requestDelete}
                      onShare={shareVideo}
                      stats={video.stats}
                    />
                  ))}
                </div>
              ) : (
                <div className='bf-showcase__empty'>
                  Add a reel to your library to feature it here.
                </div>
              )}
            </section>
          </>
        ) : activeSection === "reels" ? (
          <section
            className='bf-showcase bf-showcase--reels'
            aria-label='Reels library'
          >
            <div className='bf-showcase__head'>
              <h2 className='bf-showcase__title'>Reels Library</h2>
              <p className='bf-showcase__subtitle'>
                Add reels to your library to see them here.
              </p>
            </div>
            {reelsPageCards.length > 0 ? (
              <div className='bf-showcase__row'>
                {reelsPageCards.map((video) => (
                  <ReelsCard
                    key={`reel-${video.id}`}
                    video={video}
                    isFavorite={favorites.includes(video.id)}
                    showDelete={isAdmin && isLibraryVideo(video)}
                    onPlay={setPlaying}
                    onToggleFavorite={(videoItem) => {
                      if (typeof toggleFavorite === "function")
                        toggleFavorite(videoItem.id);
                    }}
                    onDelete={requestDelete}
                    onShare={shareVideo}
                    stats={video.stats}
                  />
                ))}
              </div>
            ) : (
              <div className='bf-showcase__empty'>
                No reels in your library yet.
              </div>
            )}
          </section>
        ) : activeSection === "vids" ? (
          <section
            className='bf-showcase bf-showcase--vids'
            aria-label='Vids library'
          >
            <div className='bf-showcase__head'>
              <h2 className='bf-showcase__title'>Vids Library</h2>
              <p className='bf-showcase__subtitle'>
                All the long-form stories and behind-the-scenes features.
              </p>
            </div>
            {vidsPageCards.length > 0 ? (
              <div className='bf-showcase__row'>
                {vidsPageCards.map((video) => (
                  <MCard
                    key={`vid-${video.id}`}
                    video={video}
                    variant='doc'
                    stats={video.stats}
                    showDelete={isAdmin && isLibraryVideo(video)}
                    onDelete={requestDelete}
                    onPlay={setPlaying}
                    isFavorite={favorites.includes(video.id)}
                    onToggleFavorite={(videoItem) => {
                      if (typeof toggleFavorite === "function")
                        toggleFavorite(videoItem.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className='bf-showcase__empty'>
                No vids matched your search.
              </div>
            )}
          </section>
        ) : activeSection === "favorites" ? (
          <section
            className='bf-showcase bf-showcase--favorites'
            aria-label='Favorites library'
          >
            <div className='bf-showcase__head'>
              <h2 className='bf-showcase__title'>Favorites Library</h2>
              <p className='bf-showcase__subtitle'>
                Hand-picked clips you’ve saved for quick access.
              </p>
            </div>
            {favoritesPageCards.length > 0 ? (
              <div className='bf-showcase__row'>
                {favoritesPageCards.map((item) =>
                  item.type === "reel" ? (
                    <ReelsCard
                      key={`fav-reel-${item.data.id}`}
                      video={item.data}
                      isFavorite
                      showDelete={isAdmin && isLibraryVideo(item.data)}
                      onDelete={requestDelete}
                      onPlay={setPlaying}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onShare={shareVideo}
                      stats={item.data.stats}
                    />
                  ) : (
                    <MCard
                      key={`fav-vid-${item.data.id}`}
                      video={item.data}
                      variant='doc'
                      showDelete={isAdmin && isLibraryVideo(item.data)}
                      onDelete={requestDelete}
                      onPlay={setPlaying}
                      isFavorite
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onShare={shareVideo}
                      stats={item.data.stats}
                    />
                  )
                )}
              </div>
            ) : (
              <div className='bf-showcase__empty'>
                You haven’t favorited any videos yet.
              </div>
            )}
          </section>
        ) : activeSection === "nsfw" ? (
          authStatus === "loading" || authStatus === "idle" ? (
            <section className='bf-nsfwGate' aria-label='Checking permissions'>
              <div className='bf-nsfwGate__spinner' aria-hidden='true' />
              <h2 className='bf-nsfwGate__title'>Preparing access…</h2>
              <p className='bf-nsfwGate__body'>Hang tight while we confirm your permissions.</p>
            </section>
          ) : !authUser || authUser.role === "guest" ? (
            <section className='bf-nsfwGate' aria-label='Restricted NSFW library'>
              <span className='bf-nsfwGate__eyebrow'>Restricted Library</span>
              <h2 className='bf-nsfwGate__title'>Sign in to view NSFW content</h2>
              <p className='bf-nsfwGate__body'>
                Because this catalog contains explicit scenes, only authenticated members can browse it.
                Log in with your account to continue.
              </p>
              <div className='bf-nsfwGate__buttons'>
                <button
                  type='button'
                  className='bf-nsfwGate__btn bf-nsfwGate__btn--primary'
                  onClick={openLogin}
                >
                  Sign in
                </button>
                <button type='button' className='bf-nsfwGate__btn' onClick={openRegister}>
                  Create account
                </button>
                <button type='button' className='bf-nsfwGate__link' onClick={handleNsfwExit}>
                  Back to library
                </button>
              </div>
            </section>
          ) : !nsfwConsentReady ? (
            <section className='bf-nsfwGate' aria-label='Preparing NSFW consent'>
              <div className='bf-nsfwGate__spinner' aria-hidden='true' />
              <h2 className='bf-nsfwGate__title'>Almost there…</h2>
              <p className='bf-nsfwGate__body'>Just a moment while we prepare the catalog.</p>
            </section>
          ) : nsfwConsent ? (
            <section className='bf-showcase bf-showcase--nsfw' aria-label='NSFW library'>
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>NSFW Library</h2>
                <p className='bf-showcase__subtitle'>Content flagged as explicit or adults-only.</p>
              </div>
              {nsfwPageCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {nsfwPageCards.map((video) => (
                    <MCard
                      key={`nsfw-${video.id}`}
                      video={video}
                      variant='doc'
                      stats={video.stats}
                      showDelete={isAdmin && isLibraryVideo(video)}
                      onDelete={requestDelete}
                      onPlay={setPlaying}
                      isFavorite={favorites.includes(video.id)}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onShare={shareVideo}
                    />
                  ))}
                </div>
              ) : (
                <div className='bf-showcase__empty'>No NSFW videos available.</div>
              )}
            </section>
          ) : (
            <section className='bf-nsfwGate' aria-label='NSFW consent confirmation'>
              <span className='bf-nsfwGate__eyebrow'>Adults Only</span>
              <h2 className='bf-nsfwGate__title'>Confirm you are 18 or older</h2>
              <p className='bf-nsfwGate__body'>
                By entering you certify that you are of legal age in your region and consent to view explicit
                material. You can revoke this confirmation anytime by clearing your browser storage.
              </p>
              <div className='bf-nsfwGate__buttons'>
                <button
                  type='button'
                  className='bf-nsfwGate__btn bf-nsfwGate__btn--primary'
                  onClick={handleNsfwConsent}
                >
                  I’m 18+ — enter
                </button>
                <button type='button' className='bf-nsfwGate__btn' onClick={handleNsfwExit}>
                  No thanks
                </button>
              </div>
            </section>
          )
        ) : (
          <div id='library-grid' className='bf-grid'>
            {mixedCards.length === 0 ? (
              <div className='bf-empty'>No videos found.</div>
            ) : (
              mixedCards.map((item) => {
                const isFav = favorites.includes(item.data.id);
                return item.type === "reel" ? (
                  <ReelsCard
                    key={`grid-reel-${item.data.id}`}
                    video={item.data}
                    isFavorite={isFav}
                    showDelete={isAdmin && isLibraryVideo(item.data)}
                    onDelete={requestDelete}
                    onPlay={setPlaying}
                    onToggleFavorite={(videoItem) => {
                      if (typeof toggleFavorite === "function")
                        toggleFavorite(videoItem.id);
                    }}
                    onShare={shareVideo}
                    stats={item.data.stats}
                  />
                ) : (
                  <MCard
                    key={`grid-vid-${item.data.id}`}
                    video={item.data}
                    variant='doc'
                    stats={item.data.stats}
                    onPlay={setPlaying}
                    isFavorite={isFav}
                    showDelete={isAdmin && isLibraryVideo(item.data)}
                    onDelete={requestDelete}
                    onToggleFavorite={(videoItem) => {
                      if (typeof toggleFavorite === "function")
                        toggleFavorite(videoItem.id);
                    }}
                    onShare={shareVideo}
                  />
                );
              })
            )}
          </div>
        )}
      </main>

      <EditProfileModal
        open={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        profile={profile}
        onSave={saveProfile}
      />

      {deleteTarget && (
        <ConfirmModal
          title='Delete Video?'
          message={`Are you sure you want to permanently delete "${deleteTarget.title}"? This action cannot be undone.`}
          confirmText='Delete'
          cancelText='Cancel'
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Player */}
      <PlayerOverlay video={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}
