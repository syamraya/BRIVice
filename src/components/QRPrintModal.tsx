"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QRPrintModal({
  equipment,
  onClose,
}: {
  equipment: any;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = `${baseUrl}/qr/${equipment.id}`;

  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#1B2420", light: "#FFFFFF" },
    }).then(setQr);
  }, [qrUrl]);

  const handleDownload = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `QR-${equipment.name.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            padding: 20mm;
            background: white;
          }
          @page { size: A6 portrait; margin: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-body"
        style={{ background: "rgba(27,36,32,0.45)" }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#D7DCD7", background: "#F7F8F6" }}>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "#8A9590" }}>
                🏷️ Stiker QR
              </p>
              <h2 className="font-display font-semibold text-base">{equipment.name}</h2>
            </div>
            <button onClick={onClose} className="text-lg leading-none hover:opacity-60" style={{ color: "#6B7570" }}>×</button>
          </div>

          <div className="p-5">
            {/* Area yang di-print (hidden di layar, muncul saat print) */}
            <div className="print-area" style={{ display: "none" }}>
              <div style={{
                border: "2px dashed #1B2420",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
                background: "white",
                fontFamily: "system-ui, sans-serif",
              }}>
                <p style={{ fontSize: 10, letterSpacing: 2, color: "#6B7570", margin: 0 }}>
                  SCAN UNTUK SERVICE
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1B2420", margin: "4px 0" }}>
                  BRIVice
                </p>
                {qr && (
                  <img
                    src={qr}
                    alt="QR"
                    style={{ width: "100%", maxWidth: 220, margin: "8px auto", display: "block" }}
                  />
                )}
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1B2420", margin: "4px 0" }}>
                  {equipment.name}
                </p>
                <p style={{ fontSize: 11, color: "#6B7570", margin: "2px 0" }}>
                  {equipment.type} · {equipment.location || "-"}
                </p>
                <p style={{ fontSize: 9, color: "#8A9590", marginTop: 8 }}>
                  ID: {equipment.id.slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Preview di layar */}
            <div className="flex justify-center mb-4">
              <div className="border-2 border-dashed rounded-lg p-4" style={{ borderColor: "#D7DCD7", width: 260 }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-center mb-1" style={{ color: "#6B7570" }}>
                  Scan untuk service
                </p>
                <p className="font-display font-bold text-center text-lg" style={{ color: "#2F5D62" }}>BRIVice</p>
                {qr ? (
                  <img src={qr} alt="QR" className="w-full my-2" />
                ) : (
                  <div className="w-full h-48 bg-gray-100 animate-pulse rounded" />
                )}
                <p className="text-center font-semibold text-sm">{equipment.name}</p>
                <p className="text-center text-xs" style={{ color: "#6B7570" }}>
                  {equipment.type} · {equipment.location || "-"}
                </p>
                <p className="font-mono text-[9px] text-center mt-2" style={{ color: "#8A9590" }}>
                  ID: {equipment.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 text-white text-sm font-medium py-2.5 rounded-md transition hover:opacity-90"
                style={{ background: "#2F5D62" }}
              >
                🖨️ Print Stiker
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 text-sm font-medium py-2.5 rounded-md border transition hover:opacity-75"
                style={{ borderColor: "#D7DCD7", color: "#2F5D62" }}
              >
                📥 Download PNG
              </button>
            </div>

            <p className="text-[10px] mt-3 text-center" style={{ color: "#8A9590" }}>
              Print di stiker A6 atau kertas biasa lalu potong.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}