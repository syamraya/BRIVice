"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

// ---------------------------------------------------------------------------
// Struktur Lokasi — KC Sutoyo
// ---------------------------------------------------------------------------
const BRANCH_NAME = "KC Sutoyo";

const KCP_LOCATIONS = ["Mangliawan", "Lawang", "Sawojajar", "Singosari", "Tumpang"];

const UNIT_LOCATIONS = [
  "Blimbing", "Purwantoro", "LA Sucipto", "Wendit", "Pakis", "Jabung",
  "Tumpang", "Poncokusumo", "Bentoel", "Singosari", "Randu Agung",
  "Lawang", "Madyopuro", "Sawojajar",
];

const ALL_LOCATION_VALUES = [
  BRANCH_NAME,
  ...KCP_LOCATIONS.map((n) => `KCP ${n}`),
  ...UNIT_LOCATIONS.map((n) => `Unit ${n}`),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Status = "belum" | "expired" | "soon" | "ok";

function getServiceStatus(
  lastServiceDate: string | null,
  intervalDays: number,
  verified: boolean
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastServiceDate) {
    return { next: null, daysRemaining: null, percentElapsed: 0, status: "belum" as Status };
  }

  const last = new Date(lastServiceDate);
  const next = new Date(last);
  next.setDate(next.getDate() + intervalDays);
  next.setHours(0, 0, 0, 0);

  const daysRemaining = Math.round((next.getTime() - today.getTime()) / 86400000);
  const elapsed = intervalDays - daysRemaining;
  const percentElapsed = Math.min(100, Math.max(0, (elapsed / intervalDays) * 100));

  if (!verified) {
    return {
      next,
      daysRemaining,
      percentElapsed: 0,
      status: (daysRemaining < 0 ? "expired" : "belum") as Status,
    };
  }

  if (daysRemaining < 0) {
    return { next, daysRemaining, percentElapsed: 100, status: "expired" as Status };
  }

  if (daysRemaining <= 7) {
    return { next, daysRemaining, percentElapsed, status: "soon" as Status };
  }
  return { next, daysRemaining, percentElapsed, status: "ok" as Status };
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const STATUS_META: Record<Status, { label: string; color: string; soft: string }> = {
  belum: { label: "Belum Service", color: "#8A9590", soft: "#EEF1EE" },
  expired: { label: "Belum Service", color: "#C1443A", soft: "#F7E7E5" },
  soon: { label: "Segera", color: "#C8862A", soft: "#FBEED9" },
  ok: { label: "Sudah Diservice", color: "#3F7A5E", soft: "#E4EFE8" },
};

const TYPE_ICON: Record<string, string> = {
  AC: "❄",
  Printer: "⎙",
  Server: "▤",
  Lift: "⇅",
  Genset: "⚡",
  Lainnya: "◆",
};

function Gauge({ percent, color, size = 56, dashed = false }: { percent: number; color: string; size?: number; dashed?: boolean }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={dashed ? "4 5" : c}
        strokeDashoffset={dashed ? 0 : offset}
        strokeLinecap="round"
        transform={dashed ? undefined : `rotate(-90 ${size / 2} ${size / 2})`}
        opacity={dashed ? 0.5 : 1}
      />
    </svg>
  );
}

const emptyForm = {
  name: "",
  type: "AC",
  location: "",
  interval: 90,
  lastService: "",
  notificationEmail: "",
};

