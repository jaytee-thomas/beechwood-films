import React, { useEffect, useRef, useState } from "react";

export default function ForgotPinModal({ onClose, masterCode, onResetPin }) {
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1 = verify code, 2 = set new PIN
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
    return /^\d{4,12}$/.test(pin);
  }

  function verifyCode(e) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Enter the master code.");
      return;
    }
    if (code.trim() !== String(masterCode || "")) {
      setError("Master code is incorrect.");
      return;
    }
    setError("");
    setStep(2);
  }

  function setNewPin(e) {
    e.preventDefault();
    if (!validate(nextPin)) {
      setError("New PIN must be 4–12 digits.");
      return;
    }
    if (nextPin !== confirm) {
      setError("New PIN and confirmation do not match.");
      return;
    }
    onResetPin(nextPin);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className='bf-modalOverlay'
      role='dialog'
      aria-modal='true'
      aria-labelledby='bf-forgotpin-title'
      onClick={handleOverlayClick}
    >
      <div className='bf-modal'>
        <header className='bf-modalHeader'>
          <h2 id='bf-forgotpin-title' className='bf-modalTitle'>
            🆘 Reset Admin PIN
          </h2>
          <button className='bf-close' onClick={onClose} aria-label='Close'>
            ✕
          </button>
        </header>

        {step === 1 ? (
          <form className='bf-modalBody' onSubmit={verifyCode}>
            <div className='bf-field'>
              <label className='bf-label'>Master Code</label>
              <input
                ref={firstRef}
                className='bf-input'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='Enter your master code'
                required
              />
              {error ? <p className='bf-error'>{error}</p> : null}
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
                Verify
              </button>
            </div>
          </form>
        ) : (
          <form className='bf-modalBody' onSubmit={setNewPin}>
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
        )}
      </div>
    </div>
  );
}
