import { NextResponse } from "next/server";
import { TOTP, Secret } from "otpauth";

function setSession(res: NextResponse) {
  res.cookies.set("brivice_session", process.env.SESSION_SECRET || "brivice-dev-secret", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // MODE 1: Kode Google Authenticator (TOTP)
  if (body.totp) {
    const secret = process.env.TOTP_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "TOTP belum disetup. Isi TOTP_SECRET di env dulu." },
        { status: 500 }
      );
    }

    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: String(body.totp), window: 1 });
    if (delta === null) {
      return NextResponse.json(
        { error: "Kode salah / kedaluwarsa. Pakai kode terbaru di aplikasi Authenticator." },
        { status: 401 }
      );
    }

    return setSession(NextResponse.json({ ok: true, method: "totp" }));
  }

  // MODE 2: PIN darurat (backup)
  if (body.pin) {
    const correctPin = process.env.ACCESS_PIN;
    if (!correctPin) {
      return NextResponse.json({ error: "ACCESS_PIN belum diset." }, { status: 500 });
    }
    if (body.pin !== correctPin) {
      return NextResponse.json({ error: "PIN darurat salah." }, { status: 401 });
    }
    return setSession(NextResponse.json({ ok: true, method: "pin" }));
  }

  return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
}