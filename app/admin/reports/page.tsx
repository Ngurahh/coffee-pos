import { prisma } from "@/lib/prisma";
import ExportExcelButton from "@/components/admin/ExportExcelButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string, end?: string, page?: string }>
}) {
  const currentDate = new Date();
  
  // Default: dari awal bulan ini sampai hari ini
  const defaultStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = currentDate.toISOString().split("T")[0];

  const params = await searchParams;
  const startDateStr = params.start || defaultStart;
  const endDateStr = params.end || defaultEnd;
  const currentPage = params.page ? parseInt(params.page) : 1;
  const limit = 50;

  // Konversi ke Date object untuk Prisma
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  // Set endDate ke ujung hari (23:59:59) agar transaksi di hari terakhir ikut terhitung
  endDate.setHours(23, 59, 59, 999);

  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    }
  };

  // 1. Hitung total data (untuk Pagination)
  const totalOrders = await prisma.order.count({ where: whereClause });
  const totalPages = Math.ceil(totalOrders / limit) || 1;

  // 2. Tarik data TERBATAS untuk UI tabel (Paginasi)
  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * limit,
    take: limit,
    include: { items: true },
  });

  // 3. Tarik seluruh data di rentang waktu tersebut KHUSUS untuk ekspor Excel 
  const allOrdersForExcel = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const excelData = allOrdersForExcel.map(order => ({
    "ID Transaksi": order.transactionNumber,
    "Tanggal": new Date(order.createdAt).toLocaleString("id-ID"),
    "Kasir": order.cashierName,
    "Metode Pembayaran": order.paymentMethod || "-",
    "Status": order.status,
    "Subtotal": Number(order.subtotal),
    "Diskon": Number(order.discount),
    "Total Tagihan": Number(order.total),
    "Item Terjual": order.items.map(item => `${item.productName} (x${item.quantity})`).join(", ")
  }));

  const formatCurrency = (val: any) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Laporan Penjualan</h2>
          <p className="text-slate-500 mt-2 font-medium text-sm">Menampilkan <span className="font-bold text-slate-900">{totalOrders}</span> transaksi untuk rentang waktu terpilih.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Form Filter Rentang Tanggal (Custom Date Range) */}
          <form method="GET" className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                name="start" 
                defaultValue={startDateStr} 
                className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              />
              <span className="text-slate-400 font-medium">s/d</span>
              <input 
                type="date" 
                name="end" 
                defaultValue={endDateStr} 
                className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              />
            </div>
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors text-sm">
              Terapkan
            </button>
          </form>

          {/* Tombol Ekspor Excel */}
          <ExportExcelButton 
            data={excelData} 
            filename={`Rekap_${startDateStr}_sd_${endDateStr}`} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-bold tracking-wide">Tanggal</th>
                <th className="p-4 font-bold tracking-wide">No. Transaksi</th>
                <th className="p-4 font-bold tracking-wide">Detail Item</th>
                <th className="p-4 font-bold tracking-wide">Metode</th>
                <th className="p-4 font-bold tracking-wide">Total</th>
                <th className="p-4 font-bold tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {orders.map(order => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-600">{new Date(order.createdAt).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                  })}</td>
                  <td className="p-4 font-bold text-slate-900">{order.transactionNumber}</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate" title={order.items.map(i => `${i.productName} (x${i.quantity})`).join(", ")}>
                    {order.items.map(i => `${i.productName} (x${i.quantity})`).join(", ")}
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 font-black text-indigo-600">{formatCurrency(order.total)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${order.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">Belum ada transaksi penjualan di rentang tanggal ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          {currentPage > 1 ? (
            <Link 
              href={`/admin/reports?start=${startDateStr}&end=${endDateStr}&page=${currentPage - 1}`}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              &larr; Sebelumnya
            </Link>
          ) : (
            <span className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-slate-300 cursor-not-allowed">
              &larr; Sebelumnya
            </span>
          )}
          
          <span className="text-sm font-medium text-slate-500 px-4">
            Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link 
              href={`/admin/reports?start=${startDateStr}&end=${endDateStr}&page=${currentPage + 1}`}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Selanjutnya &rarr;
            </Link>
          ) : (
            <span className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-slate-300 cursor-not-allowed">
              Selanjutnya &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
