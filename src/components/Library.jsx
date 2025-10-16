import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X, Pencil } from "lucide-react";
import useLibraryStore from "../store/useLibraryStore";
import useProfileStore from "../store/useProfileStore";
import useAdminPanel from "../store/useAdminPanel";
import MCard from "./MCard.jsx";
import ReelsCard from "./ReelsCard.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

const LIBRARY_SHOWCASE = [
  {
    id: "lib-feature-1",
    title: "Golden Hour Drone Ballet",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    views: 14820,
    postedAt: "2024-12-18T15:00:00Z",
  },
  {
    id: "lib-feature-2",
    title: "Afterglow Sessions: Nashville Streets",
    thumbnail: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    views: 23250,
    postedAt: "2025-01-04T20:30:00Z",
  },
  {
    id: "lib-feature-3",
    title: "Rehearsal Room Reveries",
    thumbnail: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    views: 9800,
    postedAt: "2024-12-27T12:15:00Z",
  },
  {
    id: "lib-feature-4",
    title: "Studio Spotlight: Light & Texture",
    thumbnail: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
    views: 17560,
    postedAt: "2025-01-09T09:45:00Z",
  },
];

const REELS_SHOWCASE = [
  {
    id: "reel-demo-1",
    title: "Beechwood Pulse: City in Motion",
    poster: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=520&q=80",
    creator: "Beechwood Reels",
    duration: "0:46",
    views: 21340,
    postedAt: "2025-01-08T13:10:00Z",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
  },
  {
    id: "reel-demo-2",
    title: "Steadicam Sprints: Market Street",
    poster: "https://images.unsplash.com/photo-1520357456831-2068fbd28cee?auto=format&fit=crop&w=520&q=80",
    creator: "Natalie Pierce",
    duration: "0:38",
    views: 18980,
    postedAt: "2025-01-05T18:45:00Z",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
  },
  {
    id: "reel-demo-3",
    title: "Light Tests at The Loft",
    poster: "https://images.unsplash.com/photo-1521292270410-a8c07b3f5c4a?auto=format&fit=crop&w=520&q=80",
    creator: "Beechwood Studio",
    duration: "0:54",
    views: 24750,
    postedAt: "2024-12-29T09:30:00Z",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
  },
  {
    id: "reel-demo-4",
    title: "Crash Zooms & Coffee Runs",
    poster: "https://images.unsplash.com/photo-1520013333352-744949c868b7?auto=format&fit=crop&w=520&q=80",
    creator: "Jacob Kent",
    duration: "0:41",
    views: 16800,
    postedAt: "2025-01-10T11:05:00Z",
    src: "https://media.w3.org/2010/05/video/big_buck_bunny.mp4",
  },
];

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

