import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAdminPanel from "../store/useAdminPanel";
import useLibraryStore from "../store/useLibraryStore";

const ADMIN_PIN = "2580";

export function AdminLoginModal({ open, onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setPin("");
    const frame = requestAnimationFrame(() => setAnimateIn(true));
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      setAnimateIn(false);
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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

  return (
    <>
      <div
        className={`bf-adminOverlay ${animateIn ? "show" : ""}`}
        onClick={onClose}
        role='presentation'
      />
      <aside
        className={`bf-adminDrawer ${animateIn ? "is-open" : ""}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby='bf-adminDrawerTitle'
      >
        <div className='bf-adminDrawer__head'>
          <div className='bf-adminDrawer__intro'>
            <h3 id='bf-adminDrawerTitle' className='bf-adminDrawer__title'>
              Admin Access
            </h3>
            <p className='bf-adminDrawer__sub'>
              Enter your admin PIN to unlock editing tools, upload videos, and manage the library.
            </p>
          </div>
          <button
            type='button'
            className='bf-adminDrawer__close'
            onClick={onClose}
            aria-label='Close admin panel'
          >
            <X size={18} />
          </button>
        </div>

        <form className='bf-adminDrawer__form' onSubmit={submit}>
          <label className='bf-adminDrawer__label'>
            Admin PIN
            <input
              type='password'
              className='bf-adminDrawer__input'
              placeholder='Enter PIN'
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </label>
          <div className='bf-adminDrawer__actions'>
            <button
              type='button'
              className='bf-adminDrawer__btn'
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='bf-adminDrawer__btn bf-adminDrawer__btn--primary'
            >
              Unlock
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

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
      borderColor: "var(--accent-border)",
      boxShadow: "0 0 18px var(--accent-glow)",
      background: "rgba(81, 99, 199, 0.18)",
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
      boxShadow: "0 0 10px var(--accent-glow)",
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

export default function AdminPortals() {
  const navigate = useNavigate();
  const { addVideo } = useLibraryStore();
  const {
    isAuthed,
    showLogin,
    closeLogin,
    markAuthed,
    showUpload,
    closeUpload,
  } = useAdminPanel();

  return (
    <>
      <AdminLoginModal
        open={showLogin}
        onClose={closeLogin}
        onSuccess={markAuthed}
      />
      <UploadModal
        open={isAuthed && showUpload}
        onClose={closeUpload}
        onAdd={(video) => {
          const added = addVideo(video);
          const target = (video.library || "").toLowerCase();
          if (target === "reels") navigate("/reels");
          else navigate("/vids");
          return added;
        }}
      />
    </>
  );
}
