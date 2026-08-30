import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const openShiftSchema = z.object({
  cashierName: z.string().min(1, "Nama kasir wajib diisi"),
  openingCash: z.number().min(0, "Modal awal tidak boleh negatif"),
});

const closeShiftSchema = z.object({
  sessionId: z.string().min(1),
  actualCash: z.number().min(0, "Uang fisik tidak boleh negatif"),
});

// GET: Ambil sesi kasir yang sedang aktif
export async function GET() {
  try {
    const activeSession = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
      include: {
        _count: { select: { orders: true } },
      },
    });
    return NextResponse.json({ success: true, session: activeSession });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengambil sesi kasir" }, { status: 500 });
  }
}

// POST: Buka Shift Baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = openShiftSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Data tidak valid", details: result.error.flatten() }, { status: 400 });
    }

    // Pastikan tidak ada shift yang masih buka
    const existingSession = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
    });

    if (existingSession) {
      return NextResponse.json({ error: "Masih ada shift yang aktif. Tutup shift sebelumnya terlebih dahulu." }, { status: 400 });
    }

    const newSession = await prisma.cashSession.create({
      data: {
        cashierName: result.data.cashierName,
        openingCash: result.data.openingCash,
        status: "OPEN",
      },
    });

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal membuka shift", message: error.message }, { status: 500 });
  }
}

// PUT: Tutup Shift
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = closeShiftSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Data tidak valid", details: result.error.flatten() }, { status: 400 });
    }

    const { sessionId, actualCash } = result.data;

    // Ambil sesi & Hitung expected cash
    const session = await prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: { orders: { where: { status: "PAID", paymentMethod: "CASH" } } }
    });

    if (!session || session.status === "CLOSED") {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah ditutup" }, { status: 400 });
    }

    // Expected Cash = Modal awal + Total Cash dari order
    const totalCashSales = session.orders.reduce((sum, order) => sum + Number(order.total), 0);
    const expectedCash = Number(session.openingCash) + totalCashSales;
    const difference = actualCash - expectedCash;

    const closedSession = await prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: "CLOSED",
        endTime: new Date(),
        expectedCash,
        actualCash,
        difference,
      },
    });

    return NextResponse.json({ success: true, session: closedSession });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menutup shift", message: error.message }, { status: 500 });
  }
}
