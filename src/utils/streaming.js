const HLS_MODULE = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/+esm";
const DASH_MODULE = "https://cdn.jsdelivr.net/npm/dashjs@4.7.4/+esm";

const HLS_MIME_TYPES = new Set([
  "application/x-mpegurl",
  "application/vnd.apple.mpegurl"
]);

export const isHlsSource = (source) => {
  if (!source) return false;
  const { type = "", extension = "", url = "" } = source;
  if (HLS_MIME_TYPES.has(type.toLowerCase())) return true;
  if (extension?.toLowerCase() === "m3u8") return true;
  if (url && url.toLowerCase().includes(".m3u8")) return true;
  return false;
};

export const isDashSource = (source) => {
  if (!source) return false;
  const { type = "", extension = "", url = "" } = source;
  if (type?.toLowerCase() === "application/dash+xml") return true;
  if (extension?.toLowerCase() === "mpd") return true;
  if (url && url.toLowerCase().includes(".mpd")) return true;
  return false;
};

export const attachHlsStream = async (videoEl, src) => {
  if (!videoEl || !src) return () => {};

  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = src;
    return () => {
      if (videoEl.src === src) {
        videoEl.removeAttribute("src");
        videoEl.load();
      }
    };
  }

  const { default: Hls } = await import(HLS_MODULE);

  if (!Hls.isSupported()) {
    videoEl.src = src;
    return () => {
      if (videoEl.src === src) {
        videoEl.removeAttribute("src");
        videoEl.load();
      }
    };
  }

  const hls = new Hls({
    enableWorker: true,
    backBufferLength: 60,
    lowLatencyMode: true
  });

  hls.attachMedia(videoEl);
  hls.loadSource(src);

  return () => {
    hls.detachMedia();
    hls.destroy();
  };
};

export const attachDashStream = async (videoEl, src) => {
  if (!videoEl || !src) return () => {};

  const dashModule = await import(DASH_MODULE);
  const dashjs = dashModule.default || dashModule;
  const player = dashjs.MediaPlayer().create();
  player.updateSettings({
    streaming: {
      abr: { autoSwitchBitrate: { video: true } },
      lowLatencyEnabled: true,
      delay: 3
    }
  });
  player.initialize(videoEl, src, true);

  return () => {
    player.reset();
  };
};
