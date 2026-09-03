import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrBarcodeGeneratorProps {
  value: string;
  type?: "qr" | "barcode" | "both";
  label?: string;
  subLabel?: string;
  size?: number;
  className?: string;
}

export const QrBarcodeGenerator: React.FC<QrBarcodeGeneratorProps> = ({
  value,
  type = "qr",
  label,
  subLabel,
  size = 140,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: "#020617", // slate-950
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      },
      (error) => {
        if (error) console.error("QR Code render error:", error);
      }
    );
  }, [value, size]);

  return (
    <div
      className={`bg-white text-slate-950 p-2.5 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center justify-center font-mono ${className}`}
    >
      {/* QR CODE CANVAS */}
      {(type === "qr" || type === "both") && (
        <div className="bg-white p-1 rounded-lg">
          <canvas ref={canvasRef} className="rounded" />
        </div>
      )}

      {/* PSEUDO 1D BARCODE VISUALIZER */}
      {(type === "barcode" || type === "both") && (
        <div className="w-full flex flex-col items-center mt-1">
          <div className="h-10 w-full flex items-end justify-center gap-[2px] px-2 py-1 bg-white overflow-hidden">
            {generateBarcodePattern(value).map((bar, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: `${bar.width}px`,
                  height: `${bar.height}%`,
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-black tracking-widest text-slate-900 mt-0.5">
            *{value}*
          </span>
        </div>
      )}

      {/* LABELS */}
      {label && (
        <div className="text-center mt-1">
          <div className="text-xs font-black text-slate-950 uppercase tracking-wider">{label}</div>
          {subLabel && <div className="text-[10px] text-slate-600 font-semibold">{subLabel}</div>}
        </div>
      )}
    </div>
  );
};

/**
 * Generate visual line patterns representing Code128 / Barcode 39 style
 */
function generateBarcodePattern(text: string): Array<{ width: number; height: number }> {
  const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bars: Array<{ width: number; height: number }> = [];
  
  // Guard lines start
  bars.push({ width: 2, height: 100 }, { width: 1, height: 100 }, { width: 2, height: 100 });
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const w1 = ((code + i) % 3) + 1;
    const w2 = ((code * 2 + i) % 2) + 1;
    bars.push({ width: w1, height: 85 });
    bars.push({ width: 1, height: 0 }); // gap
    bars.push({ width: w2, height: 90 });
    bars.push({ width: 1, height: 0 }); // gap
  }

  // Guard lines stop
  bars.push({ width: 2, height: 100 }, { width: 1, height: 100 }, { width: 2, height: 100 });
  return bars.slice(0, 36);
}
