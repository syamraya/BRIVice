"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase-client";

type Status = "belum" | "expired" | "soon" | "ok";

const STATUS_LABEL: Record<Status, string> = {
  belum: "Belum Service",
  expired: "Belum Service",
  soon: "Segera",
  ok: "Sudah Diservice",
};

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getStatus(item: any): { status: Status; daysRemaining: number | null; next: Date | null } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!item.last_service_date) return { status: "belum", daysRemaining: null, next: null };
  const last = new Date(item.last_service_date);
  const next = new Date(last);
  next.setDate(next.getDate() + item.service_interval_days);
  next.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((next.getTime() - today.getTime()) / 86400000);
  const verified = item.service_verified === true;
  if (!verified) return { status: daysRemaining < 0 ? "expired" : "belum", daysRemaining, next };
  if (daysRemaining < 0) return { status: "expired", daysRemaining, next };
  if (daysRemaining <= 7) return { status: "soon", daysRemaining, next };
  return { status: "ok", daysRemaining, next };
}

export default function ExportButton({
  items,
  filterLocation,
  counts,
}: {
  items: any[];
  filterLocation: string;
  counts: { belum: number; overdue: number; soon: number };
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Sheet 1: Peralatan
      const rowsEq = items.map((item, idx) => {
        const st = getStatus(item);
        return {
          No: idx + 1,
          "Nama Alat": item.name,
          Tipe: item.type,
          Lokasi: item.location || "-",
          "Interval (hari)": item.service_interval_days,
          "Service Terakhir": item.last_service_date || "-",
          "Jatuh Tempo": st.next ? fmtDate(st.next) : "-",
          "Sisa Hari": st.daysRemaining ?? "-",
          Status: STATUS_LABEL[st.status],
          Terverifikasi: item.service_verified ? "Ya" : "Tidak",
          "Email Notifikasi": item.notification_email || "-",
        };
      });

      // Sheet 2: Riwayat Service
      const { data: hist } = await supabase
        .from("service_history")
        .select("*, equipment(name, location)")
        .order("created_at", { ascending: false });

      const rowsHist = (hist || [])
        .filter((h: any) => filterLocation === "all" || h.equipment?.location === filterLocation)
        .map((h: any, idx: number) => ({
          No: idx + 1,
          "Tanggal Service": h.service_date || "-",
          "Nama Alat": h.equipment?.name || "-",
          Lokasi: h.equipment?.location || "-",
          Teknisi: h.technician || "-",
          Catatan: h.notes || "-",
          "Foto Bukti": h.photo_url || "-",
        }));

      // Sheet 3: Rekap
      const rowsRekap = [
        { Keterangan: "Cabang", Nilai: "KC Sutoyo" },
        { Keterangan: "Filter lokasi", Nilai: filterLocation === "all" ? "Semua lokasi" : filterLocation },
        { Keterangan: "Total peralatan", Nilai: items.length },
        { Keterangan: "Belum service", Nilai: counts.belum },
        { Keterangan: "Jatuh tempo", Nilai: counts.overdue },
        { Keterangan: "Segera (<=7 hari)", Nilai: counts.soon },
        { Keterangan: "Waktu ekspor", Nilai: new Date().toLocaleString("id-ID") },
      ];

      const wb = XLSX.utils.book_new();

      const wsEq = XLSX.utils.json_to_sheet(rowsEq.length ? rowsEq : [{ Info: "Tidak ada data sesuai filter" }]);
      wsEq["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 9 }, { wch: 16 }, { wch: 14 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, wsEq, "Peralatan");

      const wsHist = XLSX.utils.json_to_sheet(rowsHist.length ? rowsHist : [{ Info: "Belum ada riwayat service" }]);
      wsHist["!cols"] = [{ wch: 4 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsHist, "Riwayat Service");

      const wsRekap = XLSX.utils.json_to_sheet(rowsRekap);
      wsRekap["!cols"] = [{ wch: 22 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap");

      XLSX.writeFile(wb, `BRIVice-Laporan-${fmtDate(new Date())}.xlsx`);
    } catch (err: any) {
      alert("Gagal export: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="text-xs font-mono uppercase tracking-wide flex items-center gap-1.5 hover:opacity-70 transition disabled:opacity-40"
      style={{ color: "#2F5D62" }}
      title="Download laporan Excel (.xlsx)"
    >
      {exporting ? "⏳ Menyusun…" : "📥 Excel"}
    </button>
  );
}