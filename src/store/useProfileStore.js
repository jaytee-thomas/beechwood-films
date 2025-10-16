import { create } from "zustand";

const KEY_PROFILE = "bf_profile_v1";

const defaultProfile = {
  name: "Jay In Nashville",
  bio: "Filmmaker and storyteller capturing the rhythm of Nashville and beyond.",
  hometown: "Nashville, TN",
  photo:
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80",
  phone: "(615) 555-0102",
  email: "jay@beechwoodfilms.com",
  whatsapp: "+1 615 555 0102",
  youtube: "@Jay_In_Nashville",
  tiktok: "@Jay_In_Nashville",
  instagram: "@Jay_In_Nashville",
  facebook: "JayInNashville",
};

const readProfile = () => {
  try {
    const raw = localStorage.getItem(KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultProfile, ...parsed };
    }
  } catch {}
  return defaultProfile;
};

const writeProfile = (profile) => {
  try {
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  } catch {}
};

const useProfileStore = create((set) => ({
  profile: readProfile(),
  updateProfile: (updates) =>
    set((state) => {
      const profile = { ...state.profile, ...updates };
      writeProfile(profile);
      return { profile };
    }),
}));

export default useProfileStore;