// ---------------------------------------------------------------------------
// Location combobox
// ---------------------------------------------------------------------------
function LocationSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const groups = [
    { label: "Kantor Cabang", items: [BRANCH_NAME] },
    { label: "KCP", items: KCP_LOCATIONS.map((n) => `KCP ${n}`) },
    { label: "Unit", items: UNIT_LOCATIONS.map((n) => `Unit ${n}`) },
  ];

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((i) => i.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  const isExact = ALL_LOCATION_VALUES.includes(value);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full p-2.5 rounded-md border text-sm outline-none transition"
        style={{ borderColor: open ? "#2F5D62" : "#D7DCD7", color: "#1B2420", background: "#fff" }}
        placeholder="Ketik untuk cari lokasi… (cth: Lawang)"
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && (
        <div
          className="absolute z-30 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto"
          style={{ borderColor: "#D7DCD7" }}
        >
          {filteredGroups.map((g) => (
            <div key={g.label}>
              <p
                className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-widest sticky top-0"
                style={{ color: "#8A9590", background: "#F7F8F6" }}
              >
                {g.label}
              </p>
              {g.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm transition hover:bg-gray-100"
                  style={{ color: item === value ? "#2F5D62" : "#1B2420", fontWeight: item === value ? 600 : 400 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onChange(item); setQuery(""); setOpen(false); }}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}

          {filteredGroups.length === 0 && !query && (
            <p className="px-3 py-2 text-xs" style={{ color: "#8A9590" }}>Tidak ada lokasi</p>
          )}

          {query && !isExact && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs font-medium border-t transition hover:bg-gray-100"
              style={{ color: "#2F5D62", borderColor: "#EEF1EE" }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); setQuery(""); }}
            >
              ✓ Gunakan "{query}" sebagai lokasi baru
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------
function ModalShell({
  eyebrow,
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-body"
      style={{ background: "rgba(27,36,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        style={{ color: "#1B2420" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between rounded-t-xl sticky top-0"
          style={{ borderColor: "#D7DCD7", background: "#F7F8F6" }}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "#8A9590" }}>
              {eyebrow}
            </p>
            <h2 className="font-display font-semibold text-base" style={{ color: "#1B2420" }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-60 transition"
            style={{ color: "#6B7570" }}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photo modal
// ---------------------------------------------------------------------------
function PhotoModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 font-body"
      style={{ background: "rgba(27,36,32,0.75)" }}
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "#EEF1EE" }}>
            📷 Bukti Service — {title}
          </p>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-60 transition"
            style={{ color: "#EEF1EE" }}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
        <img
          src={url}
          alt={`Bukti service ${title}`}
          className="w-full max-h-[80vh] object-contain rounded-xl bg-white"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Equipment Modal
// ---------------------------------------------------------------------------
function AddEquipmentModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell eyebrow="Formulir Peralatan" title="Tambah Peralatan Baru" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Nama Alat *
          </label>
          <input
            required
            type="text"
            className="w-full p-2.5 rounded-md border text-sm outline-none transition"
            style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
            placeholder="Cth: AC Ruang Meeting"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
              Tipe
            </label>
            <select
              className="w-full p-2.5 rounded-md border text-sm outline-none"
              style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="AC">AC</option>
              <option value="Printer">Printer</option>
              <option value="Server">Server</option>
              <option value="Lift">Lift</option>
              <option value="Genset">Genset</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
              Interval (Hari) *
            </label>
            <input
              required
              type="number"
              min="1"
              className="w-full p-2.5 rounded-md border text-sm font-mono outline-none"
              style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Lokasi
          </label>
          <LocationSelect
            value={formData.location}
            onChange={(v) => setFormData({ ...formData, location: v })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Service Terakhir
          </label>
          <input
            type="date"
            className="w-full p-2.5 rounded-md border text-sm font-mono outline-none"
            style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
            value={formData.lastService}
            onChange={(e) => setFormData({ ...formData, lastService: e.target.value })}
          />
          <p className="text-xs mt-1.5" style={{ color: "#8A9590" }}>
            Kosongkan kalau belum pernah diservice — statusnya jadi "Belum Service"
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Email Notifikasi <span style={{ color: "#8A9590" }}>(opsional)</span>
          </label>
          <input
            type="email"
            className="w-full p-2.5 rounded-md border text-sm outline-none"
            style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
            placeholder="admin@kantor.com"
            value={formData.notificationEmail}
            onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
          />
          <p className="text-xs mt-1.5" style={{ color: "#8A9590" }}>
            Kosongkan untuk tidak kirim email
          </p>
        </div>

        {error && (
          <p className="text-xs rounded-md px-3 py-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md text-sm font-medium border transition hover:opacity-70"
            style={{ borderColor: "#D7DCD7", color: "#6B7570" }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 text-white text-sm font-medium py-2.5 rounded-md transition disabled:opacity-50"
            style={{ background: "#2F5D62" }}
          >
            {loading ? "Menyimpan…" : "✓ Simpan Peralatan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Service modal — VERIFIKASI 2 TAHAP (FOTO SEKARANG OPSIONAL)
// ---------------------------------------------------------------------------
function ServiceModal({
  equipment,
  onClose,
  onDone,
}: {
  equipment: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [servicedAt, setServicedAt] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      setPreview(null);
      setError(null);
      return;
    }
    // Validasi hanya kalau ada file
    if (f.size > 5 * 1024 * 1024) { setError("Ukuran file maksimal 5MB"); return; }
    if (!f.type.startsWith("image/")) { setError("File harus berupa gambar"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const goToStep2 = () => {
    // 👇 FOTO TIDAK WAJIB LAGI — hanya validasi tanggal
    if (!servicedAt) { setError("Tanggal service harus diisi"); return; }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) { setError("Centang konfirmasi bahwa data sudah benar"); return; }

    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | null = null;

      // 👇 Upload foto HANYA kalau ada file
      if (file) {
        const path = `${equipment.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("service-photos").upload(path, file);
        if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);

        const { data: urlData } = supabase.storage.from("service-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const res = await fetch(`/api/equipment/${equipment.id}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicedAt, photoUrl, notes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      eyebrow={step === 1 ? "Verifikasi 1/2" : "Verifikasi 2/2"}
      title={equipment.name}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
                Tanggal Service *
              </label>
              <input
                required
                type="date"
                className="w-full p-2.5 rounded-md border text-sm font-mono outline-none"
                style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
                value={servicedAt}
                onChange={(e) => setServicedAt(e.target.value)}
              />
            </div>

            <div>
              {/* 👇 LABEL DIUBAH: dari "*" jadi "(opsional)" */}
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
                Foto Bukti Service <span style={{ color: "#8A9590" }}>(opsional)</span>
              </label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm" style={{ color: "#1B2420" }} />
              <p className="text-[10px] mt-1" style={{ color: "#8A9590" }}>
                Maksimal 5MB (JPG/PNG). Upload kalau ada dokumentasi.
              </p>
              {preview && (
                <img
                  src={preview}
                  alt="Preview foto service"
                  className="mt-3 rounded-md w-full max-h-48 object-cover border"
                  style={{ borderColor: "#D7DCD7" }}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
                Catatan Teknisi <span style={{ color: "#8A9590" }}>(opsional)</span>
              </label>
              <textarea
                rows={2}
                className="w-full p-2.5 rounded-md border text-sm outline-none"
                style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
                placeholder="Cth: Filter diganti, freon diisi ulang..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs rounded-md px-3 py-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-md text-sm font-medium border transition hover:opacity-70"
                style={{ borderColor: "#D7DCD7", color: "#6B7570" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={goToStep2}
                className="flex-1 text-white text-sm font-medium py-2.5 rounded-md transition"
                style={{ background: "#2F5D62" }}
              >
                Lanjut ke Verifikasi →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="p-4 rounded-lg border-2 border-dashed" style={{ borderColor: "#C8862A", background: "#FBEED9" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#8E7043" }}>
                ⚠️ Periksa kembali data berikut:
              </p>
              <ul className="text-sm space-y-1" style={{ color: "#1B2420" }}>
                <li>• <strong>Peralatan:</strong> {equipment.name} ({equipment.type})</li>
                <li>• <strong>Lokasi:</strong> {equipment.location || "-"}</li>
                <li>• <strong>Tanggal Service:</strong> {new Date(servicedAt).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</li>
                <li>• <strong>Foto:</strong> {file ? file.name : <em style={{ color: "#8A9590" }}>tidak diupload</em>}</li>
                {notes && <li>• <strong>Catatan:</strong> {notes}</li>}
                {!notes && <li>• <strong>Catatan:</strong> <em style={{ color: "#8A9590" }}>kosong</em></li>}
              </ul>
            </div>

            {preview && (
              <img
                src={preview}
                alt="Foto bukti service"
                className="rounded-md w-full max-h-48 object-cover border"
                style={{ borderColor: "#D7DCD7" }}
              />
            )}

            <div className="p-3 rounded" style={{ background: "#EEF1EE" }}>
              <p className="text-xs" style={{ color: "#6B7570" }}>
                ✓ Setelah dikonfirmasi, status berubah menjadi <strong>Sudah Diservice</strong> dan reminder berikutnya dijadwalkan <strong>{equipment.service_interval_days} hari</strong> dari tanggal service.
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => { setIsConfirmed(e.target.checked); setError(null); }}
                className="mt-0.5"
                style={{ width: 16, height: 16 }}
              />
              <span className="text-sm leading-snug" style={{ color: "#1B2420" }}>
                Saya menyatakan data di atas <strong>benar dan akurat</strong>, serta pekerjaan service telah selesai dilakukan.
              </span>
            </label>

            {error && (
              <p className="text-xs rounded-md px-3 py-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium border transition hover:opacity-70"
                style={{ borderColor: "#D7DCD7", color: "#6B7570" }}
              >
                ← Kembali
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 text-white text-sm font-medium py-2.5 rounded-md transition disabled:opacity-50"
                style={{ background: "#3F7A5E" }}
              >
                {submitting ? "Menyimpan…" : "✓ Konfirmasi Selesai"}
              </button>
            </div>
          </>
        )}
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------
function EditModal({
  equipment,
  onClose,
  onDone,
}: {
  equipment: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: equipment.name,
    type: equipment.type,
    location: equipment.location || "",
    interval: equipment.service_interval_days,
    notificationEmail: equipment.notification_email || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: equipment.id, ...form }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell eyebrow="Edit Peralatan" title={equipment.name} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Nama Alat *
          </label>
          <input
            required
            type="text"
            className="w-full p-2.5 rounded-md border text-sm outline-none"
            style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
              Tipe
            </label>
            <select
              className="w-full p-2.5 rounded-md border text-sm outline-none"
              style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="AC">AC</option>
              <option value="Printer">Printer</option>
              <option value="Server">Server</option>
              <option value="Lift">Lift</option>
              <option value="Genset">Genset</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
              Interval (Hari) *
            </label>
            <input
              required
              type="number"
              min="1"
              className="w-full p-2.5 rounded-md border text-sm font-mono outline-none"
              style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value as any })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Lokasi
          </label>
          <LocationSelect value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "#6B7570" }}>
            Email Notifikasi
          </label>
          <input
            type="email"
            className="w-full p-2.5 rounded-md border text-sm outline-none"
            style={{ borderColor: "#D7DCD7", color: "#1B2420" }}
            value={form.notificationEmail}
            onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
          />
        </div>

        {error && (
          <p className="text-xs rounded-md px-3 py-2" style={{ background: "#F7E7E5", color: "#C1443A" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md text-sm font-medium border transition hover:opacity-70"
            style={{ borderColor: "#D7DCD7", color: "#6B7570" }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 text-white text-sm font-medium py-2.5 rounded-md transition disabled:opacity-50"
            style={{ background: "#2F5D62" }}
          >
            {submitting ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [serviceTarget, setServiceTarget] = useState<any | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [photoTarget, setPhotoTarget] = useState<{ url: string; name: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    if (typeof window === "undefined") return "card";
    return (localStorage.getItem("brivice-view") as "card" | "table") || "card";
  });

  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");

  const switchView = (m: "card" | "table") => {
    setViewMode(m);
    localStorage.setItem("brivice-view", m);
  };

  const toggleStatusFilter = (s: Status) => {
    setFilterStatus((prev) => (prev === s ? "all" : s));
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setRefreshing(true);
    const { data } = await supabase.from("equipment").select("*").order("created_at", { ascending: false });
    if (data) setEquipmentList(data);
    setRefreshing(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name}?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("equipment").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      setEquipmentList((prev) => prev.filter((i) => i.id !== id));
    }
    setDeletingId(null);
  };

  const statusOf = (i: any) =>
    getServiceStatus(i.last_service_date, i.service_interval_days, i.service_verified === true);

  const locationFiltered =
    filterLocation === "all"
      ? equipmentList
      : equipmentList.filter((i) => i.location === filterLocation);

  const belumCount = locationFiltered.filter((i) => statusOf(i).status === "belum").length;
  const overdueCount = locationFiltered.filter((i) => statusOf(i).status === "expired").length;
  const soonCount = locationFiltered.filter((i) => statusOf(i).status === "soon").length;

  const filteredList =
    filterStatus === "all"
      ? locationFiltered
      : locationFiltered.filter((i) => statusOf(i).status === filterStatus);

  return (
    <main className="min-h-screen" style={{ background: "#EEF1EE" }}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap");
        .font-display { font-family: "Space Grotesk", ui-sans-serif, sans-serif; }
        .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
        .font-body { font-family: "Inter", ui-sans-serif, sans-serif; }
        .tag-card { position: relative; }
        .tag-card::before {
          content: "";
          position: absolute;
          left: -7px;
          top: 50%;
          transform: translateY(-50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #EEF1EE;
          border: 1.5px solid #D7DCD7;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-10 md:px-10 font-body" style={{ color: "#1B2420" }}>
        {/* HEADER */}
        <div className="flex items-start justify-between gap-6 mb-10 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm shrink-0"
              style={{ borderColor: "#2F5D62", color: "#2F5D62" }}
            >
              BV
            </div>
            <div>
              <p className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: "#6B7570" }}>
                Facility Maintenance Log · {BRANCH_NAME}
              </p>
              <h1 className="font-display text-3xl font-bold" style={{ color: "#1B2420" }}>
                BRIVice
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "#6B7570" }}>
                Reminder service peralatan kantor
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => toggleStatusFilter("belum")}
              className="rounded-lg px-4 py-2 border text-left transition hover:opacity-80"
              style={{
                background: "#EEF1EE",
                borderColor: filterStatus === "belum" ? "#6B7570" : "#D7DCD7",
                boxShadow: filterStatus === "belum" ? "0 0 0 2px rgba(107,117,112,0.25)" : undefined,
                cursor: "pointer",
              }}
              title="Klik untuk filter Belum Service"
            >
              <p className="font-mono text-2xl font-semibold leading-none" style={{ color: "#6B7570" }}>
                {String(belumCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "#8A9590" }}>
                Belum service {filterStatus === "belum" && "· ✕"}
              </p>
            </button>

            <button
              onClick={() => toggleStatusFilter("expired")}
              className="rounded-lg px-4 py-2 border text-left transition hover:opacity-80"
              style={{
                background: "#F7E7E5",
                borderColor: filterStatus === "expired" ? "#C1443A" : "#E3B4AE",
                boxShadow: filterStatus === "expired" ? "0 0 0 2px rgba(193,68,58,0.25)" : undefined,
                cursor: "pointer",
              }}
              title="Klik untuk filter Jatuh Tempo"
            >
              <p className="font-mono text-2xl font-semibold leading-none" style={{ color: "#C1443A" }}>
                {String(overdueCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "#8E5B54" }}>
                Jatuh tempo {filterStatus === "expired" && "· ✕"}
              </p>
            </button>

            <button
              onClick={() => toggleStatusFilter("soon")}
              className="rounded-lg px-4 py-2 border text-left transition hover:opacity-80"
              style={{
                background: "#FBEED9",
                borderColor: filterStatus === "soon" ? "#C8862A" : "#E8CE9C",
                boxShadow: filterStatus === "soon" ? "0 0 0 2px rgba(200,134,42,0.25)" : undefined,
                cursor: "pointer",
              }}
              title="Klik untuk filter Segera"
            >
              <p className="font-mono text-2xl font-semibold leading-none" style={{ color: "#C8862A" }}>
                {String(soonCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "#8E7043" }}>
                Segera {filterStatus === "soon" && "· ✕"}
              </p>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-semibold text-lg" style={{ color: "#1B2420" }}>
                Daftar Peralatan
              </h2>

              {filterStatus !== "all" && (
                <button
                  onClick={() => setFilterStatus("all")}
                  className="text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full transition hover:opacity-75"
                  style={{ background: STATUS_META[filterStatus].soft, color: STATUS_META[filterStatus].color }}
                  title="Klik untuk hapus filter"
                >
                  {STATUS_META[filterStatus].label} ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="text-xs border rounded-md px-2 py-1.5 outline-none"
                style={{ borderColor: "#D7DCD7", color: "#1B2420", background: "#fff" }}
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="all">📍 Semua Lokasi</option>
                <optgroup label="Kantor Cabang">
                  <option value={BRANCH_NAME}>{BRANCH_NAME}</option>
                </optgroup>
                <optgroup label="KCP">
                  {KCP_LOCATIONS.map((n) => (
                    <option key={`fk-${n}`} value={`KCP ${n}`}>KCP {n}</option>
                  ))}
                </optgroup>
                <optgroup label="Unit">
                  {UNIT_LOCATIONS.map((n) => (
                    <option key={`fu-${n}`} value={`Unit ${n}`}>Unit {n}</option>
                  ))}
                </optgroup>
              </select>

              <div className="flex items-center gap-0.5 rounded-md border p-0.5" style={{ borderColor: "#D7DCD7", background: "#fff" }}>
                <button
                  onClick={() => switchView("card")}
                  className="text-[11px] font-medium px-2.5 py-1 rounded transition"
                  style={viewMode === "card" ? { background: "#2F5D62", color: "#fff" } : { color: "#6B7570" }}
                  title="Mode kartu"
                >
                  ▤ Kartu
                </button>
                <button
                  onClick={() => switchView("table")}
                  className="text-[11px] font-medium px-2.5 py-1 rounded transition"
                  style={viewMode === "table" ? { background: "#2F5D62", color: "#fff" } : { color: "#6B7570" }}
                  title="Mode tabel (simple)"
                >
                  ▦ Tabel
                </button>
              </div>

              <button
                onClick={fetchEquipment}
                className="text-xs font-mono uppercase tracking-wide flex items-center gap-1.5 hover:opacity-70 transition"
                style={{ color: "#2F5D62" }}
              >
                ↻ Refresh
              </button>
              <button
  onClick={async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }}
  className="text-xs font-mono uppercase tracking-wide hover:opacity-70 transition"
  style={{ color: "#C1443A" }}
>
  ⎋ Keluar
</button>
            </div>
          </div>

          {refreshing ? (
            <div className="p-16 text-center rounded-xl border bg-white" style={{ borderColor: "#D7DCD7", color: "#8A9590" }}>
              Memuat data…
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center rounded-xl border bg-white" style={{ borderColor: "#D7DCD7" }}>
              <p className="font-display font-medium mb-1" style={{ color: "#1B2420" }}>
                {equipmentList.length === 0 ? "Belum ada peralatan" : "Tidak ada peralatan yang cocok"}
              </p>
              <p className="text-sm mb-4" style={{ color: "#8A9590" }}>
                {equipmentList.length === 0
                  ? "Tambahkan alat pertama lewat tombol di kanan bawah."
                  : "Coba ubah filter lokasi atau klik ulang counter status di atas untuk reset."}
              </p>
              {equipmentList.length === 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-sm px-4 py-2 rounded-md text-white font-medium transition hover:opacity-85"
                  style={{ background: "#2F5D62" }}
                >
                  ＋ Tambah Peralatan Pertama
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#D7DCD7" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F7F8F6" }}>
                      {["No", "Nama Alat", "Tipe", "Lokasi", "Interval", "Service Terakhir", "Jatuh Tempo", "Sisa", "Status", "Email", "Foto", "Aksi"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "#6B7570", borderBottom: "1px solid #D7DCD7" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((item, idx) => {
                      const st = statusOf(item);
                      const meta = STATUS_META[st.status];
                      const unverified = st.status === "belum" || st.status === "expired";

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition" style={{ borderBottom: "1px solid #EEF1EE" }}>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#8A9590" }}>{idx + 1}</td>
                          <td className="px-3 py-2 text-sm font-medium whitespace-nowrap" style={{ color: "#1B2420" }}>{item.name}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "#6B7570" }}>{TYPE_ICON[item.type] || "◆"} {item.type}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "#6B7570" }}>{item.location || "-"}</td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#6B7570" }}>{item.service_interval_days} hr</td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#6B7570" }}>{item.last_service_date || "-"}</td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#6B7570" }}>{st.next ? fmtDate(st.next) : "-"}</td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: meta.color }}>
                            {st.daysRemaining === null ? "-" : st.daysRemaining >= 0 ? st.daysRemaining : `-${Math.abs(st.daysRemaining)}`}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: meta.soft, color: meta.color }}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs truncate max-w-[140px]" style={{ color: "#6B7570" }} title={item.notification_email || ""}>
                            {item.notification_email || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {item.last_service_photo_url ? (
                              <img
                                src={item.last_service_photo_url}
                                alt={`Bukti ${item.name}`}
                                className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-75 transition border"
                                style={{ borderColor: "#D7DCD7" }}
                                onClick={() => setPhotoTarget({ url: item.last_service_photo_url, name: item.name })}
                              />
                            ) : (
                              <span className="text-xs" style={{ color: "#8A9590" }}>-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              onClick={() => setServiceTarget(item)}
                              className="text-xs px-2 py-1 rounded mr-1 transition hover:opacity-75"
                              style={{ background: unverified ? meta.soft : "#E4EFE8", color: unverified ? meta.color : "#3F7A5E" }}
                              title="Tandai service"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditTarget(item)}
                              className="text-xs px-2 py-1 rounded mr-1 border transition hover:opacity-70"
                              style={{ borderColor: "#D7DCD7", color: "#2F5D62" }}
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              disabled={deletingId === item.id}
                              className="text-xs px-2 py-1 rounded transition hover:opacity-70 disabled:opacity-40"
                              style={{ color: "#C1443A" }}
                              title="Hapus"
                            >
                              {deletingId === item.id ? "…" : "🗑"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wide" style={{ color: "#8A9590", background: "#F7F8F6" }}>
                {filteredList.length} peralatan {filterLocation !== "all" ? `· ${filterLocation}` : ""} {filterStatus !== "all" ? `· ${STATUS_META[filterStatus].label}` : ""} · mode simple
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((item) => {
                const { daysRemaining, percentElapsed, status } = statusOf(item);
                const meta = STATUS_META[status];
                const unverified = status === "belum" || status === "expired";

                return (
                  <div
                    key={item.id}
                    className="tag-card bg-white rounded-xl border p-4 flex flex-col gap-3"
                    style={{ borderColor: "#D7DCD7", borderLeftWidth: 3, borderLeftColor: meta.color }}
                  >
                    <div className="flex gap-4 items-center">
                      <Gauge percent={percentElapsed} color={meta.color} dashed={unverified} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm shrink-0" aria-hidden>
                            {TYPE_ICON[item.type] || "◆"}
                          </span>
                          <p className="font-display font-semibold text-sm truncate" style={{ color: "#1B2420" }}>
                            {item.name}
                          </p>
                        </div>
                        <p className="text-xs mb-2" style={{ color: "#8A9590" }}>
                          {item.location || "Lokasi tidak diisi"} · setiap {item.service_interval_days} hari
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span
                            className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ background: meta.soft, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          {daysRemaining !== null && (
                            <span className="font-mono text-[11px]" style={{ color: "#6B7570" }}>
                              {daysRemaining >= 0 ? `${daysRemaining} hari lagi` : `terlambat ${Math.abs(daysRemaining)} hari`}
                            </span>
                          )}
                        </div>
                        {item.notification_email && (
                          <p className="text-[11px] truncate" style={{ color: "#8A9590" }}>
                            ✉ {item.notification_email}
                          </p>
                        )}
                      </div>

                      {item.last_service_photo_url && (
                        <img
                          src={item.last_service_photo_url}
                          alt={`Bukti service ${item.name}`}
                          className="w-12 h-12 rounded-md object-cover border shrink-0 cursor-pointer hover:opacity-75 transition"
                          style={{ borderColor: "#D7DCD7" }}
                          title="Klik untuk lihat foto"
                          onClick={() => setPhotoTarget({ url: item.last_service_photo_url, name: item.name })}
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "#EEF1EE" }}>
                      <button
                        onClick={() => setServiceTarget(item)}
                        className="flex-1 text-xs font-medium py-2 rounded-md transition hover:opacity-85"
                        style={{
                          background: unverified ? meta.soft : "#E4EFE8",
                          color: unverified ? meta.color : "#3F7A5E",
                        }}
                      >
                        {unverified ? "+ Tandai Service" : "✓ Sudah Diservice"}
                      </button>
                      <button
                        onClick={() => setEditTarget(item)}
                        className="text-xs px-3 rounded-md border transition hover:opacity-70"
                        style={{ borderColor: "#D7DCD7", color: "#2F5D62" }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={deletingId === item.id}
                        className="text-xs px-3 rounded-md transition hover:opacity-70 disabled:opacity-40"
                        style={{ color: "#C1443A" }}
                        aria-label={`Hapus ${item.name}`}
                      >
                        {deletingId === item.id ? "…" : "🗑"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-white font-medium transition hover:shadow-xl hover:scale-105 active:scale-95"
        style={{ background: "#2F5D62" }}
        title="Tambah peralatan baru"
      >
        <span className="text-xl leading-none">＋</span>
        <span className="hidden sm:inline text-sm">Tambah Peralatan</span>
      </button>

      {showAddForm && (
        <AddEquipmentModal
          onClose={() => setShowAddForm(false)}
          onDone={() => {
            setShowAddForm(false);
            fetchEquipment();
          }}
        />
      )}

      {serviceTarget && (
        <ServiceModal
          equipment={serviceTarget}
          onClose={() => setServiceTarget(null)}
          onDone={() => {
            setServiceTarget(null);
            fetchEquipment();
          }}
        />
      )}

      {editTarget && (
        <EditModal
          equipment={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => {
            setEditTarget(null);
            fetchEquipment();
          }}
        />
      )}

      {photoTarget && (
        <PhotoModal
          url={photoTarget.url}
          title={photoTarget.name}
          onClose={() => setPhotoTarget(null)}
        />
      )}
    </main>
  );
}