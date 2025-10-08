import React, { useEffect, useRef, useState } from "react";

export default function ChangePinModal({
  onClose,
  onChangePin,
  getCurrentPin,
}) {
  const [current, setCurrent] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function validate(pin) {
    // 4–12 digits recommended; tweak as you like
    return /^\d{4,12}$/.test(pin);
  }

  function submit(e) {
    e.preventDefault();
    const effective = getCurrentPin();
    if (current !== effective) {
      setError("Current PIN is incorrect.");
      return;
    }
    if (!validate(nextPin)) {
      setError("New PIN must be 4–12 digits.");
      return;
    }
    if (nextPin !== confirm) {
      setError("New PIN and confirmation do not match.");
      return;
    }
    onChangePin(nextPin);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className='bf-modalOverlay'
      role='dialog'
      aria-modal='true'
      aria-labelledby='bf-changepin-title'
      onClick={handleOverlayClick}
    >
      <div className='bf-modal'>
        <header className='bf-modalHeader'>
          <h2 id='bf-changepin-title' className='bf-modalTitle'>
            🔑 Change Admin PIN
          </h2>
          <button className='bf-close' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </header>

        <form className='bf-modalBody' onSubmit={submit}>
          <div className='bf-field'>
            <label className='bf-label'>Current PIN</label>
            <input
              ref={firstRef}
              className='bf-input'
              type='password'
              inputMode='numeric'
              pattern='[0-9]*'
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder='••••'
              required
            />
          </div>

          <div className='bf-row'>
            <div className='bf-field'>
              <label className='bf-label'>New PIN</label>
              <input
                className='bf-input'
                type='password'
                inputMode='numeric'
                pattern='[0-9]*'
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value)}
                placeholder='4–12 digits'
                required
              />
            </div>
            <div className='bf-field'>
              <label className='bf-label'>Confirm New PIN</label>
              <input
                className='bf-input'
                type='password'
                inputMode='numeric'
                pattern='[0-9]*'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder='Re-enter PIN'
                required
              />
            </div>
          </div>

          {error ? <p className='bf-error'>{error}</p> : null}

          <div className='bf-actionsRow'>
            <button
              type='button'
              className='bf-btn bf-btn--lock'
              onClick={onClose}
            >
              Cancel
            </button>
            <button type='submit' className='bf-btn bf-btn--add'>
              Save PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
