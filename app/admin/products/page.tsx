import { prisma } from "@/lib/prisma";
import ProductManager from "@/components/admin/ProductManager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const rawProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price),
    categoryId: p.categoryId,
    isActive: p.isActive,
    imageUrl: p.imageUrl,
    category: {
      id: p.category.id,
      name: p.category.name,
    },
  }));

  return <ProductManager initialProducts={products} categories={categories} />;
}
