import { useMemo } from "react";
import qrcode from "qrcode-generator";

interface QrCodeProps {
  value: string;
  size?: number;
}

// Real QR code (error correction M) drawn as SVG, dark modules on white with
// a quiet zone so phone cameras read it on the dark UI.
export default function QrCode({ value, size = 180 }: QrCodeProps) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      }
    }
    return { count: n + 8, path: d };
  }, [value]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges" role="img" aria-label={value}
      className="rounded-xl">
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#0d1017" />
    </svg>
  );
}
