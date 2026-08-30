import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama produk wajib diisi"),
  sku: z.string().optional(),
  price: z.number().min(0, "Harga tidak valid"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  isActive: z.boolean().optional(),
  imageUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Data tidak valid", details: result.error.flatten() }, { status: 400 });
    }

    const { name, price, categoryId } = result.data;
    let { sku } = result.data;

    // Generate SKU otomatis jika tidak diisi
    if (!sku) {
      const initials = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
      const randomId = Math.floor(1000 + Math.random() * 9000);
      sku = `SKU-${initials}-${randomId}`;
    }

    // Cek SKU unik
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return NextResponse.json({ error: "SKU sudah digunakan, silakan coba lagi" }, { status: 400 });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku,
        price,
        categoryId,
        isActive: true,
        imageUrl: result.data.imageUrl,
      },
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Gagal menambah produk", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success || !result.data.id) {
      return NextResponse.json({ error: "Data tidak valid atau ID hilang" }, { status: 400 });
    }

    const { id, name, price, categoryId, isActive } = result.data;
    let { sku } = result.data;

    // Generate SKU otomatis jika tidak diisi
    if (!sku) {
      const initials = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
      const randomId = Math.floor(1000 + Math.random() * 9000);
      sku = `SKU-${initials}-${randomId}`;
    }

    // Cek SKU unik (kecuali milik sendiri)
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "SKU sudah digunakan oleh produk lain" }, { status: 400 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        price,
        categoryId,
        isActive: isActive !== undefined ? isActive : undefined,
        imageUrl: result.data.imageUrl,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Gagal mengubah produk", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID produk tidak ditemukan" }, { status: 400 });

    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
      return NextResponse.json({ error: "Produk tidak bisa dihapus permanen karena sudah pernah terjual. Silakan matikan (nonaktifkan) produk ini saja." }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Gagal menghapus produk", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
