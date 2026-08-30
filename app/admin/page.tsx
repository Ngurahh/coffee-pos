import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  // 1. Definisikan waktu "hari ini" (dari jam 00:00 s/d 23:59)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 2. Ambil semua transaksi hari ini
  const todayOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: { items: true },
  });

  // 3. Kalkulasi Metrik Utama
  const totalOmsetToday = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalTransactionsToday = todayOrders.length;
  const totalItemsSoldToday = todayOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  // 4. Cari Shift yang sedang Aktif (Jika Ada)
  const activeSession = await prisma.cashSession.findFirst({
    where: { status: "OPEN" },
  });

  // 5. Produk Terlaris Hari Ini
  const topProductsRaw = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    _sum: { quantity: true },
    orderBy: {
      _sum: { quantity: "desc" },
    },
    take: 5,
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Ringkasan performa penjualan hari ini.</p>
        </div>
        <div className="mt-4 sm:mt-0 text-right">
          <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-slate-500">Data realtime</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <h3 className="font-semibold text-xs uppercase tracking-wider">Omset Hari Ini</h3>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOmsetToday)}</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <h3 className="font-semibold text-xs uppercase tracking-wider">Transaksi</h3>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalTransactionsToday} <span className="text-sm font-normal text-slate-500">struk</span></p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <h3 className="font-semibold text-xs uppercase tracking-wider">Item Terjual</h3>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalItemsSoldToday} <span className="text-sm font-normal text-slate-500">porsi</span></p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <h3 className="font-semibold text-xs uppercase tracking-wider">Status Shift</h3>
            <span className={`flex w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeSession ? activeSession.cashierName : "Offline"}</p>
          <p className="text-xs text-slate-500 mt-1">{activeSession ? "Sedang bertugas" : "Kasir tutup"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-6">Produk Terlaris Hari Ini</h3>
          
          {topProductsRaw.length > 0 ? (
            <div className="space-y-1">
              {topProductsRaw.map((item, index) => (
                <div key={item.productName} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-4">{index + 1}</span>
                    <p className="font-medium text-slate-800 text-sm">{item.productName}</p>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {item._sum.quantity} <span className="text-slate-400 font-normal">terjual</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 min-h-50">
              <p className="text-sm">Belum ada data penjualan hari ini.</p>
            </div>
          )}
        </div>

        {/* Quick Actions Minimalist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-6">Akses Cepat</h3>
          
          <div className="grid gap-3">
            <Link href="/admin/products" className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-slate-900 transition-colors group">
              <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center mr-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Tambah Produk Baru</p>
                <p className="text-xs text-slate-500">Perbarui menu kedai kopi</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>

            <Link href="/admin/reports" className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-slate-900 transition-colors group">
              <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center mr-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Riwayat Transaksi</p>
                <p className="text-xs text-slate-500">Ekspor laporan ke format Excel</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            
            {/* <Link href="/" className="flex items-center p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors group mt-2">
              <div className="flex-1">
                <p className="text-sm font-bold">Buka Layar Kasir</p>
                <p className="text-xs text-slate-400">Mulai transaksi dengan pelanggan</p>
              </div>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link> */}
          </div>
        </div>
      </div>
    </div>
  );
}