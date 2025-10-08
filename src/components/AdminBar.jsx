import React from "react";

export default function AdminBar({ isAdmin, onAdd, onUnlock, onLock }) {
  return isAdmin ? (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={onAdd}
        style={{
          border: "1px solid #f3c969",
          background: "#f3c969",
          color: "#0b0b0f",
          borderRadius: 8,
          padding: "8px 12px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        ＋ Add Film
      </button>
      <button
        onClick={onLock}
        style={{
          border: "1px solid #e35d6a",
          background: "transparent",
          color: "#e35d6a",
          borderRadius: 8,
          padding: "8px 12px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Lock
      </button>
    </div>
  ) : (
    <button
      onClick={onUnlock}
      style={{
        border: "1px solid #22232b",
        background: "#121218",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 12px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Unlock Admin
    </button>
  );
}
