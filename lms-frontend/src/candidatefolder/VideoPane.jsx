import { useEffect, useRef } from "react";
import API_BASE_URL from "../../config";

function toStaticUrl(p) {
  if (!p) return "";
  const str = String(p).replaceAll("\\", "/");
  if (/^https?:\/\//i.test(str)) return str;
  const idx = str.toLowerCase().indexOf("/uploads/");
  const path = idx >= 0 ? str.slice(idx) : str;
  return `${API_BASE_URL}${path}`;
}

export default function VideoPane({ url, seekTo = 0 }) {
  const ref = useRef(null);
  const src = toStaticUrl(url);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;

    const playWhenReady = () => {
      try {
        if (Number.isFinite(seekTo)) el.currentTime = Math.max(0, seekTo);
        el.play().catch(() => {});
      } catch {}
    };

    if (el.readyState >= 1) playWhenReady();
    else el.addEventListener("loadedmetadata", playWhenReady, { once: true });
  }, [src, seekTo]);

  return (
    <div
      className="
        w-full
        h-[60vh] lg:h-[55vh] xl:h-[50vh]            /* ↓ reduced, responsive */
        max-h-[560px]
        rounded-2xl border border-slate-800
        bg-white/5 overflow-hidden
        flex items-center justify-center
      "
    >
      {!src ? (
        <div className="p-4 text-slate-300">Select a chapter/topic to play video</div>
      ) : (
        <video ref={ref} controls className="w-full h-full object-contain">
          <source src={src} />
          Your browser does not support HTML5 video.
        </video>
      )}
    </div>
  );
}
