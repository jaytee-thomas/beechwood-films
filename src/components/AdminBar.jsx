import React from "react";

export default function AdminBar({
  isAdmin,
  onAdd,
  onUnlock,
  onLock,
  onClearProgress,
  onClearFavorites,
  onChangePin, // ✅ new
}) {
  return (
    <div className='bf-adminbar'>
      {!isAdmin ? (
        <button className='bf-btn bf-btn--brand' onClick={onUnlock}>
          🔓 Admin
        </button>
      ) : (
        <>
          <button className='bf-btn bf-btn--add' onClick={onAdd}>
            ➕ Add
          </button>
          <button className='bf-btn bf-btn--warn' onClick={onClearProgress}>
            🕒 Clear Progress
          </button>
          <button className='bf-btn bf-btn--warn' onClick={onClearFavorites}>
            💔 Clear Favorites
          </button>
          <button className='bf-btn bf-btn--brand' onClick={onChangePin}>
            🔑 Change PIN
          </button>
          <button className='bf-btn bf-btn--lock' onClick={onLock}>
            🔒 Lock
          </button>
        </>
      )}
    </div>
  );
}
