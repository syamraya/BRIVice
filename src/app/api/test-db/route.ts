import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Cek koneksi ke Supabase
    const { data, error } = await supabaseAdmin
      .from("equipment")
      .select("id")
      .limit(1);

    if (error && error.code !== "42P01") { // 42P01 = tabel belum ada (normal di awal)
      throw new Error(error.message);
    }

    return NextResponse.json({ 
      status: "✅ Supabase Connected", 
      message: error?.code === "42P01" ? "Table belum dibuat (lanjut ke Step SQL)" : "Table ready" 
    });
  } catch (err: any) {
    return NextResponse.json({ status: "❌ Error", message: err.message }, { status: 500 });
  }
}