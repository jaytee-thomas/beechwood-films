import db from "./client.js";
import { createDefaultProfile, profileFields } from "../../shared/defaultProfile.js";

const PROFILE_ID = "default_profile";

const statements = {
  select: null,
  selectFull: null,
  upsert: null
};

const quotedFields = profileFields.map((field) => `"${field}"`).join(", ");
const valuePlaceholders = profileFields.map((field) => `@${field}`).join(", ");
const updateAssignments = profileFields
  .map((field) => `"${field}" = excluded."${field}"`)
  .join(", ");

const prepareStatements = () => {
  if (statements.select) return;
  statements.select = db.prepare(
    `SELECT ${quotedFields} FROM profile WHERE id = ?`
  );
  statements.selectFull = db.prepare(
    `SELECT ${quotedFields}, updated_at FROM profile WHERE id = ?`
  );
  statements.upsert = db.prepare(
    `INSERT INTO profile (id, ${quotedFields}, updated_at)
     VALUES (@id, ${valuePlaceholders}, @updated_at)
     ON CONFLICT(id) DO UPDATE SET ${updateAssignments}, updated_at = excluded.updated_at`
  );
};

export const getProfile = () => {
  prepareStatements();
  const row = statements.select.get(PROFILE_ID);
  if (!row) {
    return createDefaultProfile();
  }
  const profile = {};
  for (const field of profileFields) {
    profile[field] = row[field] ?? "";
  }
  return profile;
};

export const saveProfile = (updates) => {
  prepareStatements();
  const base = getProfile();
  const next = { ...base };
  for (const field of profileFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      next[field] = updates[field];
    }
  }
  statements.upsert.run({
    id: PROFILE_ID,
    ...next,
    updated_at: Date.now()
  });
  return getProfile();
};

export const getProfileWithMeta = () => {
  prepareStatements();
  const row = statements.selectFull.get(PROFILE_ID);
  if (!row) {
    return { ...createDefaultProfile(), updated_at: null };
  }
  const profile = {};
  for (const field of profileFields) {
    profile[field] = row[field] ?? "";
  }
  return { ...profile, updated_at: row.updated_at };
};
