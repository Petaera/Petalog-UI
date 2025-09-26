import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createObjectCsvStringifier } from "csv-writer";

// Supabase client (using env vars from Vercel dashboard)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// --- Export CSV (same as Reports.tsx "Export CSV") ---
function generateLogsCSV(logs) {
  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: "vehicle_number", title: "Vehicle Number" },
      { id: "service", title: "Service" },
      { id: "Amount", title: "Amount" },
      { id: "payment_mode", title: "Payment Mode" },
      { id: "created_at", title: "Date" },
    ],
  });
  return csvWriter.getHeaderString() + csvWriter.stringifyRecords(logs);
}

// --- Export Payment Breakdown (same as Reports.tsx "Export Payment Breakdown") ---
function generatePaymentBreakdownCSV(logs) {
  const payments = {};
  logs.forEach((l) => {
    payments[l.payment_mode] = (payments[l.payment_mode] || 0) + l.Amount;
  });

  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: "mode", title: "Payment Mode" },
      { id: "total", title: "Total Collected" },
    ],
  });

  const rows = Object.entries(payments).map(([mode, total]) => ({
    mode,
    total,
  }));

  return csvWriter.getHeaderString() + csvWriter.stringifyRecords(rows);
}

// --- API handler for Vercel Cron + manual testing ---
export default async function handler(req, res) {
  try {
    // 1. Fetch all logs
    const { data: logs, error } = await supabase.from("logs-man").select("*");
    if (error) throw error;

    // 2. Generate both CSVs
    const logsCsv = generateLogsCSV(logs);
    const paymentsCsv = generatePaymentBreakdownCSV(logs);

    // 3. Fetch owner email from Supabase
    const { data: owner, error: ownerErr } = await supabase
      .from("users")
      .select("email")
      .eq("role", "owner") // adjust if column name differs
      .single();

    if (ownerErr) throw ownerErr;
    if (!owner?.email) throw new Error("Owner email not found in Supabase");

    const ownerEmail = owner.email;

    // 4. Configure SMTP (Zoho)
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS,
      },
    });

    // 5. Send email
    await transporter.sendMail({
      from: `"Peta Parking Reports" <${process.env.ZOHO_USER}>`,
      to: ownerEmail,
      subject: `Daily Reports - ${new Date().toLocaleDateString()}`,
      text: "Attached are today's reports.",
      attachments: [
        {
          filename: `report-${new Date().toISOString().slice(0, 10)}.csv`,
          content: logsCsv,
        },
        {
          filename: `payment-breakdown-${new Date().toISOString().slice(0, 10)}.csv`,
          content: paymentsCsv,
        },
      ],
    });

    res.status(200).json({ message: "✅ Reports sent to " + ownerEmail });
  } catch (err) {
    console.error("❌ Error sending report:", err.message);
    res.status(500).json({ error: err.message });
  }
}
