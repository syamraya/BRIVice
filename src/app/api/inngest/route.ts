import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { transporter } from "@/lib/mailer"; // 👈 Import transporter Nodemailer

// ---------------------------------------------------------------------------
// Email template — table-based + inline CSS (required for Gmail/Outlook to
// render consistently). Mirrors the dashboard's status colors.
// ---------------------------------------------------------------------------
function buildReminderEmail(equipment: {
  name: string;
  type: string;
  location: string | null;
  service_interval_days: number;
}, scheduledAt: string) {
  const dateLabel = new Date(scheduledAt).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const TYPE_ICON: Record<string, string> = {
    AC: "❄", Printer: "⎙", Server: "▤", Lift: "⇅", Genset: "⚡", Lainnya: "◆",
  };
  const icon = TYPE_ICON[equipment.type] || "◆";

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reminder Service</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF1EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF1EE;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #D7DCD7;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2F5D62;padding:24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:40px;height:40px;border-radius:50%;border:2px solid #ffffff;text-align:center;vertical-align:middle;font-family:Georgia,serif;font-weight:700;font-size:13px;color:#ffffff;">
                    BV
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#BFD4D2;font-weight:600;">Facility Maintenance Log</p>
                    <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:#ffffff;">BRIVice</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status strip -->
          <tr>
            <td style="background-color:#F7E7E5;padding:10px 28px;border-bottom:1px solid #E3B4AE;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#C1443A;">
                🔧 Reminder Service Peralatan
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D7DCD7;border-left:3px solid #C1443A;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:13px;color:#8A9590;">
                      ${icon} ${equipment.type}
                    </p>
                    <p style="margin:0 0 8px;font-size:19px;font-weight:700;color:#1B2420;">
                      ${equipment.name}
                    </p>
                    <p style="margin:0;font-size:14px;color:#6B7570;">
                      ${equipment.location || "Lokasi tidak diisi"} · setiap ${equipment.service_interval_days} hari
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="font-size:14px;color:#1B2420;line-height:1.6;">
                    Peralatan ini dijadwalkan untuk servis pada:
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px;">
                    <p style="margin:0;font-size:16px;font-weight:700;color:#2F5D62;">${dateLabel}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background-color:#F7F8F6;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#6B7570;line-height:1.5;">
                      Segera koordinasikan dengan teknisi terkait untuk menjadwalkan kunjungan servis.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #EEF1EE;">
              <p style="margin:0;font-size:11px;color:#8A9590;">
                Email otomatis dari BRIVice — sistem pengingat maintenance peralatan kantor.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `BRIVice — Reminder Service Peralatan

${equipment.name} (${equipment.type})
Lokasi: ${equipment.location || "-"}
Interval: setiap ${equipment.service_interval_days} hari

Dijadwalkan servis pada: ${dateLabel}

Segera koordinasikan dengan teknisi terkait.`;

  return { html, text, subject: `🔧 Reminder Service: ${equipment.name}` };
}

const sendReminderJob = inngest.createFunction(
  {
    id: "brivice-send-reminder",
    triggers: [{ event: "brivice/schedule-reminder" }],
  },
  async ({ event, step }) => {
    await step.sleepUntil("wait", event.data.scheduledAt);

    const equipment = await step.run("fetch", async () => {
      const { data, error } = await supabaseAdmin
        .from("equipment")
        .select("id, name, type, location, service_interval_days, notification_email")
        .eq("id", event.data.equipmentId)
        .single();
      if (error || !data) throw new Error("Not found");
      return data;
    });

    // 👇 GANTI BAGIAN INI: Kirim email via Nodemailer (bukan Resend)
    await step.run("email", async () => {
      const recipient = equipment.notification_email;
      if (!recipient) {
        console.log("⚠️ No email to send for:", equipment.name);
        return;
      }

      const { html, text, subject } = buildReminderEmail(equipment, event.data.scheduledAt);

      try {
        const info = await transporter.sendMail({
          from: `"BRIVice System" <${process.env.GMAIL_USER}>`,
          to: recipient, // ✅ Bisa ke email apa saja!
          subject,
          html,
          text,
        });
        console.log("✅ Email sent via Gmail:", info.messageId);
      } catch (err: any) {
        console.error("❌ Nodemailer error:", err);
        throw new Error("Failed to send email: " + err.message);
      }
    });

    await step.run("update", async () => {
      if (event.data.reminderId) {
        await supabaseAdmin
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", event.data.reminderId);
      }
    });
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendReminderJob],
});