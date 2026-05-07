import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = 'HomeFixer <noreply@homefixer.app>';

interface EmailPayload {
  type: string;
  to: string;
  [key: string]: unknown;
}

function bookingConfirmationHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#2563EB;">Booking Confirmed!</h2>
      <p>Hi ${p.customerName},</p>
      <p>Your booking has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#475569;">Service</td><td style="padding:8px;font-weight:600;">${p.category}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px;color:#475569;">Provider</td><td style="padding:8px;font-weight:600;">${p.providerName}</td></tr>
        <tr><td style="padding:8px;color:#475569;">Date</td><td style="padding:8px;font-weight:600;">${p.scheduledDate}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px;color:#475569;">Time</td><td style="padding:8px;font-weight:600;">${p.scheduledTime}</td></tr>
        <tr><td style="padding:8px;color:#475569;">Address</td><td style="padding:8px;font-weight:600;">${p.address}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px;color:#475569;">Booking ID</td><td style="padding:8px;font-family:monospace;">${p.bookingId}</td></tr>
      </table>
      <p style="color:#475569;font-size:14px;">The final price will be agreed upon after the job is completed.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function bookingAcceptedHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#16A34A;">Booking Accepted!</h2>
      <p>Hi ${p.customerName},</p>
      <p><strong>${p.providerName}</strong> has accepted your service request and will be heading your way soon.</p>
      <p style="color:#475569;">Open the HomeFixer app to track the status in real-time.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function bookingCompletedHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#16A34A;">Job Completed!</h2>
      <p>Hi ${p.customerName},</p>
      <p><strong>${p.providerName}</strong> has marked your job as complete. We hope everything went well!</p>
      <p style="color:#475569;">Don't forget to leave a review — it helps other homeowners find great providers.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function welcomeHtml(p: Record<string, unknown>) {
  const isProvider = p.role === 'provider';
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#2563EB;">Welcome to HomeFixer, ${p.customerName}!</h2>
      <p>We're thrilled to have you on board${isProvider ? ' as a service provider' : ''}.</p>
      ${isProvider
        ? `<p style="color:#475569;">To start accepting bookings, please submit your government-issued ID and certifications through the app so our team can verify your account.</p>`
        : `<p style="color:#475569;">You can now browse and book trusted home service providers in your area — plumbers, electricians, aircon technicians, and more.</p>`}
      <p style="color:#475569;">Please confirm your email address by clicking the link Supabase sent to activate your account, then sign in.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function verificationApprovedHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#16A34A;">You're Verified!</h2>
      <p>Hi ${p.providerName},</p>
      <p>Great news — your HomeFixer provider account has been <strong>approved</strong>!</p>
      <p style="color:#475569;">You can now start accepting bookings. Make sure your profile is complete and your availability is set so customers can find you.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function verificationRejectedHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#DC2626;">Verification Unsuccessful</h2>
      <p>Hi ${p.providerName},</p>
      <p>Unfortunately, your provider verification could not be approved at this time.</p>
      ${p.reason ? `<p style="color:#475569;"><strong>Reason:</strong> ${p.reason}</p>` : ''}
      <p style="color:#475569;">You can resubmit your documents through the app once you have the required paperwork ready. If you have questions, please contact our support team.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function receiptHtml(p: Record<string, unknown>) {
  const isProvider = p.role === 'provider';
  const price      = Number(p.finalPrice ?? 0);
  const commission = Number(p.commission ?? 0);
  const net        = Number(p.providerNet ?? 0);
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#16A34A;">Transaction Receipt</h2>
      <p>Hi ${p.recipientName},</p>
      <p>${isProvider
        ? `Here is your earnings receipt for the completed job.`
        : `Thank you for using HomeFixer! Here is your payment receipt.`
      }</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #E2E8F0;border-radius:8px;">
        <tr style="background:#F8FAFC;"><td style="padding:10px;color:#475569;font-weight:600;" colspan="2">Booking Details</td></tr>
        <tr><td style="padding:8px 10px;color:#475569;">Booking ID</td><td style="padding:8px 10px;font-family:monospace;font-size:13px;">${p.bookingId}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px 10px;color:#475569;">Service</td><td style="padding:8px 10px;font-weight:600;">${p.category}</td></tr>
        <tr><td style="padding:8px 10px;color:#475569;">Customer</td><td style="padding:8px 10px;">${p.customerName}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px 10px;color:#475569;">Provider</td><td style="padding:8px 10px;">${p.providerName}</td></tr>
        <tr><td style="padding:8px 10px;color:#475569;">Date</td><td style="padding:8px 10px;">${p.scheduledDate}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px 10px;color:#475569;">Address</td><td style="padding:8px 10px;">${p.address}</td></tr>
        <tr><td style="padding:8px 10px;color:#475569;">Payment Method</td><td style="padding:8px 10px;text-transform:uppercase;">${p.paymentMethod}</td></tr>
        ${isProvider ? `
        <tr style="background:#F0FDF4;"><td style="padding:10px;font-weight:700;color:#15803D;" colspan="2">Earnings Breakdown</td></tr>
        <tr style="background:#F0FDF4;"><td style="padding:8px 10px;color:#475569;">Service Fee</td><td style="padding:8px 10px;font-weight:600;">₱${price.toLocaleString()}</td></tr>
        <tr style="background:#F0FDF4;"><td style="padding:8px 10px;color:#DC2626;">Platform Commission (10%)</td><td style="padding:8px 10px;color:#DC2626;font-weight:600;">-₱${commission.toLocaleString()}</td></tr>
        <tr style="background:#F0FDF4;"><td style="padding:8px 10px;font-weight:700;font-size:16px;color:#15803D;">Your Net Earnings</td><td style="padding:8px 10px;font-weight:800;font-size:16px;color:#15803D;">₱${net.toLocaleString()}</td></tr>
        ` : `
        <tr style="background:#F0FDF4;"><td style="padding:10px;font-weight:700;color:#15803D;" colspan="2">Payment Summary</td></tr>
        <tr style="background:#F0FDF4;"><td style="padding:10px;font-weight:700;font-size:16px;color:#15803D;">Total Paid</td><td style="padding:10px;font-weight:800;font-size:16px;color:#15803D;">₱${price.toLocaleString()}</td></tr>
        `}
      </table>
      <p style="color:#64748B;font-size:12px;">This receipt is your official record of the transaction per RA 8792 (Electronic Commerce Act of the Philippines).</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function problemReportHtml(p: Record<string, unknown>) {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;">
      <h2 style="color:#D97706;">Problem Report Received</h2>
      <p>Hi ${p.customerName},</p>
      <p>We've received your report and our support team will look into it shortly.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#475569;">Category</td><td style="padding:8px;font-weight:600;">${p.reportCategory}</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px;color:#475569;">Details</td><td style="padding:8px;">${p.description}</td></tr>
      </table>
      <p style="color:#94A3B8;font-size:12px;margin-top:32px;">HomeFixer — Your trusted home service partner</p>
    </div>`;
}

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const p = payload as Record<string, unknown>;
  switch (payload.type) {
    case 'booking_confirmation':
      return { subject: 'Booking Confirmed — HomeFixer', html: bookingConfirmationHtml(p) };
    case 'booking_accepted':
      return { subject: 'Provider Accepted Your Booking — HomeFixer', html: bookingAcceptedHtml(p) };
    case 'booking_completed':
      return { subject: 'Job Completed — HomeFixer', html: bookingCompletedHtml(p) };
    case 'receipt':
      return {
        subject: `Your ${p.role === 'provider' ? 'Earnings' : 'Payment'} Receipt — HomeFixer`,
        html: receiptHtml(p),
      };
    case 'welcome':
      return { subject: `Welcome to HomeFixer, ${p.customerName}!`, html: welcomeHtml(p) };
    case 'verification_approved':
      return { subject: 'Your HomeFixer Account is Verified!', html: verificationApprovedHtml(p) };
    case 'verification_rejected':
      return { subject: 'HomeFixer Verification Update', html: verificationRejectedHtml(p) };
    case 'problem_report':
      return { subject: 'We Received Your Report — HomeFixer', html: problemReportHtml(p) };
    default:
      return { subject: 'HomeFixer Notification', html: `<p>${JSON.stringify(payload)}</p>` };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { subject, html } = buildEmail(payload);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[send-email] Resend error:', data);
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
