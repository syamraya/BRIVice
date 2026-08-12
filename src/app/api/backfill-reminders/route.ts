import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const { data: pending, error } = await supabaseAdmin
    .from("reminders")
    .select("id, equipment_id, scheduled_for")
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  for (const r of pending || []) {
    await inngest.send({
      name: "brivice/schedule-reminder",
      data: {
        equipmentId: r.equipment_id,
        reminderId: r.id,
        scheduledAt: r.scheduled_for,
      },
    });
  }

  return NextResponse.json({ triggered: pending?.length || 0 });
}