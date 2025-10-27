import db from "./client.js";
import { createDefaultProfile, profileFields } from "../../shared/defaultProfile.js";

const PROFILE_ID = "default_profile";

const selectProfile = db.prepare(
  `SELECT ${profileFields.map((field) => `${field}`).join(", ")} FROM profile WHERE id = ?`
);

const selectFullProfile = db.prepare(
  `SELECT ${profileFields.map((field) => `${field}`).join(", ")}, updated_at FROM profile WHERE id = ?`
);

const upsertProfile = db.prepare(
  `INSERT INTO profile (id, ${profileFields.join(", ")}, updated_at)
   VALUES (@id, ${profileFields.map((field) => `@${field}`).join(", ")}, @updated_at)
   ON CONFLICT(id) DO UPDATE SET
     ${profileFields.map((field) => `${field} = excluded.${field}`).join(", ")},
     updated_at = excluded.updated_at`
);

export const getProfile = () => {
  const row = selectProfile.get(PROFILE_ID);
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
  const base = getProfile();
  const next = { ...base };
  for (const field of profileFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      next[field] = updates[field];
    }
  }
  upsertProfile.run({
    id: PROFILE_ID,
    ...next,
    updated_at: Date.now()
  });
  return getProfile();
};

export const getProfileWithMeta = () => {
  const row = selectFullProfile.get(PROFILE_ID);
  if (!row) {
    return { ...createDefaultProfile(), updated_at: null };
  }
  const profile = {};
  for (const field of profileFields) {
    profile[field] = row[field] ?? "";
  }
  return { ...profile, updated_at: row.updated_at };
};
