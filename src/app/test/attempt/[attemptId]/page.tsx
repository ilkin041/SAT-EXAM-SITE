import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadAttemptState } from "@/lib/attempt-engine";
import { TestInterface } from "./test-interface";

export const metadata = { title: "Test in progress" };

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true, user: { select: { name: true, email: true } } },
  });
  if (!attempt) notFound();

  // Auth: owner OR admin OR anonymous attempt on public test.
  const isOwner = attempt.userId && session?.user?.id === attempt.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAnonymousPublic = !attempt.userId && attempt.test.isPublic;
  if (!isOwner && !isAdmin && !isAnonymousPublic) {
    redirect("/login");
  }

  if (attempt.status === "COMPLETED") {
    redirect(`/results/${attempt.id}`);
  }

  const state = await loadAttemptState(attemptId);
  if (!state) redirect(`/results/${attempt.id}`);

  const displayName =
    attempt.user?.name ||
    attempt.user?.email ||
    session?.user?.name ||
    session?.user?.email ||
    "Test taker";

  return <TestInterface initialState={state} studentName={displayName} />;
}
