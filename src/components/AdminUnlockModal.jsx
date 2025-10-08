import React, { useEffect, useRef, useState } from "react";

export default function AdminUnlockModal({ onClose, onSubmit, onForgot }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onSubmit(pin.trim());
    if (!ok) {
      setError("Incorrect PIN. Try again.");
      setPin("");
      inputRef.current?.focus();
      return;
    }
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className='bf-modalOverlay'
      role='dialog'
      aria-modal='true'
      aria-labelledby='bf-adminunlock-title'
      onClick={handleOverlayClick}
    >
      <div className='bf-modal'>
        <header className='bf-modalHeader'>
          <h2 id='bf-adminunlock-title' className='bf-modalTitle'>
            🔓 Admin Unlock
          </h2>
          <button className='bf-close' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </header>

        <form className='bf-modalBody' onSubmit={handleSubmit}>
          <div className='bf-field'>
            <label className='bf-label'>Enter PIN</label>
            <input
              ref={inputRef}
              className='bf-input'
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder='••••'
              type='password'
              inputMode='numeric'
              pattern='[0-9]*'
              required
            />
            {error ? <p className='bf-error'>{error}</p> : null}
          </div>

          <div
            className='bf-actionsRow'
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <button
              type='button'
              className='bf-linkLike'
              onClick={() => onForgot && onForgot()}
            >
              Forgot PIN?
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type='button'
                className='bf-btn bf-btn--lock'
                onClick={onClose}
              >
                Cancel
              </button>
              <button type='submit' className='bf-btn bf-btn--add'>
                Unlock
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
