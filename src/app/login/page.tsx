"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CODE_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "pin">("totp");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  
  // 👇 FIX: start with null, only set Date in useEffect
  const [now, setNow] = useState<Date | null>(null);
  const [leftover, setLeftover] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // 👇 Live data dari database
  const [totpEnabled, setTotpEnabled] = useState(true);
  const [lines, setLines] = useState<{ color: string; text: string }[]>([]);
  const [loadingLines, setLoadingLines] = useState(true);

  useEffect(() => {
    setNow(new Date()); // Set immediately on mount
    const t = setInterval(() => {
      setNow(new Date());
      setLeftover(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/public/status")
      .then((r) => r.json())
      .then((d) => {
        setTotpEnabled(!!d.totpEnabled);
        setLines(d.lines || []);
      })
      .catch(() => setLines([]))
      .finally(() => setLoadingLines(false));
  }, []);

  const submit = async (payload: { totp?: string; pin?: string }) => {
    const code = payload.totp || payload.pin || "";
    if (!code || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Kode salah");
      }
    const currentUrl = new URL(window.location.href);
const nextParam = currentUrl.searchParams.get("next");
// Auto-decode kalau encoded, fallback ke "/" kalau tidak ada
const nextUrl = nextParam ? decodeURIComponent(nextParam) : "/";
router.push(nextUrl);
router.refresh();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(Array(CODE_LENGTH).fill(""));
      setPin("");
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError(null);
    if (clean && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) submit({ totp: next.join("") });
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!text) return;
    const next = Array(CODE_LENGTH).fill("");
    text.split("").forEach((c, idx) => (next[idx] = c));
    setDigits(next);
    inputs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
    if (text.length === CODE_LENGTH) submit({ totp: text });
  };

  const switchMode = () => {
    setMode(mode === "totp" ? "pin" : "totp");
    setError(null);
    setDigits(Array(CODE_LENGTH).fill(""));
    setPin("");
  };

  // 👇 Render placeholder kalau belum hydrate
  const timeLabel = now
    ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const dateLabel = now
    ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Loading...";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-body"
      style={{
        background: "#EEF1EE",
        backgroundImage: "radial-gradient(#D7DCD7 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
        .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
        .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
        .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes shakeX { 10%,90% { transform: translateX(-1px);} 20%,80% { transform: translateX(2px);} 30%,50%,70% { transform: translateX(-4px);} 40%,60% { transform: translateX(4px);} }
        @keyframes blinkDot { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        .anim-fade-up { animation: fadeUp 0.5s ease both; }
        .anim-shake { animation: shakeX 0.45s ease; }
        .dot-blink { animation: blinkDot 1.6s infinite; }
      `}</style>

      <div
        className={`w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 rounded-2xl border overflow-hidden shadow-xl anim-fade-up ${shake ? "anim-shake" : ""}`}
        style={{ borderColor: "#D7DCD7" }}
      >
        {/* PANEL KIRI */}
        <div className="md:col-span-2 p-8 flex flex-col justify-between gap-8" style={{ background: "#2F5D62", color: "#EEF1EE" }}>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm shrink-0" style={{ borderColor: "#EEF1EE", color: "#EEF1EE" }}>
                BV
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#BFD4D2" }}>Facility Maintenance Log</p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#BFD4D2" }}>KC Sutoyo</p>
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">BRIVice</h1>
            <p className="text-sm leading-relaxed" style={{ color: "#BFD4D2" }}>
              Sistem pengingat service peralatan kantor untuk seluruh cabang & unit kerja.
            </p>
          </div>

          <div className="space-y-2 hidden sm:block">
            <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: "#BFD4D2" }}>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${totpEnabled ? "dot-blink" : ""}`}
                style={{ background: totpEnabled ? "#7FB89A" : "#E0B36A" }}
              />
              {totpEnabled ? "2FA aktif · Google Authenticator" : "2FA nonaktif · mode PIN"}
            </div>

            {loadingLines ? (
              <>
                <div className="h-3 w-4/5 rounded animate-pulse" style={{ background: "rgba(238,241,238,0.18)" }} />
                <div className="h-3 w-3/5 rounded animate-pulse" style={{ background: "rgba(238,241,238,0.18)" }} />
              </>
            ) : lines.length === 0 ? (
              <p className="font-mono text-[11px]" style={{ color: "#BFD4D2" }}>
                Belum ada peralatan terdaftar
              </p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-[11px]" style={{ color: "#BFD4D2" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="truncate">{l.text}</span>
                </div>
              ))
            )}

            <p className="font-mono text-[9px] uppercase tracking-widest pt-1" style={{ color: "rgba(191,212,210,0.55)" }}>
              ● live · sinkron dengan database
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full dot-blink" style={{ background: "#7FB89A" }} />
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#BFD4D2" }}>System online</p>
            </div>
            <p className="font-mono text-2xl font-semibold tabular-nums">{timeLabel}</p>
            <p className="font-mono text-[11px] mt-0.5" style={{ color: "#BFD4D2" }}>{dateLabel} · WIB</p>
          </div>
        </div>

        {/* PANEL KANAN */}
        <div className="md:col-span-3 bg-white p-8 md:p-10" style={{ color: "#1B2420" }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "#8A9590" }}>
            🔐 Two-Factor Authentication
          </p>
          <h2 className="font-display text-xl font-semibold mb-1">
            {mode === "totp" ? "Masukkan Kode Authenticator" : "Masukkan PIN Darurat"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "#6B7570" }}>
            {mode === "totp"
              ? "Buka aplikasi Google Authenticator, masukkan 6 digit kode yang sedang tampil."
              : "Gunakan hanya jika HP / aplikasi Authenticator tidak bisa diakses."}
          </p>

          {mode === "totp" ? (
            <form onSubmit={(e) => { e.preventDefault(); submit({ totp: digits.join("") }); }}>
              <div className="flex gap-2 md:gap-3 justify-between mb-4" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoFocus={i === 0}
                    autoComplete="one-time-code"
                    className="w-11 h-14 md:w-12 md:h-14 text-center font-mono text-xl rounded-lg border outline-none transition"
                    style={{
                      borderColor: error ? "#C1443A" : d ? "#2F5D62" : "#D7DCD7",
                      color: "#1B2420",
                      background: d ? "#E4EFE8" : "#fff",
                    }}
                    onFocus={(e) => e.target.select()}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                  />
                ))}
              </div>

              <div className="mb-6">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wide mb-1" style={{ color: "#8A9590" }}>
                  <span>Kode berganti dalam</span>
                  <span style={{ color: leftover <= 5 ? "#C1443A" : "#8A9590" }}>{leftover}s</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#EEF1EE" }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${(leftover / 30) * 100}%`, background: leftover <= 5 ? "#C1443A" : "#2F5D62" }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs rounded-md px-3 py-2 mb-4 text-center" style={{ background: "#F7E7E5", color: "#C1443A" }}>
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || digits.every((d) => d === "")}
                className="w-full text-white font-medium py-3 px-4 rounded-md transition disabled:opacity-40 hover:opacity-90 active:scale-[0.99]"
                style={{ background: "#2F5D62" }}
              >
                {loading ? "Memverifikasi…" : "🔓 Verifikasi & Masuk"}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submit({ pin }); }}>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                className="w-full p-3 rounded-md border text-center font-mono text-lg tracking-[0.5em] outline-none transition mb-6"
                style={{ borderColor: error ? "#C1443A" : "#D7DCD7", color: "#1B2420" }}
                placeholder="••••••"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(null); }}
                disabled={loading}
              />

              {error && (
                <p className="text-xs rounded-md px-3 py-2 mb-4 text-center" style={{ background: "#F7E7E5", color: "#C1443A" }}>
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !pin}
                className="w-full text-white font-medium py-3 px-4 rounded-md transition disabled:opacity-40 hover:opacity-90"
                style={{ background: "#C8862A" }}
              >
                {loading ? "Memeriksa…" : "🔓 Masuk dengan PIN Darurat"}
              </button>
            </form>
          )}

          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={switchMode} className="text-xs font-medium underline underline-offset-2 hover:opacity-70 transition" style={{ color: "#2F5D62" }}>
              {mode === "totp" ? "Gunakan PIN darurat" : "← Kembali ke kode Authenticator"}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-full" style={{ background: "#EEF1EE", color: "#6B7570" }}>
              Internal Only
            </span>
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest mt-6" style={{ color: "#8A9590" }}>
        BRIVice v1.1 · 2FA TOTP · KC Sutoyo
      </p>
    </main>
  );
}