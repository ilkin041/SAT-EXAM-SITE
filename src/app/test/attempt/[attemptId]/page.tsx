import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadAttemptState } from "@/lib/attempt-engine";
import { TestInterface } from "./test-interface";
import { canAccessTest } from "@/lib/test-access";
import { canAccessAttempt } from "@/lib/attempt-auth";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Test in progress", noindex: true });

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

  if (!(await canAccessAttempt(session?.user, attempt))) {
    redirect("/login");
  }
  if (!(await canAccessTest(session?.user, attempt.test))) redirect("/dashboard");

  if (attempt.status === "COMPLETED") {
    redirect(`/results/${attempt.id}`);
  }
  if (attempt.status !== "IN_PROGRESS") redirect("/dashboard");

  const state = await loadAttemptState(attemptId, session?.user);
  if (!state) redirect("/dashboard");

  const displayName =
    attempt.user?.name ||
    attempt.user?.email ||
    session?.user?.name ||
    session?.user?.email ||
    "Test taker";

  return <TestInterface initialState={state} studentName={displayName} />;
}
