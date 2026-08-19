"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const QR_TTL_SECONDS = 120;

export default function SetupPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [hidden, setHidden] = useState(false);
  const [ttl, setTtl] = useState(QR_TTL_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const [revealedAt, setRevealedAt] = useState("");

  const visible = !!data && !hidden;

  // Blur INSTAN saat window kehilangan fokus / pindah tab / PrintScreen / print
  useEffect(() => {
    const onBlur = () => setHidden(true);
    const onVis = () => {
      if (document.hidden) setHidden(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setHidden(true);
        setNotice("⌨️ Tombol screenshot terdeteksi — konten langsung di-blur.");
      }
    };
    const onPrint = () => setHidden(true);

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeprint", onPrint);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, []);

  // Countdown auto-expire
  useEffect(() => {
    if (!data) return;
    setTtl(QR_TTL_SECONDS);
    const started = Date.now();
    const t = setInterval(() => {
      setTtl(Math.max(0, QR_TTL_SECONDS - Math.floor((Date.now() - started) / 1000)));
    }, 500);
    return () => clearInterval(t);
  }, [data]);

  // Kalau waktu habis → reset demi keamanan
  useEffect(() => {
    if (data && ttl <= 0) {
      setData(null);
      setCode("");
      setHidden(false);
      setNotice("⏳ QR & secret auto-disembunyikan demi keamanan. Masukkan PIN admin lagi untuk menampilkan.");
    }
  }, [ttl, data]);

  const handleReveal = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
      setHidden(false);
      setRevealedAt(
        `${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async () => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totp: code }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Kode salah");
      }
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setVerifyError(e.message);
      setCode("");
    } finally {
      setVerifying(false);
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
          {notice && (
            <p className="text-xs rounded-md px-3 py-2" style={{ background: "#FBEED9", color: "#8E7043" }}>
              {notice}
            </p>
          )}

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
              {/* Baris countdown */}
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: ttl <= 15 ? "#C1443A" : "#8A9590" }}>
                  ⏳ Auto-hide dalam {ttl}s
                </p>
                <button
                  onClick={() => setHidden(true)}
                  className="font-mono text-[10px] uppercase tracking-wide hover:opacity-70 transition"
                  style={{ color: "#6B7570" }}
                >
                  🙈 Sembunyikan
                </button>
              </div>

              {/* 👇 AREA SENSITIF: QR + SECRET (watermark + blur instan + anti-copy) */}
              <div className="relative" onContextMenu={(e) => e.preventDefault()}>
                <div
                  className="space-y-4 select-none"
                  style={{
                    filter: visible ? "none" : "blur(16px)",
                    pointerEvents: visible ? "auto" : "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                  aria-hidden={!visible}
                >
                  <div className="flex justify-center p-4 rounded-lg border" style={{ borderColor: "#D7DCD7" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.qr} alt="QR Google Authenticator" className="w-56 h-56" draggable={false} />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#6B7570" }}>Secret Key</p>
                    <p className="font-mono text-xs p-2 rounded border break-all" style={{ borderColor: "#D7DCD7", background: "#F7F8F6" }}>
                      {data.secret}
                    </p>
                  </div>
                </div>

                {/* Watermark tipis (tetap bisa discan karena QR level H) */}
                {visible && (
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-lg" aria-hidden>
                    <div
                      className="absolute inset-0 flex flex-col justify-between py-3"
                      style={{ opacity: 0.08, transform: "rotate(-10deg) scale(1.2)" }}
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <p key={i} className="font-mono text-[10px] whitespace-nowrap" style={{ color: "#1B2420" }}>
                          BRIVICE · RAHASIA · {revealedAt} · BRIVICE · RAHASIA · {revealedAt}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overlay saat blur */}
                {!visible && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg" style={{ background: "rgba(247,248,246,0.65)" }}>
                    <p className="text-2xl">🔒</p>
                    <p className="text-xs font-medium" style={{ color: "#6B7570" }}>Konten sensitif disembunyikan</p>
                    <button
                      onClick={() => { setHidden(false); setNotice(null); }}
                      className="text-xs px-4 py-2 rounded-md text-white font-medium transition hover:opacity-85"
                      style={{ background: "#2F5D62" }}
                    >
                      👁 Tampilkan Lagi
                    </button>
                  </div>
                )}
              </div>

              <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "#6B7570" }}>
                <li>Buka <strong>Google Authenticator</strong> di HP</li>
                <li>Tekan <strong>+</strong> → <strong>Scan QR code</strong></li>
                <li>Entri <strong>BRIVice (KC Sutoyo Admin)</strong> muncul</li>
              </ol>

              <p className="text-[11px] rounded-md px-3 py-2" style={{ background: "#EEF1EE", color: "#6B7570" }}>
                🛡️ QR diberi watermark waktu & otomatis blur saat pindah aplikasi / screenshot. Jangan bagikan tampilan ini ke siapa pun.
              </p>

              {/* Udah selesai? login */}
              <div className="pt-2 border-t" style={{ borderColor: "#EEF1EE" }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "#8A9590" }}>
                  ✅ Udah selesai scan?
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6 digit kode"
                    className="flex-1 p-2.5 rounded-md border text-center font-mono text-lg tracking-[0.3em] outline-none transition"
                    style={{ borderColor: verifyError ? "#C1443A" : "#D7DCD7", color: "#1B2420" }}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setVerifyError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyLogin()}
                    disabled={verifying}
                  />
                  <button
                    onClick={handleVerifyLogin}
                    disabled={verifying || code.length !== 6}
                    className="px-4 text-white text-sm font-medium rounded-md transition disabled:opacity-40 hover:opacity-90"
                    style={{ background: "#3F7A5E" }}
                  >
                    {verifying ? "…" : "🔓 Verifikasi & Masuk"}
                  </button>
                </div>

                {verifyError && (
                  <p className="text-xs rounded-md px-3 py-2 mt-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>
                    ⚠️ {verifyError}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => router.push("/login")}
                    className="text-xs font-medium underline underline-offset-2 hover:opacity-70 transition"
                    style={{ color: "#2F5D62" }}
                  >
                    Ke halaman login →
                  </button>
                  <button
                    onClick={() => { setData(null); setPin(""); setCode(""); setVerifyError(null); setNotice(null); }}
                    className="text-xs hover:opacity-70 transition"
                    style={{ color: "#8A9590" }}
                  >
                    ↺ Ulangi setup
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}