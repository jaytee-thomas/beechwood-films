export const profileFields = [
  "name",
  "bio",
  "hometown",
  "photo",
  "wallpaper",
  "phone",
  "email",
  "whatsapp",
  "youtube",
  "tiktok",
  "instagram",
  "facebook"
];

const baseProfile = Object.freeze({
  name: "",
  bio: "",
  hometown: "",
  photo: "",
  wallpaper: "",
  phone: "",
  email: "",
  whatsapp: "",
  youtube: "",
  tiktok: "",
  instagram: "",
  facebook: ""
});

export const createDefaultProfile = () => ({ ...baseProfile });

export default baseProfile;
