import { useMemo } from "react";
import API_BASE_URL from "../../config";

/** Normalize Windows-like absolute paths into served URLs under your backend. */
function toStaticUrl(p) {
  if (!p) return "";
  const str = String(p).replaceAll("\\", "/");
  if (/^https?:\/\//i.test(str)) return str;
  const idx = str.toLowerCase().indexOf("/uploads/");
  const path = idx >= 0 ? str.slice(idx) : str; // keep from /uploads/… if present
  return `${API_BASE_URL}${path}`;
}

/** Build a viewer URL that hides thumb/sidebar and jumps to a page. */
function viewerUrl(raw, page = 1) {
  const base = toStaticUrl(raw);
  if (!base) return "";
  // most browsers honor #page, plus we suppress viewer chrome as much as possible
  return `${base}#toolbar=1&navpanes=0&scrollbar=1&page=${Math.max(1, page)}`;
}

export default function PdfPane({ url, page = 1 }) {
  const src = useMemo(() => viewerUrl(url, page), [url, page]);

  return (
    <div
      className="
        relative
        w-full
        h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]
        rounded-2xl border border-slate-800
        bg-black/50 overflow-hidden
      "
    >
      {!src ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          Select a chapter/topic to load PDF
        </div>
      ) : (
        <iframe
          key={src}               // forces refresh when page changes
          title="Chapter PDF"
          src={src}
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
}
