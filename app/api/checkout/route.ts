import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkoutSchema = z.object({
  paymentMethod: z.enum(["CASH", "QRIS"]),
  cashReceived: z.number().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Keranjang kosong"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { paymentMethod, cashReceived, items } = result.data;

    // 1. Cek Active Cash Session
    const activeSession = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "Tidak ada shift yang aktif. Silakan buka shift terlebih dahulu." },
        { status: 400 }
      );
    }

    // 2. Ambil harga asli dari database (Never Trust Client)
    const productIds = items.map((item) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "Beberapa produk tidak ditemukan atau tidak aktif" },
        { status: 400 }
      );
    }

    // 2. Kalkulasi Subtotal & Order Items
    let subtotal = 0;
    const orderItemsInput = items.map((item) => {
      const product = dbProducts.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.price);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice,
        subtotal: itemSubtotal,
      };
    });

    // Kalkulasi Pajak/Diskon (Untuk saat ini 0)
    const discount = 0;
    const tax = 0;
    const total = subtotal - discount + tax;

    // 3. Validasi Uang (Jika CASH)
    let change = 0;
    if (paymentMethod === "CASH") {
      if (cashReceived === undefined || cashReceived < total) {
        return NextResponse.json(
          { error: "Uang tunai kurang dari total belanja" },
          { status: 400 }
        );
      }
      change = cashReceived - total;
    }

    // 4. Generate Transaction Number
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0'); // YYYYMMDD based on server local time

    // Find the latest order for today to avoid counting mismatch due to deleted orders or timezone issues
    const latestOrder = await prisma.order.findFirst({
      where: {
        transactionNumber: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: {
        transactionNumber: 'desc',
      },
    });

    let nextNum = 1;
    if (latestOrder) {
      const parts = latestOrder.transactionNumber.split('-');
      if (parts.length === 3) {
        nextNum = parseInt(parts[2], 10) + 1;
      }
    }
    const transactionNumber = `ORD-${dateStr}-${String(nextNum).padStart(5, "0")}`;

    // 5. Atomic Transaction
    const order = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          transactionNumber,
          sessionId: activeSession.id,
          cashierName: activeSession.cashierName,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          status: "PAID", // Otomatis PAID karena pembayaran langsung
          cashReceived: paymentMethod === "CASH" ? cashReceived : null,
          change: paymentMethod === "CASH" ? change : null,
          items: {
            create: orderItemsInput,
          },
        },
        include: {
          items: true,
        },
      });
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: unknown) {
    console.error("Checkout Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses transaksi", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
