import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();

  const { data: eqData, error: eqError } = await supabaseAdmin
    .from("equipment")
    .insert({
      name: body.name,
      type: body.type,
      location: body.location,
      service_interval_days: parseInt(body.interval),
      last_service_date: body.lastService || null, // boleh kosong = "Belum Service"
      notification_email: body.notificationEmail || null,
      service_verified: false,
    })
    .select()
    .single();

  if (eqError) return NextResponse.json({ error: eqError.message }, { status: 400 });

  // Reminder & event Inngest cuma dibuat kalau ada tanggal service.
  // Kalau belum ada, belum ada baseline untuk hitung jadwal berikutnya —
  // reminder baru dibuat pas equipment pertama kali ditandai "Sudah Diservice".
  if (body.lastService) {
    const nextDate = new Date(body.lastService);
    nextDate.setDate(nextDate.getDate() + parseInt(body.interval));

    const { data: remData, error: remError } = await supabaseAdmin
      .from("reminders")
      .insert({
        equipment_id: eqData.id,
        scheduled_for: nextDate.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (remError) return NextResponse.json({ error: remError.message }, { status: 400 });

    await inngest.send({
      name: "brivice/schedule-reminder",
      data: {
        equipmentId: eqData.id,
        reminderId: remData.id,
        scheduledAt: nextDate.toISOString(),
      },
    });
  }

  return NextResponse.json({ equipment: eqData });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("equipment")
    .update({
      name: fields.name,
      type: fields.type,
      location: fields.location,
      service_interval_days: parseInt(fields.interval),
      notification_email: fields.notificationEmail || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ equipment: data });
}