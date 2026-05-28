import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * Validates the reset token and updates the user's password. The route
 * returns the user's email on success so the client can auto-sign-in via
 * NextAuth credentials (the credentials provider needs email+password, but
 * the new password is what the client just sent, so the client already has
 * both pieces).
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
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      },
      { status: 400 },
    );
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      {
        ok: false,
        error: "This reset link has expired or already been used.",
      },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(password, 10);

  // Update password and mark token used in a transaction so a partial
  // failure doesn't leave the token reusable.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Burn any other outstanding tokens so the user only ever has the one
    // they just used.
    prisma.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, email: record.user.email });
}
