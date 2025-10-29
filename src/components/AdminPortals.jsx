import React, { useEffect, useState } from "react";
import { UserPlus, LogIn, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAdminPanel from "../store/useAdminPanel";
import useLibraryStore from "../store/useLibraryStore";
import useAuth from "../store/useAuth";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export function AuthModal({ open, view, onClose, onSwitch }) {
  const [animateIn, setAnimateIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [localError, setLocalError] = useState("");
  const [pending, setPending] = useState(false);
  const { login, register, guest, resetError, error } = useAuth();

  useEffect(() => {
    if (!open) return undefined;
    setEmail("");
    setPassword("");
    setName("");
    setSubscribe(true);
    setLocalError("");
    resetError();
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
  }, [open, onClose, resetError, view]);

  if (!open) return null;

  const isRegister = view === "register";
  const activeError = localError || error;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setLocalError("");
    try {
      if (isRegister) {
        await register({ email, password, name, subscribe });
      } else {
        await login({ email, password });
      }
      onClose();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setPending(false);
    }
  };

  const handleGuest = async () => {
    setPending(true);
    setLocalError("");
    try {
      await guest();
      onClose();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setPending(false);
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
        aria-labelledby='bf-authDrawerTitle'
      >
        <div className='bf-adminDrawer__head'>
          <div className='bf-adminDrawer__intro'>
            <h3 id='bf-authDrawerTitle' className='bf-adminDrawer__title'>
              {isRegister ? "Create your account" : "Welcome back"}
            </h3>
            <p className='bf-adminDrawer__sub'>
              {isRegister
                ? "Sign up to save favorites, get notified about new videos, and unlock more features."
                : "Sign in to access your library, notifications, and admin tools."}
            </p>
          </div>
          <button
            type='button'
            className='bf-adminDrawer__close'
            onClick={onClose}
            aria-label='Close authentication panel'
          >
            <X size={18} />
          </button>
        </div>

        <form className='bf-adminDrawer__form' onSubmit={handleSubmit}>
          {isRegister && (
            <label className='bf-adminDrawer__label'>
              Display name
              <input
                type='text'
                className='bf-adminDrawer__input'
                placeholder='Name for greetings'
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className='bf-adminDrawer__label'>
            Email
            <input
              type='email'
              className='bf-adminDrawer__input'
              placeholder='you@example.com'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className='bf-adminDrawer__label'>
            Password
            <input
              type='password'
              className='bf-adminDrawer__input'
              placeholder='••••••••'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {isRegister && (
            <label className='bf-adminDrawer__checkbox'>
              <input
                type='checkbox'
                checked={subscribe}
                onChange={(event) => setSubscribe(event.target.checked)}
              />
              Email me when new videos drop
            </label>
          )}

          {activeError && <div className='bf-adminDrawer__error'>{activeError}</div>}

          <div className='bf-adminDrawer__actions'>
            <button
              type='button'
              className='bf-adminDrawer__btn'
              onClick={handleGuest}
              disabled={pending}
            >
              Continue as guest
            </button>
            <button
              type='submit'
              className='bf-adminDrawer__btn bf-adminDrawer__btn--primary'
              disabled={pending}
            >
              {pending ? "Processing…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </div>
        </form>

        <div className='bf-adminDrawer__footer'>
          <button
            type='button'
            className='bf-authToggle'
            onClick={() => onSwitch(isRegister ? "login" : "register")}
          >
            {isRegister ? (
              <>
                <LogIn size={16} />
                <span>Already have an account? Sign in</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Need an account? Register</span>
              </>
            )}
          </button>
          <p className='bf-authHint'>
            Admins should sign in with the email configured on the server to unlock editing.
          </p>
        </div>
      </aside>
    </>
  );
}

function UploadModal({ open, onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState("");
  const [thumbnail, setThumb] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState("");
  const [library, setLibrary] = useState("videos");
  const [tags, setTags] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const token = useAuth((state) => state.token);

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
    setFile(f);
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
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    if (!date.trim()) setDate(new Date().toISOString().slice(0, 10));
  };

  const detectProvider = (url) => {
    if (!url) return { provider: "custom", embedUrl: "", providerId: null };
    const trimmed = url.trim();
    const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
    if (ytMatch) {
      const id = ytMatch[1];
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}`,
        providerId: id
      };
    }
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
    if (vimeoMatch) {
      const id = vimeoMatch[1];
      return {
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}`,
        providerId: id
      };
    }
    return {
      provider: "file",
      embedUrl: trimmed,
      providerId: fileName || null
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !src.trim()) return;

    setSaving(true);
    setError("");
    try {
      const trimmedSrc = src.trim();
      const { provider, embedUrl, providerId } = detectProvider(trimmedSrc);

      let finalSrc = trimmedSrc;
      let finalThumbnail = thumbnail.trim();
      let finalProvider = provider;
      let finalProviderId = providerId;
      let finalSource = trimmedSrc.startsWith("blob:") ? "local" : "custom";

      if (file && trimmedSrc.startsWith("blob:")) {
        if (!token) {
          throw new Error("You need to sign in again to upload files.");
        }

        const presignResponse = await fetch(`${API_BASE}/api/uploads/presign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream"
          })
        });

        if (!presignResponse.ok) {
          throw new Error(
            `Failed to prepare upload (status ${presignResponse.status})`
          );
        }

        const presign = await presignResponse.json();
        const uploadHeaders = new Headers(presign.headers || {});
        if (uploadHeaders.has("x-amz-acl")) {
          uploadHeaders.delete("x-amz-acl");
        }
        if (!uploadHeaders.has("Content-Type")) {
          uploadHeaders.set(
            "Content-Type",
            file.type || "application/octet-stream"
          );
        }

        const uploadResponse = await fetch(presign.uploadUrl, {
          method: presign.method || "PUT",
          headers: Object.fromEntries(uploadHeaders.entries()),
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed. Please try again.");
        }

        finalSrc = presign.fileUrl;
        finalProvider = "file";
        finalProviderId = presign.key;
        finalSource = "upload";

        if (!finalThumbnail && file.type?.startsWith("image/")) {
          finalThumbnail = presign.fileUrl;
        }
      }

      await onAdd({
        title: title.trim(),
        embedUrl: embedUrl || finalSrc,
        src: finalSrc,
        provider: finalProvider,
        providerId: finalProviderId,
        thumbnail: finalThumbnail,
        previewSrc:
          finalSource === "upload"
            ? undefined
            : trimmedSrc.startsWith("blob:")
            ? trimmedSrc
            : undefined,
        duration: duration.trim(),
        date: date.trim(),
        library: library.trim().toLowerCase(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        source: finalSource,
        fileName: fileName || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save video");
    } finally {
      setSaving(false);
    }
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
    error: {
      marginTop: 8,
      background: "rgba(240, 74, 111, 0.14)",
      border: "1px solid rgba(240, 74, 111, 0.4)",
      color: "#ff9ab6",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: "0.9rem",
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

  return open ? (
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
                    ...(library === "videos" ? S.typeActive : {}),
                  }}
                  onClick={() => setLibrary("videos")}
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
                <button
                  type='button'
                  style={{
                    ...S.typeBtn,
                    ...(library === "nsfw" ? S.typeActive : {}),
                  }}
                  onClick={() => setLibrary("nsfw")}
                >
                  NSFW
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

          {error && <div style={S.error}>{error}</div>}

          <div style={S.actions}>
            <button type='button' style={S.btn} onClick={onClose}>
              Cancel
            </button>
            <button
              type='submit'
              style={{ ...S.btn, ...S.primary, opacity: saving ? 0.7 : 1 }}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  ) : null;
}

export default function AdminPortals() {
  const navigate = useNavigate();
  const { addVideo } = useLibraryStore();
  const {
    showAuth,
    authView,
    closeAuth,
    setAuthView,
    showUpload,
    closeUpload,
  } = useAdminPanel();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) closeUpload();
  }, [isAdmin, closeUpload]);

  return (
    <>
      <AuthModal
        open={showAuth}
        view={authView}
        onClose={closeAuth}
        onSwitch={setAuthView}
      />
      <UploadModal
        open={isAdmin && showUpload}
        onClose={closeUpload}
        onAdd={async (video) => {
          const created = await addVideo(video);
          const target = (created?.library || video.library || "").toLowerCase();
          if (target === "reels") navigate("/reels");
          else navigate("/vids");
          return created;
        }}
      />
    </>
  );
}
