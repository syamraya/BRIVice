import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("equipment")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}