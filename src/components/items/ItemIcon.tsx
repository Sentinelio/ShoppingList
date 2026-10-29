import { matchProductEmoji } from "../../lib/emojiMatcher";
import { getCategoryColor } from "../../data/categories";

interface ItemIconProps {
  /** Text used to pick the product emoji (usually item.original). */
  name: string;
  category: string;
  photo?: string | null;
  size?: number;
}

// Product icon on a rounded tile tinted with its category colour. The item's
// own photo wins over the emoji.
export default function ItemIcon({ name, category, photo, size = 40 }: ItemIconProps) {
  const color = getCategoryColor(category || "other");
  const radius = Math.round(size * 0.28);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        loading="lazy"
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      className="shrink-0 flex items-center justify-center select-none"
      style={{ width: size, height: size, borderRadius: radius, background: `${color}26` }}
      aria-hidden="true"
    >
      <span style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}>{matchProductEmoji(name).emoji}</span>
    </span>
  );
}
