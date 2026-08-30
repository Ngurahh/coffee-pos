import { prisma } from "@/lib/prisma";
import POSClient from "@/components/pos/POSClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Pastikan data selalu fresh
export const dynamic = "force-dynamic";

export default async function POSPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  // Ambil kategori dari database
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Ambil produk aktif dari database
  const rawProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Ambil shift yang sedang aktif
  const activeSession = await prisma.cashSession.findFirst({
    where: { status: "OPEN" },
  });

  // Prisma Decimal harus dikonversi ke number sebelum dikirim ke Client Component
  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price),
    categoryId: p.categoryId,
    imageUrl: p.imageUrl,
  }));

  return (
    <POSClient 
      categories={categories} 
      products={products} 
      user={session?.user || null}
      activeSession={activeSession ? {
        id: activeSession.id,
        cashierName: activeSession.cashierName,
        openingCash: Number(activeSession.openingCash)
      } : null}
    />
  );
}
