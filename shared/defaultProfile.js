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
  name: "Jay In Nashville",
  bio: "Filmmaker and storyteller capturing the rhythm of Nashville and beyond.",
  hometown: "Nashville, TN",
  photo: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80",
  wallpaper: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80",
  phone: "(615) 555-0102",
  email: "jay@beechwoodfilms.com",
  whatsapp: "+1 615 555 0102",
  youtube: "@Jay_In_Nashville",
  tiktok: "@Jay_In_Nashville",
  instagram: "@Jay_In_Nashville",
  facebook: "JayInNashville"
});

export const createDefaultProfile = () => ({ ...baseProfile });

export default baseProfile;
