"use client";
import { useState } from "react";

export default function SetupPage() {
  const [pin, setPin] = useState("");
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 font-body" style={{ background: "#EEF1EE" }}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
        .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
        .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
        .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
      `}</style>

      <div className="bg-white rounded-xl border w-full max-w-md overflow-hidden" style={{ borderColor: "#D7DCD7", color: "#1B2420" }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "#D7DCD7", background: "#F7F8F6" }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "#8A9590" }}>
            ⚙️ Setup Google Authenticator
          </p>
          <h1 className="font-display font-semibold text-lg">Hubungkan Perangkat</h1>
        </div>

        <div className="p-6 space-y-4">
          {!data ? (
            <>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
                  PIN Admin
                </label>
                <input
                  type="password"
                  className="w-full p-2.5 rounded-md border text-sm font-mono outline-none"
                  style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-xs rounded-md px-3 py-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>{error}</p>
              )}
              <button
                onClick={handleReveal}
                disabled={loading}
                className="w-full text-white font-medium py-2.5 rounded-md transition disabled:opacity-50"
                style={{ background: "#2F5D62" }}
              >
                {loading ? "Membuka…" : "🔓 Tampilkan QR Code"}
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center p-4 rounded-lg border" style={{ borderColor: "#D7DCD7" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qr} alt="QR Google Authenticator" className="w-56 h-56" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#6B7570" }}>Secret Key</p>
                <p className="font-mono text-xs p-2 rounded border break-all" style={{ borderColor: "#D7DCD7", background: "#F7F8F6" }}>
                  {data.secret}
                </p>
              </div>
              <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "#6B7570" }}>
                <li>Buka aplikasi <strong>Google Authenticator</strong> di HP</li>
                <li>Tekan <strong>+</strong> → <strong>Scan QR code</strong></li>
                <li>Entri <strong>BRIVice (KC Sutoyo Admin)</strong> akan muncul</li>
                <li>Masuk ke dashboard pakai kode 6 digit yang berputar</li>
              </ol>
              <p className="text-[11px] rounded-md px-3 py-2" style={{ background: "#FBEED9", color: "#8E7043" }}>
                ⚠️ Simpan secret key di tempat aman. Siapa pun yang punya secret ini bisa membuat kode login.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}