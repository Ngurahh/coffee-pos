import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama kategori wajib diisi"),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Data tidak valid", details: result.error.flatten() }, { status: 400 });
    }

    const { name } = result.data;

    // Cek nama unik
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Nama kategori sudah ada" }, { status: 400 });
    }

    const newCategory = await prisma.category.create({
      data: { name, isActive: true },
    });

    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menambah kategori", message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success || !result.data.id) {
      return NextResponse.json({ error: "Data tidak valid atau ID hilang" }, { status: 400 });
    }

    const { id, name, isActive } = result.data;

    // Cek nama unik kecuali milik sendiri
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Nama kategori sudah digunakan oleh kategori lain" }, { status: 400 });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengubah kategori", message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID kategori tidak ditemukan" }, { status: 400 });

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json({ error: "Kategori tidak bisa dihapus karena masih ada produk di dalamnya. Pindahkan atau hapus produknya terlebih dahulu." }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menghapus kategori", message: error.message }, { status: 500 });
  }
}
