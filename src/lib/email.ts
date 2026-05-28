import { Resend } from "resend";

/**
 * Thin wrapper around the Resend API. Reads RESEND_API_KEY lazily so the
 * module is importable in environments where the key isn't set (e.g. local
 * dev without email config) — calls just no-op in that case and we log the
 * email contents to the server console so devs can copy the reset link.
 */
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "SAT Practice <onboarding@resend.dev>";

interface SendPasswordResetParams {
  to: string;
  resetUrl: string;
  /** Friendly display name; falls back to "there". */
  name?: string | null;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  name,
}: SendPasswordResetParams): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();

  // In dev without a key, dump the link so the developer can still test the
  // flow end-to-end without standing up Resend.
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY not set — would have sent password reset to ${to}: ${resetUrl}`,
    );
    return { ok: true };
  }

  const displayName = (name?.trim() || "there").replace(/[<>]/g, "");
  const subject = "Reset your password — SAT Practice Platform";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fa;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 8px;">
                    <div style="font-size:14px;font-weight:600;color:#1e3a5f;letter-spacing:0.02em;">SAT Practice Platform</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0;">
                    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0f172a;">Reset your password</h1>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
                      Hi ${displayName}, we received a request to reset your password. Click the button below to set a new one.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 24px;">
                    <a href="${resetUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:500;">Reset password</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 24px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">
                      Or paste this link into your browser:<br />
                      <a href="${resetUrl}" style="color:#1e3a5f;word-break:break-all;">${resetUrl}</a>
                    </p>
                    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">SAT Practice Platform · Built for SAT preparation</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
