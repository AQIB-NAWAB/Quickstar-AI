import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.CLINIC_PORT ? parseInt(process.env.CLINIC_PORT, 10) : 4000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

// In-memory demo state for Dental Strivers
const INITIAL_SLOTS = [
  { id: "slot-1", time: "Tomorrow at 2:00 PM", doctor: "Dr. Sarah Miller", status: "available" },
  { id: "slot-2", time: "Tomorrow at 3:30 PM", doctor: "Dr. Sarah Miller", status: "available" },
  { id: "slot-3", time: "Tomorrow at 5:00 PM", doctor: "Dr. Alex Reed", status: "available" },
  { id: "slot-4", time: "Monday at 10:00 AM", doctor: "Dr. Sarah Miller", status: "available" },
  { id: "slot-5", time: "Monday at 11:30 AM", doctor: "Dr. Alex Reed", status: "available" },
];

let availableSlots = JSON.parse(JSON.stringify(INITIAL_SLOTS));
let bookings = [
  {
    id: "DS-901",
    patient_name: "Sarah Jenkins",
    service: "Teeth Whitening",
    slot: "Today at 4:00 PM",
    doctor: "Dr. Alex Reed",
    email: "sarah.j@example.com",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    status: "confirmed",
    email_status: "delivered",
  },
];
let webhookLogs = [
  {
    id: "wh-1",
    event: "booking.confirmed",
    patient: "Sarah Jenkins",
    slot: "Today at 4:00 PM",
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
    email_delivered: true,
  },
];

// SSE Clients
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function matchSlot(requestedSlot, slots) {
  if (!requestedSlot || typeof requestedSlot !== "string") return null;
  const raw = requestedSlot.toLowerCase().trim();

  // 1. Direct ID match (e.g. "slot-4")
  let match = slots.find((s) => s.status === "available" && s.id.toLowerCase() === raw);
  if (match) return match;

  const clean = (str) =>
    String(str)
      .toLowerCase()
      .replace(/\b(at|for|on|the|appointment|slot)\b/g, "")
      .replace(/[^a-z0-9]/g, "");

  const cleanReq = clean(raw);

  // 2. Cleaned normalized match (e.g. "Monday 10:00 AM" vs "Monday at 10:00 AM")
  match = slots.find((s) => {
    if (s.status !== "available") return false;
    const cleanS = clean(s.time);
    return cleanS === cleanReq || cleanS.includes(cleanReq) || cleanReq.includes(cleanS);
  });
  if (match) return match;

  // 3. Time + day token match
  const reqTimeMatch = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const reqDay = raw.includes("tomorrow")
    ? "tomorrow"
    : raw.includes("monday")
      ? "monday"
      : raw.includes("today")
        ? "today"
        : null;

  if (reqTimeMatch) {
    const hour = parseInt(reqTimeMatch[1], 10);
    const min = reqTimeMatch[2] || "00";
    const ampm = reqTimeMatch[3];

    match = slots.find((s) => {
      if (s.status !== "available") return false;
      const sLower = s.time.toLowerCase();
      if (reqDay && !sLower.includes(reqDay)) return false;

      const sMatch = sLower.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
      if (!sMatch) return false;
      const sHour = parseInt(sMatch[1], 10);
      const sMin = sMatch[2];
      const sAmpm = sMatch[3];

      if (hour !== sHour) return false;
      if (reqTimeMatch[2] && min !== sMin) return false;
      if (ampm && ampm !== sAmpm) return false;
      return true;
    });
    if (match) return match;
  }

  return null;
}

