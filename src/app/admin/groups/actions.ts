"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function createGroup(data: FormData) {
  await requireAdmin();
  const name = data.get("name") as string;
  const description = data.get("description") as string;

  if (!name) throw new Error("Name is required");

  await prisma.group.create({
    data: { name, description },
  });

  revalidatePath("/admin/groups");
}

export async function deleteGroup(id: string) {
  await requireAdmin();
  await prisma.group.delete({ where: { id } });
  revalidatePath("/admin/groups");
}

export async function addStudentToGroup(groupId: string, data: FormData) {
  await requireAdmin();
  const email = data.get("email") as string;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  await prisma.group.update({
    where: { id: groupId },
    data: {
      users: {
        connect: { id: user.id },
      },
    },
  });

  revalidatePath(`/admin/groups/${groupId}`);
}

export async function removeStudentFromGroup(groupId: string, userId: string) {
  await requireAdmin();
  await prisma.group.update({
    where: { id: groupId },
    data: {
      users: {
        disconnect: { id: userId },
      },
    },
  });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function assignTestToGroup(groupId: string, data: FormData) {
  await requireAdmin();
  const testId = data.get("testId") as string;
  
  await prisma.group.update({
    where: { id: groupId },
    data: {
      tests: {
        connect: { id: testId },
      },
    },
  });

  revalidatePath(`/admin/groups/${groupId}`);
}

export async function removeTestFromGroup(groupId: string, testId: string) {
  await requireAdmin();
  await prisma.group.update({
    where: { id: groupId },
    data: {
      tests: {
        disconnect: { id: testId },
      },
    },
  });
  revalidatePath(`/admin/groups/${groupId}`);
}
