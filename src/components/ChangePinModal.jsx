import React, { useMemo, useState } from "react";

export default function ChangePinModal({
  onClose,
  getCurrentPin,
  onChangePin,
}) {
  const [current, setCurrent] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const effectivePin = useMemo(() => {
    try {
      return getCurrentPin?.() ?? "";
    } catch {
      return "";
    }
  }, [getCurrentPin]);

  function validate() {
    if (!current) return "Enter your current PIN.";
    if (current !== effectivePin) return "Current PIN is incorrect.";
    if (!/^\d{4,8}$/.test(nextPin)) return "New PIN must be 4–8 digits.";
    if (confirm !== nextPin) return "PIN confirmation does not match.";
    if (nextPin === current)
      return "New PIN must be different from current PIN.";
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
      await Promise.resolve(onChangePin(nextPin));
      setOkMsg("PIN updated!");
      setTimeout(() => onClose?.(), 650);
    } catch {
      setError("Could not update PIN. Try again.");
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
          <h2 className='bf-modalTitle'>🔒 Change Admin PIN</h2>
        </div>

        <form onSubmit={handleSubmit} className='bf-modalBody'>
          <div className='bf-formGrid'>
            <label className='bf-label'>
              Current PIN
              <input
                type='password'
                inputMode='numeric'
                maxLength={8}
                className='bf-input'
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder='••••'
                autoFocus
              />
            </label>

            <label className='bf-label'>
              New PIN
              <input
                type='password'
                inputMode='numeric'
                maxLength={8}
                className='bf-input'
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value)}
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
              {loading ? "Saving..." : "Save PIN"}
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
            Tip: Use a PIN you’ll remember but others won’t guess.
          </div>
        </form>
      </div>
    </div>
  );
}
