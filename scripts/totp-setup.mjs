// Jalankan: node scripts/totp-setup.mjs
import { TOTP } from "otpauth";

const totp = new TOTP({
  issuer: "BRIVice",
  label: "KC Sutoyo Admin",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
});

console.log("=== BRIVice TOTP Setup ===");
console.log("Tambahkan baris ini ke .env.local (dan Vercel nanti):");
console.log(`TOTP_SECRET=${totp.secret.base32}`);