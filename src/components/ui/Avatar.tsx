const AVATAR_COLORS = ["#f0883e", "#3dd68c", "#6c8aff", "#c76dff", "#34d6c0", "#ff5c5c", "#ffb03d"];

interface AvatarProps {
  name: string;
  index?: number;
  size?: number;
}

export default function Avatar({ name, index = 0, size = 28 }: AvatarProps) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

export { AVATAR_COLORS };
