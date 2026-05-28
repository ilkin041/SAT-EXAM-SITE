import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin-only: forcibly set a user's password to a freshly-generated readable
 * temporary string. Returns the temp password ONCE in the response so the
 * admin can copy/share it — it's never logged or stored in plaintext.
 *
 * Also invalidates any outstanding password reset tokens for the user so
 * old links can't be used to override the admin-set temp password.
 */

const ADJECTIVES = [
  "Blue", "Red", "Gold", "Quick", "Brave", "Calm", "Swift", "Bright",
  "Lucky", "Sharp", "Sunny", "Bold", "Clever", "Cool", "Eager", "Happy",
];
const NOUNS = [
  "Tiger", "Falcon", "River", "Mountain", "Wave", "Comet", "Forest", "Star",
  "Cloud", "Meadow", "Harbor", "Canyon", "Phoenix", "Garden", "Ranger", "Otter",
];

/**
 * "Blue4Tiger9"-style readable temp passwords. Avoids look-alike characters
 * (0/O, 1/l/I) and stays ≥10 chars to satisfy the 8-char minimum with margin.
 */
function generateTempPassword(): string {
  const adj = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const noun = NOUNS[crypto.randomInt(NOUNS.length)];
  const d1 = crypto.randomInt(2, 10); // 2..9 — skip 0,1
  const d2 = crypto.randomInt(2, 10);
  return `${adj}${d1}${noun}${d2}`;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { password: hash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, tempPassword });
}
