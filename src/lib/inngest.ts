import { Inngest } from "inngest";
import { Resend } from "resend";

// ID harus string unik
export const inngest = new Inngest({ id: "brivice" });

// Pastikan RESEND_API_KEY ada di .env.local
export const resend = new Resend(process.env.RESEND_API_KEY!);