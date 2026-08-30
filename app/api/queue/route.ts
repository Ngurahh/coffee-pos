import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ambil semua pesanan yang statusnya PAID (Sedang Antre / Dibuat Barista)
export async function GET() {
  try {
    const activeOrders = await prisma.order.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    });

    return NextResponse.json({ success: true, orders: activeOrders });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengambil antrean", message: error.message }, { status: 500 });
  }
}

// Update pesanan menjadi COMPLETED (Selesai Dibuat / Disajikan)
export async function PUT(request: Request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengupdate pesanan", message: error.message }, { status: 500 });
  }
}
