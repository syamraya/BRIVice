import { NextResponse } from "next/server";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({}));

  // Harus pakai PIN admin untuk lihat QR
  if (!process.env.ACCESS_PIN || pin !== process.env.ACCESS_PIN) {
    return NextResponse.json({ error: "PIN admin salah." }, { status: 401 });
  }

  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "TOTP_SECRET belum ada. Jalankan: node scripts/totp-setup.mjs" },
      { status: 500 }
    );
  }

  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    issuer: "BRIVice",
    label: "KC Sutoyo Admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const url = totp.toString();
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 280,
    color: { dark: "#1B2420", light: "#FFFFFF" },
  });

  return NextResponse.json({ qr, secret });
}