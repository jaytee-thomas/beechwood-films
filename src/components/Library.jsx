import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, X, Pencil } from "lucide-react";
import useLibraryStore from "../store/useLibraryStore";
import useProfileStore from "../store/useProfileStore";
import useAdminPanel from "../store/useAdminPanel";
import MCard from "./MCard.jsx";
import ReelsCard from "./ReelsCard.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

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
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: "auto",
      paddingTop: 12,
      borderTop: "1px solid rgba(47,50,64,0.6)",
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
    primary: { background: "var(--accent-gradient)", borderColor: "var(--accent-border)" },
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
    removeVideo,
  } = useLibraryStore();
  const { profile, updateProfile } = useProfileStore();
  const { isAuthed: adminAuthed } = useAdminPanel();
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

  const showcaseVideos = useMemo(() => [], [videos, search]);
  const showcaseCards = useMemo(
    () =>
      showcaseVideos.map((video) => {
        const rawViews =
          video.stats?.views ??
          video.views ??
          video.playCount ??
          video.metrics?.views ??
          null;
        const viewsLabel = Number.isFinite(Number(rawViews))
          ? formatViews(Number(rawViews))
          : rawViews || undefined;
        const ageSource =
          video.stats?.ageSource ||
          video.postedAt ||
          video.date ||
          video.createdAt;
        const ageLabel =
          typeof video.stats?.age === "string"
            ? video.stats.age
            : ageSource
            ? formatAge(ageSource)
            : undefined;
        const stats =
          viewsLabel || ageLabel
            ? {
                views: viewsLabel,
                age: ageLabel,
              }
            : undefined;
        return {
          ...video,
          stats,
          __fromLibrary: true,
        };
      }),
    [showcaseVideos]
  );
  const reelCards = useMemo(() => [], [videos, enrichReel]);
  const socialLinks = useMemo(() => {
    const links = [];
    const push = (platform, label, value) => {
      const link = buildSocialLink(platform, label, value);
      if (link) links.push(link);
    };
    push("youtube", "YouTube", profile?.youtube);
    push("tiktok", "TikTok", profile?.tiktok);
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
  const profilePhoto =
    profile?.photo ||
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80";
  const profileBio = profile?.bio?.trim() || "";
  const aboutWallpaperStyle = useMemo(
    () => ({
      "--about-wallpaper": `url("${profilePhoto}")`,
    }),
    [profilePhoto]
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

      <main
        className={`bf-libraryMain${activeSection === "about" ? " is-about" : ""}`}
        role='main'
      >
          {activeSection === "about" ? (
            <section
              className='bf-aboutWallpaperSection'
              style={aboutWallpaperStyle}
              aria-label='About portrait'
            >
              {adminAuthed && (
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
                <div className='bf-aboutPrimary'>
                  <div className='bf-aboutPrimaryText'>
                    <span className='bf-aboutPrimaryHandle'>{aboutHandle}</span>
                    <h1>{profile?.name || "Add your name"}</h1>
                    <p className='bf-aboutPrimarySubline'>Based in {hometownDisplay}</p>
                  </div>
                </div>
                <div className='bf-aboutInfoBlocks'>
                  <section aria-label='Bio'>
                    <h3>Bio</h3>
                    <p>{profileBio || "Use the edit button to tell your story."}</p>
                  </section>
                  <section aria-label='Contact Information'>
                    <h3>Contact</h3>
                    <ul className='bf-aboutInfoList'>
                      {contactItems.map((item) => (
                        <li key={item.label}>
                          <span className='bf-aboutInfoLabel'>{item.label}</span>
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
                      <ul className='bf-aboutInfoList'>
                        {socialLinks.map((link) => (
                          <li key={link.label}>
                            <span className='bf-aboutInfoLabel'>{link.label}</span>
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
                <p className='bf-showcase__subtitle'>Add reels to your library to see them here.</p>
              </div>
              <div className='bf-showcase__empty'>No reels in your library yet.</div>
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
