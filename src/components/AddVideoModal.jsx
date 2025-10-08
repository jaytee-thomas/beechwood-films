import React, { useState } from "react";
import useLibraryStore from "../store/useLibraryStore";

export default function AddVideoModal({ onClose }) {
  const addVideo = useLibraryStore((s) => s.addVideo);
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [duration, setDuration] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!title || !src) {
      alert("Title and Video URL are required.");
      return;
    }
    addVideo({ title, src, thumbnail, duration, tags: [] });
    onClose();
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Add Film</h3>
        <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
          <input
            placeholder='Title *'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder='Video URL (MP4) *'
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder='Thumbnail URL'
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder='Duration (e.g., 12:34)'
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={styles.input}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type='submit' style={styles.primary}>
              Save
            </button>
            <button type='button' onClick={onClose} style={styles.ghost}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#121218",
    color: "#fff",
    border: "1px solid #22232b",
    borderRadius: 12,
    padding: 16,
  },
  input: {
    background: "#0b0b0f",
    color: "#fff",
    border: "1px solid #22232b",
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
  },
  primary: {
    border: "1px solid #f3c969",
    background: "#f3c969",
    color: "#0b0b0f",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
  ghost: {
    border: "1px solid #22232b",
    background: "transparent",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
};
