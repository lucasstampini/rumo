const COLORS = ["#b84a22", "#2f5fc4", "#8a3fc0", "#0d7442", "#c23b3b", "#a86400", "#4a5a52"];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

/** Foto da pessoa ou a inicial sobre uma cor estável por nome. */
export function Avatar({
  name,
  url,
  size = 44,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return (
    <div
      className="av"
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: url ? "var(--color-green-l)" : colorFor(name),
      }}
    >
      {url ? <img src={url} alt="" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );
}