async function sendResendEmail({ to, patientName, slot, doctor, service }) {
  const recipient = to || "hashir@example.com";
  const subject = `Appointment Confirmed: Dental Strivers (${slot})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #ff571a; margin-top: 0;">Dental Strivers Clinic</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Your dental appointment has been successfully scheduled:</p>
      <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Time:</strong> ${slot}</p>
        <p style="margin: 4px 0;"><strong>Dentist:</strong> ${doctor}</p>
        <p style="margin: 4px 0;"><strong>Service:</strong> ${service || "General Consultation & Cleaning"}</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> 742 Evergreen Terrace, Suite 100</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you need to reschedule or have questions, please call us at (555) 321-DENT.</p>
    </div>
  `;

  if (!RESEND_API_KEY) {
    console.log(`[Resend Simulated] Sent confirmation email to ${recipient} for ${patientName}`);
    return { ok: true, simulated: true, id: `sim_${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dental Strivers <onboarding@resend.dev>",
        to: [recipient],
        subject,
        html,
      }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[Resend Error]", err);
    return { ok: false, error: String(err) };
  }
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname.replace(/\/$/, "") || "/";

  // Real-time SSE Stream
  if (pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("event: connected\ndata: {}\n\n");
    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // API: Get Slots
  if (req.method === "GET" && pathname === "/api/slots") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        clinic: "Dental Strivers",
        available_slots: availableSlots.filter((s) => s.status === "available"),
        summary: `Currently available slots: ${availableSlots.filter((s) => s.status === "available").map((s) => s.time).join(", ")}.`,
      }),
    );
    return;
  }

  // API: Book a slot
  if (req.method === "POST" && pathname === "/api/book") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const patientName = payload.name || payload.patient_name || payload.caller_name;
        const requestedSlot = payload.slot || payload.slot_time || payload.time;
        const service = payload.service || "Dental Checkup & Cleaning";
        const email = payload.email || "hashir@example.com";

        if (!patientName) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "PATIENT_NAME_REQUIRED",
              message: "Please provide the patient name for the appointment booking.",
            }),
          );
          return;
        }

        if (!requestedSlot || !String(requestedSlot).trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "SLOT_REQUIRED",
              message: "Please select an available appointment slot before booking.",
              available_slots: availableSlots.filter((s) => s.status === "available"),
            }),
          );
          return;
        }

        const matchedSlot = matchSlot(requestedSlot, availableSlots);

        if (!matchedSlot) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "SLOT_UNAVAILABLE",
              message: `The slot '${requestedSlot}' is not currently available. Please select from the available times.`,
              available_slots: availableSlots.filter((s) => s.status === "available"),
            }),
          );
          return;
        }

        matchedSlot.status = "booked";

        const newBooking = {
          id: `DS-${Math.floor(100 + Math.random() * 900)}`,
          patient_name: patientName,
          service,
          slot: matchedSlot.time,
          doctor: matchedSlot.doctor,
          email,
          created_at: new Date().toISOString(),
          status: "confirmed",
          email_status: "sending",
        };

        bookings.unshift(newBooking);

        // Send email via Resend
        const emailResult = await sendResendEmail({
          to: email,
          patientName,
          slot: matchedSlot.time,
          doctor: matchedSlot.doctor,
          service,
        });

        newBooking.email_status = emailResult.ok ? "sent" : "failed";

        // Log webhook event
        webhookLogs.unshift({
          id: `wh-${Date.now()}`,
          event: "booking.confirmed",
          patient: patientName,
          slot: matchedSlot.time,
          timestamp: new Date().toLocaleTimeString(),
          email_delivered: emailResult.ok,
        });

        // Broadcast real-time SSE update to the dashboard
        broadcast("booking_created", {
          booking: newBooking,
          slots: availableSlots,
          logs: webhookLogs,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            status: "confirmed",
            message: `Appointment successfully booked for ${patientName} on ${matchedSlot.time} with ${matchedSlot.doctor}. A confirmation email has been dispatched.`,
            booking: newBooking,
          }),
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  // API: Cancel an appointment
  if (req.method === "POST" && pathname === "/api/cancel") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const bookingId = payload.id || payload.booking_id;
        const patientName = payload.name || payload.patient_name || payload.caller_name;

        let booking = null;
        if (bookingId) {
          booking = bookings.find((b) => b.id.toLowerCase() === String(bookingId).toLowerCase());
        }
        if (!booking && patientName) {
          booking = bookings.find(
            (b) =>
              b.patient_name.toLowerCase().includes(String(patientName).toLowerCase()) &&
              b.status !== "cancelled",
          );
        }
        if (!booking && patientName) {
          booking = bookings.find(
            (b) => b.patient_name.toLowerCase().includes(String(patientName).toLowerCase()),
          );
        }

        if (!booking) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "BOOKING_NOT_FOUND",
              message: "No active appointment found matching the provided identifier or name.",
            }),
          );
          return;
        }

        booking.status = "cancelled";

        // Free up the slot if it matches
        const freedSlot = availableSlots.find((s) => s.time === booking.slot);
        if (freedSlot) {
          freedSlot.status = "available";
        }

        // Log webhook event
        webhookLogs.unshift({
          id: `wh-${Date.now()}`,
          event: "booking.cancelled",
          patient: booking.patient_name,
          slot: booking.slot,
          timestamp: new Date().toLocaleTimeString(),
          email_delivered: false,
        });

        // Broadcast real-time SSE update to the dashboard
        broadcast("booking_cancelled", {
          booking,
          slots: availableSlots,
          logs: webhookLogs,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            status: "cancelled",
            message: `Appointment ${booking.id} for ${booking.patient_name} on ${booking.slot} has been successfully cancelled.`,
            booking,
          }),
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  // API: Reschedule an appointment
  if (req.method === "POST" && pathname === "/api/reschedule") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const bookingId = payload.id || payload.booking_id;
        const patientName = payload.name || payload.patient_name || payload.caller_name;
        const requestedSlot = payload.new_slot || payload.slot || payload.time;

        let booking = null;
        if (bookingId) {
          booking = bookings.find((b) => b.id.toLowerCase() === String(bookingId).toLowerCase());
        }
        if (!booking && patientName) {
          booking = bookings.find(
            (b) =>
              b.patient_name.toLowerCase().includes(String(patientName).toLowerCase()) &&
              b.status !== "cancelled",
          );
        }
        if (!booking && patientName) {
          booking = bookings.find(
            (b) => b.patient_name.toLowerCase().includes(String(patientName).toLowerCase()),
          );
        }

        if (!booking) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "BOOKING_NOT_FOUND",
              message: "No active appointment found to reschedule.",
            }),
          );
          return;
        }

        if (!requestedSlot || !String(requestedSlot).trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "SLOT_REQUIRED",
              message: "Please specify the new appointment slot to change to.",
              available_slots: availableSlots.filter((s) => s.status === "available"),
            }),
          );
          return;
        }

        const matchedSlot = matchSlot(requestedSlot, availableSlots);

        if (!matchedSlot) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "SLOT_UNAVAILABLE",
              message: `The slot '${requestedSlot}' is not currently available for rescheduling.`,
              available_slots: availableSlots.filter((s) => s.status === "available"),
            }),
          );
          return;
        }

        // Release old slot
        const freedSlot = availableSlots.find((s) => s.time === booking.slot);
        if (freedSlot) {
          freedSlot.status = "available";
        }

        // Reserve new slot
        matchedSlot.status = "booked";
        const oldTime = booking.slot;
        booking.slot = matchedSlot.time;
        booking.doctor = matchedSlot.doctor;

        // Log webhook event
        webhookLogs.unshift({
          id: `wh-${Date.now()}`,
          event: "booking.rescheduled",
          patient: booking.patient_name,
          slot: booking.slot,
          timestamp: new Date().toLocaleTimeString(),
          email_delivered: true,
        });

        // Broadcast real-time SSE update to the dashboard
        broadcast("booking_rescheduled", {
          booking,
          slots: availableSlots,
          logs: webhookLogs,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            status: "rescheduled",
            message: `Appointment ${booking.id} for ${booking.patient_name} has been rescheduled from ${oldTime} to ${matchedSlot.time} with ${matchedSlot.doctor}.`,
            booking,
          }),
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  // API: Get current state
  if (req.method === "GET" && pathname === "/api/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ slots: availableSlots, bookings, logs: webhookLogs }));
    return;
  }

  // API: Reset demo
  if (req.method === "POST" && pathname === "/api/reset") {
    availableSlots = JSON.parse(JSON.stringify(INITIAL_SLOTS));
    bookings = bookings.slice(-1);
    broadcast("reset", { slots: availableSlots, bookings, logs: webhookLogs });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Serve Dashboard HTML
  if (req.method === "GET" && (pathname === "/" || pathname === "/dashboard")) {
    const htmlPath = path.join(__dirname, "dashboard.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(htmlPath, "utf8"));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Dental Strivers Clinic Portal] Running at http://127.0.0.1:${PORT}`);
  console.log(`  - Slots API:     http://127.0.0.1:${PORT}/api/slots`);
  console.log(`  - Booking API:   http://127.0.0.1:${PORT}/api/book`);
  console.log(`  - Dashboard:     http://127.0.0.1:${PORT}/`);
});
