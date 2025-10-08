import React, { useEffect, useRef } from "react";

export default function ConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onCancel();
  }

  return (
    <div
      ref={overlayRef}
      className='bf-modalOverlay'
      role='dialog'
      aria-modal='true'
      aria-labelledby='bf-confirm-title'
      onClick={handleOverlayClick}
    >
      <div className='bf-modal'>
        <header className='bf-modalHeader'>
          <h2 id='bf-confirm-title' className='bf-modalTitle'>
            {title}
          </h2>
          <button className='bf-close' onClick={onCancel} aria-label='Close'>
            ✕
          </button>
        </header>

        <div className='bf-modalBody'>
          <p style={{ color: "var(--text)" }}>{message}</p>

          <div className='bf-actionsRow'>
            <button
              type='button'
              className='bf-btn bf-btn--lock'
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type='button'
              className='bf-btn bf-btn--warn'
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
