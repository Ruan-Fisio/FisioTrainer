"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioSchema, usuarioUpdateSchema } from "@/lib/validations/usuario";

const PAGE_SIZE = 10;

export async function listUsuarios(filters: { q?: string }, page: number) {
  const where = filters.q
    ? {
        OR: [
          { name: { contains: filters.q, mode: "insensitive" as const } },
          { email: { contains: filters.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [usuarios, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    usuarios,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export type UsuarioActionState = {
  error?: string;
  success?: boolean;
};

export async function createUsuario(
  _prevState: UsuarioActionState,
  formData: FormData,
): Promise<UsuarioActionState> {
  const parsed = usuarioSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    cref: formData.get("cref"),
    crefito: formData.get("crefito"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { error: "Já existe um usuário com este e-mail." };
  }

  const password = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      ...parsed.data,
      password,
      cref: parsed.data.cref || null,
      crefito: parsed.data.crefito || null,
    },
  });

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUsuario(
  id: string,
  _prevState: UsuarioActionState,
  formData: FormData,
): Promise<UsuarioActionState> {
  const parsed = usuarioUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    cref: formData.get("cref"),
    crefito: formData.get("crefito"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing && existing.id !== id) {
    return { error: "Já existe um usuário com este e-mail." };
  }

  const data: {
    name: string;
    email: string;
    password?: string;
    cref: string | null;
    crefito: string | null;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    cref: parsed.data.cref || null,
    crefito: parsed.data.crefito || null,
  };

  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  await prisma.user.update({ where: { id }, data });

  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteUsuario(id: string) {
  await prisma.user.delete({ where: { id } });
  revalidatePath("/usuarios");
}
