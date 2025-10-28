import db from "./client.js";
import { contentFields, createDefaultContent } from "../../shared/defaultContent.js";

const insertSql = `INSERT INTO content (key, value) VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value`;

export const getContent = () => {
  const rows = db.prepare("SELECT key, value FROM content").all();
  const defaults = createDefaultContent();
  const content = { ...defaults };
  for (const row of rows) {
    if (row.key in content) {
      content[row.key] = row.value ?? "";
    }
  }
  return content;
};

export const saveContent = (updates = {}) => {
  const entries = Object.entries(updates).filter(([key]) => contentFields.includes(key));
  if (!entries.length) return getContent();

  const insert = db.prepare(insertSql);
  const runMany = db.transaction((items) => {
    for (const [key, value] of items) {
      insert.run({ key, value: typeof value === "string" ? value : value == null ? "" : String(value) });
    }
  });

  runMany(entries);
  return getContent();
};
