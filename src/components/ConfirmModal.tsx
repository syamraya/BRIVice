"use client";
import { useState } from "react";

export default function ConfirmModal({
  icon = "⚠️",
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  danger = false,
  onConfirm,
  onCancel,
}: {
  icon?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const accent = danger ? "#C1443A" : "#2F5D62";
  const soft = danger ? "#F7E7E5" : "#E4EFE8";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-body"
      style={{ background: "rgba(27,36,32,0.5)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl"
        style={{ color: "#1B2420" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: soft }}
          >
            {icon}
          </div>
          <h2 className="font-display font-semibold text-base mb-2" style={{ color: "#1B2420" }}>
            {title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#6B7570" }}>
            {message}
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-md text-sm font-medium border transition hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "#D7DCD7", color: "#6B7570" }}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-md text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: accent }}
          >
            {busy ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}