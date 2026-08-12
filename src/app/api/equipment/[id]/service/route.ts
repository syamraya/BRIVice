import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/equipment/[id]/service
// Body: { servicedAt: string (YYYY-MM-DD), photoUrl?: string | null }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { servicedAt, photoUrl } = body;

  if (!servicedAt) {
    return NextResponse.json({ error: "servicedAt wajib diisi" }, { status: 400 });
  }

  // 1. Ambil data equipment (butuh interval-nya untuk hitung reminder berikutnya)
  const { data: equipment, error: eqFetchError } = await supabaseAdmin
    .from("equipment")
    .select("id, service_interval_days")
    .eq("id", id)
    .single();

  if (eqFetchError || !equipment) {
    return NextResponse.json({ error: "Peralatan tidak ditemukan" }, { status: 404 });
  }

  // 2. Update equipment: tanggal service terakhir + foto terbaru
  const { error: updateError } = await supabaseAdmin
    .from("equipment")
    .update({
      last_service_date: servicedAt,
      last_service_photo_url: photoUrl || null,
      service_verified: true,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // 3. Catat ke riwayat service
  const { error: logError } = await supabaseAdmin.from("service_logs").insert({
    equipment_id: id,
    serviced_at: servicedAt,
    photo_url: photoUrl || null,
  });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 400 });
  }

  // 4. Batalkan reminder lama yang masih pending (biar tidak ada 2 reminder aktif)
  await supabaseAdmin
    .from("reminders")
    .update({ status: "cancelled" })
    .eq("equipment_id", id)
    .eq("status", "pending");

  // 5. Hitung & jadwalkan reminder berikutnya
  const nextDate = new Date(servicedAt);
  nextDate.setDate(nextDate.getDate() + equipment.service_interval_days);

  const { data: newReminder, error: remError } = await supabaseAdmin
    .from("reminders")
    .insert({
      equipment_id: id,
      scheduled_for: nextDate.toISOString(),
      status: "pending",
    })
    .select()
    .single();

  if (remError) {
    return NextResponse.json({ error: remError.message }, { status: 400 });
  }

  await inngest.send({
    name: "brivice/schedule-reminder",
    data: {
      equipmentId: id,
      reminderId: newReminder.id,
      scheduledAt: nextDate.toISOString(),
    },
  });

  return NextResponse.json({ nextServiceDate: nextDate.toISOString() });
}