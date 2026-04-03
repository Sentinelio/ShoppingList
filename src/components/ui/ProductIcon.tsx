import { matchProductEmoji } from "../../lib/emojiMatcher";

interface ProductIconProps {
  name: string;
  size?: number;
}

export default function ProductIcon({ name, size = 48 }: ProductIconProps) {
  const { emoji, color } = matchProductEmoji(name);
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}20`,
      }}
    >
      <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{emoji}</span>
    </div>
  );
}