/* -------------------------
   Player Overlay (inline styles)
------------------------- */
function PlayerOverlay({ video, onClose }) {
  if (!video) return null;

  const isYouTube = (url = "") =>
    /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
  const isVimeo = (url = "") => /vimeo\.com\/\d+/i.test(url);
  const getYouTubeId = (url = "") => {
    const y1 = url.match(/[?&]v=([^&]+)/);
    const y2 = url.match(/youtu\.be\/([^?]+)/);
    return (y1 && y1[1]) || (y2 && y2[1]) || "";
  };
  const getVimeoId = (url = "") => {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return (m && m[1]) || "";
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = video.src || "";
  const canNativeVideo =
    src.startsWith("blob:") ||
    /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(src) ||
    src.startsWith("data:video");

  const S = {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.7)",
      zIndex: 4000,
    },
    wrap: {
      position: "fixed",
      inset: 0,
      margin: "auto",
      width: "min(1100px, 96vw)",
      height: "min(70vh, 70dvh)",
      background: "#0b0b0f",
      border: "1px solid #2f3240",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,.65)",
      zIndex: 4001,
      display: "grid",
      gridTemplateRows: "1fr auto",
      overflow: "hidden",
    },
    close: {
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
    },
    stage: { background: "#000" },
    meta: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      borderTop: "1px solid #20222a",
      background: "#121218",
    },
    title: { margin: 0, fontSize: "1rem", fontWeight: 700, color: "#e8e8e8" },
    info: { display: "flex", gap: 12, color: "#9aa0a6", fontSize: ".9rem" },
    fallback: {
      height: "100%",
      display: "grid",
      placeItems: "center",
      color: "#ddd",
      padding: 20,
      textAlign: "center",
    },
  };

  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.wrap} role='dialog' aria-modal='true'>
        <button style={S.close} onClick={onClose} aria-label='Close'>
          <X size={20} />
        </button>
        <div style={S.stage}>
          {canNativeVideo ? (
            <video
              src={src}
              controls
              autoPlay
              style={{ width: "100%", height: "100%", background: "#000" }}
            />
          ) : isYouTube(src) ? (
            <iframe
              title={video.title}
              src={`https://www.youtube.com/embed/${getYouTubeId(
                src
              )}?autoplay=1&rel=0`}
              allow='autoplay; fullscreen; picture-in-picture'
              referrerPolicy='strict-origin-when-cross-origin'
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                background: "#000",
              }}
            />
          ) : isVimeo(src) ? (
            <iframe
              title={video.title}
              src={`https://player.vimeo.com/video/${getVimeoId(
                src
              )}?autoplay=1`}
              allow='autoplay; fullscreen; picture-in-picture'
              referrerPolicy='strict-origin-when-cross-origin'
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                background: "#000",
              }}
            />
          ) : (
            <div style={S.fallback}>
              <p>Cannot play this URL. Use MP4/WebM or a YouTube/Vimeo link.</p>
            </div>
          )}
        </div>
        <div style={S.meta}>
          <h3 style={S.title}>{video.title}</h3>
          <div style={S.info}>
            <span>{video.date || "--"}</span>
            <span>{video.duration || "--"}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------
   Admin Login (inline styles)
------------------------- */
function AdminLoginModal({ open, onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const ADMIN_PIN = "2580";
  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
      onClose();
    } else {
      alert("Incorrect PIN");
    }
  };

  const S = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 3000,
    },
    modal: {
      position: "fixed",
      inset: 0,
      margin: "auto",
      width: "min(360px,90vw)",
      background: "#121218",
      borderRadius: 12,
      border: "1px solid #2f3240",
      padding: 20,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      zIndex: 3001,
    },
    input: {
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #2f3240",
      background: "#1a1b21",
      color: "#fff",
      fontSize: "1rem",
      outline: "none",
    },
    row: { display: "flex", justifyContent: "flex-end", gap: 8 },
    btn: {
      padding: "8px 14px",
      borderRadius: 8,
      cursor: "pointer",
      border: "1px solid #2f3240",
      background: "#20222a",
      color: "#fff",
      fontWeight: 600,
    },
    primary: { background: "#e50914", borderColor: "#e50914" },
  };

  return (
    <>
      <div style={S.overlay} onClick={onClose} />
      <form style={S.modal} onSubmit={submit}>
        <h3 style={{ margin: 0, textAlign: "center" }}>Admin Access</h3>
        <input
          type='password'
          style={S.input}
          placeholder='Enter PIN'
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        <div style={S.row}>
          <button type='button' style={S.btn} onClick={onClose}>
            Cancel
          </button>
          <button type='submit' style={{ ...S.btn, ...S.primary }}>
            Unlock
          </button>
        </div>
      </form>
    </>
  );
}

