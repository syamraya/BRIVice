import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Status helper (sama seperti di dashboard)
// ---------------------------------------------------------------------------
type Status = "belum" | "expired" | "soon" | "ok";

function getServiceStatus(lastServiceDate: string | null, intervalDays: number, verified: boolean) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastServiceDate) {
    return { daysRemaining: null, status: "belum" as Status };
  }

  const last = new Date(lastServiceDate);
  const next = new Date(last);
  next.setDate(next.getDate() + intervalDays);
  next.setHours(0, 0, 0, 0);

  const daysRemaining = Math.round((next.getTime() - today.getTime()) / 86400000);

  if (!verified) {
    return { daysRemaining, status: (daysRemaining < 0 ? "expired" : "belum") as Status };
  }
  if (daysRemaining < 0) return { daysRemaining, status: "expired" as Status };
  if (daysRemaining <= 7) return { daysRemaining, status: "soon" as Status };
  return { daysRemaining, status: "ok" as Status };
}

const DOT_COLOR: Record<Status, string> = {
  belum: "#8A9590",
  expired: "#C1443A",
  soon: "#C8862A",
  ok: "#3F7A5E",
};

function suffixFor(st: { status: Status; daysRemaining: number | null }) {
  if (st.status === "expired") {
    return st.daysRemaining !== null ? `terlambat ${Math.abs(st.daysRemaining)} hari` : "jatuh tempo";
  }
  if (st.status === "belum") return "belum service";
  if (st.status === "soon") return `${st.daysRemaining} hari lagi`;
  return `aman · ${st.daysRemaining} hari lagi`;
}

// ---------------------------------------------------------------------------
// GET /api/public/status — data live untuk panel login
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from("equipment")
      .select("name, type, location, last_service_date, service_interval_days, service_verified");

    const rows = (data || []).map((item) => ({
      item,
      st: getServiceStatus(item.last_service_date, item.service_interval_days, item.service_verified === true),
    }));

    // Urutkan dari paling urgen: expired → belum → soon → ok
    const weight: Record<Status, number> = { expired: 0, belum: 1, soon: 2, ok: 3 };
    rows.sort((a, b) => {
      const wa = weight[a.st.status];
      const wb = weight[b.st.status];
      if (wa !== wb) return wa - wb;
      return (a.st.daysRemaining ?? -9999) - (b.st.daysRemaining ?? -9999);
    });

    const lines = rows.slice(0, 3).map(({ item, st }) => ({
      color: DOT_COLOR[st.status],
      text: `${item.location || "Tanpa lokasi"} · ${item.type} · ${suffixFor(st)}`,
    }));

    return NextResponse.json({
      totpEnabled: !!process.env.TOTP_SECRET,
      total: (data || []).length,
      lines,
    });
  } catch {
    return NextResponse.json({ totpEnabled: !!process.env.TOTP_SECRET, total: 0, lines: [] });
  }
}