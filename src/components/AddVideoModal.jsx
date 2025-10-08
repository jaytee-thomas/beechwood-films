import React, { useEffect, useRef, useState } from "react";
import useLibraryStore from "../store/useLibraryStore";

export default function AddVideoModal({ onClose }) {
  const addVideo = useLibraryStore((s) => s.addVideo);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState("");

  const overlayRef = useRef(null);
  const firstInputRef = useRef(null);

  // Focus first field when modal opens
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function onSubmit(e) {
    e.preventDefault();

    if (!title.trim() || !src.trim()) {
      alert("Please provide at least a Title and a Video URL.");
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    addVideo({
      title: title.trim(),
      thumbnail: thumbnail.trim(),
      src: src.trim(),
      duration: duration.trim(),
      tags: parsedTags,
    });

    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className='bf-modalOverlay'
      role='dialog'
      aria-modal='true'
      aria-labelledby='bf-addvideo-title'
      onClick={handleOverlayClick}
    >
      <div className='bf-modal'>
        <header className='bf-modalHeader'>
          <h2 id='bf-addvideo-title' className='bf-modalTitle'>
            ➕ Add Film
          </h2>
          <button className='bf-close' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </header>

        <form className='bf-modalBody' onSubmit={onSubmit}>
          <div className='bf-field'>
            <label className='bf-label'>Title *</label>
            <input
              ref={firstInputRef}
              className='bf-input'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Harlem Dancers'
              required
            />
          </div>

          <div className='bf-field'>
            <label className='bf-label'>Thumbnail URL</label>
            <input
              className='bf-input'
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder='https://example.com/poster.jpg'
            />
          </div>

          <div className='bf-field'>
            <label className='bf-label'>Video URL *</label>
            <input
              className='bf-input'
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder='https://…/video.mp4'
              required
            />
            <p className='bf-help'>
              MP4 (H.264/AAC) URLs play best across browsers.
            </p>
          </div>

          <div className='bf-row'>
            <div className='bf-field'>
              <label className='bf-label'>Duration</label>
              <input
                className='bf-input'
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder='14:47'
              />
            </div>

            <div className='bf-field'>
              <label className='bf-label'>Tags (comma-separated)</label>
              <input
                className='bf-input'
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder='doc, short'
              />
            </div>
          </div>

          <div className='bf-actionsRow'>
            <button
              type='button'
              className='bf-btn bf-btn--lock'
              onClick={onClose}
            >
              Cancel
            </button>
            <button type='submit' className='bf-btn bf-btn--add'>
              Save Film
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
