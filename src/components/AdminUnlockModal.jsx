import React, { useState } from "react";

export default function AdminUnlockModal({ onClose, onSubmit, onForgot }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await onSubmit(pin);
      if (!ok) setError("Incorrect PIN. Please try again.");
      else onClose();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='bf-modalOverlay' onClick={onClose}>
      <div
        className='bf-modal glassy'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <div className='bf-modalHeader'>
          <h2 className='bf-modalTitle'>🔐 Admin Unlock</h2>
        </div>

        <form onSubmit={handleSubmit} className='bf-modalBody'>
          <p className='bf-modalText'>
            Enter your 4-digit admin PIN to unlock access.
          </p>

          <input
            type='password'
            maxLength={8}
            inputMode='numeric'
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder='Enter PIN'
            className='bf-input'
            autoFocus
          />

          {error && <div className='bf-error'>{error}</div>}

          <div className='bf-modalActions'>
            <button
              type='submit'
              className='bf-btn bf-btn--primary'
              disabled={loading || !pin}
            >
              {loading ? "Verifying..." : "Unlock"}
            </button>
            <button
              type='button'
              className='bf-btn bf-btn--ghost'
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          <button
            type='button'
            className='bf-forgotLink'
            onClick={onForgot}
            tabIndex={0}
          >
            Forgot PIN?
          </button>
        </form>
      </div>
    </div>
  );
}