/* -------------------------
   Upload Modal (inline styles; full fields)
------------------------- */
function UploadModal({ open, onClose, onAdd }) {
  if (!open) return null;

  const [title, setTitle] = useState("");
  const [src, setSrc] = useState("");
  const [thumbnail, setThumb] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState("");
  const [library, setLibrary] = useState("vids");
  const [tags, setTags] = useState("");
  const [fileName, setFileName] = useState("");

  const makeThumb = (videoEl) =>
    new Promise((resolve) => {
      const targetTime = Math.min(1.0, (videoEl.duration || 2) * 0.1);
      const shoot = () => {
        const vw = videoEl.videoWidth || 480;
        const vh = videoEl.videoHeight || 270;
        const w = Math.max(480, vw);
        const h = Math.round((w * vh) / vw) || 270;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(videoEl, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      const onSeeked = () => {
        videoEl.removeEventListener("seeked", onSeeked);
        shoot();
      };
      if (!isNaN(videoEl.duration) && isFinite(videoEl.duration)) {
        videoEl.addEventListener("seeked", onSeeked);
        try {
          videoEl.currentTime = targetTime;
        } catch {
          shoot();
        }
      } else shoot();
    });

  const handlePickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const blobUrl = URL.createObjectURL(f);
    setSrc(blobUrl);

    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    v.src = blobUrl;
    v.onloadedmetadata = async () => {
      if (!isNaN(v.duration) && isFinite(v.duration)) {
        const m = Math.floor(v.duration / 60);
        const s = Math.round(v.duration % 60)
          .toString()
          .padStart(2, "0");
        setDuration(`${m}:${s}`);
      }
      try {
        const dataUrl = await makeThumb(v);
        setThumb(dataUrl);
      } catch {}
      v.remove();
    };

    if (!title.trim())
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " "));
    if (!date.trim()) setDate(new Date().toISOString().slice(0, 10));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !src.trim()) return;

    onAdd({
      title: title.trim(),
      src: src.trim(),
      thumbnail: thumbnail.trim(),
      duration: duration.trim(),
      date: date.trim(),
      library: library.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source: src.startsWith("blob:") ? "local" : "custom",
      fileName: fileName || undefined,
    });
    onClose();
  };

  const S = {
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.55)",
      zIndex: 3000,
    },
    card: {
      position: "fixed",
      inset: 0,
      margin: "auto",
      width: "min(720px, 92vw)",
      background: "#121218",
      color: "#eee",
      border: "1px solid #2f3240",
      borderRadius: 12,
      boxShadow: "0 10px 40px rgba(0,0,0,.6)",
      zIndex: 3001,
      padding: 16,
    },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid #222536",
      paddingBottom: 8,
      marginBottom: 12,
    },
    form: { display: "flex", flexDirection: "column", gap: 10 },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    label: { display: "flex", flexDirection: "column", gap: 6 },
    input: {
      background: "#1a1b21",
      border: "1px solid #2f3240",
      color: "#eee",
      borderRadius: 8,
      padding: "10px 12px",
      outline: "none",
    },
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 6,
    },
    sectionLabel: { fontSize: ".9rem", color: "#b9bcc6", fontWeight: 500 },
    typeWrap: { display: "flex", flexDirection: "column", gap: 8 },
    typeGroup: { display: "flex", gap: 10 },
    typeBtn: {
      flex: "1 1 0",
      padding: "10px 0",
      borderRadius: 8,
      border: "1px solid #2f3240",
      background: "#1a1b21",
      color: "#e7e7e7",
      fontWeight: 600,
      cursor: "pointer",
      transition: "border-color .2s ease, box-shadow .2s ease, background .2s ease",
    },
    typeActive: {
      borderColor: "#e50914",
      boxShadow: "0 0 18px rgba(229,9,20,.35)",
      background: "#21141a",
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
      background: "#e50914",
      borderColor: "#e50914",
      boxShadow: "0 0 10px rgba(229,9,20,.35)",
    },
  };

  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.card} role='dialog' aria-modal='true'>
        <div style={S.head}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>Add a Video</h3>
          <button onClick={onClose} style={S.btn}>
            ✕
          </button>
        </div>

        <form style={S.form} onSubmit={submit}>
          <div style={S.row}>
            <label style={S.label}>
              <span>Choose local file</span>
              <input
                type='file'
                accept='video/*'
                onChange={handlePickFile}
                style={S.input}
              />
            </label>
            <label style={S.label}>
              <span>or Paste a video URL</span>
              <input
                style={S.input}
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                placeholder='https://…'
              />
            </label>
          </div>

          <label style={S.label}>
            <span>Title</span>
            <input
              style={S.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label style={S.label}>
            <span>Thumbnail URL (auto if you picked a file)</span>
            <input
              style={S.input}
              value={thumbnail}
              onChange={(e) => setThumb(e.target.value)}
              placeholder='https://… or data:image/…'
            />
          </label>

          <div style={S.row}>
            <label style={S.label}>
              <span>Duration</span>
              <input
                style={S.input}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder='mm:ss'
              />
            </label>
            <label style={S.label}>
              <span>Date</span>
              <input
                style={S.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder='YYYY-MM-DD'
              />
            </label>
          </div>

          <div style={S.row}>
            <div style={{ ...S.label, ...S.typeWrap }}>
              <span style={S.sectionLabel}>Video Type</span>
              <div style={S.typeGroup}>
                <button
                  type='button'
                  style={{
                    ...S.typeBtn,
                    ...(library === "vids" ? S.typeActive : {}),
                  }}
                  onClick={() => setLibrary("vids")}
                >
                  Vids
                </button>
                <button
                  type='button'
                  style={{
                    ...S.typeBtn,
                    ...(library === "reels" ? S.typeActive : {}),
                  }}
                  onClick={() => setLibrary("reels")}
                >
                  Reels
                </button>
              </div>
            </div>
            <label style={S.label}>
              <span>Tags (comma separated)</span>
              <input
                style={S.input}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder='vid, community'
              />
            </label>
          </div>

          <div style={S.actions}>
            <button type='button' style={S.btn} onClick={onClose}>
              Cancel
            </button>
            <button type='submit' style={{ ...S.btn, ...S.primary }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* -------------------------
   Edit Profile Modal
------------------------- */
function EditProfileModal({ open, onClose, profile, onSave }) {
  const [name, setName] = useState(profile?.name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [hometown, setHometown] = useState(profile?.hometown || "");
  const [photo, setPhoto] = useState(profile?.photo || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [youtube, setYoutube] = useState(profile?.youtube || "");
  const [tiktok, setTiktok] = useState(profile?.tiktok || "");
  const [instagram, setInstagram] = useState(profile?.instagram || "");
  const [facebook, setFacebook] = useState(profile?.facebook || "");

  useEffect(() => {
    if (open) {
      setName(profile?.name || "");
      setBio(profile?.bio || "");
      setHometown(profile?.hometown || "");
      setPhoto(profile?.photo || "");
      setPhone(profile?.phone || "");
      setEmail(profile?.email || "");
      setWhatsapp(profile?.whatsapp || "");
      setYoutube(profile?.youtube || "");
      setTiktok(profile?.tiktok || "");
      setInstagram(profile?.instagram || "");
      setFacebook(profile?.facebook || "");
    }
  }, [open, profile]);

  if (!open) return null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({
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
    });
    onClose();
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
    form: { display: "flex", flexDirection: "column", gap: 14 },
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
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
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
    primary: { background: "#e50914", borderColor: "#e50914" },
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

        <div style={S.actions}>
          <button type='button' style={S.btn} onClick={onClose}>
            Cancel
          </button>
          <button type='submit' style={{ ...S.btn, ...S.primary }}>
            Save
          </button>
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
  const {
    videos,
    favorites = [],
    toggleFavorite,
    addVideo,
    removeVideo,
  } = useLibraryStore();
  const { profile, updateProfile } = useProfileStore();
  const {
    isAuthed: adminAuthed,
    showLogin,
    showUpload,
    closeLogin,
    closeUpload,
    markAuthed,
  } = useAdminPanel();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const enrichReel = useCallback((video, index = 0) => {
    const poster = video.poster || video.thumbnail;
    const rawViews =
      video.views ??
      video.playCount ??
      video.metrics?.views ??
      video.stats?.views ??
      null;
    const numericViews = Number(rawViews);
    const viewsLabel = Number.isFinite(numericViews) && numericViews > 0
      ? formatViews(numericViews)
      : typeof rawViews === "string"
      ? rawViews
      : undefined;
    const ageSource = video.postedAt || video.date || video.createdAt;
    const ageLabel = ageSource ? formatAge(ageSource) : undefined;
    const duration =
      video.duration || FALLBACK_REEL_DURATIONS[index % FALLBACK_REEL_DURATIONS.length];

    return {
      ...video,
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

  const navigate = useNavigate();
  const activeSection =
    mode === "vids"
      ? "vids"
      : mode === "reels"
      ? "reels"
      : mode === "favorites"
      ? "favorites"
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
      const matchHandle = input.match(/@[\w.\-]+/);
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
      const match = raw.match(/@[\w.\-]+/);
      if (match) text = match[0];
      else {
        const handle = extractHandle(raw);
        text = handle ? `@${handle}` : raw.replace(/^https?:\/\/(www\.)?/i, "");
      }
    }

    return { label, text, href };
  };

  const showcaseVideos = useMemo(() => {
    if (!search?.trim()) return LIBRARY_SHOWCASE;
    const q = search.trim().toLowerCase();
    return LIBRARY_SHOWCASE.filter((video) =>
      video.title.toLowerCase().includes(q)
    );
  }, [search]);
  const showcaseCards = useMemo(
    () =>
      showcaseVideos.map((video) => ({
        ...video,
        stats: {
          views: formatViews(video.views),
          age: formatAge(video.postedAt),
        },
      })),
    [showcaseVideos]
  );
  const reelsList = useMemo(() => {
    const reelsFromLibrary =
      videos?.filter(
        (video) => (video.library || "").toLowerCase() === "reels"
      ) || [];
    return reelsFromLibrary.length > 0 ? reelsFromLibrary : REELS_SHOWCASE;
  }, [videos]);
  const reelCards = useMemo(
    () => reelsList.map((video, index) => enrichReel(video, index)),
    [reelsList, enrichReel]
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
  const sanitizePhone = useCallback((value = "") => value.replace(/[^\d+]/g, ""), []);
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
        href: whatsappValue && whatsappSanitized ? `https://wa.me/${whatsappSanitized}` : null,
        placeholder: "Add your WhatsApp",
      },
    ];
  }, [profile, sanitizePhone]);
  const aboutHandle = profile?.name
    ? `@${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
    : "@your_profile";
  const hometownDisplay = profile?.hometown
    ? profile.hometown
    : "Add your hometown";

  const onAdminSuccess = () => {
    markAuthed();
  };

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

  const filtered = useMemo(() => {
    let list = videos || [];
    if (activeSection === "vids")
      list = list.filter((v) => {
        const tag = (v.library || "").toLowerCase();
        return tag === "vids" || tag === "videos" || tag === "docs" || tag === "documentaries";
      });
    else if (activeSection === "reels")
      list = list.filter(
        (v) => (v.library || "").toLowerCase() === "reels"
      );
    else if (activeSection === "favorites")
      list = list.filter((v) => favorites.includes(v.id));
    else if (activeSection === "home")
      list = list.filter((v) => {
        const tag = (v.library || "").toLowerCase();
        return tag !== "reels";
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
  }, [videos, activeSection, favorites, search, mode]);

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
    return filtered.map((video) => ({ ...video }));
  }, [activeSection, filtered]);
  const favoritesPageCards = useMemo(() => {
    if (activeSection !== "favorites") return [];
    return filtered.map((video) => ({ ...video }));
  }, [activeSection, filtered]);

  const isLibraryVideo = useCallback(
    (video) => Boolean(video) && (typeof video.id === "number" || video.source === "custom" || video.__fromLibrary),
    []
  );

  const requestDelete = useCallback(
    (video) => {
      if (!adminAuthed) return;
      if (!isLibraryVideo(video)) return;
      setDeleteTarget(video);
    },
    [adminAuthed, isLibraryVideo]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    removeVideo(deleteTarget.id);
    if (playing && playing.id === deleteTarget.id) {
      setPlaying(null);
    }
    setDeleteTarget(null);
  }, [deleteTarget, removeVideo, playing]);

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

      <main className='bf-libraryMain' role='main'>
          {activeSection === "about" ? (
            <section className='bf-aboutSection is-full'>
              <div className='bf-aboutProfileFlow'>
                <div className='bf-aboutAvatarFlow'>
                  <img
                    src={
                      profile?.photo ||
                      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80"
                    }
                    alt={profile?.name || "Profile"}
                  />
                </div>
                <h1 className='bf-aboutName'>{profile?.name || "Add your name"}</h1>
                <div className='bf-aboutSubline'>Based in {hometownDisplay}</div>
                <button
                  className='bf-aboutEditBtn'
                  onClick={() => setShowProfileEdit(true)}
                >
                  <Pencil size={16} />
                  <span>Edit Profile</span>
                </button>
              </div>
              <div className='bf-aboutColumnsFlow'>
                <section aria-label='Bio'>
                  <h3>Bio</h3>
                  <p>
                    {profile?.bio || "Use the edit button to tell your story."}
                  </p>
                </section>
                <section aria-label='Contact Information'>
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
                          <span className='bf-aboutPlaceholder'>{item.placeholder}</span>
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
                          <a href={link.href} target='_blank' rel='noreferrer noopener'>
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
          ) : activeSection === "home" ? (
            <>
              <section className='bf-showcase' aria-label='Library spotlight videos'>
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
                      showDelete={adminAuthed && isLibraryVideo(video)}
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

              <section className='bf-showcase bf-showcase--reels' aria-label='Latest reels'>
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
                        showDelete={adminAuthed && isLibraryVideo(video)}
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
            <section className='bf-showcase bf-showcase--reels' aria-label='Reels library'>
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>Reels Library</h2>
                <p className='bf-showcase__subtitle'>All the social-ready cuts curated in one stream.</p>
              </div>
              {reelsPageCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {reelsPageCards.map((video) => (
                    <ReelsCard
                      key={`reel-${video.id}`}
                      video={video}
                      isFavorite={favorites.includes(video.id)}
                      showDelete={adminAuthed && isLibraryVideo(video)}
                      onPlay={setPlaying}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                      onShare={shareVideo}
                      onDelete={requestDelete}
                      stats={video.stats}
                    />
                  ))}
                </div>
              ) : (
                <div className='bf-showcase__empty'>
                  No reels matched your search.
                </div>
              )}
            </section>
          ) : activeSection === "vids" ? (
            <section className='bf-showcase bf-showcase--vids' aria-label='Vids library'>
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>Vids Library</h2>
                <p className='bf-showcase__subtitle'>All the long-form stories and behind-the-scenes features.</p>
              </div>
              {vidsPageCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {vidsPageCards.map((video) => (
                    <MCard
                      key={`vid-${video.id}`}
                      video={video}
                      variant='doc'
                      showDelete={adminAuthed && isLibraryVideo(video)}
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
            <section className='bf-showcase bf-showcase--favorites' aria-label='Favorites library'>
              <div className='bf-showcase__head'>
                <h2 className='bf-showcase__title'>Favorites Library</h2>
                <p className='bf-showcase__subtitle'>Hand-picked clips you’ve saved for quick access.</p>
              </div>
              {favoritesPageCards.length > 0 ? (
                <div className='bf-showcase__row'>
                  {favoritesPageCards.map((video) => (
                    <MCard
                      key={`fav-${video.id}`}
                      video={video}
                      variant='doc'
                      showDelete={adminAuthed && isLibraryVideo(video)}
                      onDelete={requestDelete}
                      onPlay={setPlaying}
                      isFavorite
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className='bf-showcase__empty'>You haven’t favorited any videos yet.</div>
              )}
            </section>
          ) : (
            <div id='library-grid' className='bf-grid'>
              {filtered.length === 0 ? (
                <div className='bf-empty'>No videos found.</div>
              ) : (
                filtered.map((v) => {
                  const favOn = favorites.includes(v.id);
                  return (
                    <MCard
                      key={v.id}
                      video={v}
                      variant='doc'
                      onPlay={setPlaying}
                      isFavorite={favOn}
                      showDelete={adminAuthed && isLibraryVideo(v)}
                      onDelete={requestDelete}
                      onToggleFavorite={(videoItem) => {
                        if (typeof toggleFavorite === "function")
                          toggleFavorite(videoItem.id);
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </main>

      {/* Modals */}
      <AdminLoginModal
        open={showLogin}
        onClose={closeLogin}
        onSuccess={onAdminSuccess}
      />
      <UploadModal
        open={adminAuthed && showUpload}
        onClose={closeUpload}
        onAdd={(video) => {
          const added = addVideo(video);
          const target = (video.library || "").toLowerCase();
          if (target === "reels") navigate("/reels");
          else navigate("/vids");
          return added;
        }}
      />
      <EditProfileModal
        open={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        profile={profile}
        onSave={updateProfile}
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
