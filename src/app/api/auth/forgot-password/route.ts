import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

/**
 * Always returns `{ ok: true }` regardless of whether the email exists in
 * the system — leaking that information would let an attacker enumerate
 * registered users. The actual side effect (token + email) only happens for
 * real users.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  // Silent success when the email is not registered.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Invalidate previous outstanding tokens for this user — only the most
  // recent link should work, both to reduce DB clutter and to mitigate
  // multiple-link-in-inbox confusion.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const origin =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin;
  const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;

  const result = await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
    name: user.name,
  });

  // Even if the email fails to send, we don't reveal that to the client
  // (same enumeration concern). Server logs capture the failure for the
  // admin to investigate.
  if (!result.ok) {
    console.error(`[forgot-password] Email send failed for ${user.email}:`, result.error);
  }

  return NextResponse.json({ ok: true });
}
