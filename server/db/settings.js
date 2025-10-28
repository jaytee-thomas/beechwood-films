import db from "./client.js";

const ALLOWED_SETTINGS = new Set(["homeWallpaper"]);

export const getSettings = () => {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value ?? "";
  }
  return settings;
};

export const updateSettings = (updates = {}) => {
  const entries = Object.entries(updates).filter(([key]) => ALLOWED_SETTINGS.has(key));
  if (!entries.length) return getSettings();

  const insert = db.prepare(
    `INSERT INTO settings (key, value)
     VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  const runMany = db.transaction((items) => {
    for (const [key, value] of items) {
      const stored = typeof value === "string" ? value : value == null ? "" : String(value);
      insert.run({ key, value: stored.trim() });
    }
  });

  runMany(entries);
  return getSettings();
};
