"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";

export default function QRPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [equipment, setEquipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    // 👈 Pakai endpoint publik yang baru
    fetch(`/api/public/equipment/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error || "Peralatan tidak ditemukan");
        }
        return r.json();
      })
      .then((data) => {
        setEquipment(data);
        return QRCode.toDataURL(`${window.location.origin}/qr/${id}`, {
          width: 300, margin: 1, errorCorrectionLevel: "H",
        });
      })
      .then(setQr)
      .catch((err) => {
        console.error("Error fetching equipment:", err);
        setError(err.message);
        setEquipment(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleService = () => {
    router.push(`/login?next=/?service=${id}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#EEF1EE" }}>
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
          .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
          .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
          .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
        `}</style>
        <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: "#D7DCD7" }}>
          <p className="text-4xl mb-3">⏳</p>
          <p className="font-body text-base" style={{ color: "#1B2420" }}>Memuat data peralatan…</p>
        </div>
      </main>
    );
  }

  if (error || !equipment) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "#EEF1EE" }}>
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
          .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
          .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
          .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
        `}</style>

        <div className="bg-white rounded-xl border p-8 text-center max-w-md" style={{ borderColor: "#D7DCD7", color: "#1B2420" }}>
          <p className="text-5xl mb-4">❌</p>
          <h1 className="font-display font-semibold text-xl mb-2" style={{ color: "#1B2420" }}>
            Peralatan Tidak Ditemukan
          </h1>
          <p className="font-body text-sm mb-4" style={{ color: "#6B7570" }}>
            {error || "QR code ini tidak valid atau peralatan sudah dihapus."}
          </p>
          <p className="font-mono text-xs mb-6 p-3 rounded" style={{ background: "#F7F8F6", color: "#8A9590" }}>
            ID: {id.slice(0, 8)}...
          </p>
          <button
            onClick={() => router.push("/login")}
            className="font-body text-sm font-medium px-6 py-2.5 rounded-md text-white transition hover:opacity-90"
            style={{ background: "#2F5D62" }}
          >
            ← Buka Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 font-body" style={{ background: "#EEF1EE", color: "#1B2420" }}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
        .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
        .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
        .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
      `}</style>

      <div className="bg-white rounded-xl border w-full max-w-sm overflow-hidden" style={{ borderColor: "#D7DCD7" }}>
        <div className="px-6 py-5 text-center" style={{ background: "#2F5D62", color: "#EEF1EE" }}>
          <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm mx-auto mb-3" style={{ borderColor: "#EEF1EE", color: "#EEF1EE" }}>
            BV
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#BFD4D2" }}>BRIVice · KC Sutoyo</p>
          <h1 className="font-display text-xl font-bold mt-1">{equipment.name}</h1>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4">
            {qr && <img src={qr} alt="QR" className="w-48 h-48" />}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#EEF1EE" }}>
              <span className="font-body text-xs font-medium uppercase" style={{ color: "#8A9590" }}>Tipe</span>
              <span className="font-body text-sm">{equipment.type}</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#EEF1EE" }}>
              <span className="font-body text-xs font-medium uppercase" style={{ color: "#8A9590" }}>Lokasi</span>
              <span className="font-body text-sm">{equipment.location || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#EEF1EE" }}>
              <span className="font-body text-xs font-medium uppercase" style={{ color: "#8A9590" }}>Interval</span>
              <span className="font-body text-sm">{equipment.service_interval_days} hari</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-body text-xs font-medium uppercase" style={{ color: "#8A9590" }}>Service terakhir</span>
              <span className="font-body text-sm">{equipment.last_service_date || "Belum pernah"}</span>
            </div>
          </div>

          <button
            onClick={handleService}
            className="w-full font-body text-white font-medium py-3 px-4 rounded-md transition hover:opacity-90"
            style={{ background: "#3F7A5E" }}
          >
            🔓 Verifikasi Service Sekarang
          </button>

          <button
            onClick={() => router.push("/login")}
            className="w-full font-body text-sm font-medium py-2 mt-2 rounded-md hover:opacity-75"
            style={{ color: "#2F5D62" }}
          >
            ← Buka dashboard lengkap
          </button>
        </div>
      </div>
    </main>
  );
}