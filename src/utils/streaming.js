export const isHlsSource = (source) => {
  if (!source) return false;
  const { type = "", extension = "", url = "" } = source;
  const lowerType = type.toLowerCase();
  if (lowerType === "application/x-mpegurl" || lowerType === "application/vnd.apple.mpegurl") {
    return true;
  }
  const lowerExt = extension.toLowerCase();
  if (lowerExt === "m3u8") return true;
  if (url && url.toLowerCase().includes(".m3u8")) return true;
  return false;
};

export const isDashSource = (source) => {
  if (!source) return false;
  const { type = "", extension = "", url = "" } = source;
  const lowerType = type.toLowerCase();
  if (lowerType === "application/dash+xml") return true;
  const lowerExt = extension.toLowerCase();
  if (lowerExt === "mpd") return true;
  if (url && url.toLowerCase().includes(".mpd")) return true;
  return false;
};
