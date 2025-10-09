import React, { useState } from "react";

export default function ForgotPinModal({ onClose, masterCode, onResetPin }) {
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!code) return "Enter the master code.";
    if (code !== (masterCode ?? "")) return "Master code is incorrect.";
    if (!/^\d{4,8}$/.test(newPin)) return "New PIN must be 4–8 digits.";
    if (confirm !== newPin) return "PIN confirmation does not match.";
    return "";
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");
    setOkMsg("");
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      await Promise.resolve(onResetPin(newPin));
      setOkMsg("PIN reset! You’re now unlocked.");
      setTimeout(() => onClose?.(), 800);
    } catch {
      setError("Could not reset PIN. Try again.");
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
          <h2 className='bf-modalTitle'>🧩 Forgot PIN</h2>
        </div>

        <form onSubmit={handleSubmit} className='bf-modalBody'>
          <p className='bf-modalText'>
            Enter your <strong>master code</strong> to set a new admin PIN.
          </p>

          <label className='bf-label'>
            Master Code
            <input
              type='text'
              className='bf-input'
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='Paste your master code'
              autoFocus
            />
          </label>

          <div className='bf-formGrid'>
            <label className='bf-label'>
              New PIN
              <input
                type='password'
                inputMode='numeric'
                maxLength={8}
                className='bf-input'
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder='4–8 digits'
              />
            </label>

            <label className='bf-label'>
              Confirm New PIN
              <input
                type='password'
                inputMode='numeric'
                maxLength={8}
                className='bf-input'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder='Repeat new PIN'
              />
            </label>
          </div>

          {error && <div className='bf-error'>{error}</div>}
          {okMsg && <div className='bf-ok'>{okMsg}</div>}

          <div className='bf-modalActions'>
            <button
              type='submit'
              className='bf-btn bf-btn--primary'
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset PIN"}
            </button>
            <button
              type='button'
              className='bf-btn bf-btn--ghost'
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          <div className='bf-help'>
            Don’t have the master code? Contact the site owner.
          </div>
        </form>
      </div>
    </div>
  );
}
